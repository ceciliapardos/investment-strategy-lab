"""Tests deterministas del motor de costes (analytics/costs.py), sin red."""

import json
from datetime import date
from pathlib import Path

import pandas as pd
import pytest

from analytics import costs as c
from analytics import portfolio as pf
from analytics.costs import Asset, Trade

DATASET = json.loads((Path(__file__).resolve().parents[1] / "data" / "broker_fees.json").read_text(encoding="utf-8"))
BROKERS = {b["id"]: b for b in DATASET["brokers"]}


def bdays(start="2023-01-02", end="2023-12-29"):
    return pd.bdate_range(start, end)


def flat_prices(tickers, idx=None, value=100.0):
    idx = idx if idx is not None else bdays()
    return pd.DataFrame({t: value for t in tickers}, index=idx)


def asset(t, typ="Stock", ccy="EUR"):
    return Asset(t, typ, ccy)


def custom(buy_fixed=0.0, buy_rate=0.0, buy_min=None, fx=None, custody=None, maintenance=None):
    rule = {"fixed": buy_fixed, "rate": buy_rate, "min": buy_min, "fixed_ccy": "EUR"}
    return {
        "trade": {"buy": rule, "sell": rule},
        "fx": {"rate": fx} if fx else None,
        "custody": {"type": "percent_annual", "rate": custody} if custody else None,
        "maintenance": {"amount_per_year": maintenance} if maintenance else None,
    }


def run(assets_list, prices, trades, schedule, fx=None):
    return c.simulate_costs({a.ticker: a for a in assets_list}, prices, trades, schedule, fx)


def monthly_trades(prices, ticker, amount, months=12):
    flows = pf.contribution_flows(prices.index, [{"ticker": ticker, "amount": amount, "frequency": "monthly"}])
    return [Trade(f.date, f.ticker, f.amount, "periodic") for f in flows][:months]


USD_FX = None  # se construye en los tests que lo necesitan


def usd_fx(idx, rate=1.1):
    return pd.DataFrame({"USD": rate}, index=idx)


# --- Casos sintéticos obligatorios (no son tarifas reales) --------------------------
def test_tres_activos_un_euro_por_compra():
    p = flat_prices(["A.MC", "B.MC", "C.MC"])
    trades = c.initial_trades(p, {"A.MC": 1 / 3, "B.MC": 1 / 3, "C.MC": 1 / 3}, 3000)
    r = run([asset("A.MC"), asset("B.MC"), asset("C.MC")], p, trades, custom(buy_fixed=1.0))
    assert r["during"]["buy"] == pytest.approx(3.0)


def test_porcentaje_sobre_importe():
    assert c.trade_fee({"rate": 0.002}, 10_000, {}) == pytest.approx(20.0)


def test_minimo_por_operacion():
    assert c.trade_fee({"rate": 0.001, "min": 5}, 1_000, {}) == pytest.approx(5.0)


def test_custodia_un_por_ciento_un_anio():
    idx = pd.date_range("2023-01-01", "2023-12-31")       # año natural completo
    p = flat_prices(["A.MC"], idx)
    r = run([asset("A.MC")], p, [Trade(idx[0], "A.MC", 10_000)], custom(custody=0.01))
    assert r["during"]["custody"] == pytest.approx(100.0)


def test_cambio_de_divisa():
    assert c.fx_fee({"fx": {"rate": 0.005}}, "buy", 10_000, "USD") == pytest.approx(50.0)


# --- Reglas de comisión ----------------------------------------------------------------
def test_maximo_y_fijo_mas_porcentaje():
    assert c.trade_fee({"rate": 0.0012, "min": 3, "max": 25}, 100_000, {}) == pytest.approx(25.0)
    assert c.trade_fee({"fixed": 3, "rate": 0.001}, 5_000, {}) == pytest.approx(8.0)


def test_tope_condicionado_solo_bajo_umbral():
    rule = {"fixed": 3, "rate": 0.001, "cap": 20, "cap_if_amount_below": 50_000}
    assert c.trade_fee(rule, 30_000, {}) == pytest.approx(20.0)
    assert c.trade_fee(rule, 60_000, {}) == pytest.approx(63.0)


def test_tramos_por_importe():
    rule = BROKERS["santander_online"]["trade"]["by_market"]["ES"]
    assert c.trade_fee(rule, 2_000, {}) == pytest.approx(3.0)       # hasta 2.000 € inclusive
    assert c.trade_fee(rule, 2_000.01, {}) == pytest.approx(6.0)
    assert c.trade_fee(rule, 20_000, {}) == pytest.approx(50.0)     # 0,25 %


