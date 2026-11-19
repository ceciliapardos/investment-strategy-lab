"""
Tests de INTEGRACIÓN del backtest con datos reales de Yahoo (requieren internet).

    python -m pytest -m integration

No comprueban si una estrategia gana o pierde (depende del mercado), sino que
el periodo común, la conversión a euros y los cálculos son coherentes.
"""

import pandas as pd
import pytest

from services import backtest_service as bt
from services import market_service as ms

pytestmark = pytest.mark.integration


def strat(sid, assets, capital=10_000):
    return {"id": sid, "name": f"E{sid}", "initialCapital": capital, "baseCurrency": "EUR",
            "assets": [{"ticker": t, "weight": w} for t, w in assets]}


def test_two_usd_strategies_one_year():
    r = bt.run_comparison([strat("a", [("VOO", 100)]), strat("b", [("QQQ", 50), ("VOO", 50)])], "1Y")
    assert r["status"] == "ok"
    assert r["fx"] == [{"currency": "USD", "pair": "EURUSD=X"}]
    assert r["effective"]["observations"] > 200
    assert all(len(p["values"]) == 2 for p in r["series"])


def test_euro_conversion_is_exactly_price_times_fx_change():
    r = bt.run_comparison([strat("a", [("VOO", 100)]), strat("b", [("QQQ", 100)])], "5Y")
    s, e = pd.Timestamp(r["effective"]["start"]), pd.Timestamp(r["effective"]["end"])
    voo = ms._daily_frame("VOO")["adj"]
    fx = ms._daily_frame("EURUSD=X")["adj"]
    expected = (voo[e] / voo[s]) * (fx[s] / fx[e]) - 1
    assert r["strategies"][0]["metrics"]["total_return"] == pytest.approx(expected, abs=1e-6)


def test_short_history_asset_limits_common_period():
    r = bt.run_comparison([strat("a", [("VOO", 100)]), strat("b", [("IBIT", 100)])], "MAX")
    assert r["effective"]["start"] >= "2024-01-11"
    assert "IBIT" in next(n for n in r["notices"] if n["code"] == "max_common")["message"]


def test_euro_assets_need_no_fx_and_three_strategies_with_different_capital():
    r = bt.run_comparison([
        strat("a", [("IWDA.AS", 100)], 10_000),
        strat("b", [("SAN.MC", 100)], 50_000),
        strat("c", [("IWDA.AS", 70), ("SAN.MC", 30)], 100_000),
    ], "5Y")
    assert r["status"] == "ok" and r["fx"] == []
    for s in r["strategies"]:
        assert s["final_value"] == pytest.approx(s["initial_capital"] * (1 + s["metrics"]["total_return"]), rel=1e-6)


def test_period_before_any_data_returns_no_data():
    r = bt.run_comparison([strat("a", [("VOO", 100)]), strat("b", [("QQQ", 100)])], start="1995-01-01", end="1996-01-01")
    assert r["status"] == "no_data"
