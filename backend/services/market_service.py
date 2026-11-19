"""
Lógica de negocio de Explore Markets.

- No importa yfinance: obtiene los datos a través de services.data_provider.
- Los cálculos financieros se delegan en analytics.metrics (funciones puras).
- Tipos soportados: acciones, ETFs, índices, criptomonedas, futuros y fondos.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Optional

import pandas as pd

from analytics import metrics
from services import data_provider as provider
from services.errors import (
    InvalidDateRange,
    InvalidPeriod,
    InvalidTickerFormat,
    TickerNotFound,
    UnsupportedAssetType,
)

# ---------------------------------------------------------------------------
# Clasificación de activos
# ---------------------------------------------------------------------------
# quoteType de Yahoo -> tipo interno
SUPPORTED_TYPES = {
    "EQUITY": "Stock",
    "ETF": "ETF",
    "INDEX": "Index",
    "CRYPTOCURRENCY": "Crypto",
    "FUTURE": "Future",
    "MUTUALFUND": "Fund",
}

# Tipos que Yahoo conoce pero que la aplicación NO soporta (mensajes claros).
UNSUPPORTED_LABELS = {
    "CURRENCY": "un tipo de cambio entre divisas",
    "OPTION": "una opción",
    "MONEYMARKET": "un fondo monetario",
}

# Vehículos de inversión colectiva: son los únicos con TER propio.
TER_TYPES = {"ETF", "Fund"}

# Por qué el TER no aplica a cada tipo (se muestra al usuario).
TER_NOT_APPLICABLE_REASON = {
    "Stock": "Una acción no es un fondo: no tiene comisión de gestión. Los costes dependen del intermediario.",
    "Index": "Un índice no se puede comprar directamente; se invierte en él a través de fondos o ETFs, que sí tienen TER.",
    "Crypto": "Una criptomoneda no es un fondo. Los costes los fija la plataforma (comisiones, diferencial).",
    "Future": "Un futuro es un contrato derivado, no un fondo. Sus costes son comisiones y garantías del intermediario.",
}

# Advertencias metodológicas por tipo de activo (se muestran junto a las métricas).
TYPE_NOTES = {
    "Index": "Los índices de Yahoo suelen ser índices de precios: no incluyen dividendos, por lo que la rentabilidad total puede infravalorar lo obtenido invirtiendo en un fondo que lo replique. Un índice no se puede comprar directamente.",
    "Crypto": "Las criptomonedas cotizan todos los días del año; la volatilidad se anualiza con 365 días en lugar de 252 sesiones.",
    "Future": "Serie continua de Yahoo construida con el contrato más próximo a vencimiento. Los cambios de contrato pueden provocar saltos y la rentabilidad no equivale a la de una inversión real en futuros (no incluye garantías ni intereses).",
    "Fund": "Para fondos no cotizados, el precio es el valor liquidativo diario publicado por la gestora.",
}

# Letras, números y los símbolos que usa Yahoo (. - = ^). Máx. 20 caracteres.
_TICKER_RE = re.compile(r"^[A-Z0-9^][A-Z0-9.\-=^]{0,19}$")


def normalize_ticker(ticker: str) -> str:
    sym = (ticker or "").strip().upper()
    if not _TICKER_RE.match(sym):
        raise InvalidTickerFormat(f"«{ticker}» no tiene un formato de ticker válido.")
    return sym


def classify_quote_type(quote_type: Optional[str]) -> Optional[str]:
    """Devuelve el tipo interno o None si el tipo no está soportado."""
    return SUPPORTED_TYPES.get(str(quote_type or "").upper())


def _supported_info(sym: str) -> tuple[dict, str]:
    """Obtiene los metadatos y comprueba que el ticker existe y está soportado."""
    info = provider.fetch_info(sym)
    quote_type = str(info.get("quoteType") or "").upper()
    if not quote_type or quote_type == "NONE":
        raise TickerNotFound(f"No se ha encontrado ningún activo con el ticker «{sym}».")
    asset_type = classify_quote_type(quote_type)
    if asset_type is None:
        what = UNSUPPORTED_LABELS.get(quote_type, f"un activo de tipo {quote_type}")
        raise UnsupportedAssetType(
            f"«{sym}» es {what}. La aplicación analiza acciones, ETFs, índices, "
            "criptomonedas, futuros y fondos."
        )
    return info, asset_type


# ---------------------------------------------------------------------------
# Búsqueda
# ---------------------------------------------------------------------------
SEARCH_FETCH = 15  # se piden más de los que se muestran porque luego se filtran
SEARCH_LIMIT = 10


def search_assets(query: str) -> list[dict]:
    """Busca por ticker o nombre y devuelve solo tipos soportados."""
    q = (query or "").strip()
    if not q:
        return []

    output: list[dict] = []
    seen: set[str] = set()
    for item in provider.search(q, SEARCH_FETCH):
        symbol = item.get("symbol")
        asset_type = classify_quote_type(item.get("quoteType"))
        if not symbol or asset_type is None or symbol in seen:
            continue
        seen.add(symbol)
        output.append(
            {
                "ticker": symbol,
                "name": item.get("longname") or item.get("shortname") or symbol,
                "type": asset_type,
                # Yahoo no devuelve la divisa en la búsqueda; sí el mercado.
                "exchange": item.get("exchDisp") or item.get("exchange") or "",
            }
        )
        if len(output) >= SEARCH_LIMIT:
            break
    return output


# ---------------------------------------------------------------------------
# Ficha del activo
# ---------------------------------------------------------------------------
def get_quote(ticker: str) -> dict:
    sym = normalize_ticker(ticker)
    info, asset_type = _supported_info(sym)

    price = provider.fetch_last_price(sym)
    if price is None:
        raw = info.get("regularMarketPrice") or info.get("previousClose")
        price = float(raw) if raw is not None and pd.notna(raw) else None

    return {
        "ticker": sym,
        "name": info.get("longName") or info.get("shortName") or sym,
        "type": asset_type,
        "currency": info.get("currency") or "",
        "price": round(price, 4) if price is not None else None,
        "exchange": info.get("fullExchangeName") or info.get("exchange") or "",
        "type_note": TYPE_NOTES.get(asset_type),
    }


# ---------------------------------------------------------------------------
# TER / expense ratio
# ---------------------------------------------------------------------------
# Rango de plausibilidad: un valor fuera de (0 %, 5 %] se descarta como dato
# sospechoso y se muestra "No disponible" (decisión D9, pendiente de validación).
TER_MIN_EXCLUSIVE = 0.0
TER_MAX = 0.05

_FUND_OPS_ROWS = ("Annual Report Expense Ratio", "Net Expense Ratio", "Total Expense Ratio")


def _ter_from_fund_operations(sym: str) -> Optional[float]:
    """
    fund_operations expresa el ratio como FRACCIÓN (VOO: 0.0003 = 0,03 %).
    Se lee la columna del propio fondo, nunca 'Category Average'.
    """
    ops = provider.fetch_fund_operations(sym)
    if ops is None:
        return None
    if sym in ops.columns:
        col = sym
    else:
        candidates = [c for c in ops.columns if "average" not in str(c).lower()]
        if not candidates:
            return None
        col = candidates[0]
    for row in _FUND_OPS_ROWS:
        if row in ops.index:
            val = ops.loc[row, col]
            if pd.notna(val):
                return float(val)
    return None


def _ter_from_info(info: dict) -> Optional[float]:
    """
    info['netExpenseRatio'] viene en PUNTOS PORCENTUALES (VOO: 0.03 = 0,03 %),
    por lo que se divide entre 100. Comprobado comparándolo con fund_operations.
    """
    val = info.get("netExpenseRatio")
    if val is None or not pd.notna(val):
        return None
    return float(val) / 100


def _plausible_ter(value: Optional[float]) -> bool:
    return value is not None and TER_MIN_EXCLUSIVE < value <= TER_MAX


def get_ter(ticker: str) -> dict:
    """
    Reglas:
      - Acción, índice, cripto, futuro -> no aplica (con explicación)
      - ETF o fondo con dato             -> valor real (fracción) y fuente
      - ETF o fondo sin dato             -> no disponible
    Nunca se inventa ni se estima un TER.
    """
    sym = normalize_ticker(ticker)
    info, asset_type = _supported_info(sym)

    if asset_type not in TER_TYPES:
        return {
            "applicable": False,
            "status": "not_applicable",
            "value": None,
            "source": None,
            "reason": TER_NOT_APPLICABLE_REASON.get(asset_type),
        }

    for source, getter in (
        ("yahoo_fund_operations", lambda: _ter_from_fund_operations(sym)),
        ("yahoo_net_expense_ratio", lambda: _ter_from_info(info)),
    ):
        value = getter()
        if _plausible_ter(value):
            return {
                "applicable": True,
                "status": "available",
                "value": round(value, 6),
                "source": source,
                "reason": None,
            }

    return {
        "applicable": True,
        "status": "not_available",
        "value": None,
        "source": None,
        "reason": "La fuente de datos no publica el TER de este fondo. No lo estimamos.",
    }


# ---------------------------------------------------------------------------
# Rendimiento histórico (datos diarios)
# ---------------------------------------------------------------------------
PRESETS = {
    "1M": pd.DateOffset(months=1),
    "6M": pd.DateOffset(months=6),
    "YTD": None,  # desde el 1 de enero del año del último dato
    "1Y": pd.DateOffset(years=1),
    "3Y": pd.DateOffset(years=3),
    "5Y": pd.DateOffset(years=5),
    "10Y": pd.DateOffset(years=10),
    "MAX": None,
}

MIN_OBSERVATIONS = 2           # para rentabilidad y drawdown
MIN_RETURNS_FOR_VOLATILITY = 20  # ~1 mes de sesiones (decisión pendiente de validación)
MAX_CHART_POINTS = 800         # solo afecta al dibujo; los cálculos usan todos los cierres


def _daily_frame(sym: str) -> pd.DataFrame:
    """
    Devuelve un DataFrame diario con columnas 'adj' y 'close', indexado por la
    FECHA LOCAL del mercado (sin hora ni zona), sin NaN, sin duplicados y solo
    con precios positivos. No se añaden ni se interpolan observaciones.
    """
    raw = provider.fetch_daily_history(sym)
    if raw is None or raw.empty or "Close" not in raw:
        return pd.DataFrame(columns=["adj", "close"])

    adj = raw["Adj Close"] if "Adj Close" in raw else raw["Close"]
    df = pd.DataFrame({"adj": adj, "close": raw["Close"]})

    idx = pd.DatetimeIndex(df.index)
    if idx.tz is not None:
        idx = idx.tz_localize(None)  # conserva la fecha local del mercado
    df.index = idx.normalize()

    df = df.dropna(subset=["adj"])
    df = df[df["adj"] > 0]
    df = df[~df.index.duplicated(keep="last")].sort_index()
    return df


def _parse_date(value: str, label: str) -> pd.Timestamp:
    try:
        return pd.Timestamp(datetime.strptime(value.strip(), "%Y-%m-%d").date())
    except (ValueError, AttributeError):
        raise InvalidDateRange(f"La fecha {label} «{value}» no es válida. Usa el formato AAAA-MM-DD.")


def _fmt(d: pd.Timestamp) -> str:
    return d.strftime("%d/%m/%Y")


def _resolve_window(
    period: Optional[str], start: Optional[str], end: Optional[str],
    first: pd.Timestamp, last: pd.Timestamp,
) -> tuple[str, pd.Timestamp, pd.Timestamp, list[dict]]:
    """Calcula la ventana solicitada [inicio, fin] y los avisos asociados."""
    notices: list[dict] = []
    today = pd.Timestamp(date.today())

    if start or end:
        if not (start and end):
            raise InvalidDateRange("Indica una fecha inicial y una fecha final.")
        s, e = _parse_date(start, "inicial"), _parse_date(end, "final")
        if s >= e:
            raise InvalidDateRange("La fecha inicial debe ser anterior a la fecha final.")
        if s > today:
            raise InvalidDateRange("La fecha inicial no puede estar en el futuro.")
        if e > today:
            notices.append({"code": "end_in_future",
                            "message": f"La fecha final es futura; el análisis llega hasta hoy ({_fmt(today)})."})
            e = today
        return "CUSTOM", s, e, notices

    key = (period or "1Y").upper()
    if key not in PRESETS:
        raise InvalidPeriod(f"Periodo «{period}» no válido. Opciones: {', '.join(PRESETS)}.")
    if key == "MAX":
        return key, first, last, notices
    if key == "YTD":
        return key, pd.Timestamp(year=last.year, month=1, day=1), last, notices
    return key, last - PRESETS[key], last, notices


def _downsample_positions(n: int, max_points: int, keep: set[int]) -> list[int]:
    if n <= max_points:
        return list(range(n))
    step = -(-n // max_points)  # división redondeando hacia arriba
    pos = set(range(0, n, step)) | {n - 1} | {k for k in keep if 0 <= k < n}
    return sorted(pos)


def _round(value: Optional[float], nd: int = 6) -> Optional[float]:
    return round(value, nd) if value is not None else None


def get_performance(
    ticker: str,
    period: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
) -> dict:
    """
    Rendimiento histórico de un activo en un periodo predefinido o entre dos fechas.

    Metodología (ver Decisiones D18-D21):
    - Serie: cierre AJUSTADO diario (dividendos reinvertidos y splits).
    - Primer día del análisis: primer cierre disponible en o después de la fecha
      inicial. Último día: último cierre disponible en o antes de la fecha final.
    - No se crean observaciones en fines de semana o festivos.
    """
    sym = normalize_ticker(ticker)
    _, asset_type = _supported_info(sym)
    df = _daily_frame(sym)

    if df.empty:
        # Validar igualmente los parámetros para dar el error correcto.
        _resolve_window(period, start, end, pd.Timestamp(date.today()), pd.Timestamp(date.today()))
        return _empty_result(sym, asset_type, period, start, end,
                             "Yahoo Finance no tiene histórico diario para este activo.")

    first, last = df.index[0], df.index[-1]
    key, req_start, req_end, notices = _resolve_window(period, start, end, first, last)

    window = df[(df.index >= req_start) & (df.index <= req_end)]

    if req_start < first and key != "MAX" and not window.empty:
        notices.append({"code": "history_starts_later",
                        "message": f"Solo hay datos desde el {_fmt(first)}: el análisis empieza ese día y abarca menos tiempo del solicitado."})

    if window.empty:
        if req_end < first:
            msg = f"No hay datos en este periodo: el histórico disponible empieza el {_fmt(first)}."
        else:
            msg = "No hubo ninguna sesión con cotización en este periodo (fin de semana, festivos o mercado cerrado)."
        return _empty_result(sym, asset_type, key, start, end, msg, first, last, notices)

    if key == "CUSTOM":
        if window.index[0] > req_start >= first:
            notices.append({"code": "start_adjusted",
                            "message": f"El {_fmt(req_start)} no hubo cotización (fin de semana, festivo o mercado cerrado). Se usa el primer cierre disponible: {_fmt(window.index[0])}."})
        if window.index[-1] < req_end:
            notices.append({"code": "end_adjusted",
                            "message": f"Último cierre disponible en el periodo: {_fmt(window.index[-1])}."})

    n = len(window)
    adj, close = window["adj"], window["close"]
    periods_per_year = 365 if asset_type == "Crypto" else metrics.TRADING_DAYS_PER_YEAR
    years = metrics.years_between(window.index[0], window.index[-1])

    if n < MIN_OBSERVATIONS:
        result = _empty_result(sym, asset_type, key, start, end,
                               f"Solo hay {n} cierre en este periodo; se necesitan al menos {MIN_OBSERVATIONS} para calcular rentabilidades.",
                               first, last, notices)
        result["series"] = [_point(window.index[0], adj.iloc[0], close.iloc[0], 0.0)]
        return result

    total = metrics.total_return(adj)
    price_only = metrics.total_return(close.dropna()) if close.notna().sum() >= 2 else None
    cagr = metrics.cagr(adj)
    vol = metrics.annualized_volatility(adj, periods_per_year, MIN_RETURNS_FOR_VOLATILITY)
    mdd = metrics.max_drawdown(adj)
    dd = metrics.drawdown_series(adj)

    days = (window.index[-1] - window.index[0]).days
    cagr_reason = None if cagr is not None else (
        f"El periodo analizado dura {days} días. La rentabilidad anualizada solo se calcula "
        "para periodos de al menos 1 año: anualizar periodos cortos da cifras engañosas."
    )
    vol_reason = None if vol is not None else (
        f"Hay {n - 1} rentabilidades diarias; se necesitan al menos {MIN_RETURNS_FOR_VOLATILITY} para estimar la volatilidad."
    )
    # Sharpe (rf = 0 %): mismas rentabilidades diarias que la volatilidad. En futuros no
    # tiene sentido: su precio no es el capital invertido (se opera con garantías).
    if asset_type == "Future":
        sharpe, sharpe_reason = None, ("No aplica a futuros: su precio no es el capital que se invierte "
                                       "(se opera con garantías), así que rentabilidad/riesgo no es comparable.")
    else:
        sharpe = metrics.sharpe_ratio(adj, periods_per_year, MIN_RETURNS_FOR_VOLATILITY)
        sharpe_reason = None if sharpe is not None else (
            vol_reason or "La volatilidad del periodo es 0: el ratio de Sharpe no está definido.")

    keep = set()
    if mdd and mdd["peak_date"] is not None:
        keep = {window.index.get_loc(mdd["peak_date"]), window.index.get_loc(mdd["trough_date"])}
    positions = _downsample_positions(n, MAX_CHART_POINTS, keep)

    return {
        "ticker": sym,
        "asset_type": asset_type,
        "status": "ok",
        "message": None,
        "period": key,
        "requested": {"start": req_start.date().isoformat(), "end": req_end.date().isoformat()},
        "available": {"start": first.date().isoformat(), "end": last.date().isoformat()},
        "start": {"date": window.index[0].date().isoformat(),
                  "close": _round(_num(close.iloc[0]), 4), "adj": _round(float(adj.iloc[0]), 4)},
        "end": {"date": window.index[-1].date().isoformat(),
                "close": _round(_num(close.iloc[-1]), 4), "adj": _round(float(adj.iloc[-1]), 4)},
        "observations": n,
        "years": round(years, 4),
        "price_basis": "adjusted_close",
        "metrics": {
            "total_return": _round(total),
            "price_return": _round(price_only),
            "cagr": _round(cagr),
            "cagr_reason": cagr_reason,
            "volatility": _round(vol),
            "volatility_reason": vol_reason,
            "sharpe": None if sharpe is None else round(sharpe, 4),
            "sharpe_reason": sharpe_reason,
            "sharpe_risk_free": metrics.SHARPE_RISK_FREE_RATE,
            "periods_per_year": periods_per_year,
            "max_drawdown": None if mdd is None else {
                "value": _round(mdd["value"]),
                "peak_date": mdd["peak_date"].date().isoformat() if mdd["peak_date"] is not None else None,
                "trough_date": mdd["trough_date"].date().isoformat() if mdd["trough_date"] is not None else None,
            },
        },
        "notices": notices,
        "type_note": TYPE_NOTES.get(asset_type),
        "series": [_point(window.index[i], adj.iloc[i], close.iloc[i], dd.iloc[i]) for i in positions],
    }


def _num(v) -> Optional[float]:
    return float(v) if v is not None and pd.notna(v) else None


def _point(ts: pd.Timestamp, adj, close, dd) -> dict:
    return {
        "date": ts.date().isoformat(),
        "adj": round(float(adj), 4),
        "close": _round(_num(close), 4),
        "dd": round(float(dd), 6),
    }


def _empty_result(sym, asset_type, period, start, end, message,
                  first=None, last=None, notices=None) -> dict:
    return {
        "ticker": sym,
        "asset_type": asset_type,
        "status": "no_data",
        "message": message,
        "period": (period or "CUSTOM") if not (start or end) else "CUSTOM",
        "requested": {"start": start, "end": end},
        "available": {"start": first.date().isoformat() if first is not None else None,
                      "end": last.date().isoformat() if last is not None else None},
        "start": None,
        "end": None,
        "observations": 0,
        "years": None,
        "price_basis": "adjusted_close",
        "metrics": None,
        "notices": notices or [],
        "type_note": TYPE_NOTES.get(asset_type),
        "series": [],
    }
