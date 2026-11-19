"""
SENSIBILIDAD A COSTES — simulación educativa hipotética (funciones puras).

NO es el backtest histórico ni lo modifica: es un ejercicio separado que muestra
cómo pequeños costes, repetidos año tras año, se acumulan por el interés
compuesto. Todos los supuestos son visibles en la interfaz (Decisiones D74-D75).

Modelo (pasos anuales, deliberadamente sencillo y explicable):
- Año 0: se invierte el capital con UNA orden de compra (comisión del intermediario
  y, si el mercado no es en euros y la tarifa lo cobra, cambio de divisa).
- Cada año t = 1..T:
    1. La cartera crece a la rentabilidad anual SUPUESTA g (entrada del usuario;
       no es una previsión).
    2. Costes recurrentes: r % anual sobre el valor (entrada del usuario; ejemplo de
       custodia o de un coste interno usado SOLO como ejercicio; nunca se resta del
       resultado histórico real).
    3. Costes de operativa según el perfil de rotación:
         volumen negociado = 2 × rotación × valor (se vende y se recompra esa parte)
         nº de órdenes = las del perfil; importe por orden = volumen / nº de órdenes
         la mitad de las órdenes son ventas y la otra mitad compras: cada una paga
         la comisión de SU lado en la tarifa del intermediario (+ divisa si ese lado la cobra).
- Escenario «sin costes»: C × (1 + g)^t.

Lo que pagas en costes deja de crecer: por eso la diferencia final es mayor que la
suma de costes pagados.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional

from analytics import costs

# Perfiles de operativa con hipótesis cuantitativas VISIBLES.
ROTATION_PROFILES = [
    {"id": "buy_hold", "name": "Comprar y mantener", "turnover": 0.0, "orders_per_year": 0,
     "description": "Solo la compra inicial; no se vende ni se recompra nada después."},
    {"id": "low", "name": "Rotación baja", "turnover": 0.20, "orders_per_year": 4,
     "description": "Se renueva el 20 % de la cartera al año, en 4 órdenes (2 ventas y 2 compras)."},
    {"id": "medium", "name": "Rotación media", "turnover": 0.50, "orders_per_year": 12,
     "description": "Se renueva el 50 % de la cartera al año, en 12 órdenes (6 ventas y 6 compras)."},
    {"id": "high", "name": "Rotación alta", "turnover": 1.00, "orders_per_year": 24,
     "description": "Se renueva toda la cartera una vez al año, en 24 órdenes (una venta y una compra al mes)."},
]

MARKETS = {
    "ES": {"label": "Bolsa española (EUR)", "currency": "EUR", "ticker": "X.MC"},
    "EUROZONE": {"label": "Zona euro (EUR)", "currency": "EUR", "ticker": "X.DE"},
    "US": {"label": "EE. UU. (USD)", "currency": "USD", "ticker": "X"},
}


@dataclass
class SensitivityInput:
    capital: float
    years: int
    annual_return: float          # fracción supuesta (0.05 = 5 %)
    recurring_rate: float         # fracción anual (0.002 = 0,2 %)
    schedule: Optional[Mapping]   # tarifa del intermediario (None = sin comisiones)
    market: str = "EUROZONE"
    asset_type: str = "ETF"
    rates: Mapping[str, float] = None   # unidades de divisa por 1 € (para comisiones fijas en $)


def _order_costs(schedule: Optional[Mapping], amount: float, inp: SensitivityInput,
                 side: str = "buy") -> tuple[float, float]:
    """(comisión, divisa) de UNA orden de `amount` euros del lado `side` («buy» o «sell»).
    Cada lado usa su propia regla de la tarifa (Fase 8.1: antes las ventas usaban la de compra)."""
    if not schedule or amount <= 0:
        return 0.0, 0.0
    m = MARKETS[inp.market]
    rule = costs.trade_rule(schedule, side, inp.market, inp.asset_type)
    fee = costs.trade_fee(rule, amount, inp.rates or {})
    fx = costs.fx_fee(schedule, side, amount, m["currency"])
    return fee, fx


def simulate_profile(inp: SensitivityInput, profile: Mapping) -> dict:
    """Trayectoria anual de un perfil: valor, costes acumulados y diferencia frente a sin costes."""
    fee0, fx0 = _order_costs(inp.schedule, inp.capital, inp)
    value = inp.capital - fee0 - fx0
    paid_trading = fee0 + fx0
    paid_recurring = 0.0
    no_cost = inp.capital
    rows = [{"year": 0, "value": value, "no_cost": no_cost, "paid": paid_trading}]
    for year in range(1, inp.years + 1):
        value *= 1 + inp.annual_return
        no_cost *= 1 + inp.annual_return
        rec = inp.recurring_rate * value
        value -= rec
        paid_recurring += rec
        n_orders = profile["orders_per_year"]
        if n_orders and profile["turnover"] > 0:
            # La mitad de las órdenes son ventas y la otra mitad compras (perfiles D75),
            # cada una por el mismo importe: rotación × valor ÷ (órdenes ÷ 2).
            per_order = 2 * profile["turnover"] * value / n_orders
            half = n_orders / 2
            sell_fee, sell_fx = _order_costs(inp.schedule, per_order, inp, "sell")
            buy_fee, buy_fx = _order_costs(inp.schedule, per_order, inp, "buy")
            trading = half * (sell_fee + sell_fx) + half * (buy_fee + buy_fx)
            value -= trading
            paid_trading += trading
        rows.append({"year": year, "value": value, "no_cost": no_cost, "paid": paid_trading + paid_recurring})
    return {
        "id": profile["id"],
        "final_value": value,
        "no_cost_final": no_cost,
        "difference": no_cost - value,
        "paid_trading": paid_trading,
        "paid_recurring": paid_recurring,
        "paid_total": paid_trading + paid_recurring,
        "series": rows,
    }


def run(inp: SensitivityInput, profiles=ROTATION_PROFILES) -> list[dict]:
    if inp.capital <= 0 or inp.years < 1:
        raise ValueError("Capital y horizonte deben ser positivos.")
    return [{**{k: p[k] for k in ("id", "name", "turnover", "orders_per_year", "description")},
             **simulate_profile(inp, p)} for p in profiles]
