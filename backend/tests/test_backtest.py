"""
Tests deterministas del servicio de comparación (backtest_service) con el
proveedor falso: validación, divisas, periodo común, fechas y resultados.
"""

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from main import app
from services import backtest_service as bt
from services import market_service as ms
from services.errors import InvalidComparison, InvalidDateRange, UnusableAsset
from tests.conftest import make_daily


def strat(sid, assets, capital=10_000, name=None):
    return {"id": sid, "name": name or f"Estrategia {sid}", "initialCapital": capital, "baseCurrency": "EUR",
            "assets": [{"ticker": t, "weight": w} for t, w in assets]}


def linear(n, start_value, end_value):
    return list(np.linspace(start_value, end_value, n))


@pytest.fixture
def eur_data(fake):
    """IWDA.AS sube un 10 % y SAN.MC está plano, 300 días hábiles en euros."""
    fake.histories["IWDA.AS"] = make_daily(linear(300, 100, 110), start="2022-01-03", tz="Europe/Amsterdam")
    fake.histories["SAN.MC"] = make_daily([4.0] * 300, start="2022-01-03", tz="Europe/Madrid")
    return fake


# ---------------- Validación ----------------
def test_needs_at_least_two_strategies(eur_data):
    with pytest.raises(InvalidComparison, match="entre 2 y 6"):
        bt.run_comparison([strat("a", [("IWDA.AS", 100)])], "MAX")


def test_at_most_six_strategies(eur_data):
    many = [strat(str(i), [("IWDA.AS", 100)]) for i in range(7)]
    with pytest.raises(InvalidComparison, match="entre 2 y 6"):
        bt.run_comparison(many, "MAX")


@pytest.mark.parametrize("bad, msg", [
    (strat("b", [("IWDA.AS", 60), ("SAN.MC", 30)]), "suman 90"),
    (strat("b", [("IWDA.AS", 60), ("SAN.MC", 50)]), "suman 110"),
    (strat("b", [("IWDA.AS", 100), ("SAN.MC", None)]), "mayor que 0"),
    (strat("b", []), "no tiene activos"),
    (strat("b", [("IWDA.AS", 100)], capital=0), "capital"),
    (strat("b", [("IWDA.AS", 100)], capital=None), "capital"),
    (strat("b", [("IWDA.AS", 50), ("iwda.as", 50)]), "dos veces"),
])
def test_invalid_strategies_are_rejected_with_their_name(eur_data, bad, msg):
    with pytest.raises(InvalidComparison, match=msg) as e:
        bt.run_comparison([strat("a", [("IWDA.AS", 100)]), bad], "MAX")
    assert "«Estrategia b»" in e.value.message


def test_only_euro_capital(eur_data):
    s = strat("b", [("IWDA.AS", 100)])
    s["baseCurrency"] = "USD"
    with pytest.raises(InvalidComparison, match="euros"):
        bt.run_comparison([strat("a", [("IWDA.AS", 100)]), s], "MAX")


@pytest.mark.parametrize("ticker", ["INVALIDXYZ", "EURUSD=X", "TSLA", "NOCCY"])
def test_unusable_assets(eur_data, ticker):
    # inexistente, tipo no soportado, sin histórico, sin divisa
    with pytest.raises(UnusableAsset) as e:
        bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [(ticker, 100)])], "MAX")
    assert ticker in e.value.message and "«Estrategia b»" in e.value.message


def test_missing_fx_rate(eur_data):
    eur_data.histories["CHFETF"] = make_daily([10.0] * 50, start="2022-01-03")
    with pytest.raises(UnusableAsset, match="EUR/CHF"):
        bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("CHFETF", 100)])], "MAX")


# ---------------- Resultados conocidos ----------------
def test_known_results_in_euros(eur_data):
    r = bt.run_comparison([
        strat("a", [("IWDA.AS", 100)], capital=100_000),
        strat("b", [("IWDA.AS", 50), ("SAN.MC", 50)], capital=20_000),
    ], "MAX")
    a, b = r["strategies"]
    assert r["status"] == "ok" and r["base_currency"] == "EUR" and r["fx"] == []
    assert a["metrics"]["total_return"] == pytest.approx(0.10)
    assert b["metrics"]["total_return"] == pytest.approx(0.05)
    assert a["final_value"] == pytest.approx(110_000)
    assert b["final_value"] == pytest.approx(21_000)
    assert r["method"]["rebalancing"] == "buy_and_hold"


