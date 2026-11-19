"""
Cost Analysis: aplica costes de intermediación al backtest histórico.

- Reutiliza la MISMA ventana y los MISMOS precios en euros que Strategy
  Comparison (backtest_service.prepare_window): el «resultado antes de costes
  del intermediario» coincide con el valor final de la comparación.
- Las tarifas salen de data/broker_fees.json (verificadas a mano, con fuente y
  fecha). Nada de tarifas en el código ni en React.
- Las fórmulas están en analytics/costs.py (puras, testeadas sin red).
- El TER se muestra como información: ya está en el precio histórico del
  ETF/fondo y NO se vuelve a restar.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd

from analytics import costs
from services import backtest_service as bt
from services import market_service as ms
from services.errors import InvalidCostScenario, MarketDataError, UnusableAsset

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "broker_fees.json"

NONE_ID = "none"
CUSTOM_ID = "custom"

# Límites de los costes personalizados (evitan errores de tecleo absurdos).
CUSTOM_LIMITS = {
    "buy_fixed": 1_000, "buy_rate": 10, "buy_min": 1_000,
    "sell_fixed": 1_000, "sell_rate": 10, "sell_min": 1_000,
    "fx_rate": 10, "custody_rate": 10, "maintenance": 10_000,
}
CUSTOM_LABELS = {
    "buy_fixed": "comisión fija de compra", "buy_rate": "comisión porcentual de compra",
    "buy_min": "mínimo de compra", "sell_fixed": "comisión fija de venta",
    "sell_rate": "comisión porcentual de venta", "sell_min": "mínimo de venta",
    "fx_rate": "cambio de divisa", "custody_rate": "custodia anual", "maintenance": "mantenimiento anual",
}


@lru_cache(maxsize=1)
def load_dataset() -> dict:
    return json.loads(DATASET_PATH.read_text(encoding="utf-8"))


def _brokers() -> dict[str, dict]:
    return {b["id"]: b for b in load_dataset()["brokers"]}


def _public_broker(b: dict) -> dict:
    return {
        "id": b["id"], "name": b["name"], "kind": "broker", "type": b.get("kind"),
        "category": b.get("category"), "entity": b.get("entity"), "profile": b.get("profile"),
        "country": b.get("country"), "plan": b.get("plan"),
        "instruments": b.get("instruments"), "source": b.get("source"),
        "notes": b.get("notes", []), "not_modeled": b.get("not_modeled", []),
        "has_custody": bool(b.get("custody")), "has_fx": bool(b.get("fx")),
    }


def list_brokers() -> dict:
    data = load_dataset()
    return {
        "dataset_version": data["dataset_version"],
        "description": data.get("description"),
        "brokers": [_public_broker(b) for b in data["brokers"]],
    }


# ---------------------------------------------------------------------------
# Escenario personalizado
# ---------------------------------------------------------------------------
def build_custom_schedule(raw: Optional[dict]) -> Optional[dict]:
    """
    Convierte los datos del formulario (porcentajes como 0,25 = 0,25 %) en una
    tarifa para el motor. Todos los campos son opcionales; vacío = 0.
    """
    if raw is None:
        return None
    vals = {}
    for key, limit in CUSTOM_LIMITS.items():
        v = raw.get(key)
        if v in (None, ""):
            v = 0.0
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v != v:
            raise InvalidCostScenario(f"Costes personalizados: la {CUSTOM_LABELS[key]} no es un número.")
        if v < 0 or v > limit:
            unit = "€" if key in ("buy_fixed", "buy_min", "sell_fixed", "sell_min", "maintenance") else "%"
            raise InvalidCostScenario(
                f"Costes personalizados: la {CUSTOM_LABELS[key]} debe estar entre 0 y {limit} {unit}.")
        vals[key] = float(v)

    def rule(side):
        return {"fixed": vals[f"{side}_fixed"], "rate": vals[f"{side}_rate"] / 100,
                "min": vals[f"{side}_min"] or None, "fixed_ccy": "EUR"}

    return {
        "trade": {"buy": rule("buy"), "sell": rule("sell")},
        "fx": {"rate": vals["fx_rate"] / 100, "applies_to": ["buy", "sell"]} if vals["fx_rate"] else None,
        "custody": {"type": "percent_annual", "rate": vals["custody_rate"] / 100} if vals["custody_rate"] else None,
        "maintenance": {"amount_per_year": vals["maintenance"]} if vals["maintenance"] else None,
        "inputs": vals,
    }


# ---------------------------------------------------------------------------
# Análisis
# ---------------------------------------------------------------------------
def _rule_currencies(rule: Optional[dict]) -> set[str]:
    if not rule:
        return set()
    return {rule.get("fixed_ccy", "EUR"), rule.get("cap_ccy", rule.get("fixed_ccy", "EUR")),
            rule.get("tier_ccy", "EUR"), rule.get("fee_ccy", "EUR")}


def _needed_currencies(assets: list[costs.Asset], schedules: dict[str, Optional[dict]]) -> set[str]:
    """Divisas de importes fijos, topes y tramos de las reglas que se van a usar (3 $, 40.000 $...)."""
    need = set()
    for sch in schedules.values():
        if not sch:
            continue
        for a in assets:
            for side in ("buy", "sell"):
                for periodic in (False, True):
                    need |= _rule_currencies(costs.trade_rule(sch, side, a.market, a.asset_type, periodic))
    need.discard("EUR")
    return need


def _r(x: float) -> float:
    return round(float(x), 2)


def _pct(x: float, base: float) -> Optional[float]:
    return round(x / base, 6) if base else None


def _format_costs(res: dict) -> dict:
    paid_in, gross = res["contributed"], res["gross_final"]
    return {
        "complete": res["complete"],
        "uncovered": res["uncovered"],
        "trades": res["trades"],
        "during": {k: _r(v) for k, v in res["during"].items()},
        "during_pct_contributed": _pct(res["during"]["total"], paid_in),
        "during_pct_final": _pct(res["during"]["total"], gross),
        "net_final": _r(res["net_final"]),
        "net_gain": _r(res["net_final"] - paid_in),
        "impact": _r(res["impact"]),
        "impact_pct_contributed": _pct(res["impact"], paid_in),
        "exit": {k: _r(v) for k, v in res["exit"].items()},
        "net_after_exit": _r(res["net_after_exit"]),
        "net_after_exit_gain": _r(res["net_after_exit"] - paid_in),
        "positions": [{k: (_r(v) if isinstance(v, float) else v) for k, v in d.items()} for d in res["positions"]],
        "notes": res["notes"],
    }


def _product_costs(assets: dict) -> list[dict]:
    """TER por activo (solo informativo). Si la fuente falla, «No disponible»."""
    tickers = sorted(assets)
    fallback = {"status": "not_available", "value": None, "source": None,
                "reason": "No se pudo consultar el TER en este momento."}

    def one(t):
        try:
            return ms.get_ter(t)
        except MarketDataError:
            return fallback

    results, _ = bt._parallel(one, tickers)
    out = []
    for t in tickers:
        ter = results.get(t) or fallback
        out.append({"ticker": t, "name": assets[t]["name"], "type": assets[t]["type"],
                    "ter_status": ter["status"], "ter": ter["value"], "source": ter["source"],
                    "reason": ter["reason"]})
    return out


def analyze(strategies: list[dict], period: Optional[str] = None, start: Optional[str] = None,
            end: Optional[str] = None, custom: Optional[dict] = None) -> dict:
    strats = bt._validate_strategies(strategies, min_count=1)
    custom_schedule = build_custom_schedule(custom)

    brokers = _brokers()
    schedules: dict[str, Optional[dict]] = {NONE_ID: None, **brokers}
    scenarios = [{"id": NONE_ID, "name": "Sin costes de intermediación", "kind": "none"}]
    scenarios += [_public_broker(b) for b in brokers.values()]
    if custom_schedule:
        schedules[CUSTOM_ID] = custom_schedule
        scenarios.append({"id": CUSTOM_ID, "name": "Costes personalizados", "kind": "custom",
                          "inputs": custom_schedule["inputs"]})

    ctx = bt.prepare_window(strats, period, start, end)
    if "no_data" in ctx:
        nd = ctx["no_data"]
        nd.update({"scenarios": scenarios, "dataset_version": load_dataset()["dataset_version"],
                   "product_costs": []})
        return nd

    window, assets_raw, fx = ctx["window"], ctx["assets"], dict(ctx["fx"])
    assets = {t: costs.Asset(t, a["type"], a["currency"]) for t, a in assets_raw.items()}

    # Tipos de cambio que hacen falta para importes fijos o tramos en otra divisa.
    extra = sorted(_needed_currencies(list(assets.values()), schedules) - set(fx))
    if extra:
        loaded, errors = bt._parallel(bt._load_fx, extra)
        if errors:
            raise UnusableAsset(" ".join(errors.values()))
        fx.update(loaded)
    fx_df = pd.concat(fx, axis=1).sort_index().ffill() if fx else None

    notices = ctx["notices"]
    results = []
    for s in strats:
        prices = window[list(s["weights"])]
        values, flows = bt.simulate_strategy(s, window)
        index = bt.portfolio.twr_index(values["__total__"], values["__flow__"]).dropna()
        trades = costs.initial_trades(prices, s["weights"], s["capital"])
        trades += [costs.Trade(f.date, f.ticker, f.amount, "periodic") for f in flows]
        if s["contributions"] and not flows:
            notices.append({"code": f"no_flows_{s['id']}",
                            "message": f"Ninguna aportación periódica de «{s['name']}» cae dentro de este periodo."})
        by_scenario = {
            sid: _format_costs(costs.simulate_costs(assets, prices, trades, sch, fx_df))
            for sid, sch in schedules.items()
        }
        gross_final = float(values["__total__"].iloc[-1])
        contributed = s["capital"] + sum(f.amount for f in flows)
        results.append({
            "id": s["id"],
            "name": s["name"],
            "initial_capital": _r(s["capital"]),
            "contributions_total": _r(contributed - s["capital"]),
            "total_contributed": _r(contributed),
            "n_contributions": len(flows),
            "planned_contributions": s["contributions"],
            "gross_final": _r(gross_final),
            "gross_gain": _r(gross_final - contributed),
            "gross_twr": round(float(index.iloc[-1] / index.iloc[0] - 1), 6) if len(index) else None,
            "assets": [{"ticker": t, "name": assets_raw[t]["name"], "type": assets[t].asset_type,
                        "currency": assets[t].currency, "market": assets[t].market,
                        "weight": s["weights_pct"][t], "allocation": _r(s["capital"] * w)}
                       for t, w in s["weights"].items()],
            "costs": by_scenario,
        })

    return {
        "status": "ok",
        "message": None,
        "base_currency": bt.BASE_CURRENCY,
        "method": {"rebalancing": "buy_and_hold", "prices": "adjusted_close", "alignment": "common_dates",
                   "ter": "already_in_prices", "custody_last_quarter": "charged_prorated",
                   "contributions": any(s["contributions"] for s in strats)},
        **bt.window_summary(ctx),
        "dataset_version": load_dataset()["dataset_version"],
        "scenarios": scenarios,
        "strategies": results,
        "product_costs": _product_costs(assets_raw),
    }

# ---------------------------------------------------------------------------
# Sensibilidad a costes (simulación educativa, separada del backtest histórico)
# ---------------------------------------------------------------------------
SENS_LIMITS = {"capital": (100, 10_000_000), "years": (1, 40), "annual_return_pct": (-10, 15), "recurring_pct": (0, 3)}


def sensitivity(capital, years, annual_return_pct, recurring_pct, broker: str = "none", market: str = "EUROZONE") -> dict:
    """
    Ejercicio hipotético: cómo erosionan los costes el interés compuesto según el
    perfil de rotación. Nunca se mezcla con el resultado histórico real.
    """
    from analytics import sensitivity as sens

    vals = {"capital": capital, "years": years, "annual_return_pct": annual_return_pct, "recurring_pct": recurring_pct}
    for k, (lo, hi) in SENS_LIMITS.items():
        v = vals[k]
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v != v or not lo <= v <= hi:
            raise InvalidCostScenario(f"Sensibilidad a costes: el valor de «{k}» debe estar entre {lo} y {hi}.")
    if market not in sens.MARKETS:
        raise InvalidCostScenario("Sensibilidad a costes: mercado no válido.")
    brokers = _brokers()
    if broker != NONE_ID and broker not in brokers:
        raise InvalidCostScenario("Sensibilidad a costes: el intermediario elegido no existe.")
    schedule = brokers.get(broker)

    m = sens.MARKETS[market]
    if schedule:
        reason = costs.coverage(schedule, costs.Asset(m["ticker"], "ETF", m["currency"]))
        if reason:
            raise InvalidCostScenario(f"Sensibilidad a costes: {schedule['name']} no cubre este caso ({reason}).")

    # Tipos de cambio para comisiones fijas o tramos en otra divisa: último dato de Yahoo.
    need = _needed_currencies([costs.Asset(m["ticker"], "ETF", m["currency"])], {"s": schedule}) if schedule else set()
    rates = {}
    if need:
        loaded, errors = bt._parallel(bt._load_fx, sorted(need))
        if errors:
            raise UnusableAsset(" ".join(errors.values()))
        rates = {ccy: float(s.iloc[-1]) for ccy, s in loaded.items()}

    inp = sens.SensitivityInput(capital=float(capital), years=int(years), annual_return=annual_return_pct / 100,
                                recurring_rate=recurring_pct / 100, schedule=schedule, market=market,
                                asset_type="ETF", rates=rates)
    profiles = sens.run(inp)
    for p in profiles:
        for k in ("final_value", "no_cost_final", "difference", "paid_trading", "paid_recurring", "paid_total"):
            p[k] = _r(p[k])
        p["series"] = [{k: (_r(v) if k != "year" else v) for k, v in row.items()} for row in p["series"]]
    return {
        "kind": "educational_simulation",
        "assumptions": {
            "capital": float(capital), "years": int(years), "annual_return_pct": annual_return_pct,
            "recurring_pct": recurring_pct, "market": market, "market_label": m["label"], "asset_type": "ETF",
            "broker": broker, "broker_name": schedule["name"] if schedule else "Sin comisiones de intermediación",
            "fx_rates": rates,
        },
        "profiles": profiles,
    }
