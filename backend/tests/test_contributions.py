"""
Aportaciones periódicas (Fase 5.1): calendario, simulación, rentabilidad TWR,
validaciones y efecto en Strategy Comparison y Cost Analysis. Sin red.
"""

from datetime import date

import numpy as np
import pandas as pd
import pytest

from analytics import portfolio as pf
from services import backtest_service as bt
from services import cost_service as cs
from services.errors import InvalidComparison
from tests.conftest import make_daily


def strat(sid, assets, capital=10_000, contributions=None):
    return {"id": sid, "name": f"Estrategia {sid}", "initialCapital": capital, "baseCurrency": "EUR",
            "assets": [{"ticker": t, "weight": w} for t, w in assets],
            "recurringContributions": contributions or []}


def contrib(ticker, amount, frequency="monthly"):
    return {"id": f"{ticker}-{frequency}", "ticker": ticker, "amount": amount, "frequency": frequency}


@pytest.fixture
def data(fake):
    n = 520
    fake.histories["SAN.MC"] = make_daily([4.0] * n, start="2022-01-03", tz="Europe/Madrid")
    fake.histories["IWDA.AS"] = make_daily(list(np.linspace(100, 110, n)), start="2022-01-03", tz="Europe/Amsterdam")
    fake.histories["QQQ"] = make_daily(list(np.linspace(100, 120, n)), start="2022-01-03")
    fake.histories["VOO"] = make_daily(list(np.linspace(100, 120, n)), start="2022-01-03")
    fake.histories["EURUSD=X"] = make_daily([1.1] * n, start="2022-01-03", tz="Europe/London")
    return fake


# ---------------- Calendario ----------------
def test_add_months_fin_de_mes():
    assert pf.add_months(date(2023, 1, 31), 1) == date(2023, 2, 28)
    assert pf.add_months(date(2024, 1, 31), 1) == date(2024, 2, 29)
    assert pf.add_months(date(2023, 11, 15), 3) == date(2024, 2, 15)


def test_mensual_durante_12_meses():
    idx = pd.bdate_range("2023-01-02", "2024-01-05")
    flows = pf.contribution_flows(idx, [{"ticker": "A", "amount": 100, "frequency": "monthly"}])
    assert len(flows) == 12 and flows[0].scheduled == date(2023, 2, 2)


def test_anual_y_periodo_demasiado_corto():
    idx = pd.bdate_range("2023-01-02", "2023-06-30")
    assert pf.contribution_flows(idx, [{"ticker": "A", "amount": 100, "frequency": "annual"}]) == []


# ---------------- Simulación y TWR ----------------
def test_aportacion_no_es_rentabilidad():
    """Precio plano + aportaciones: el valor sube por el dinero aportado, la rentabilidad es 0 %."""
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    p = pd.DataFrame({"A": 50.0}, index=idx)
    flows = pf.contribution_flows(idx, [{"ticker": "A", "amount": 1_000, "frequency": "monthly"}])
    v = pf.simulate(p, {"A": 1.0}, 10_000, flows)
    twr = pf.twr_index(v["__total__"], v["__flow__"])
    assert v["__total__"].iloc[-1] == pytest.approx(10_000 + 1_000 * len(flows))
    assert twr.iloc[-1] == pytest.approx(100.0)
    m = pf.money_summary(v, 10_000)
    assert m["gain"] == pytest.approx(0) and m["total_contributed"] == pytest.approx(10_000 + 11_000)


def test_twr_sin_aportaciones_igual_a_buy_and_hold():
    idx = pd.bdate_range("2023-01-02", periods=60)
    p = pd.DataFrame({"A": np.linspace(100, 130, 60), "B": np.linspace(50, 40, 60)}, index=idx)
    w = {"A": 0.6, "B": 0.4}
    v = pf.simulate(p, w, 10_000)
    bh = pf.buy_and_hold(p, w, 10_000)
    assert v["__total__"].equals(bh["__total__"])
    assert pf.twr_index(v["__total__"], v["__flow__"]).iloc[-1] == pytest.approx(bh["__total__"].iloc[-1] / 100)


