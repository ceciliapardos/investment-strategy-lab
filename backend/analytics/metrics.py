"""
Métricas financieras básicas sobre una serie de precios.

Todas las funciones son PURAS: reciben una pd.Series de precios indexada por
fecha y devuelven un número (o None). No acceden a Yahoo ni a ningún servicio,
por lo que se prueban con series sintéticas de resultado conocido
(tests/test_metrics.py).

Convenciones (pendientes de validación por el equipo):
- Los resultados se expresan como FRACCIÓN (0.10 = 10 %). El formateo a % se
  hace en la interfaz.
- Valores ausentes (NaN) se eliminan; no se rellenan ni se interpolan.
- Precios <= 0 se consideran datos inválidos y provocan ValueError.
- La serie se ordena por fecha antes de calcular.
"""

from __future__ import annotations

import math
from typing import Optional

import pandas as pd

TRADING_DAYS_PER_YEAR = 252
DAYS_PER_YEAR = 365.25
MIN_DAYS_FOR_CAGR = 365  # 1 año natural


def clean_prices(prices: pd.Series) -> pd.Series:
    """Elimina NaN, ordena por fecha y valida que los precios sean positivos."""
    s = pd.Series(prices, dtype="float64").dropna().sort_index()
    if (s <= 0).any():
        raise ValueError("La serie contiene precios menores o iguales a cero.")
    return s


def simple_returns(prices: pd.Series) -> pd.Series:
    """Rentabilidades simples entre observaciones consecutivas: P_t / P_{t-1} - 1."""
    s = clean_prices(prices)
    return (s / s.shift(1) - 1).dropna()


def total_return(prices: pd.Series) -> Optional[float]:
    """
    Rentabilidad acumulada del periodo: P_final / P_inicial - 1.
    None si hay menos de 2 precios válidos.
    """
    s = clean_prices(prices)
    if len(s) < 2:
        return None
    return float(s.iloc[-1] / s.iloc[0] - 1)


def years_between(start: pd.Timestamp, end: pd.Timestamp) -> float:
    """Años naturales transcurridos (días / 365,25)."""
    return (pd.Timestamp(end) - pd.Timestamp(start)).days / DAYS_PER_YEAR


def cagr(prices: pd.Series, min_days: int = MIN_DAYS_FOR_CAGR) -> Optional[float]:
    """
    Tasa de crecimiento anual compuesta: (P_final / P_inicial) ^ (1 / años) - 1.

    'años' = días naturales entre la primera y la última fecha / 365,25.
    Devuelve None si entre la primera y la última fecha hay menos de `min_days`
    días naturales (por defecto 365, es decir, 1 año): anualizar periodos
    cortos produce cifras engañosas para un inversor principiante.
    """
    s = clean_prices(prices)
    if len(s) < 2:
        return None
    days = (s.index[-1] - s.index[0]).days
    if days <= 0 or days < min_days:
        return None
    years = days / DAYS_PER_YEAR
    return float((s.iloc[-1] / s.iloc[0]) ** (1 / years) - 1)


def annualized_volatility(
    prices: pd.Series,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
    min_returns: int = 2,
) -> Optional[float]:
    """
    Volatilidad anualizada: desviación típica muestral (ddof=1) de las
    rentabilidades simples × sqrt(periods_per_year).

    Por defecto supone datos DIARIOS de un mercado con ~252 sesiones/año.
    Para activos que cotizan todos los días (cripto) se usa 365; para series
    semanales o mensuales, 52 o 12. Devuelve None si hay menos de
    `min_returns` rentabilidades (mínimo matemático: 2).
    """
    r = simple_returns(prices)
    if len(r) < max(2, min_returns):
        return None
    return float(r.std(ddof=1) * math.sqrt(periods_per_year))


# Tasa libre de riesgo del Sharpe: 0 % EXPLÍCITO (decisión del equipo, Decisiones D71).
# Es una simplificación documentada y reproducible: con tipos positivos el Sharpe
# real (frente a un activo sin riesgo) sería menor. Se indica junto a la métrica.
SHARPE_RISK_FREE_RATE = 0.0


def sharpe_ratio(
    prices: pd.Series,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
    min_returns: int = 2,
    risk_free_rate: float = SHARPE_RISK_FREE_RATE,
) -> Optional[float]:
    """
    Ratio de Sharpe anualizado con las MISMAS rentabilidades diarias que la volatilidad:

        Sharpe = (media(r) × N − rf) / (desv. típica muestral(r) × √N)

    r = rentabilidades simples entre observaciones, N = periods_per_year (252 o 365),
    rf = tasa libre de riesgo anual (por defecto 0 %).
    None si hay menos de `min_returns` rentabilidades o la volatilidad es 0
    (el cociente no está definido).
    """
    r = simple_returns(prices)
    if len(r) < max(2, min_returns):
        return None
    sd = float(r.std(ddof=1))
    if not sd > 1e-12:
        return None
    excess = float(r.mean()) * periods_per_year - risk_free_rate
    return float(excess / (sd * math.sqrt(periods_per_year)))


def drawdown_series(prices: pd.Series) -> pd.Series:
    """Caída de cada punto respecto al máximo previo: P_t / max(P_0..P_t) - 1 (<= 0)."""
    s = clean_prices(prices)
    return s / s.cummax() - 1


def max_drawdown(prices: pd.Series) -> Optional[dict]:
    """
    Máximo drawdown: la mayor caída porcentual desde un máximo previo hasta un
    mínimo posterior dentro del periodo.

    Devuelve {"value": fracción <= 0, "peak_date", "trough_date"}.
    Si la serie nunca cae por debajo de un máximo previo, value = 0.0 y las
    fechas son None. None si hay menos de 2 precios válidos.
    """
    s = clean_prices(prices)
    if len(s) < 2:
        return None
    dd = s / s.cummax() - 1
    trough_date = dd.idxmin()
    value = float(dd.loc[trough_date])
    if value == 0.0:
        return {"value": 0.0, "peak_date": None, "trough_date": None}
    peak_date = s.loc[:trough_date].idxmax()
    return {"value": value, "peak_date": peak_date, "trough_date": trough_date}
