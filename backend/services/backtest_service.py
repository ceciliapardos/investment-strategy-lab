"""
Strategy Comparison: orquesta el backtest histórico de varias estrategias.

Capas:
- Datos:      services.data_provider (vía market_service._daily_frame)
- Cálculo:    analytics.portfolio (buy & hold, divisas, alineación) y
              analytics.metrics (rentabilidad, CAGR, volatilidad, drawdown)
- Este módulo valida la petición, reúne los datos, fija el PERIODO COMÚN y
  monta la respuesta. No contiene fórmulas financieras propias.

Metodología resumida (detalle en Decisiones D34-D38):
- Divisa base EUR. Cada activo se convierte con el tipo de cambio diario de
  Yahoo Finance (EURUSD=X, EURGBP=X...).
- Solo días en los que TODOS los activos de TODAS las estrategias seleccionadas
  (y sus tipos de cambio) tienen cierre: misma ventana para todas.
- Buy & hold sin rebalanceo, sin costes. Precios ajustados (dividendos ya
  incluidos; el TER de los ETF ya está descontado en su precio).
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date
from typing import Optional

import pandas as pd

from analytics import metrics, portfolio
from services import market_service as ms
from services.errors import InvalidComparison, MarketDataError, UnusableAsset

BASE_CURRENCY = "EUR"
MIN_STRATEGIES = 2
MAX_STRATEGIES = 6
MAX_ASSETS_PER_STRATEGY = 25
MAX_CHART_POINTS = 600
MIN_OBSERVATIONS = 2

# Cotizaciones en céntimos de la divisa (Yahoo): se pasan a la unidad principal.
CENT_CURRENCIES = {"GBp": ("GBP", 0.01), "GBX": ("GBP", 0.01), "ZAc": ("ZAR", 0.01), "ILA": ("ILS", 0.01)}


def _fmt(d: pd.Timestamp) -> str:
    return d.strftime("%d/%m/%Y")


def fx_pair(currency: str) -> str:
    """Par de Yahoo que da unidades de `currency` por 1 EUR."""
    return f"{BASE_CURRENCY}{currency}=X"


def normalize_currency(raw: Optional[str]) -> tuple[str, float]:
    """('GBp') -> ('GBP', 0.01); ('usd') -> ('USD', 1.0)."""
    raw = (raw or "").strip()
    if raw in CENT_CURRENCIES:
        return CENT_CURRENCIES[raw]
    return raw.upper(), 1.0


# ---------------------------------------------------------------------------
# Validación de la petición
# ---------------------------------------------------------------------------
def _validate_strategies(strategies: list[dict], min_count: int = MIN_STRATEGIES) -> list[dict]:
    if not isinstance(strategies, list) or not (min_count <= len(strategies) <= MAX_STRATEGIES):
        if min_count == 1:
            raise InvalidComparison(f"Selecciona entre 1 y {MAX_STRATEGIES} estrategias.")
        raise InvalidComparison(f"Selecciona entre {min_count} y {MAX_STRATEGIES} estrategias para compararlas.")

    clean, ids = [], set()
    for s in strategies:
        name = (s.get("name") or "").strip() or "Estrategia sin nombre"
        sid = str(s.get("id") or "")
        if not sid or sid in ids:
            raise InvalidComparison(f"«{name}»: identificador ausente o repetido.")
        ids.add(sid)

        if (s.get("baseCurrency") or BASE_CURRENCY) != BASE_CURRENCY:
            raise InvalidComparison(f"«{name}»: solo se admite capital en euros.")

        capital = s.get("initialCapital")
        if capital is None and s.get("recurringContributions"):
            capital = 0
        if isinstance(capital, bool) or not isinstance(capital, (int, float)) or capital < 0 or capital > 1_000_000_000:
            raise InvalidComparison(f"«{name}»: el capital inicial no es válido.")

        assets = s.get("assets") or []
        if not assets:
            raise InvalidComparison(f"«{name}»: no tiene activos.")
        if len(assets) > MAX_ASSETS_PER_STRATEGY:
            raise InvalidComparison(f"«{name}»: tiene más de {MAX_ASSETS_PER_STRATEGY} activos.")

        weights: dict[str, float] = {}
        for a in assets:
            sym = ms.normalize_ticker(a.get("ticker", ""))
            if sym in weights:
                raise InvalidComparison(f"«{name}»: {sym} aparece dos veces.")
            weights[sym] = a.get("weight")
        try:
            fractions = portfolio.normalize_weights(weights)
        except ValueError as exc:
            raise InvalidComparison(f"«{name}»: {exc}") from exc

        contributions = _validate_contributions(name, s.get("recurringContributions") or [], weights)
        if capital == 0 and not contributions:
            raise InvalidComparison(f"«{name}»: sin capital inicial necesita al menos una aportación periódica.")

        clean.append({"id": sid, "name": name, "capital": float(capital),
                      "weights_pct": weights, "weights": fractions, "contributions": contributions})
    return clean


FREQUENCY_LABEL = {"monthly": "mensual", "quarterly": "trimestral", "annual": "anual"}
MAX_CONTRIBUTIONS = 25
MAX_CONTRIBUTION_AMOUNT = 1_000_000


def _validate_contributions(name: str, raw: list, weights: dict) -> list[dict]:
    """Aportaciones periódicas: importe > 0, activo de la estrategia, frecuencia válida, sin duplicados."""
    if not isinstance(raw, list):
        raise InvalidComparison(f"«{name}»: las aportaciones periódicas no son válidas.")
    if len(raw) > MAX_CONTRIBUTIONS:
        raise InvalidComparison(f"«{name}»: tiene más de {MAX_CONTRIBUTIONS} aportaciones periódicas.")
    out, seen = [], set()
    for c in raw:
        ticker = ms.normalize_ticker((c or {}).get("ticker") or (c or {}).get("assetTicker") or "")
        if ticker not in weights:
            raise InvalidComparison(f"«{name}»: la aportación a {ticker or '(sin activo)'} no corresponde a ningún activo de la estrategia.")
        freq = c.get("frequency")
        if freq not in portfolio.FREQUENCY_MONTHS:
            raise InvalidComparison(f"«{name}»: la frecuencia de la aportación a {ticker} no es válida (mensual, trimestral o anual).")
        amount = c.get("amount")
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount != amount:
            raise InvalidComparison(f"«{name}»: el importe de la aportación a {ticker} no es un número.")
        if not amount > 0 or amount > MAX_CONTRIBUTION_AMOUNT:
            raise InvalidComparison(f"«{name}»: el importe de la aportación a {ticker} debe ser mayor que 0 € y como máximo {MAX_CONTRIBUTION_AMOUNT:,} €.".replace(",", "."))
        if (ticker, freq) in seen:
            raise InvalidComparison(f"«{name}»: hay dos aportaciones {FREQUENCY_LABEL[freq]}es a {ticker}; modifica el importe de una en lugar de repetirla.")
        seen.add((ticker, freq))
        out.append({"ticker": ticker, "amount": float(amount), "frequency": freq})
    return out


# ---------------------------------------------------------------------------
# Datos
# ---------------------------------------------------------------------------
def _load_asset(sym: str) -> dict:
    info, asset_type = ms._supported_info(sym)  # 404 / 422 si no existe o no está soportado
    frame = ms._daily_frame(sym)
    if frame.empty or len(frame) < MIN_OBSERVATIONS:
        raise UnusableAsset(f"{sym} no tiene histórico de precios utilizable.")
    currency, factor = normalize_currency(info.get("currency"))
    if not currency:
        raise UnusableAsset(f"{sym}: la fuente no indica su divisa.")
    return {
        "ticker": sym,
        "name": info.get("longName") or info.get("shortName") or sym,
        "type": asset_type,
        "currency": currency,
        "factor": factor,
        "adj": frame["adj"],
    }


def _load_fx(currency: str) -> pd.Series:
    frame = ms._daily_frame(fx_pair(currency))
    if frame.empty:
        raise UnusableAsset(f"No hay tipo de cambio EUR/{currency} disponible para convertir a euros.")
    return frame["adj"]


def _parallel(fn, keys):
    """Ejecuta fn(k) en paralelo; devuelve (resultados, errores) por clave."""
    results, errors = {}, {}
    with ThreadPoolExecutor(max_workers=min(8, max(1, len(keys)))) as pool:
        futures = {k: pool.submit(fn, k) for k in keys}
    for k, f in futures.items():
        try:
            results[k] = f.result()
        except MarketDataError as exc:
            errors[k] = exc.message
    return results, errors


# ---------------------------------------------------------------------------
# Comparación
# ---------------------------------------------------------------------------
def run_comparison(strategies: list[dict], period: Optional[str] = None,
                   start: Optional[str] = None, end: Optional[str] = None, min_count: int = MIN_STRATEGIES,
                   benchmark: Optional[str] = None) -> dict:
    if benchmark and benchmark not in BENCHMARKS:
        raise InvalidComparison("El índice de referencia elegido no existe.")
    strats = _validate_strategies(strategies, min_count=min_count)
    ctx = prepare_window(strats, period, start, end)
    if "no_data" in ctx:
        return ctx["no_data"]
    window, assets, key = ctx["window"], ctx["assets"], ctx["key"]

    periods_per_year = 365 if (window.index.dayofweek >= 5).any() else metrics.TRADING_DAYS_PER_YEAR
    notices = ctx["notices"]
    results, indexes, totals = [], {}, {}
    for s in strats:
        values, flows = simulate_strategy(s, window)
        index = portfolio.twr_index(values["__total__"], values["__flow__"])
        indexes[s["id"]], totals[s["id"]] = index, values["__total__"]
        results.append(_strategy_result(s, values, index, flows, window, assets, periods_per_year))
        if s["contributions"] and not flows:
            notices.append({"code": f"no_flows_{s['id']}",
                            "message": f"Ninguna aportación periódica de «{s['name']}» cae dentro de este periodo: "
                                       "se simula solo el capital inicial."})

    bench = benchmark_result(benchmark, window, ctx["fx"]) if benchmark else None
    series = _chart_series(indexes, totals, results)
    if bench and bench["status"] == "ok":
        by_date = bench.pop("_index")
        for p in series:
            v = by_date.get(p["date"])
            p["benchmark"] = None if v is None else round(v, 4)
    elif bench:
        bench.pop("_index", None)

    return {
        "status": "ok",
        "message": None,
        "base_currency": BASE_CURRENCY,
        "method": {"rebalancing": "buy_and_hold", "prices": "adjusted_close", "alignment": "common_dates",
                   "costs": "not_included", "periods_per_year": periods_per_year,
                   "returns": "time_weighted",
                   "contributions": any(s["contributions"] for s in strats)},
        **window_summary(ctx),
        "assets": ctx["availability"],
        "strategies": results,
        "benchmark": bench,
        "series": series,
    }


# ---------------------------------------------------------------------------
# Índice de referencia (benchmark): solo contexto, no es una estrategia (D72-D73)
# ---------------------------------------------------------------------------
BENCHMARKS = {
    "sp500tr": {
        "ticker": "^SP500TR",
        "name": "S&P 500 (Total Return)",
        "kind": "index",
        "kind_label": "Índice directo",
        "description": "Índice S&P 500 con dividendos reinvertidos (Total Return), en dólares, convertido a euros "
                       "con el mismo tipo de cambio diario que las estrategias.",
    },
    "msci_world": {
        "ticker": "IWDA.AS",
        "name": "MSCI World (proxy: iShares Core MSCI World UCITS ETF)",
        "kind": "etf_proxy",
        "kind_label": "ETF proxy, no es el índice",
        "description": "ETF de acumulación que replica el MSCI World, cotizado en euros en Ámsterdam. No es el índice: "
                       "su precio ya descuenta su TER y tiene error de seguimiento.",
    },
}


def benchmark_result(bench_id: str, window: pd.DataFrame, fx_cache: dict) -> dict:
    """
    Comprar y mantener del benchmark en EXACTAMENTE la ventana de las estrategias:
    primer cierre del benchmark en o después del inicio del periodo común y último en
    o antes del final (sin rellenar precios). No recibe aportaciones: es contexto de
    mercado. Si su histórico no cubre el inicio del periodo, no se muestra (no se
    acorta el periodo de las estrategias por su culpa).
    """
    meta = BENCHMARKS[bench_id]
    base = {"id": bench_id, "ticker": meta["ticker"], "name": meta["name"], "kind": meta["kind"],
            "kind_label": meta["kind_label"], "description": meta["description"]}
    w0, w1 = window.index[0], window.index[-1]
    try:
        asset = _load_asset(meta["ticker"])
        fx = None
        if asset["currency"] != BASE_CURRENCY:
            fx = fx_cache.get(asset["currency"]) if fx_cache else None
            if fx is None:
                fx = _load_fx(asset["currency"])
        eur = portfolio.to_base_currency(asset["adj"], fx, asset["factor"])
    except MarketDataError as exc:
        return {**base, "status": "unavailable", "message": f"No se pudieron obtener los datos del índice de referencia: {exc.message}"}

    if eur.empty or eur.index[0] > w0:
        since = _fmt(eur.index[0]) if not eur.empty else "—"
        return {**base, "status": "unavailable",
                "message": f"El índice de referencia solo tiene datos desde el {since}: no cubre el periodo común, "
                           f"que empieza el {_fmt(w0)}. Elige un periodo más corto."}
    s = eur[(eur.index >= w0) & (eur.index <= w1)]
    if len(s) < MIN_OBSERVATIONS:
        return {**base, "status": "unavailable", "message": "El índice de referencia no tiene cotizaciones en este periodo."}

    ppy = metrics.TRADING_DAYS_PER_YEAR
    n = len(s)
    vol = metrics.annualized_volatility(s, ppy, ms.MIN_RETURNS_FOR_VOLATILITY)
    cagr = metrics.cagr(s)
    mdd = metrics.max_drawdown(s)
    days = (s.index[-1] - s.index[0]).days
    rebased = s / s.iloc[0] * 100
    return {
        **base,
        "status": "ok",
        "message": None,
        "currency": asset["currency"],
        "effective": {"start": s.index[0].date().isoformat(), "end": s.index[-1].date().isoformat(), "observations": n},
        "metrics": {
            "total_return": round(metrics.total_return(s), 6),
            "cagr": round(cagr, 6) if cagr is not None else None,
            "cagr_reason": None if cagr is not None else
                f"El periodo dura {days} días; el CAGR solo se calcula para periodos de al menos 1 año.",
            "volatility": round(vol, 6) if vol is not None else None,
            "volatility_reason": None if vol is not None else
                f"Hay {n - 1} variaciones; se necesitan al menos {ms.MIN_RETURNS_FOR_VOLATILITY}.",
            **_sharpe_fields(s, ppy, n),
            "max_drawdown": None if mdd is None else {
                "value": round(mdd["value"], 6),
                "peak_date": mdd["peak_date"].date().isoformat() if mdd["peak_date"] is not None else None,
                "trough_date": mdd["trough_date"].date().isoformat() if mdd["trough_date"] is not None else None,
            },
        },
        "_index": {d.date().isoformat(): float(v) for d, v in rebased.items()},
    }


def simulate_strategy(s: dict, window: pd.DataFrame) -> tuple[pd.DataFrame, list]:
    """Valor diario (con aportaciones) y lista de aportaciones ejecutadas de una estrategia."""
    prices = window[list(s["weights"])]
    flows = portfolio.contribution_flows(prices.index, s["contributions"])
    if s["capital"] == 0 and not flows:
        raise InvalidComparison(
            f"«{s['name']}» no tiene capital inicial y ninguna de sus aportaciones cae dentro del periodo "
            f"({_fmt(window.index[0])} → {_fmt(window.index[-1])}). Amplía el periodo o añade capital inicial.")
    return portfolio.simulate(prices, s["weights"], s["capital"], flows), flows


def window_summary(ctx: dict) -> dict:
    """Bloque común de la respuesta: periodo pedido, común y efectivo, avisos y divisas."""
    window = ctx["window"]
    return {
        "period": ctx["key"],
        "requested": {"start": ctx["req_start"].date().isoformat(), "end": ctx["req_end"].date().isoformat()},
        "common": {"start": ctx["common_first"].date().isoformat(), "end": ctx["common_last"].date().isoformat()},
        "effective": {"start": window.index[0].date().isoformat(), "end": window.index[-1].date().isoformat(),
                      "observations": int(len(window)),
                      "days": int((window.index[-1] - window.index[0]).days)},
        "notices": ctx["notices"],
        "fx": [{"currency": c, "pair": fx_pair(c)} for c in ctx["currencies"]],
    }


def prepare_window(strats: list[dict], period: Optional[str] = None,
                   start: Optional[str] = None, end: Optional[str] = None) -> dict:
    """
    Reúne precios en euros, alinea fechas comunes y resuelve la ventana.
    Devuelve {"no_data": respuesta} o el contexto con: window (precios EUR),
    assets, fx (series EUR/divisa), currencies, availability, key, req_start,
    req_end, notices, common_first, common_last.
    Lo usan Strategy Comparison y Cost Analysis: misma ventana, mismos datos.
    """
    tickers = sorted({t for s in strats for t in s["weights"]})

    assets, errors = _parallel(_load_asset, tickers)
    if errors:
        used_by = {t: [s["name"] for s in strats if t in s["weights"]] for t in errors}
        detail = " ".join(f"{msg} (en {', '.join('«' + n + '»' for n in used_by[t])})." for t, msg in errors.items())
        raise UnusableAsset(f"No se puede hacer la comparación: {detail}")

    currencies = sorted({a["currency"] for a in assets.values() if a["currency"] != BASE_CURRENCY})
    fx, fx_errors = _parallel(_load_fx, currencies)
    if fx_errors:
        raise UnusableAsset(" ".join(fx_errors.values()))

    # Precios en euros por activo (sin rellenar huecos).
    eur = {
        t: portfolio.to_base_currency(a["adj"], fx.get(a["currency"]), a["factor"])
        for t, a in assets.items()
    }
    availability = []
    for t, s in eur.items():
        a = assets[t]
        availability.append({
            "ticker": t, "name": a["name"], "type": a["type"], "currency": a["currency"],
            "fx_pair": fx_pair(a["currency"]) if a["currency"] != BASE_CURRENCY else None,
            "first_date": s.index[0].date().isoformat() if len(s) else None,
            "last_date": s.index[-1].date().isoformat() if len(s) else None,
            "local_first_date": a["adj"].index[0].date().isoformat(),
        })

    aligned = portfolio.align_prices(eur)
    if len(aligned) < MIN_OBSERVATIONS:
        ms._resolve_window(period, start, end, pd.Timestamp(date.today()), pd.Timestamp(date.today()))
        return {"no_data": _no_data(strats, availability, period, start, end,
                                    "Los activos seleccionados no tienen suficientes días de cotización en común.")}

    common_first, common_last = aligned.index[0], aligned.index[-1]
    key, req_start, req_end, notices = ms._resolve_window(period, start, end, common_first, common_last)
    window = aligned[(aligned.index >= req_start) & (aligned.index <= req_end)]

    limiting = _limiting_assets(availability, common_first)
    if req_start < common_first and len(window):
        notices.append({"code": "common_start",
                        "message": f"El periodo común empieza el {_fmt(common_first)}: {limiting} no tiene datos antes. "
                                   "Todas las estrategias se comparan desde esa fecha."})
    elif key == "MAX":
        notices.append({"code": "max_common",
                        "message": f"Máximo periodo común: desde el {_fmt(common_first)} (lo limita {limiting})."})

    if len(window) < MIN_OBSERVATIONS:
        if req_end < common_first:
            msg = f"No hay datos comunes en este periodo: el periodo común empieza el {_fmt(common_first)} ({limiting})."
        else:
            msg = (f"Solo hay {len(window)} día con cotización común en este periodo; se necesitan al menos "
                   f"{MIN_OBSERVATIONS}." if len(window) == 1 else
                   "No hay ningún día con cotización común en este periodo (fines de semana, festivos o mercados cerrados).")
        return {"no_data": _no_data(strats, availability, key, start, end, msg, notices,
                                    common=(common_first, common_last))}

    if key == "CUSTOM":
        if window.index[0] > req_start >= common_first:
            notices.append({"code": "start_adjusted",
                            "message": f"El {_fmt(req_start)} no fue un día con cotización común. Se empieza el {_fmt(window.index[0])}."})
        if window.index[-1] < req_end:
            notices.append({"code": "end_adjusted",
                            "message": f"Último día con cotización común del periodo: {_fmt(window.index[-1])}."})

    return {
        "window": window, "assets": assets, "fx": fx, "currencies": currencies,
        "availability": availability, "key": key, "req_start": req_start, "req_end": req_end,
        "notices": notices, "common_first": common_first, "common_last": common_last,
    }


def _limiting_assets(availability: list[dict], common_first: pd.Timestamp) -> str:
    """Nombra el activo (o tipo de cambio) que más tarde empieza a tener datos."""
    target = common_first.date().isoformat()
    names = []
    for a in availability:
        if a["first_date"] and a["first_date"] >= target:
            if a["fx_pair"] and a["local_first_date"] < a["first_date"]:
                names.append(f"el tipo de cambio EUR/{a['currency']} (para {a['ticker']})")
            else:
                names.append(a["ticker"])
    if not names:
        return "la combinación de calendarios de los activos"
    return ", ".join(sorted(set(names)))


def _sharpe_fields(index: pd.Series, ppy: int, n: int) -> dict:
    """Sharpe (rf = 0 %) sobre el índice TWR: mismas rentabilidades diarias que la volatilidad."""
    sharpe = metrics.sharpe_ratio(index, ppy, ms.MIN_RETURNS_FOR_VOLATILITY)
    reason = None
    if sharpe is None:
        reason = (f"Hay {n - 1} variaciones; se necesitan al menos {ms.MIN_RETURNS_FOR_VOLATILITY}."
                  if n - 1 < ms.MIN_RETURNS_FOR_VOLATILITY else "La volatilidad del periodo es 0: no está definido.")
    return {"sharpe": round(sharpe, 4) if sharpe is not None else None, "sharpe_reason": reason,
            "sharpe_risk_free": metrics.SHARPE_RISK_FREE_RATE}


def _strategy_result(s: dict, values: pd.DataFrame, index: pd.Series, flows: list,
                     window: pd.DataFrame, assets: dict, ppy: int) -> dict:
    # Métricas sobre el índice TWR (sin aportaciones coincide con el valor en euros).
    total = index.dropna()
    n = len(total)
    mdd = metrics.max_drawdown(total)
    cagr = metrics.cagr(total)
    vol = metrics.annualized_volatility(total, ppy, ms.MIN_RETURNS_FOR_VOLATILITY)
    days = (total.index[-1] - total.index[0]).days
    fw = portfolio.final_weights(values.drop(columns="__flow__"))
    ar = portfolio.asset_returns(window[list(s["weights"])])
    largest = max(s["weights_pct"].items(), key=lambda kv: kv[1])
    money = portfolio.money_summary(values, s["capital"])
    by_asset: dict[str, dict] = {}
    for f in flows:
        a = by_asset.setdefault(f.ticker, {"count": 0, "amount": 0.0})
        a["count"] += 1
        a["amount"] += f.amount

    return {
        "id": s["id"],
        "name": s["name"],
        "initial_capital": round(s["capital"], 2),
        "final_value": round(money["final_value"], 2),
        "contributions": {
            "planned": [{"ticker": c["ticker"], "amount": c["amount"], "frequency": c["frequency"]} for c in s["contributions"]],
            "count": len(flows),
            "total": round(money["contributions"], 2),
            "total_contributed": round(money["total_contributed"], 2),
            "gain": round(money["gain"], 2),
            "first_date": flows[0].date.date().isoformat() if flows else None,
            "by_asset": {t: {"count": v["count"], "amount": round(v["amount"], 2)} for t, v in by_asset.items()},
        },
        "n_assets": len(s["weights"]),
        "largest_weight": {"ticker": largest[0], "weight": largest[1]},
        "metrics": {
            "total_return": round(metrics.total_return(total), 6),
            "cagr": round(cagr, 6) if cagr is not None else None,
            "cagr_reason": None if cagr is not None else
                f"El periodo común dura {days} días; el CAGR solo se calcula para periodos de al menos 1 año.",
            "volatility": round(vol, 6) if vol is not None else None,
            "volatility_reason": None if vol is not None else
                f"Hay {n - 1} variaciones; se necesitan al menos {ms.MIN_RETURNS_FOR_VOLATILITY}.",
            **_sharpe_fields(total, ppy, n),
            "max_drawdown": None if mdd is None else {
                "value": round(mdd["value"], 6),
                "peak_date": mdd["peak_date"].date().isoformat() if mdd["peak_date"] is not None else None,
                "trough_date": mdd["trough_date"].date().isoformat() if mdd["trough_date"] is not None else None,
            },
        },
        "composition": [
            {
                "ticker": t,
                "name": assets[t]["name"],
                "type": assets[t]["type"],
                "currency": assets[t]["currency"],
                "initial_weight": s["weights_pct"][t],
                "final_weight": round(fw[t] * 100, 4),
                "return_eur": round(ar[t], 6),
            }
            for t in s["weights"]
        ],
    }


def _chart_series(indexes: dict[str, pd.Series], totals: dict[str, pd.Series], results: list[dict]) -> list[dict]:
    """
    Serie común para el gráfico: índice TWR base 100 (rentabilidad sin aportaciones),
    caída desde máximos sobre ese índice y valor real en euros (incluye aportaciones).
    """
    index = next(iter(indexes.values())).index
    rebased = indexes
    dds = {k: metrics.drawdown_series(v.dropna()).reindex(index) for k, v in indexes.items()}

    keep = set()
    for r in results:
        mdd = r["metrics"]["max_drawdown"]
        if mdd and mdd["peak_date"]:
            keep.add(index.get_loc(pd.Timestamp(mdd["peak_date"])))
            keep.add(index.get_loc(pd.Timestamp(mdd["trough_date"])))
    positions = ms._downsample_positions(len(index), MAX_CHART_POINTS, keep)

    def num(x, d):
        x = float(x)
        return None if x != x else round(x, d)

    return [
        {
            "date": index[i].date().isoformat(),
            "values": {k: num(v.iloc[i], 4) for k, v in rebased.items()},
            "dd": {k: num(v.iloc[i], 6) for k, v in dds.items()},
            "eur": {k: num(v.iloc[i], 2) for k, v in totals.items()},
        }
        for i in positions
    ]


def _no_data(strats, availability, period, start, end, message, notices=None, common=None) -> dict:
    return {
        "status": "no_data",
        "message": message,
        "base_currency": BASE_CURRENCY,
        "period": "CUSTOM" if (start or end) else (period or "1Y"),
        "requested": {"start": start, "end": end},
        "common": {"start": common[0].date().isoformat(), "end": common[1].date().isoformat()} if common else None,
        "effective": None,
        "notices": notices or [],
        "fx": [],
        "assets": availability,
        "strategies": [{"id": s["id"], "name": s["name"]} for s in strats],
        "series": [],
    }
