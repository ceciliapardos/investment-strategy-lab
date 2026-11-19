"""Tests deterministas de analytics/metrics.py con series sintéticas de resultado conocido."""

import math

import numpy as np
import pandas as pd
import pytest

from analytics import metrics


def series(values, start="2020-01-01", freq="D"):
    return pd.Series(values, index=pd.date_range(start, periods=len(values), freq=freq), dtype="float64")


# ---------------- Rentabilidad acumulada ----------------
def test_total_return_basic():
    assert metrics.total_return(series([100, 110])) == pytest.approx(0.10)


def test_total_return_negative():
    assert metrics.total_return(series([200, 150])) == pytest.approx(-0.25)


def test_total_return_ignores_nan_and_sorts_by_date():
    s = series([100, np.nan, 130, 120])
    assert metrics.total_return(s) == pytest.approx(0.20)
    assert metrics.total_return(s.iloc[::-1]) == pytest.approx(0.20)


def test_total_return_needs_two_points():
    assert metrics.total_return(series([100])) is None
    assert metrics.total_return(series([])) is None


def test_non_positive_prices_are_rejected():
    with pytest.raises(ValueError):
        metrics.total_return(series([100, 0, 110]))


# ---------------- CAGR ----------------
def test_cagr_two_years_of_ten_percent():
    s = pd.Series([100.0, 121.0], index=pd.to_datetime(["2020-01-01", "2022-01-01"]))
    years = 731 / 365.25
    assert metrics.cagr(s) == pytest.approx(1.21 ** (1 / years) - 1)
    assert metrics.cagr(s) == pytest.approx(0.10, abs=1e-3)


def test_cagr_negative():
    s = pd.Series([100.0, 81.0], index=pd.to_datetime(["2020-01-01", "2022-01-01"]))
    assert metrics.cagr(s) == pytest.approx(-0.10, abs=1e-3)


def test_cagr_is_none_for_periods_shorter_than_one_year():
    s = pd.Series([100.0, 110.0], index=pd.to_datetime(["2020-01-01", "2020-07-01"]))
    assert metrics.cagr(s) is None
    assert metrics.cagr(s, min_days=90) is not None


def test_cagr_threshold_is_365_calendar_days():
    exactly_one_year = pd.Series([100.0, 110.0], index=pd.to_datetime(["2021-03-01", "2022-03-01"]))
    one_day_short = pd.Series([100.0, 110.0], index=pd.to_datetime(["2021-03-02", "2022-03-01"]))
    assert metrics.cagr(exactly_one_year) == pytest.approx(1.10 ** (365.25 / 365) - 1)
    assert metrics.cagr(one_day_short) is None


def test_volatility_min_returns():
    prices = series([100, 101, 99, 102, 100])
    assert metrics.annualized_volatility(prices, min_returns=5) is None
    assert metrics.annualized_volatility(prices, min_returns=4) is not None


# ---------------- Volatilidad ----------------
def test_volatility_alternating_returns():
    # Rentabilidades +1 %, -1 %, +1 %, -1 % -> std muestral = sqrt(4 * 0.01^2 / 3)
    prices = [100.0]
    for r in [0.01, -0.01, 0.01, -0.01]:
        prices.append(prices[-1] * (1 + r))
    expected = math.sqrt(4 * 0.0001 / 3) * math.sqrt(252)
    assert metrics.annualized_volatility(series(prices)) == pytest.approx(expected)


def test_volatility_constant_growth_is_zero():
    prices = [100 * 1.001 ** i for i in range(30)]
    assert metrics.annualized_volatility(series(prices)) == pytest.approx(0.0, abs=1e-12)


def test_volatility_monthly_scaling():
    prices = [100.0, 102.0, 99.0, 103.0, 101.0]
    daily = metrics.annualized_volatility(series(prices))
    monthly = metrics.annualized_volatility(series(prices), periods_per_year=12)
    assert monthly == pytest.approx(daily * math.sqrt(12 / 252))


def test_volatility_needs_two_returns():
    assert metrics.annualized_volatility(series([100, 101])) is None


# ---------------- Máximo drawdown ----------------
def test_max_drawdown_simple():
    s = series([100, 120, 90, 110])
    mdd = metrics.max_drawdown(s)
    assert mdd["value"] == pytest.approx(-0.25)  # 120 -> 90
    assert mdd["peak_date"] == s.index[1]
    assert mdd["trough_date"] == s.index[2]


def test_max_drawdown_picks_the_largest_of_several_falls():
    s = series([100, 80, 150, 105, 140])  # -20 % y luego -30 %
    assert metrics.max_drawdown(s)["value"] == pytest.approx(-0.30)


def test_max_drawdown_peak_must_precede_trough():
    # El mínimo absoluto (50) ocurre ANTES del máximo absoluto (200):
    # la caída correcta es 100 -> 50 (-50 %), no 200 -> 50.
    s = series([100, 50, 200, 180])
    mdd = metrics.max_drawdown(s)
    assert mdd["value"] == pytest.approx(-0.50)
    assert mdd["peak_date"] == s.index[0]


def test_max_drawdown_rising_series_is_zero():
    mdd = metrics.max_drawdown(series([100, 101, 105, 110]))
    assert mdd == {"value": 0.0, "peak_date": None, "trough_date": None}


def test_drawdown_series_values():
    dd = metrics.drawdown_series(series([100, 120, 90, 120, 130]))
    assert list(dd.round(6)) == [0.0, 0.0, -0.25, 0.0, 0.0]
