"""
Fase 7 — tests deterministas (sin red): Sharpe, benchmark y sensibilidad a costes.
"""

import math

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from analytics import metrics, sensitivity as sens
from main import app
from services import backtest_service as bt
from services import cost_service as cs
from services.errors import InvalidComparison, InvalidCostScenario
from tests.conftest import FAKE_INFO, make_daily

client = TestClient(app)


# =============================== Sharpe ===============================
def series(values, start="2023-01-02"):
    return pd.Series(values, index=pd.bdate_range(start, periods=len(values)), dtype="float64")


def test_sharpe_serie_conocida():
    # Rentabilidades alternas +2 % / −1 %: media 0,005, desv. típica muestral conocida.
    prices = [100.0]
    for i in range(40):
        prices.append(prices[-1] * (1.02 if i % 2 == 0 else 0.99))
    s = series(prices)
    r = s.pct_change().dropna()
    expected = r.mean() * 252 / (r.std(ddof=1) * math.sqrt(252))
    assert metrics.sharpe_ratio(s, 252, 20) == pytest.approx(expected)
    # Es (media/desv.) × √252 con rf = 0
    assert expected == pytest.approx(r.mean() / r.std(ddof=1) * math.sqrt(252))


def test_sharpe_volatilidad_cero():
    assert metrics.sharpe_ratio(series([100.0] * 30), 252, 20) is None


def test_sharpe_historico_insuficiente():
    assert metrics.sharpe_ratio(series(np.linspace(100, 110, 10)), 252, 20) is None


def test_sharpe_con_tasa_libre_definida():
    s = series(100 * np.cumprod([1.001 if i % 3 else 0.998 for i in range(60)]))
    r = s.pct_change().dropna()
    rf = 0.03
    expected = (r.mean() * 252 - rf) / (r.std(ddof=1) * math.sqrt(252))
    assert metrics.sharpe_ratio(s, 252, 20, risk_free_rate=rf) == pytest.approx(expected)
    assert metrics.sharpe_ratio(s, 252, 20) > metrics.sharpe_ratio(s, 252, 20, risk_free_rate=rf)
    assert metrics.SHARPE_RISK_FREE_RATE == 0.0                       # decisión del equipo (D71)


def test_sharpe_usa_periodos_por_anio():
    s = series(100 * np.cumprod([1.01 if i % 2 else 0.995 for i in range(60)]))
    assert metrics.sharpe_ratio(s, 365, 20) / metrics.sharpe_ratio(s, 252, 20) == pytest.approx(math.sqrt(365 / 252))


# =============================== Benchmark ===============================
def strat(sid, assets, capital=10_000):
    return {"id": sid, "name": f"Estrategia {sid}", "initialCapital": capital, "baseCurrency": "EUR",
            "assets": [{"ticker": t, "weight": w} for t, w in assets]}


@pytest.fixture
def data(fake):
    FAKE_INFO.setdefault("^SP500TR", {"quoteType": "INDEX", "longName": "S&P 500 (TR)", "currency": "USD"})
    n = 300
    fake.histories["IWDA.AS"] = make_daily(list(np.linspace(100, 110, n)), start="2022-01-03", tz="Europe/Amsterdam")
    fake.histories["SAN.MC"] = make_daily([4.0] * n, start="2022-01-03", tz="Europe/Madrid")
    fake.histories["^SP500TR"] = make_daily(list(np.linspace(1000, 1200, n)), start="2022-01-03")
    fake.histories["EURUSD=X"] = make_daily([1.0] * n, start="2022-01-03", tz="Europe/London")
    return fake


def test_benchmark_mismas_fechas_y_metricas(data):
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX", benchmark="sp500tr")
    b = r["benchmark"]
    assert b["status"] == "ok" and b["kind"] == "index" and b["ticker"] == "^SP500TR"
    assert b["effective"]["start"] == r["effective"]["start"] and b["effective"]["end"] == r["effective"]["end"]
    assert b["metrics"]["total_return"] == pytest.approx(0.20, abs=1e-6)        # EUR/USD plano
    for k in ("cagr", "volatility", "sharpe", "max_drawdown"):
        assert k in b["metrics"]
    assert r["series"][0]["benchmark"] == pytest.approx(100.0)
    assert r["series"][-1]["benchmark"] == pytest.approx(120.0)
    # El benchmark no es una estrategia y no altera sus resultados
    assert [s["id"] for s in r["strategies"]] == ["a", "b"]
    sin = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX")
    assert sin["strategies"] == r["strategies"] and sin["benchmark"] is None