def test_composition_and_final_weights(eur_data):
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("IWDA.AS", 50), ("SAN.MC", 50)])], "MAX")
    comp = {c["ticker"]: c for c in r["strategies"][1]["composition"]}
    assert comp["IWDA.AS"]["initial_weight"] == 50
    assert comp["IWDA.AS"]["final_weight"] == pytest.approx(110 / 210 * 100, abs=1e-3)  # deriva sin rebalanceo
    assert comp["SAN.MC"]["return_eur"] == pytest.approx(0)
    assert r["strategies"][1]["largest_weight"]["weight"] == 50
    assert r["strategies"][1]["n_assets"] == 2


def test_usd_asset_converted_with_fx(eur_data):
    eur_data.histories["QQQ"] = make_daily([100.0] * 300, start="2022-01-03")           # plano en USD
    eur_data.histories["EURUSD=X"] = make_daily(linear(300, 1.0, 1.25), start="2022-01-03", tz="Europe/London")
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("QQQ", 100)])], "MAX")
    assert r["fx"] == [{"currency": "USD", "pair": "EURUSD=X"}]
    assert r["strategies"][1]["metrics"]["total_return"] == pytest.approx(-0.20)


def test_pence_are_converted_to_pounds(eur_data):
    eur_data.histories["VUSA.L"] = make_daily(linear(300, 10000, 11000), start="2022-01-03", tz="Europe/London")
    eur_data.histories["EURGBP=X"] = make_daily([0.8] * 300, start="2022-01-03", tz="Europe/London")
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("VUSA.L", 100)])], "MAX")
    vusa = next(a for a in r["assets"] if a["ticker"] == "VUSA.L")
    assert vusa["currency"] == "GBP"
    assert r["strategies"][1]["metrics"]["total_return"] == pytest.approx(0.10)


def test_single_asset_strategy_matches_explore_markets(eur_data):
    rng = np.random.default_rng(11)
    eur_data.histories["IWDA.AS"] = make_daily(100 * np.cumprod(1 + rng.normal(0.0004, 0.01, 300)), start="2022-01-03")
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX")
    perf = ms.get_performance("IWDA.AS", start=r["effective"]["start"], end=r["effective"]["end"])
    m = r["strategies"][0]["metrics"]
    assert m["total_return"] == pytest.approx(perf["metrics"]["total_return"], abs=1e-6)
    assert m["volatility"] == pytest.approx(perf["metrics"]["volatility"], abs=1e-6)
    assert m["max_drawdown"]["value"] == pytest.approx(perf["metrics"]["max_drawdown"]["value"], abs=1e-6)


# ---------------- Periodo común y fechas ----------------
def test_common_period_limited_by_youngest_asset(eur_data):
    eur_data.histories["SAN.MC"] = make_daily([4.0] * 100, start="2022-09-01")  # nace más tarde
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])],
                          start="2022-01-03", end="2023-02-01")
    assert r["effective"]["start"] == "2022-09-01"
    notice = next(n for n in r["notices"] if n["code"] == "common_start")
    assert "SAN.MC" in notice["message"] and "01/09/2022" in notice["message"]
    # Las dos estrategias usan exactamente las mismas fechas
    assert all(set(p["values"]) == {"a", "b"} for p in r["series"])


def test_fx_can_limit_the_common_period(eur_data):
    eur_data.histories["QQQ"] = make_daily([100.0] * 300, start="2022-01-03")
    eur_data.histories["EURUSD=X"] = make_daily([1.1] * 200, start="2022-05-23", tz="Europe/London")
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("QQQ", 100)])], "MAX")
    notice = next(n for n in r["notices"] if n["code"] == "max_common")
    assert "tipo de cambio EUR/USD" in notice["message"]


def test_holiday_in_one_market_is_dropped_for_everyone(eur_data):
    san = eur_data.histories["SAN.MC"]
    eur_data.histories["SAN.MC"] = san.drop(san.index[10])  # festivo en Madrid
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX")
    assert r["effective"]["observations"] == 299
    assert r["method"]["periods_per_year"] == 252


