"""
Motor de COSTES DE INTERMEDIACIÓN (funciones puras, sin red).

Trabaja con OPERACIONES FECHADAS: la compra inicial de cada activo y cada
aportación periódica ejecutada (Fase 5.1). Cada operación paga su comisión y,
si procede, su cambio de divisa. Ver Decisiones D42-D47 y D54-D57.

Qué modela:
- Comisión de compra/venta: fija, porcentual, mínimo, máximo, tope condicionado
  al importe, TRAMOS por importe, por mercado o por instrumento. Importes fijos
  en otra divisa se pasan a euros con el tipo de cambio del día.
- Franquicia de órdenes gratuitas al mes (p. ej. Revolut Premium: 5) y regla
  propia para compras periódicas (planes de inversión sin comisión).
- Cambio de divisa: % sobre lo convertido, solo si el activo no cotiza en euros
  y el intermediario lo publica; con franquicia mensual si la tarifa la tiene.
- Custodia con su regla real: por clase de valor y trimestre sin operaciones
  (ING), % sobre el valor medio por clase con mínimo y periodicidad (bancos),
  o % anual sobre el valor de la cartera (escenario personalizado).
- Mantenimiento: cuota anual prorrateada por trimestres.

Qué NO modela: TER (ya está en el precio), impuestos, cánones, spreads, slippage.

Cómo afectan al resultado:
- Comisión y divisa de cada compra se pagan con el dinero de esa compra: se
  invierte menos y esa diferencia no se revaloriza.
- Custodia y mantenimiento se restan del resultado final por su importe nominal.
- La venta final se calcula aparte: «coste estimado de salida».
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Mapping, Optional

import pandas as pd

EUROZONE_SUFFIXES = {".DE", ".F", ".PA", ".AS", ".MI", ".BR", ".LS", ".HE", ".VI", ".IR"}


# ---------------------------------------------------------------------------
# Datos de entrada
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Asset:
    ticker: str
    asset_type: str          # Stock, ETF, Index, Crypto, Future, Fund
    currency: str            # divisa principal (USD, EUR, GBP...)

    @property
    def market(self) -> str:
        return market_of(self.ticker, self.currency)


@dataclass(frozen=True)
class Trade:
    date: pd.Timestamp       # día de mercado
    ticker: str
    amount: float            # euros destinados a la compra
    kind: str = "initial"    # "initial" | "periodic"


def market_of(ticker: str, currency: str) -> str:
    """Mercado de cotización aproximado a partir del sufijo de Yahoo y la divisa."""
    t = ticker.upper()
    suffix = t[t.rfind("."):] if "." in t else ""
    if suffix == ".MC":
        return "ES"
    if suffix in EUROZONE_SUFFIXES:
        return "EUROZONE"
    if suffix == ".L":
        return "UK"
    if suffix == ".ST":
        return "SE"
    if not suffix and currency == "USD":
        return "US"
    return "OTHER"


def to_eur(amount: float, ccy: Optional[str], rates: Mapping[str, float]) -> float:
    """rates: unidades de cada divisa por 1 € (USD 1,10 => 1 € = 1,10 $)."""
    if ccy in (None, "", "EUR"):
        return amount
    rate = rates.get(ccy)
    if not rate or rate <= 0:
        raise ValueError(f"Falta el tipo de cambio EUR/{ccy}.")
    return amount / rate


# ---------------------------------------------------------------------------
# Reglas de comisión
# ---------------------------------------------------------------------------
def trade_fee(rule: Optional[Mapping], amount_eur: float, rates: Mapping[str, float]) -> float:
    """
    Comisión de una operación de `amount_eur` euros.
    - Con «tiers»: se elige el primer tramo cuyo «upto» (en tier_ccy, la divisa
      del UMBRAL) es ≥ importe; fee = fijo + tipo × importe, con «max» del tramo.
      Los importes fijos y máximos de los tramos están en fee_ccy (por defecto EUR):
      p. ej. Bankinter cobra 20 € aunque el umbral sea 40.000 $.
    - Sin tramos: fijo + tipo × importe; después mínimo, máximo y tope
      condicionado («no supera X si la operación es de menos de Y»).
    """
    if not rule or amount_eur <= 0:
        return 0.0
    if rule.get("tiers"):
        tccy = rule.get("tier_ccy", "EUR")
        fccy = rule.get("fee_ccy", "EUR")
        amount_local = amount_eur / to_eur(1.0, tccy, rates)
        for tier in rule["tiers"]:
            if tier.get("upto") is None or amount_local <= tier["upto"]:
                fee = to_eur(tier.get("fixed", 0.0), fccy, rates) + tier.get("rate", 0.0) * amount_eur
                if tier.get("max") is not None:
                    fee = min(fee, to_eur(tier["max"], fccy, rates))
                return fee
        return 0.0
    ccy = rule.get("fixed_ccy", "EUR")
    fee = to_eur(rule.get("fixed", 0.0), ccy, rates) + rule.get("rate", 0.0) * amount_eur
    if rule.get("min") is not None:
        fee = max(fee, to_eur(rule["min"], ccy, rates))
    if rule.get("max") is not None:
        fee = min(fee, to_eur(rule["max"], ccy, rates))
    if rule.get("cap") is not None:
        cap_ccy = rule.get("cap_ccy", ccy)
        amount_local = amount_eur / to_eur(1.0, cap_ccy, rates)
        below = rule.get("cap_if_amount_below")
        if below is None or amount_local < below:
            fee = min(fee, to_eur(rule["cap"], cap_ccy, rates))
    return fee


def trade_rule(schedule: Mapping, side: str, market: str, asset_type: str,
               periodic: bool = False) -> Optional[Mapping]:
    """
    Regla de comisión de una operación (None = el intermediario no la cubre).
    Orden: compra periódica con regla propia > regla por lado > flat >
    por instrumento > por mercado (mercado, INTERNATIONAL si no es España, OTHER).
    """
    trade = schedule.get("trade")
    if not trade:
        return None
    pb = trade.get("periodic_buy")
    if periodic and side == "buy" and pb and asset_type in pb.get("instruments", []):
        return pb["rule"]
    if side in trade:
        return trade[side]
    if side not in trade.get("applies_to", ["buy", "sell"]):
        return None
    if "flat" in trade:
        return trade["flat"]
    if "by_instrument" in trade:
        return trade["by_instrument"].get(asset_type)
    if "by_market" in trade:
        bm = trade["by_market"]
        if market in bm:
            return bm[market]
        if market != "ES" and "INTERNATIONAL" in bm:
            return bm["INTERNATIONAL"]
        return bm.get("OTHER")
    return None


def fx_fee(schedule: Mapping, side: str, amount_eur: float, currency: str) -> float:
    """Comisión de cambio de una operación aislada (sin franquicia mensual)."""
    fx = schedule.get("fx")
    if not fx or currency == "EUR" or amount_eur <= 0:
        return 0.0
    if side not in fx.get("applies_to", ["buy", "sell"]):
        return 0.0
    return fx["rate"] * amount_eur


def coverage(schedule: Optional[Mapping], asset: Asset) -> Optional[str]:
    """None si el intermediario cubre el activo; si no, el motivo."""
    if not schedule:
        return None
    instruments = schedule.get("instruments")
    if instruments and asset.asset_type not in instruments:
        return "tipo de activo no incluido en esta tarifa"
    if trade_rule(schedule, "buy", asset.market, asset.asset_type) is None:
        return "mercado no incluido en esta tarifa"
    return None


# ---------------------------------------------------------------------------
# Periodos naturales
# ---------------------------------------------------------------------------
def periods(start: date, end: date, months: int = 3) -> list[tuple[date, date, float]]:
    """
    Periodos naturales de `months` meses (3 = trimestres, 6 = semestres, 12 = años)
    que se solapan con [start, end). Devuelve (inicio, fin_exclusivo, fracción).
    Un año completo = 12/months fracciones de 1,0.
    """
    out = []
    first_month = months * ((start.month - 1) // months) + 1
    p_start = date(start.year, first_month, 1)
    while p_start < end:
        nm = p_start.month - 1 + months
        p_next = date(p_start.year + nm // 12, nm % 12 + 1, 1)
        o_start, o_end = max(start, p_start), min(end, p_next)
        if o_start < o_end:
            out.append((o_start, o_end, (o_end - o_start).days / (p_next - p_start).days))
        p_start = p_next
    return out


def quarters(start: date, end: date) -> list[tuple[date, date, float]]:
    return periods(start, end, 3)


def maintenance_cost(maintenance: Optional[Mapping], start: date, end: date) -> float:
    """Cuota anual fija, cobrada por trimestres y prorrateada por días."""
    if not maintenance or end <= start:
        return 0.0
    return sum(maintenance["amount_per_year"] / 4 * frac for _, _, frac in quarters(start, end))


# ---------------------------------------------------------------------------
# Custodia
# ---------------------------------------------------------------------------
def custody_cost(custody: Optional[Mapping], values: pd.DataFrame, assets: Mapping[str, Asset],
                 trade_dates: list[pd.Timestamp], end: date,
                 periodic_tickers: set[str] = frozenset()) -> tuple[float, list[str]]:
    """
    Custodia de las posiciones cubiertas.
    values: valor diario en euros de cada posición (columnas = tickers cubiertos).
    end: fin del periodo (exclusivo), normalmente el día siguiente al último cierre.
    Devuelve (coste, notas de aproximación).
    """
    if not custody or values.empty:
        return 0.0, []
    kind = custody["type"]
    start = values.index[0].date()
    held = values > 0
    notes: list[str] = []
    total = 0.0

    if kind == "per_position_quarterly_if_no_trade":
        tdates = sorted(d.date() for d in trade_dates)
        for q_from, q_to, frac in quarters(start, end):
            if any(q_from <= d < q_to for d in tdates):
                continue  # hubo operación en el trimestre natural
            in_q = held[(held.index >= pd.Timestamp(q_from)) & (held.index < pd.Timestamp(q_to))]
            n = int(in_q.any().sum()) if not in_q.empty else 0
            if n == 0:
                continue
            base = n * custody["amount"]
            if custody.get("max_per_account") is not None:
                base = min(base, custody["max_per_account"])
            total += base * frac * (1 + custody.get("vat", 0.0))
        return total, notes

    if kind == "percent_annual":
        portfolio = values.sum(axis=1)
        for _, q_to, frac in quarters(start, end):
            upto = portfolio[portfolio.index < pd.Timestamp(q_to)]
            value = float(upto.iloc[-1]) if not upto.empty else float(portfolio.iloc[0])
            total += custody["rate"] / 4 * value * frac
        return total, notes

    if kind == "percent_per_class":
        months = custody.get("period_months", 12)
        nominal = custody.get("basis") == "nominal_min_only"
        waive = set(custody.get("waive_min_if_periodic", []))
        held_since = {t: values.index[held[t].to_numpy().argmax()].date() for t in values.columns if held[t].any()}
        for p_from, p_to, _ in periods(start, end, months):
            p_days = (_next_period(p_from, months) - _period_start(p_from, months)).days
            window = values[(values.index >= pd.Timestamp(p_from)) & (values.index < pd.Timestamp(p_to))]
            for t in values.columns:
                col = window[t]
                col = col[col > 0]
                if col.empty:
                    continue
                first_held = max(held_since[t], p_from)
                held_frac = (p_to - first_held).days / p_days
                group = "domestic" if assets[t].market == "ES" else "international"
                minimum = custody["mins"][group] * held_frac
                if assets[t].asset_type in waive and t in periodic_tickers:
                    minimum = 0.0
                if nominal:
                    fee = minimum
                else:
                    fee = max(custody["rates"][group] * float(col.mean()) * held_frac, minimum)
                total += fee
        if nominal:
            notes.append("Custodia estimada solo con el mínimo por clase de valor: la tarifa se calcula sobre el "
                         "valor nominal, que no está disponible.")
        if custody.get("tariff_kind") == "maximum":
            notes.append("Custodia calculada con la tarifa MÁXIMA publicada: la aplicada a cada cliente puede ser menor.")
        return total, notes

    raise ValueError(f"Tipo de custodia desconocido: {kind}")


def _period_start(d: date, months: int) -> date:
    return date(d.year, months * ((d.month - 1) // months) + 1, 1)


def _next_period(d: date, months: int) -> date:
    s = _period_start(d, months)
    nm = s.month - 1 + months
    return date(s.year + nm // 12, nm % 12 + 1, 1)


# ---------------------------------------------------------------------------
# Simulación completa de una estrategia en un escenario
# ---------------------------------------------------------------------------
def rates_on(fx: Optional[pd.DataFrame], day: pd.Timestamp) -> dict[str, float]:
    """Tipos EUR/divisa del día (o del último día anterior disponible)."""
    if fx is None or fx.empty:
        return {}
    upto = fx[fx.index <= day]
    row = upto.iloc[-1] if not upto.empty else fx.iloc[0]
    return {c: float(v) for c, v in row.items() if v == v and v > 0}


def simulate_costs(
    assets: Mapping[str, Asset],
    prices: pd.DataFrame,
    trades: list[Trade],
    schedule: Optional[Mapping],
    fx: Optional[pd.DataFrame] = None,
) -> dict:
    """
    assets : metadatos por ticker.
    prices : precios diarios en EUR de la ventana (columnas = tickers).
    trades : compras iniciales y periódicas (fecha = día de mercado de la ventana).
    schedule: tarifa (None = sin costes de intermediación).
    fx     : tipos EUR/divisa por día (columnas = divisas), para importes fijos en otra divisa.
    """
    schedule = schedule or {}
    tickers = list(prices.columns)
    trades = sorted(trades, key=lambda t: (t.date, t.kind != "initial", t.ticker))
    uncovered = {t: r for t in tickers if (r := coverage(schedule or None, assets[t]))}
    covered = [t for t in tickers if t not in uncovered]
    trade_info = schedule.get("trade") or {}
    free_per_month = trade_info.get("free_per_month")
    fx_rule = schedule.get("fx")
    fx_free = (fx_rule or {}).get("free_per_month_eur")

    gross_units = pd.DataFrame(0.0, index=prices.index, columns=tickers)
    net_units = pd.DataFrame(0.0, index=prices.index, columns=tickers)
    pos = {t: {"ticker": t, "market": assets[t].market, "trades": 0, "buy": 0.0, "fx_buy": 0.0} for t in tickers}
    buy_initial = buy_periodic = fx_buy = 0.0
    n_initial = n_periodic = 0
    month_orders: dict[tuple[int, int], int] = {}
    month_fx: dict[tuple[int, int], float] = {}
    covered_trade_dates: list[pd.Timestamp] = []
    periodic_tickers: set[str] = set()

    for tr in trades:
        price = prices.loc[tr.date, tr.ticker]
        a = assets[tr.ticker]
        fee = fx_cost = 0.0
        if tr.kind == "periodic":
            n_periodic += 1
            periodic_tickers.add(tr.ticker)
        else:
            n_initial += 1
        if schedule and tr.ticker in covered:
            covered_trade_dates.append(tr.date)
            rates = rates_on(fx, tr.date)
            periodic = tr.kind == "periodic"
            rule = trade_rule(schedule, "buy", a.market, a.asset_type, periodic)
            plan_rule = periodic and rule is (trade_info.get("periodic_buy") or {}).get("rule")
            fee = trade_fee(rule, tr.amount, rates)
            key = (tr.date.year, tr.date.month)
            if free_per_month is not None and not plan_rule:
                used = month_orders.get(key, 0)
                if used < free_per_month:
                    fee = 0.0
                month_orders[key] = used + 1
            if fx_rule and a.currency != "EUR" and "buy" in fx_rule.get("applies_to", ["buy", "sell"]):
                if fx_free is not None:
                    before = month_fx.get(key, 0.0)
                    after = before + tr.amount
                    month_fx[key] = after
                    fx_cost = fx_rule["rate"] * max(0.0, after - max(before, fx_free))
                else:
                    fx_cost = fx_rule["rate"] * tr.amount
        if tr.kind == "periodic":
            buy_periodic += fee
        else:
            buy_initial += fee
        fx_buy += fx_cost
        p = pos[tr.ticker]
        p["trades"] += 1
        p["buy"] += fee
        p["fx_buy"] += fx_cost
        gross_units.loc[tr.date, tr.ticker] += tr.amount / price
        net_units.loc[tr.date, tr.ticker] += (tr.amount - fee - fx_cost) / price

    gross_values = gross_units.cumsum() * prices
    net_values = net_units.cumsum() * prices
    end = (prices.index[-1] + pd.Timedelta(days=1)).date()

    custody, notes = (0.0, [])
    if schedule and covered:
        custody, notes = custody_cost(schedule.get("custody"), net_values[covered], assets,
                                      covered_trade_dates, end, periodic_tickers)
    maintenance = maintenance_cost(schedule.get("maintenance"), prices.index[0].date(), end) if schedule else 0.0

    gross_final = float(gross_values.iloc[-1].sum())
    final_positions = net_values.iloc[-1]
    net_final = float(final_positions.sum()) - custody - maintenance

    # Salida estimada: venta de todas las posiciones el último día.
    last = prices.index[-1]
    rates_end = rates_on(fx, last)
    sell = fx_sell = 0.0
    exit_fx_base = 0.0
    for t in tickers:
        s = fx_s = 0.0
        if schedule and t in covered:
            value = float(final_positions[t])
            s = trade_fee(trade_rule(schedule, "sell", assets[t].market, assets[t].asset_type), value, rates_end)
            if fx_rule and assets[t].currency != "EUR" and "sell" in fx_rule.get("applies_to", ["buy", "sell"]):
                exit_fx_base += value
                fx_s = fx_rule["rate"] * value
        sell += s
        fx_sell += fx_s
        pos[t].update({"sell": s, "fx_sell": fx_s})
    if fx_free is not None and exit_fx_base > 0:
        # La franquicia mensual también reduce el cambio de la venta final.
        factor = max(0.0, exit_fx_base - fx_free) / exit_fx_base
        fx_sell *= factor
        for t in tickers:
            pos[t]["fx_sell"] *= factor

    contributed = sum(tr.amount for tr in trades)
    capital = sum(tr.amount for tr in trades if tr.kind == "initial")
    buy = buy_initial + buy_periodic
    during = buy + fx_buy + custody + maintenance
    exit_total = sell + fx_sell
    return {
        "complete": not uncovered,
        "uncovered": [{"ticker": t, "reason": r} for t, r in uncovered.items()],
        "capital": capital,
        "contributed": contributed,
        "gross_final": gross_final,
        "trades": {"initial": n_initial, "periodic": n_periodic},
        "during": {"buy": buy, "buy_initial": buy_initial, "buy_periodic": buy_periodic,
                   "fx": fx_buy, "custody": custody, "maintenance": maintenance, "total": during},
        "net_final": net_final,
        "impact": gross_final - net_final,
        "exit": {"sell": sell, "fx": fx_sell, "total": exit_total},
        "net_after_exit": net_final - exit_total,
        "positions": [pos[t] for t in tickers],
        "notes": notes,
    }


def initial_trades(prices: pd.DataFrame, weights: Mapping[str, float], capital: float) -> list[Trade]:
    """Compra inicial de cada activo el primer día (capital × peso)."""
    if capital <= 0:
        return []
    d0 = prices.index[0]
    return [Trade(d0, t, capital * w, "initial") for t, w in weights.items()]