def test_benchmark_con_historico_corto_no_acorta_las_estrategias(data):
    data.histories["^SP500TR"] = make_daily(list(np.linspace(1000, 1100, 100)), start="2022-08-01")
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX", benchmark="sp500tr")
    assert r["benchmark"]["status"] == "unavailable" and "no cubre el periodo común" in r["benchmark"]["message"]
    assert r["effective"]["start"] == "2022-01-03"                               # periodo intacto
    assert "benchmark" not in r["series"][0]


def test_benchmark_datos_ausentes(data):
    del data.histories["^SP500TR"]
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX", benchmark="sp500tr")
    assert r["benchmark"]["status"] == "unavailable" and r["status"] == "ok"


def test_benchmark_proxy_etiquetado(data):
    r = bt.run_comparison([strat("a", [("SAN.MC", 100)]), strat("b", [("SAN.MC", 100)])], "MAX", benchmark="msci_world")
    b = r["benchmark"]
    assert b["kind"] == "etf_proxy" and "no es el índice" in b["kind_label"] and b["ticker"] == "IWDA.AS"
    assert b["metrics"]["total_return"] == pytest.approx(0.10, abs=1e-6)


def test_benchmark_invalido(data):
    with pytest.raises(InvalidComparison):
        bt.run_comparison([strat("a", [("SAN.MC", 100)]), strat("b", [("SAN.MC", 100)])], "MAX", benchmark="nasdaq")


def test_sharpe_en_comparison(data):
    r = bt.run_comparison([strat("a", [("IWDA.AS", 100)]), strat("b", [("SAN.MC", 100)])], "MAX")
    a, b = r["strategies"]
    assert a["metrics"]["sharpe"] is not None and a["metrics"]["sharpe_risk_free"] == 0.0
    assert b["metrics"]["sharpe"] is None and "volatilidad" in b["metrics"]["sharpe_reason"]   # precio plano


def test_api_benchmarks():
    j = client.get("/api/comparison/benchmarks").json()
    assert {b["id"] for b in j["benchmarks"]} == {"sp500tr", "msci_world"}


# =============================== Sensibilidad a costes ===============================
FIXED = {"trade": {"buy": {"fixed": 1.0, "fixed_ccy": "EUR"}, "sell": {"fixed": 1.0, "fixed_ccy": "EUR"}}}


def inp(schedule=None, years=10, capital=10_000, g=0.05, r=0.0, market="EUROZONE"):
    return sens.SensitivityInput(capital=capital, years=years, annual_return=g, recurring_rate=r,
                                 schedule=schedule, market=market, rates={"USD": 1.1})


def by_id(results):
    return {p["id"]: p for p in results}


def test_sens_coste_cero_igual_que_sin_costes():
    for p in sens.run(inp(None)):
        assert p["final_value"] == pytest.approx(p["no_cost_final"]) and p["paid_total"] == 0
        assert p["no_cost_final"] == pytest.approx(10_000 * 1.05 ** 10)


def test_sens_coste_fijo():
    p = by_id(sens.run(inp(FIXED, years=1, g=0.0)))
    assert p["buy_hold"]["paid_trading"] == pytest.approx(1.0)               # solo la compra inicial
    assert p["high"]["paid_trading"] == pytest.approx(1.0 + 24 * 1.0)        # + 24 órdenes en el año


def test_sens_mas_frecuencia_mas_coste():
    p = by_id(sens.run(inp(FIXED)))
    assert p["buy_hold"]["difference"] < p["low"]["difference"] < p["medium"]["difference"] < p["high"]["difference"]


