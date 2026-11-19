"""
Tests deterministas del backtest (analytics/portfolio.py) con series sintéticas
de resultado conocido. Demuestran que las fórmulas producen lo esperado.
"""

import numpy as np
import pandas as pd
import pytest

from analytics import metrics, portfolio


def s(values, start="2024-01-01", freq="B"):
    return pd.Series(values, index=pd.date_range(start, periods=len(values), freq=freq), dtype="float64")


def run(prices: dict, weights_pct: dict, capital=100_000):
    aligned = portfolio.align_prices(prices)
    return portfolio.buy_and_hold(aligned, portfolio.normalize_weights(weights_pct), capital)


# ---------------- Casos de libro ----------------
def test_single_asset_up_ten_percent():
    v = run({"A": s([100, 105, 110])}, {"A": 100})
    assert v["__total__"].iloc[0] == pytest.approx(100_000)
    assert v["__total__"].iloc[-1] == pytest.approx(110_000)
    assert metrics.total_return(v["__total__"]) == pytest.approx(0.10)


def test_fifty_fifty_one_up_ten_other_flat():
    v = run({"A": s([100, 110]), "B": s([50, 50])}, {"A": 50, "B": 50})
    assert v["__total__"].iloc[-1] == pytest.approx(105_000)  # +5 %
    assert v["A"].iloc[-1] == pytest.approx(55_000)
    assert v["B"].iloc[-1] == pytest.approx(50_000)


def test_flat_asset_has_zero_return_and_zero_volatility():
    v = run({"A": s([80.0] * 40)}, {"A": 100})
    total = v["__total__"]
    assert metrics.total_return(total) == 0
    assert metrics.annualized_volatility(total) == pytest.approx(0.0, abs=1e-12)
    assert metrics.max_drawdown(total)["value"] == 0


def test_initial_allocation_follows_target_weights():
    # Ejemplo del enunciado: 100.000 € -> 60.000 / 30.000 / 10.000
    v = run({"VOO": s([400, 410]), "QQQ": s([300, 290]), "AAPL": s([150, 160])}, {"VOO": 60, "QQQ": 30, "AAPL": 10})
    first = v.iloc[0]
    assert (first["VOO"], first["QQQ"], first["AAPL"]) == pytest.approx((60_000, 30_000, 10_000))


def test_known_portfolio_drawdown():
    # 50/50 de A (100,120,60,90) y B plano: total 100k,110k,80k,95k -> drawdown 80/110-1
    v = run({"A": s([100, 120, 60, 90]), "B": s([10, 10, 10, 10])}, {"A": 50, "B": 50})
    assert list(v["__total__"]) == pytest.approx([100_000, 110_000, 80_000, 95_000])
    assert metrics.max_drawdown(v["__total__"])["value"] == pytest.approx(80 / 110 - 1)


def test_capital_scales_values_but_not_returns():
    a = run({"A": s([100, 130])}, {"A": 100}, capital=1_000)
    b = run({"A": s([100, 130])}, {"A": 100}, capital=250_000)
    assert a["__total__"].iloc[-1] == pytest.approx(1_300)
    assert b["__total__"].iloc[-1] == pytest.approx(325_000)
    assert metrics.total_return(a["__total__"]) == pytest.approx(metrics.total_return(b["__total__"]))


# ---------------- Buy & hold: los pesos derivan ----------------
def test_buy_and_hold_weights_drift_without_rebalancing():
    v = run({"A": s([100, 200]), "B": s([100, 100])}, {"A": 50, "B": 50})
    fw = portfolio.final_weights(v)
    assert fw["A"] == pytest.approx(2 / 3)   # 100k de 150k
    assert fw["B"] == pytest.approx(1 / 3)
    assert sum(fw.values()) == pytest.approx(1)


def test_buy_and_hold_equals_weighted_sum_of_asset_returns():
    rng = np.random.default_rng(7)
    a = s(100 * np.cumprod(1 + rng.normal(0, 0.01, 300)))
    b = s(50 * np.cumprod(1 + rng.normal(0, 0.02, 300)))
    v = run({"A": a, "B": b}, {"A": 70, "B": 30})
    expected = 0.7 * (a.iloc[-1] / a.iloc[0]) + 0.3 * (b.iloc[-1] / b.iloc[0]) - 1
    assert metrics.total_return(v["__total__"]) == pytest.approx(expected)


