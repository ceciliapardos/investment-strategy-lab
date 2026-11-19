"""
Backtest de carteras: funciones PURAS (sin red), probadas con series sintéticas
en tests/test_portfolio.py.

Metodología (ver Decisiones D34-D38):

1. Conversión a la divisa base (EUR):
       precio_EUR(t) = precio_local(t) × factor / tipo_EUR→local(t)
   donde tipo_EUR→local es cuántas unidades de la divisa local vale 1 € (Yahoo
   "EURUSD=X" = USD por 1 EUR) y factor corrige cotizaciones en céntimos
   (p. ej. peniques: 0,01).

2. Alineación de fechas: INTERSECCIÓN. Solo se usan los días en los que TODOS
   los activos (y los tipos de cambio necesarios) tienen cierre. No se rellena
   ni se interpola ningún precio. La variación entre dos días comunes recoge
   todo lo ocurrido entre ellos, así que la rentabilidad total no se altera.

3. Compra y mantenimiento (buy & hold), sin rebalanceo:
       participaciones_i = capital × peso_i / precio_i(t0)
       valor(t)          = Σ participaciones_i × precio_i(t)
   Los pesos evolucionan con el mercado. No hay costes ni impuestos.

4. Las métricas de la cartera se calculan con las MISMAS funciones que Explore
   Markets (analytics/metrics.py). Con aportaciones periódicas se aplican sobre
   el índice de rentabilidad ponderada por el tiempo (twr_index), nunca sobre
   el valor en euros, para no confundir dinero aportado con rentabilidad.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date
from typing import Mapping, Optional

import pandas as pd

WEIGHT_TOLERANCE = 1e-9


def to_base_currency(local_prices: pd.Series, fx: Optional[pd.Series] = None, factor: float = 1.0) -> pd.Series:
    """
    Convierte precios en divisa local a la divisa base.
    fx: unidades de divisa local por 1 unidad de divisa base (None = misma divisa).
    Solo se conservan las fechas presentes en ambas series (sin rellenar).
    """
    prices = pd.Series(local_prices, dtype="float64") * factor
    if fx is None:
        return prices.dropna()
    joined = pd.concat({"p": prices, "fx": pd.Series(fx, dtype="float64")}, axis=1, join="inner").dropna()
    joined = joined[joined["fx"] > 0]
    return joined["p"] / joined["fx"]


def align_prices(prices: Mapping[str, pd.Series]) -> pd.DataFrame:
    """
    Une varias series de precios por fecha quedándose solo con los días comunes
    a todas (inner join) y sin NaN. Nunca rellena valores ausentes.
    """
    if not prices:
        return pd.DataFrame()
    df = pd.concat({k: pd.Series(v, dtype="float64") for k, v in prices.items()}, axis=1, join="inner")
    df = df.dropna(how="any").sort_index()
    return df[(df > 0).all(axis=1)]


def normalize_weights(weights_pct: Mapping[str, float]) -> dict[str, float]:
    """Pesos en % (que deben sumar 100) -> fracciones. Lanza ValueError si no son válidos."""
    if not weights_pct:
        raise ValueError("La estrategia no tiene activos.")
    for k, w in weights_pct.items():
        if w is None or not w > 0:
            raise ValueError(f"El peso de {k} debe ser mayor que 0.")
    total_hundredths = sum(round(w * 100) for w in weights_pct.values())
    if total_hundredths != 10000:
        raise ValueError(f"Los pesos suman {total_hundredths / 100:g} % y deben sumar 100 %.")
    return {k: w / 100 for k, w in weights_pct.items()}


def buy_and_hold(prices: pd.DataFrame, weights: Mapping[str, float], capital: float) -> pd.DataFrame:
    """
    Simula una cartera de compra y mantenimiento.

    prices : DataFrame alineado (columnas = activos), ya en la divisa base.
    weights: fracciones que suman 1 (ver normalize_weights).
    capital: capital inicial (> 0).

    Devuelve un DataFrame con el valor de cada posición y la columna "__total__".
    """
    if capital is None or not capital > 0:
        raise ValueError("El capital inicial debe ser mayor que 0.")
    if abs(sum(weights.values()) - 1) > WEIGHT_TOLERANCE:
        raise ValueError("Los pesos deben sumar 1.")
    if prices.empty:
        raise ValueError("No hay precios en el periodo.")
    missing = [k for k in weights if k not in prices.columns]
    if missing:
        raise ValueError(f"Faltan precios de: {', '.join(missing)}.")

    p = prices[list(weights)]
    first = p.iloc[0]
    units = {k: capital * w / first[k] for k, w in weights.items()}
    values = p.mul(pd.Series(units))
    values["__total__"] = values.sum(axis=1)
    return values


def final_weights(values: pd.DataFrame) -> dict[str, float]:
    """Peso de cada posición al final del periodo (fracciones que suman 1)."""
    last = values.iloc[-1]
    total = last["__total__"]
    return {k: float(last[k] / total) for k in values.columns if k != "__total__"}


def asset_returns(prices: pd.DataFrame) -> dict[str, float]:
    """Rentabilidad de cada activo entre el primer y el último día del DataFrame."""
    return {k: float(prices[k].iloc[-1] / prices[k].iloc[0] - 1) for k in prices.columns}


def rebase(series: pd.Series, base: float = 100.0) -> pd.Series:
    """Índice base 100: cuánto valdrían 100 € invertidos al inicio."""
    return series / series.iloc[0] * base


# ---------------------------------------------------------------------------
# Aportaciones periódicas (Fase 5.1, Decisiones D50-D53)
# ---------------------------------------------------------------------------
FREQUENCY_MONTHS = {"monthly": 1, "quarterly": 3, "annual": 12}


@dataclass(frozen=True)
class Flow:
    """Una compra con dinero nuevo: aportación periódica ejecutada."""
    date: pd.Timestamp        # día de mercado en que se ejecuta
    scheduled: date           # fecha teórica de la aportación
    ticker: str
    amount: float             # euros aportados


def add_months(d: date, months: int) -> date:
    """Misma fecha `months` meses después; si el día no existe, último día del mes (31-ene + 1 = 28/29-feb)."""
    m = d.month - 1 + months
    y, m = d.year + m // 12, m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def contribution_flows(index: pd.DatetimeIndex, contributions: list[Mapping]) -> list[Flow]:
    """
    Calendario de aportaciones dentro de la ventana `index` (días de mercado comunes).
    - La primera aportación es un periodo después del primer día (el capital
      inicial se invierte el día 0).
    - Fechas teóricas: misma fecha cada 1, 3 o 12 meses desde el inicio.
    - Si la fecha teórica no es día de mercado común, se usa el PRIMER día
      común posterior. Si ya no hay ninguno dentro de la ventana, no se ejecuta.
    - Nunca se inventan precios: solo se compra en días con cierre real.
    """
    if len(index) == 0:
        return []
    start, last = index[0].date(), index[-1]
    flows: list[Flow] = []
    for c in contributions:
        step = FREQUENCY_MONTHS[c["frequency"]]
        k = 1
        while True:
            sched = add_months(start, step * k)
            pos = index.searchsorted(pd.Timestamp(sched))
            if pos >= len(index) or pd.Timestamp(sched) > last:
                break
            flows.append(Flow(index[pos], sched, c["ticker"], float(c["amount"])))
            k += 1
    return sorted(flows, key=lambda f: (f.date, f.ticker))


def simulate(prices: pd.DataFrame, weights: Mapping[str, float], capital: float,
             flows: list[Flow] = ()) -> pd.DataFrame:
    """
    Compra y mantenimiento con aportaciones.

    - Día 0: participaciones_i = capital × peso_i / precio_i(t0) (si capital > 0).
    - Cada aportación compra SOLO su activo: participaciones += importe / precio(día).
      No se redistribuye según los pesos iniciales; los pesos evolucionan.
    - Participaciones teóricas fraccionarias (no se redondea a títulos enteros).

    Devuelve el valor de cada posición, "__total__" (valor de la cartera tras la
    aportación del día) y "__flow__" (dinero nuevo aportado ese día).
    """
    if capital is None or capital < 0:
        raise ValueError("El capital inicial no puede ser negativo.")
    if capital == 0 and not flows:
        raise ValueError("Sin capital inicial ni aportaciones no hay nada que simular.")
    if prices.empty:
        raise ValueError("No hay precios en el periodo.")
    tickers = list(weights)
    p = prices[tickers]
    units = pd.DataFrame(0.0, index=p.index, columns=tickers)
    if capital > 0:
        units.iloc[0] = [capital * weights[t] / p.iloc[0][t] for t in tickers]
    flow_cash = pd.Series(0.0, index=p.index)
    for f in flows:
        units.loc[f.date, f.ticker] += f.amount / p.loc[f.date, f.ticker]
        flow_cash.loc[f.date] += f.amount
    units = units.cumsum()
    values = units * p
    values["__total__"] = values.sum(axis=1)
    values["__flow__"] = flow_cash
    return values


def twr_index(total: pd.Series, flows: pd.Series, base: float = 100.0) -> pd.Series:
    """
    Rentabilidad ponderada por el tiempo (cartera unitizada), en base 100.

    Cada día: r_t = (V_t − aportación_t) / V_{t−1} − 1. Así una aportación
    aumenta el valor pero NO cuenta como rentabilidad. Sin aportaciones coincide
    exactamente con valor(t) / valor(0).

    Antes del primer día con valor > 0 (estrategia sin capital inicial) el
    índice es NaN: todavía no hay nada invertido.
    """
    v = total.astype("float64")
    f = flows.reindex(v.index).fillna(0.0)
    prev = v.shift(1)
    growth = (v - f) / prev
    started = v > 0
    first = started.idxmax() if started.any() else None
    out = pd.Series(float("nan"), index=v.index)
    if first is None:
        return out
    g = growth[v.index > first].where(prev[v.index > first] > 0, 1.0)
    out.loc[first] = base
    out.loc[v.index > first] = base * g.cumprod()
    return out


def money_summary(values: pd.DataFrame, capital: float) -> dict:
    """Capital inicial, aportaciones, total aportado, valor final y ganancia en euros."""
    contributed = float(values["__flow__"].sum())
    total_in = capital + contributed
    final = float(values["__total__"].iloc[-1])
    return {
        "initial_capital": capital,
        "contributions": contributed,
        "total_contributed": total_in,
        "final_value": final,
        "gain": final - total_in,
        "n_contributions": int((values["__flow__"] > 0).sum()),
    }