def test_sens_horizonte_corto_y_largo():
    short = by_id(sens.run(inp(FIXED, years=2)))["high"]
    long = by_id(sens.run(inp(FIXED, years=30)))["high"]
    assert long["difference"] > short["difference"]
    # Interés compuesto: con costes porcentuales, la diferencia crece más que proporcional al tiempo
    pct = {"trade": {"buy": {"rate": 0.002}, "sell": {"rate": 0.002}}}
    d10 = by_id(sens.run(inp(pct, years=10)))["high"]["difference"]
    d20 = by_id(sens.run(inp(pct, years=20)))["high"]["difference"]
    assert d20 > 2 * d10


def test_sens_diferencia_mayor_que_lo_pagado():
    """Lo pagado deja de crecer: la diferencia final supera la suma de costes."""
    p = by_id(sens.run(inp(FIXED, years=20, r=0.002)))["medium"]
    assert p["difference"] > p["paid_total"] > 0


def test_sens_mismo_capital_distinta_rotacion_y_coste_recurrente():
    p = by_id(sens.run(inp(None, r=0.005)))
    assert len({round(x["final_value"], 6) for x in p.values()}) == 1         # sin comisiones, la rotación no cuesta
    assert p["buy_hold"]["paid_recurring"] > 0


def test_sens_venta_usa_su_propia_comision():
    """Regresión (Fase 8.1): las órdenes de venta de la rotación pagan la comisión de VENTA,
    no la de compra. Compra 1 € y venta 10 € por orden; rotación alta = 12 ventas + 12 compras."""
    asym = {"trade": {"buy": {"fixed": 1.0, "fixed_ccy": "EUR"}, "sell": {"fixed": 10.0, "fixed_ccy": "EUR"}}}
    p = by_id(sens.run(inp(asym, years=1, g=0.0)))
    assert p["buy_hold"]["paid_trading"] == pytest.approx(1.0)                     # solo la compra inicial
    assert p["low"]["paid_trading"] == pytest.approx(1.0 + 2 * 10.0 + 2 * 1.0)      # 2 ventas + 2 compras
    assert p["high"]["paid_trading"] == pytest.approx(1.0 + 12 * 10.0 + 12 * 1.0)   # 12 ventas + 12 compras


def test_sens_divisa_solo_en_el_lado_que_la_cobra():
    """El cambio de divisa respeta `applies_to`: aquí solo se cobra al comprar."""
    fx_buy_only = {"trade": {"buy": {"fixed": 0.0}, "sell": {"fixed": 0.0}},
                   "fx": {"rate": 0.01, "applies_to": ["buy"]}}
    p = by_id(sens.run(inp(fx_buy_only, years=1, g=0.0, market="US")))["high"]
    # compra inicial 10.000 € → 100 €; año 1: volumen 2 × 9.900 → la mitad son compras (9.900 €) → 99 €
    assert p["paid_trading"] == pytest.approx(100.0 + 99.0)


def test_sens_servicio_validaciones_y_divisa():
    with pytest.raises(InvalidCostScenario):
        cs.sensitivity(10_000, 0, 5, 0, "none", "EUROZONE")
    with pytest.raises(InvalidCostScenario):
        cs.sensitivity(10_000, 10, 5, 0, "banco_x", "EUROZONE")
    r = cs.sensitivity(10_000, 5, 5, 0, "none", "EUROZONE")
    assert r["kind"] == "educational_simulation" and len(r["profiles"]) == 4
    assert r["profiles"][0]["series"][0]["year"] == 0 and len(r["profiles"][0]["series"]) == 6

# =============================== Sharpe en Explore Markets ===============================
def test_sharpe_en_explore_markets_y_futuros(fake):
    from services import market_service as ms
    fake.histories["VOO"] = make_daily(list(100 * np.cumprod([1.01 if i % 2 else 0.995 for i in range(300)])), start="2022-01-03")
    fake.histories["ES=F"] = make_daily(list(np.linspace(4000, 4400, 300)), start="2022-01-03")
    m = ms.get_performance("VOO", "MAX")["metrics"]
    assert m["sharpe"] is not None and m["sharpe_risk_free"] == 0.0 and m["sharpe_reason"] is None
    f = ms.get_performance("ES=F", "MAX")["metrics"]
    assert f["sharpe"] is None and "futuros" in f["sharpe_reason"]