def test_twr_conocido_con_aportacion():
    """Sube 10 %, se aportan 1.000 € y vuelve a subir 10 %: TWR = 1,1 × 1,1 − 1 = 21 %."""
    idx = pd.bdate_range("2023-01-02", periods=3)
    p = pd.DataFrame({"A": [100.0, 110.0, 121.0]}, index=idx)
    flows = [pf.Flow(idx[1], date(2023, 1, 3), "A", 1_000)]
    v = pf.simulate(p, {"A": 1.0}, 1_000, flows)
    twr = pf.twr_index(v["__total__"], v["__flow__"])
    assert twr.iloc[-1] == pytest.approx(121.0)
    assert v["__total__"].iloc[-1] == pytest.approx(1_210 + 1_100)


def test_aportacion_compra_solo_su_activo():
    idx = pd.bdate_range("2023-01-02", "2023-03-31")
    p = pd.DataFrame({"A": 10.0, "B": 10.0}, index=idx)
    flows = pf.contribution_flows(idx, [{"ticker": "B", "amount": 500, "frequency": "monthly"}])
    v = pf.simulate(p, {"A": 0.5, "B": 0.5}, 1_000, flows)
    assert v["A"].iloc[-1] == pytest.approx(500)
    assert v["B"].iloc[-1] == pytest.approx(500 + 500 * len(flows))


def test_sin_capital_inicial_empieza_con_la_primera_aportacion():
    idx = pd.bdate_range("2023-01-02", "2023-06-30")
    p = pd.DataFrame({"A": np.linspace(10, 12, len(idx))}, index=idx)
    flows = pf.contribution_flows(idx, [{"ticker": "A", "amount": 100, "frequency": "monthly"}])
    v = pf.simulate(p, {"A": 1.0}, 0, flows)
    twr = pf.twr_index(v["__total__"], v["__flow__"])
    assert np.isnan(twr.iloc[0]) and twr.dropna().index[0] == flows[0].date


# ---------------- Validaciones (Strategy Comparison) ----------------
@pytest.mark.parametrize("bad, msg", [
    ([contrib("SAN.MC", -5)], "mayor que 0"),
    ([contrib("SAN.MC", 0)], "mayor que 0"),
    ([{"ticker": "SAN.MC", "amount": None, "frequency": "monthly"}], "no es un número"),
    ([contrib("TSLA", 100)], "no corresponde"),
    ([contrib("SAN.MC", 100, "weekly")], "frecuencia"),
    ([contrib("SAN.MC", 100), contrib("SAN.MC", 50)], "dos aportaciones mensuales"),
])
def test_validaciones_de_aportaciones(data, bad, msg):
    with pytest.raises(InvalidComparison, match=msg):
        bt.run_comparison([strat("a", [("SAN.MC", 100)]), strat("b", [("SAN.MC", 100)], contributions=bad)], "MAX")


def test_mismo_activo_con_frecuencias_distintas_es_valido(data):
    s = strat("b", [("SAN.MC", 100)], contributions=[contrib("SAN.MC", 100), contrib("SAN.MC", 1_000, "annual")])
    r = bt.run_comparison([strat("a", [("SAN.MC", 100)]), s], "MAX")
    assert r["strategies"][1]["contributions"]["count"] > 0


def test_sin_capital_y_sin_aportaciones_no_valido(data):
    with pytest.raises(InvalidComparison, match="al menos una aportación"):
        bt.run_comparison([strat("a", [("SAN.MC", 100)]), strat("b", [("SAN.MC", 100)], capital=0)], "MAX")


def test_sin_capital_y_periodo_sin_aportaciones(data):
    s = strat("b", [("SAN.MC", 100)], capital=0, contributions=[contrib("SAN.MC", 100, "annual")])
    with pytest.raises(InvalidComparison, match="ninguna de sus aportaciones"):
        bt.run_comparison([strat("a", [("SAN.MC", 100)]), s], start="2022-01-03", end="2022-06-30")