def test_tramo_con_maximo_y_en_dolares():
    es = BROKERS["bankinter_std"]["trade"]["by_market"]["ES"]
    assert c.trade_fee(es, 1_000_000, {}) == pytest.approx(200.0)   # 0,07 % con máximo 200 €
    us = BROKERS["bankinter_std"]["trade"]["by_market"]["US"]
    # 38.000 € a 1,10 = 41.800 $ ≥ 40.000 $ -> 0,20 %
    assert c.trade_fee(us, 38_000, {"USD": 1.1}) == pytest.approx(76.0)
    assert c.trade_fee(us, 30_000, {"USD": 1.1}) == pytest.approx(20.0)   # 20 € (el umbral está en $, la comisión en €)


def test_fijo_en_dolares_y_falta_tipo():
    assert c.trade_fee({"fixed": 3, "fixed_ccy": "USD"}, 1_000, {"USD": 1.5}) == pytest.approx(2.0)
    with pytest.raises(ValueError):
        c.trade_fee({"fixed": 3, "fixed_ccy": "USD"}, 1_000, {})


@pytest.mark.parametrize("ticker,ccy,market", [
    ("SAN.MC", "EUR", "ES"), ("SAP.DE", "EUR", "EUROZONE"), ("VUSA.L", "GBP", "UK"),
    ("VOLV-B.ST", "SEK", "SE"), ("AAPL", "USD", "US"), ("7203.T", "JPY", "OTHER"),
])
def test_mercado(ticker, ccy, market):
    assert c.market_of(ticker, ccy) == market


def test_regla_internacional_y_mercado_no_cubierto():
    san = BROKERS["santander_online"]
    assert c.trade_rule(san, "buy", "US", "Stock")["tiers"][0]["fixed"] == 20       # INTERNATIONAL
    bk = BROKERS["bankinter_std"]
    assert c.coverage(bk, asset("7203.T", ccy="JPY")) == "mercado no incluido en esta tarifa"
    assert c.coverage(BROKERS["bbva_etf"], asset("AAPL", ccy="USD")) == "tipo de activo no incluido en esta tarifa"


# --- Periodicidad y custodia ------------------------------------------------------------
def test_periodos_naturales():
    assert sum(f for *_, f in c.periods(date(2023, 1, 1), date(2024, 1, 1), 3)) == pytest.approx(4.0)
    assert sum(f for *_, f in c.periods(date(2023, 1, 1), date(2024, 1, 1), 6)) == pytest.approx(2.0)
    assert [p[0] for p in c.periods(date(2023, 2, 15), date(2023, 5, 15), 3)] == [date(2023, 2, 15), date(2023, 4, 1)]


def test_banco_con_custodia_ing_sin_aportaciones():
    idx = bdays()
    p = flat_prices(["SAN.MC", "ITX.MC"], idx)
    r = run([asset("SAN.MC"), asset("ITX.MC")], p, c.initial_trades(p, {"SAN.MC": .5, "ITX.MC": .5}, 10_000), BROKERS["ing"])
    # Trimestre de la compra gratis; los otros 3 se cobran (el último hasta el cierre del 29-dic: 90/92)
    assert r["during"]["buy"] == pytest.approx(2 * (3 + 5))
    assert r["during"]["custody"] == pytest.approx(2 * 4 * 1.21 * (1 + 1 + 90 / 92))


def test_ing_aportacion_mensual_elimina_custodia():
    idx = bdays()
    p = flat_prices(["SAN.MC"], idx)
    trades = c.initial_trades(p, {"SAN.MC": 1}, 10_000) + monthly_trades(p, "SAN.MC", 300)
    r = run([asset("SAN.MC")], p, trades, BROKERS["ing"])
    assert r["during"]["custody"] == 0          # hay operación en todos los trimestres


def test_custodia_por_clase_valor_medio_y_minimo():
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    p = flat_prices(["SAN.MC", "BBVA.MC"], idx)
    # Santander (máxima): 0,25 % anual, mínimo 24 € por clase. 20.000 € -> 50 €; 2.000 € -> mínimo 24 €.
    trades = [Trade(idx[0], "SAN.MC", 20_000), Trade(idx[0], "BBVA.MC", 2_000)]
    r = run([asset("SAN.MC"), asset("BBVA.MC")], p, trades, BROKERS["santander_online"])
    # Se custodia lo invertido tras la comisión de compra (20.000 − 50 €), del 2-ene al cierre del 29-dic.
    held = (date(2023, 12, 30) - date(2023, 1, 2)).days / 365
    assert r["during"]["custody"] == pytest.approx((0.0025 * 19_950 + 24) * held, rel=1e-6)
    assert any("MÁXIMA" in n for n in r["notes"])