def test_weekend_calendar_uses_365(fake):
    fake.histories["IWDA.AS"] = make_daily(linear(60, 100, 101), start="2024-01-01", freq="D")
    fake.histories["SAN.MC"] = make_daily(linear(60, 4, 5), start="2024-01-01", freq="D")
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX")
    assert r["method"]["periods_per_year"] == 365


def test_presets_and_short_period_reasons(eur_data):
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "1Y")
    assert r["period"] == "1Y"
    assert r["strategies"][0]["metrics"]["cagr"] is not None
    short = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])],
                              start="2022-02-01", end="2022-02-15")
    m = short["strategies"][0]["metrics"]
    assert m["cagr"] is None and "1 año" in m["cagr_reason"]
    assert m["volatility"] is None and "20" in m["volatility_reason"]


def test_custom_range_weekend_start(eur_data):
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])],
                          start="2022-03-05", end="2022-06-30")  # sábado
    assert r["effective"]["start"] == "2022-03-07"
    assert any(n["code"] == "start_adjusted" for n in r["notices"])


@pytest.mark.parametrize("start, end", [("2022-06-01", "2022-01-01"), ("2099-01-01", "2099-02-01"), ("hoy", "2022-02-01")])
def test_invalid_dates(eur_data, start, end):
    with pytest.raises(InvalidDateRange):
        bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], start=start, end=end)


def test_period_without_common_data(eur_data):
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])],
                          start="2015-01-01", end="2016-01-01")
    assert r["status"] == "no_data" and "03/01/2022" in r["message"] and r["series"] == []


def test_assets_without_any_common_dates(fake):
    fake.histories["IWDA.AS"] = make_daily([1.0, 2.0, 3.0], start="2015-01-05")
    fake.histories["SAN.MC"] = make_daily([1.0, 2.0, 3.0], start="2023-01-02")
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX")
    assert r["status"] == "no_data" and "en común" in r["message"]


# ---------------- Gráfico ----------------
def test_chart_series_base_100_and_drawdown(eur_data):
    eur_data.histories["IWDA.AS"] = make_daily([100, 120, 90, 110] + [110] * 30, start="2022-01-03")
    eur_data.histories["SAN.MC"] = make_daily([4.0] * 34, start="2022-01-03")
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX")
    first = r["series"][0]
    assert first["values"] == {"a": 100.0, "b": 100.0}
    assert min(p["dd"]["a"] for p in r["series"]) == pytest.approx(-0.25)
    assert r["strategies"][0]["metrics"]["max_drawdown"]["value"] == pytest.approx(-0.25)


def test_chart_downsampling_keeps_drawdown_points(fake):
    n = 3000
    a = list(np.linspace(100, 200, n))
    a[1500], a[1510] = 400.0, 50.0
    fake.histories["IWDA.AS"] = make_daily(a, start="2010-01-04")
    fake.histories["SAN.MC"] = make_daily([4.0] * n, start="2010-01-04")
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX")
    dates = {p["date"] for p in r["series"]}
    mdd = r["strategies"][0]["metrics"]["max_drawdown"]
    assert len(r["series"]) <= bt.MAX_CHART_POINTS + 4
    assert mdd["peak_date"] in dates and mdd["trough_date"] in dates


# ---------------- API ----------------
def test_api_backtest(eur_data):
    client = TestClient(app, raise_server_exceptions=False)
    body = {"strategies": [strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "period": "MAX"}
    r = client.post("/api/comparison/backtest", json=body)
    assert r.status_code == 200 and r.json()["status"] == "ok"

    body["strategies"][1]["assets"][0]["weight"] = 90
    r = client.post("/api/comparison/backtest", json=body)
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_comparison"

    body["strategies"][1]["assets"] = [{"ticker": "INVALIDXYZ", "weight": 100}]
    r = client.post("/api/comparison/backtest", json=body)
    assert r.status_code == 422 and r.json()["error"]["code"] == "unusable_asset"

    assert client.post("/api/comparison/backtest", json={"strategies": "x"}).status_code == 422
