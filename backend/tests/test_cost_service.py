"""
Tests deterministas del servicio y la API de costes (proveedor falso, sin red).
"""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from main import app
from services import backtest_service as bt
from services import cost_service as cs
from services.errors import InvalidComparison, InvalidCostScenario
from tests.conftest import make_daily

client = TestClient(app)


def strat(sid, assets, capital=10_000):
    return {"id": sid, "name": f"Estrategia {sid}", "initialCapital": capital, "baseCurrency": "EUR",
            "assets": [{"ticker": t, "weight": w} for t, w in assets]}


def linear(n, a, b):
    return list(np.linspace(a, b, n))


@pytest.fixture
def data(fake):
    """~2 años de días hábiles: SAN.MC plano, IWDA.AS +10 %, QQQ +20 % en USD con EUR/USD fijo 1,10."""
    n = 520
    fake.histories["SAN.MC"] = make_daily([4.0] * n, start="2022-01-03", tz="Europe/Madrid")
    fake.histories["IWDA.AS"] = make_daily(linear(n, 100, 110), start="2022-01-03", tz="Europe/Amsterdam")
    fake.histories["QQQ"] = make_daily(linear(n, 100, 120), start="2022-01-03")
    fake.histories["VOO"] = make_daily(linear(n, 100, 120), start="2022-01-03")
    fake.histories["BTC-USD"] = make_daily(linear(n, 100, 120), start="2022-01-03")
    fake.histories["NOTER.DE"] = make_daily([50.0] * n, start="2022-01-03", tz="Europe/Berlin")
    fake.histories["EURUSD=X"] = make_daily([1.1] * n, start="2022-01-03", tz="Europe/London")
    return fake


def costs_of(r, sid, scenario):
    return next(s for s in r["strategies"] if s["id"] == sid)["costs"][scenario]


# ---------------- Dataset ----------------
def test_dataset_tiene_fuente_y_fecha_en_cada_broker():
    data = cs.list_brokers()
    assert data["dataset_version"]
    for b in data["brokers"]:
        src = b["source"]
        assert src["url"].startswith("https://") and src["consulted"] and src["document"]
        assert b["instruments"] and b["plan"]


def test_ningun_broker_marcado_como_mejor():
    text = str(cs.load_dataset()).lower()
    assert "mejor" not in text and "best" not in text and "recomendado" not in text


# ---------------- Coherencia con Strategy Comparison ----------------
def test_resultado_antes_de_costes_igual_que_comparison(data):
    ss = [strat("a", [("SAN.MC", 50), ("IWDA.AS", 50)]), strat("b", [("QQQ", 100)])]
    comp = bt.run_comparison(ss, "MAX")
    r = cs.analyze(ss, "MAX")
    for c, k in zip(comp["strategies"], r["strategies"]):
        assert k["gross_final"] == pytest.approx(c["final_value"], abs=0.01)
    assert r["effective"] == comp["effective"]


def test_sin_costes_neto_igual_a_bruto(data):
    r = cs.analyze([strat("a", [("SAN.MC", 100)])], "MAX")
    c = costs_of(r, "a", "none")
    s = r["strategies"][0]
    assert c["during"]["total"] == 0 and c["exit"]["total"] == 0
    assert c["net_final"] == s["gross_final"]


def test_una_sola_estrategia_es_valida(data):
    r = cs.analyze([strat("a", [("SAN.MC", 100)])], "1Y")
    assert r["status"] == "ok" and len(r["strategies"]) == 1


def test_siete_estrategias_no(data):
    with pytest.raises(InvalidComparison):
        cs.analyze([strat(str(i), [("SAN.MC", 100)]) for i in range(7)], "MAX")


# ---------------- Casos funcionales ----------------
def test_solo_acciones_ing_comision_y_custodia(data):
    r = cs.analyze([strat("a", [("SAN.MC", 100)])], "MAX")
    c = costs_of(r, "a", "ing")
    assert c["during"]["buy"] == pytest.approx(3 + 10)           # 3 € + 0,10 % de 10.000 €
    assert c["during"]["fx"] == 0                                # activo en euros
    assert c["during"]["custody"] > 0                            # broker con custodia
    assert c["complete"]


def test_broker_sin_custodia(data):
    r = cs.analyze([strat("a", [("SAN.MC", 100)])], "MAX")
    for b in ("myinvestor", "traderepublic"):
        assert costs_of(r, "a", b)["during"]["custody"] == 0


def test_etf_usd_aplica_divisa_y_minimo(data):
    r = cs.analyze([strat("a", [("VOO", 100)], capital=500)], "MAX")
    myi = costs_of(r, "a", "myinvestor")
    assert myi["during"]["buy"] == pytest.approx(1.0)            # 0,12 % de 500 = 0,60 -> mínimo 1 €
    assert myi["during"]["fx"] == pytest.approx(500 * 0.003)
    ing = costs_of(r, "a", "ing")
    assert ing["during"]["buy"] == pytest.approx(3 / 1.1 + 0.5, abs=0.005)  # 3 $ en euros + 0,10 %
    assert ing["during"]["fx"] == pytest.approx(500 * 0.005)


def test_estrategia_mixta_y_comision_fija(data):
    r = cs.analyze([strat("a", [("SAN.MC", 40), ("IWDA.AS", 30), ("QQQ", 30)])], "MAX")
    tr = costs_of(r, "a", "traderepublic")
    assert tr["during"]["buy"] == pytest.approx(3.0)             # 3 posiciones × 1 €
    assert tr["exit"]["sell"] == pytest.approx(3.0)
    assert tr["during"]["fx"] == 0                               # no publica comisión de divisa