# ---------------- Strategy Comparison con aportaciones ----------------
def test_comparison_separa_aportado_y_rentabilidad(data):
    s = strat("b", [("SAN.MC", 100)], contributions=[contrib("SAN.MC", 500)])
    r = bt.run_comparison([strat("a", [("SAN.MC", 100)]), s], "MAX")
    b = r["strategies"][1]
    c = b["contributions"]
    assert c["count"] >= 23
    assert c["total_contributed"] == pytest.approx(10_000 + 500 * c["count"])
    assert b["final_value"] == pytest.approx(c["total_contributed"])     # precio plano
    assert b["metrics"]["total_return"] == pytest.approx(0)             # no confunde aportación con ganancia
    assert c["gain"] == pytest.approx(0)
    assert r["method"]["returns"] == "time_weighted"
    assert r["series"][-1]["values"]["b"] == pytest.approx(100)
    assert r["series"][-1]["eur"]["b"] == pytest.approx(b["final_value"])


def test_comparison_sin_aportaciones_no_cambia(data):
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX")
    a = r["strategies"][0]
    assert a["metrics"]["total_return"] == pytest.approx(0.10, abs=1e-9)
    assert a["contributions"]["count"] == 0 and a["contributions"]["total"] == 0


# ---------------- Cost Analysis con aportaciones ----------------
def costs_of(r, sid, scenario):
    return next(s for s in r["strategies"] if s["id"] == sid)["costs"][scenario]


def test_costes_una_operacion_por_aportacion(data):
    s = strat("a", [("SAN.MC", 100)], contributions=[contrib("SAN.MC", 300)])
    r = cs.analyze([s], "MAX")
    st = r["strategies"][0]
    n = st["n_contributions"]
    myi = costs_of(r, "a", "myinvestor")
    assert myi["trades"] == {"initial": 1, "periodic": n}
    assert myi["during"]["buy_periodic"] == pytest.approx(3.0 * n)       # mínimo 3 € por compra de acciones
    tr = costs_of(r, "a", "traderepublic")
    assert tr["during"]["buy_periodic"] == 0                              # planes de inversión sin cargo
    assert tr["during"]["buy_initial"] == pytest.approx(1.0)
    ing = costs_of(r, "a", "ing")
    assert ing["during"]["custody"] == 0                                  # operación en todos los trimestres


def test_costes_divisa_en_cada_aportacion_usd(data):
    s = strat("a", [("QQQ", 100)], capital=0, contributions=[contrib("QQQ", 200)])
    r = cs.analyze([s], "MAX")
    n = r["strategies"][0]["n_contributions"]
    assert costs_of(r, "a", "myinvestor")["during"]["fx"] == pytest.approx(200 * 0.003 * n, abs=0.01)
    assert costs_of(r, "a", "ing")["during"]["fx"] == pytest.approx(200 * 0.005 * n, abs=0.01)
    assert r["strategies"][0]["initial_capital"] == 0


def test_resultado_antes_de_costes_coincide_con_comparison_con_aportaciones(data):
    ss = [strat("a", [("SAN.MC", 50), ("QQQ", 50)], contributions=[contrib("QQQ", 250)]),
          strat("b", [("IWDA.AS", 100)])]
    comp = bt.run_comparison(ss, "MAX")
    r = cs.analyze(ss, "MAX")
    for c, k in zip(comp["strategies"], r["strategies"]):
        assert k["gross_final"] == pytest.approx(c["final_value"], abs=0.01)
        assert k["total_contributed"] == pytest.approx(c["contributions"]["total_contributed"], abs=0.01)
        assert k["costs"]["none"]["net_final"] == k["gross_final"]


def test_escenarios_agrupados_por_categoria():
    data = cs.list_brokers()
    cats = {b["id"]: b["category"] for b in data["brokers"]}
    assert {cats[k] for k in ("santander_online", "caixabank_std", "bankinter_std", "ing", "bbva_etf", "bbva_joven")} == {"bank"}
    assert {cats[k] for k in ("myinvestor", "traderepublic", "revolut_standard", "revolut_premium")} == {"digital"}
    for b in data["brokers"]:
        assert b["entity"] and b["profile"] and b["source"]["consulted"] == "2026-11-12"