def test_custodia_nominal_solo_minimo_caixabank():
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    p = flat_prices(["SAN.MC"], idx)
    r = run([asset("SAN.MC")], p, [Trade(idx[0], "SAN.MC", 10_000)], BROKERS["caixabank_std"])
    s1 = (date(2023, 7, 1) - date(2023, 1, 2)).days / 181
    s2 = (date(2023, 12, 30) - date(2023, 7, 1)).days / 184
    assert r["during"]["custody"] == pytest.approx(6 * (s1 + s2), rel=1e-6)
    assert any("nominal" in n for n in r["notes"])


def test_bankinter_sin_minimo_en_etf_con_compra_periodica():
    idx = bdays()
    p = flat_prices(["IWDA.AS"], idx)
    base = [Trade(idx[0], "IWDA.AS", 1_000)]
    a = [asset("IWDA.AS", "ETF")]
    without = run(a, p, base, BROKERS["bankinter_std"])["during"]["custody"]
    with_periodic = run(a, p, base + monthly_trades(p, "IWDA.AS", 100), BROKERS["bankinter_std"])["during"]["custody"]
    assert without > 20                      # con 1.000 € manda el mínimo de 6 € por trimestre
    assert with_periodic < 5                 # con compra periódica activa: 0,05 % sin mínimo


def test_mantenimiento_prorrateado():
    assert c.maintenance_cost({"amount_per_year": 40}, date(2023, 1, 1), date(2024, 1, 1)) == pytest.approx(40)
    assert c.maintenance_cost({"amount_per_year": 40}, date(2023, 1, 1), date(2023, 7, 1)) == pytest.approx(20)


# --- Aportaciones periódicas --------------------------------------------------------------
def test_aportacion_mensual_12_meses_comision_fija():
    idx = pd.bdate_range("2023-01-02", "2024-01-31")
    p = flat_prices(["SAN.MC"], idx)
    trades = monthly_trades(p, "SAN.MC", 300)
    assert len(trades) == 12
    r = run([asset("SAN.MC")], p, trades, custom(buy_fixed=1.0))
    assert r["during"]["buy_periodic"] == pytest.approx(12.0)
    assert r["trades"]["periodic"] == 12


def test_aportacion_trimestral():
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    flows = pf.contribution_flows(idx, [{"ticker": "A", "amount": 500, "frequency": "quarterly"}])
    assert [f.scheduled for f in flows] == [date(2023, 4, 2), date(2023, 7, 2), date(2023, 10, 2)]


def test_aportacion_en_dia_no_bursatil_pasa_al_siguiente():
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    flows = pf.contribution_flows(idx, [{"ticker": "A", "amount": 100, "frequency": "monthly"}])
    # 2-abr-2023 es domingo -> lunes 3-abr
    apr = next(f for f in flows if f.scheduled == date(2023, 4, 2))
    assert apr.date == pd.Timestamp("2023-04-03")


def test_aportacion_porcentual_y_minimo():
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    p = flat_prices(["SAN.MC"], idx)
    trades = monthly_trades(p, "SAN.MC", 1_000, 11)
    pct = run([asset("SAN.MC")], p, trades, custom(buy_rate=0.002))
    assert pct["during"]["buy_periodic"] == pytest.approx(11 * 2.0)
    mn = run([asset("SAN.MC")], p, trades, custom(buy_rate=0.001, buy_min=5))
    assert mn["during"]["buy_periodic"] == pytest.approx(11 * 5.0)


def test_aportacion_en_euros_sin_divisa_y_en_dolares_con_divisa():
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    p = flat_prices(["SAN.MC", "VOO"], idx)
    trades = monthly_trades(p, "SAN.MC", 300, 11) + monthly_trades(p, "VOO", 200, 11)
    r = run([asset("SAN.MC"), asset("VOO", "ETF", "USD")], p, trades, custom(fx=0.005), usd_fx(idx))
    assert r["during"]["fx"] == pytest.approx(11 * 200 * 0.005)
    by = {x["ticker"]: x for x in r["positions"]}
    assert by["SAN.MC"]["fx_buy"] == 0


def test_varias_aportaciones_a_activos_distintos():
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    p = flat_prices(["A.MC", "B.MC"], idx)
    trades = monthly_trades(p, "A.MC", 300, 11) + monthly_trades(p, "B.MC", 200, 11)
    r = run([asset("A.MC"), asset("B.MC")], p, trades, custom(buy_fixed=1))
    assert r["trades"]["periodic"] == 22 and r["during"]["buy"] == pytest.approx(22)
    assert r["contributed"] == pytest.approx(11 * 500)