def test_activo_no_cubierto_marca_datos_incompletos(data):
    r = cs.analyze([strat("a", [("SAN.MC", 50), ("BTC-USD", 50)])], "MAX")
    for b in ("ing", "myinvestor", "traderepublic", "santander_online", "revolut_standard"):
        c = costs_of(r, "a", b)
        assert not c["complete"] and [u["ticker"] for u in c["uncovered"]] == ["BTC-USD"]
    assert costs_of(r, "a", "none")["complete"]


def test_escenario_personalizado(data):
    custom = {"buy_fixed": 2, "buy_rate": 0.2, "buy_min": 5, "sell_rate": 0.2,
              "fx_rate": 0.5, "custody_rate": 0.1, "maintenance": 12}
    r = cs.analyze([strat("a", [("QQQ", 100)])], "MAX", custom=custom)
    c = costs_of(r, "a", "custom")
    assert c["during"]["buy"] == pytest.approx(2 + 20)
    assert c["during"]["fx"] == pytest.approx(50)
    assert c["during"]["custody"] > 0 and c["during"]["maintenance"] > 0
    assert any(s["id"] == "custom" and s["kind"] == "custom" for s in r["scenarios"])


def test_personalizado_todo_cero_es_coste_cero(data):
    r = cs.analyze([strat("a", [("QQQ", 100)])], "MAX", custom={})
    c = costs_of(r, "a", "custom")
    assert c["during"]["total"] == 0 and c["exit"]["total"] == 0


@pytest.mark.parametrize("bad", [{"buy_rate": -1}, {"fx_rate": 50}, {"maintenance": "x"}, {"buy_fixed": True}])
def test_personalizado_invalido(data, bad):
    with pytest.raises(InvalidCostScenario):
        cs.analyze([strat("a", [("QQQ", 100)])], "MAX", custom=bad)


def test_capitales_distintos(data):
    r = cs.analyze([strat("a", [("SAN.MC", 100)], capital=1_000),
                    strat("b", [("SAN.MC", 100)], capital=30_000),
                    strat("c", [("SAN.MC", 100)], capital=100_000)], "MAX")
    small, mid, big = (costs_of(r, k, "ing") for k in "abc")
    assert small["during"]["buy"] == pytest.approx(4.0)            # 3 € + 1 €
    assert mid["during"]["buy"] == pytest.approx(20.0)             # 33 € -> tope 20 € (< 50.000 €)
    assert big["during"]["buy"] == pytest.approx(103.0)            # ≥ 50.000 €: sin tope
    assert small["during_pct_contributed"] > mid["during_pct_contributed"]


def test_periodo_corto_sin_custodia_ing(data):
    r = cs.analyze([strat("a", [("SAN.MC", 100)])], start="2022-01-03", end="2022-02-15")
    assert costs_of(r, "a", "ing")["during"]["custody"] == 0       # dentro del trimestre de compra


def test_periodo_largo_mas_custodia(data):
    short = cs.analyze([strat("a", [("SAN.MC", 100)])], start="2022-01-03", end="2022-12-30")
    long = cs.analyze([strat("a", [("SAN.MC", 100)])], "MAX")
    assert costs_of(long, "a", "ing")["during"]["custody"] > costs_of(short, "a", "ing")["during"]["custody"]


# ---------------- TER ----------------
def test_ter_disponible_no_disponible_y_no_aplica(data):
    r = cs.analyze([strat("a", [("SAN.MC", 30), ("VOO", 40), ("NOTER.DE", 30)])], "MAX")
    ter = {p["ticker"]: p for p in r["product_costs"]}
    assert ter["VOO"]["ter_status"] == "available" and ter["VOO"]["ter"] == pytest.approx(0.0003)
    assert ter["NOTER.DE"]["ter_status"] == "not_available" and ter["NOTER.DE"]["ter"] is None
    assert ter["SAN.MC"]["ter_status"] == "not_applicable"


def test_ter_no_se_resta_del_resultado(data):
    """Con un ETF con TER, el resultado sin costes de intermediación es exactamente el del precio."""
    r = cs.analyze([strat("a", [("VOO", 100)])], "MAX")
    s = r["strategies"][0]
    assert costs_of(r, "a", "none")["net_final"] == s["gross_final"]
    assert s["gross_twr"] == pytest.approx(0.20, abs=1e-6)
    assert r["method"]["ter"] == "already_in_prices"


# ---------------- API ----------------
def test_api_brokers():
    res = client.get("/api/costs/brokers")
    assert res.status_code == 200 and len(res.json()["brokers"]) >= 1


def test_api_analyze(data):
    body = {"strategies": [strat("a", [("SAN.MC", 100)])], "period": "MAX",
            "custom": {"buy_fixed": 1}}
    res = client.post("/api/costs/analyze", json=body)
    assert res.status_code == 200
    j = res.json()
    assert {"none", "ing", "myinvestor", "traderepublic", "custom"} <= set(j["strategies"][0]["costs"])


def test_api_personalizado_invalido_400(data):
    body = {"strategies": [strat("a", [("SAN.MC", 100)])], "period": "MAX", "custom": {"fx_rate": -1}}
    res = client.post("/api/costs/analyze", json=body)
    assert res.status_code == 400 and res.json()["error"]["code"] == "invalid_cost_scenario"


def test_api_sin_estrategias_400():
    res = client.post("/api/costs/analyze", json={"strategies": [], "period": "MAX"})
    assert res.status_code == 400
