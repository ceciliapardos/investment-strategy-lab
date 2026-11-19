"""Integración real (Yahoo Finance) de Cost Analysis. Ejecutar con: pytest -m integration"""

import pytest

from services import backtest_service as bt
from services import cost_service as cs

pytestmark = pytest.mark.integration


def strat(sid, assets, capital=10_000):
    return {"id": sid, "name": sid, "initialCapital": capital, "baseCurrency": "EUR",
            "assets": [{"ticker": t, "weight": w} for t, w in assets]}


def test_coherente_con_comparison_y_costes_reales():
    ss = [strat("es", [("SAN.MC", 50), ("ITX.MC", 50)]), strat("us", [("VOO", 60), ("AAPL", 40)])]
    comp = bt.run_comparison(ss, "3Y")
    r = cs.analyze(ss, "3Y")
    assert r["status"] == "ok" and r["effective"] == comp["effective"]
    for c, k in zip(comp["strategies"], r["strategies"]):
        assert k["gross_final"] == pytest.approx(c["final_value"], abs=0.01)
        assert k["costs"]["none"]["net_final"] == k["gross_final"]
    es, us = r["strategies"]
    assert es["costs"]["ing"]["during"]["fx"] == 0
    assert us["costs"]["ing"]["during"]["fx"] == pytest.approx(10_000 * 0.005, abs=0.01)
    assert us["costs"]["myinvestor"]["during"]["fx"] == pytest.approx(10_000 * 0.003, abs=0.01)
    assert es["costs"]["traderepublic"]["during"]["buy"] == pytest.approx(2.0)


def test_ter_real_voo_y_accion():
    r = cs.analyze([strat("x", [("VOO", 50), ("AAPL", 50)])], "1Y")
    ter = {p["ticker"]: p for p in r["product_costs"]}
    assert ter["AAPL"]["ter_status"] == "not_applicable"
    assert ter["VOO"]["ter_status"] in ("available", "not_available")
    if ter["VOO"]["ter_status"] == "available":
        assert 0 < ter["VOO"]["ter"] <= 0.05


def test_aportaciones_reales_una_comision_por_compra():
    s = strat("dca", [("VOO", 100)])
    s["recurringContributions"] = [{"ticker": "VOO", "amount": 300, "frequency": "monthly"}]
    comp = bt.run_comparison([s, strat("b", [("AAPL", 100)])], "3Y")
    r = cs.analyze([s], "3Y")
    st = r["strategies"][0]
    assert st["n_contributions"] >= 35
    assert st["gross_final"] == pytest.approx(comp["strategies"][0]["final_value"], abs=0.01)
    c = st["costs"]["myinvestor"]
    assert c["trades"]["periodic"] == st["n_contributions"]
    assert c["during"]["buy_periodic"] == pytest.approx(st["n_contributions"] * 1.0)     # ETF: mínimo 1 €
    assert st["costs"]["traderepublic"]["during"]["buy_periodic"] == 0
    assert st["costs"]["ing"]["during"]["custody"] == 0


def test_activo_londres_en_libras_usa_regla_uk():
    r = cs.analyze([strat("uk", [("VUSA.L", 100)])], "1Y")
    s = r["strategies"][0]
    assert s["assets"][0]["market"] == "UK"
    assert s["costs"]["ing"]["during"]["buy"] > 0