def test_aportaciones_mas_capital_inicial():
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    p = flat_prices(["A.MC"], idx)
    trades = c.initial_trades(p, {"A.MC": 1}, 10_000) + monthly_trades(p, "A.MC", 300, 11)
    r = run([asset("A.MC")], p, trades, custom(buy_fixed=1))
    assert r["capital"] == 10_000 and r["contributed"] == pytest.approx(10_000 + 3_300)
    assert r["during"]["buy_initial"] == 1 and r["during"]["buy_periodic"] == 11


def test_sin_aportaciones_y_sin_costes():
    p = flat_prices(["A.MC"])
    r = run([asset("A.MC")], p, c.initial_trades(p, {"A.MC": 1}, 1_000), None)
    assert r["net_final"] == r["gross_final"] == pytest.approx(1_000)
    assert r["during"]["total"] == 0 and r["exit"]["total"] == 0 and r["trades"]["periodic"] == 0


def test_coste_inicial_deja_de_revalorizarse():
    idx = pd.bdate_range("2023-01-02", "2023-02-28")
    p = pd.DataFrame({"A.MC": [100.0] + [200.0] * (len(idx) - 1)}, index=idx)
    r = run([asset("A.MC")], p, [Trade(idx[0], "A.MC", 1_000)], custom(buy_fixed=10))
    assert r["gross_final"] == pytest.approx(2_000) and r["net_final"] == pytest.approx(1_980)
    assert r["impact"] == pytest.approx(20)


# --- Intermediarios: franquicias y planes de inversión ---------------------------------------
def test_trade_republic_plan_de_inversion_gratis_orden_suelta_1_euro():
    idx = pd.bdate_range("2023-01-02", "2023-12-29")
    p = flat_prices(["VOO"], idx)
    trades = c.initial_trades(p, {"VOO": 1}, 5_000) + monthly_trades(p, "VOO", 100, 11)
    r = run([asset("VOO", "ETF", "USD")], p, trades, BROKERS["traderepublic"], usd_fx(idx))
    assert r["during"]["buy_initial"] == pytest.approx(1.0)
    assert r["during"]["buy_periodic"] == 0
    assert r["during"]["fx"] == 0


def test_revolut_premium_franquicia_de_ordenes():
    idx = pd.bdate_range("2023-01-02", "2023-01-31")
    p = flat_prices([f"S{i}" for i in range(7)], idx)
    trades = [Trade(idx[0], f"S{i}", 1_000) for i in range(7)]       # 7 órdenes el mismo mes
    r = run([asset(f"S{i}", "Stock", "USD") for i in range(7)], p, trades, BROKERS["revolut_premium"], usd_fx(idx))
    assert r["during"]["buy"] == pytest.approx(2.0)                  # 5 gratis + 2 × 1 €
    assert r["during"]["fx"] == 0                                    # Premium: sin comisión de cambio


def test_revolut_estandar_franquicia_de_divisa_mensual():
    idx = pd.bdate_range("2023-01-02", "2023-01-31")
    p = flat_prices(["AAPL"], idx)
    r = run([asset("AAPL", "Stock", "USD")], p, [Trade(idx[0], "AAPL", 3_000)], BROKERS["revolut_standard"], usd_fx(idx))
    assert r["during"]["fx"] == pytest.approx(0.01 * 2_000)          # 1 % sobre lo que supera 1.000 €
    assert r["during"]["buy"] == pytest.approx(1.0)


def test_comision_pequena_se_multiplica_con_aportaciones():
    """Educativo: 1 € por operación casi no pesa en buy & hold, pero se repite con cada aportación."""
    idx = pd.bdate_range("2021-01-04", "2025-12-31")
    p = flat_prices(["SAN.MC"], idx)
    bh = run([asset("SAN.MC")], p, c.initial_trades(p, {"SAN.MC": 1}, 18_000), custom(buy_fixed=1))
    flows = pf.contribution_flows(p.index, [{"ticker": "SAN.MC", "amount": 300, "frequency": "monthly"}])
    dca = run([asset("SAN.MC")], p, [Trade(f.date, f.ticker, f.amount, "periodic") for f in flows], custom(buy_fixed=1))
    assert bh["during"]["buy"] == pytest.approx(1)
    assert dca["during"]["buy"] == pytest.approx(len(flows)) and len(flows) >= 59