def test_single_asset_strategy_matches_explore_markets_metrics():
    rng = np.random.default_rng(3)
    a = s(100 * np.cumprod(1 + rng.normal(0.0003, 0.012, 400)))
    total = run({"A": a}, {"A": 100})["__total__"]
    assert metrics.total_return(total) == pytest.approx(metrics.total_return(a))
    assert metrics.annualized_volatility(total) == pytest.approx(metrics.annualized_volatility(a))
    assert metrics.max_drawdown(total)["value"] == pytest.approx(metrics.max_drawdown(a)["value"])


# ---------------- Alineación de fechas (sin rellenar) ----------------
def test_alignment_uses_only_common_dates():
    a = pd.Series([100, 101, 102, 103], index=pd.to_datetime(["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"]))
    b = pd.Series([10, 11, 12], index=pd.to_datetime(["2024-01-01", "2024-01-03", "2024-01-04"]))  # festivo el día 2
    df = portfolio.align_prices({"A": a, "B": b})
    assert [d.day for d in df.index] == [1, 3, 4]
    assert df.loc["2024-01-03", "A"] == 102  # no se inventa nada para el día 2


def test_alignment_drops_nan_and_never_fills():
    a = s([100, np.nan, 102, 103])
    b = s([10, 11, 12, 13])
    df = portfolio.align_prices({"A": a, "B": b})
    assert len(df) == 3 and not df.isna().any().any()


def test_asset_born_later_limits_the_common_period():
    old = s(range(100, 130), start="2024-01-01")
    young = s(range(50, 60), start="2024-01-29")  # empieza 4 semanas después
    df = portfolio.align_prices({"OLD": old, "YOUNG": young})
    assert df.index[0] == young.index[0]


def test_no_common_dates_gives_empty_frame():
    a = s([1, 2, 3], start="2020-01-01")
    b = s([1, 2, 3], start="2024-01-01")
    assert portfolio.align_prices({"A": a, "B": b}).empty


# ---------------- Divisas ----------------
def test_usd_asset_flat_but_dollar_falls_against_euro():
    # El activo no se mueve en USD; el EUR/USD pasa de 1,00 a 1,25 (el dólar se deprecia)
    price_usd = s([100, 100, 100])
    eurusd = s([1.00, 1.10, 1.25])
    eur = portfolio.to_base_currency(price_usd, eurusd)
    assert list(eur) == pytest.approx([100, 100 / 1.1, 80])
    assert metrics.total_return(eur) == pytest.approx(-0.20)


def test_currency_effect_combines_multiplicatively():
    price_usd = s([100, 120])         # +20 % en USD
    eurusd = s([1.0, 0.9])            # el dólar se aprecia
    r = metrics.total_return(portfolio.to_base_currency(price_usd, eurusd))
    assert r == pytest.approx(1.2 * (1.0 / 0.9) - 1)


def test_conversion_keeps_only_dates_with_fx():
    price = s([100, 101, 102])
    fx = pd.Series([1.0, 1.1], index=price.index[[0, 2]])
    assert len(portfolio.to_base_currency(price, fx)) == 2


def test_pence_factor():
    assert list(portfolio.to_base_currency(s([10850]), s([0.85]), factor=0.01)) == pytest.approx([108.5 / 0.85])


def test_same_currency_needs_no_fx():
    assert list(portfolio.to_base_currency(s([5, 6]))) == [5, 6]


# ---------------- Validaciones ----------------
@pytest.mark.parametrize("weights, msg", [
    ({}, "no tiene activos"),
    ({"A": 60, "B": 30}, "suman 90"),
    ({"A": 60, "B": 50}, "suman 110"),
    ({"A": 100, "B": 0}, "mayor que 0"),
    ({"A": 110, "B": -10}, "mayor que 0"),
    ({"A": None}, "mayor que 0"),
])
def test_invalid_weights(weights, msg):
    with pytest.raises(ValueError, match=msg):
        portfolio.normalize_weights(weights)


def test_weights_with_decimals_summing_to_100():
    w = portfolio.normalize_weights({"A": 33.33, "B": 33.33, "C": 33.34})
    assert sum(w.values()) == pytest.approx(1)


@pytest.mark.parametrize("capital", [0, -5, None])
def test_invalid_capital(capital):
    with pytest.raises(ValueError):
        portfolio.buy_and_hold(pd.DataFrame({"A": [1.0, 2.0]}), {"A": 1.0}, capital)


def test_rebase_to_100():
    assert list(portfolio.rebase(s([50, 55, 45]))) == pytest.approx([100, 110, 90])
