"""
Fase 9 — Experimentos con Investment Strategy Lab (V0.11).

NO contiene lógica de cálculo: solo envía escenarios fijos a la API EXISTENTE de la
aplicación en marcha y guarda las respuestas (JSON completos + CSV resumidos) en esta
carpeta. Ver «Experimentos y resultados.md».

Uso (con el backend arrancado, p. ej. con start_backend.bat):
    python experimentos.py                # API en http://127.0.0.1:8000
    python experimentos.py http://host:8000
"""
import csv
import json
import sys
from pathlib import Path

import requests

API = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/") + "/api"
OUT = Path(__file__).resolve().parent
P10 = {"start": "2016-11-18", "end": "2026-11-18"}
P5 = {"start": "2021-11-18", "end": "2026-11-18"}
BENCH = "sp500tr"
MAIN_BROKER = "ing"


def post(path, body):
    r = requests.post(f"{API}{path}", json=body, timeout=300)
    j = r.json()
    if r.status_code != 200:
        raise SystemExit(f"{path} -> HTTP {r.status_code}: {j}")
    return j


def save_json(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def save_csv(name, rows):
    if not rows:
        return
    with open(OUT / name, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(rows)


def strategy(sid, name, weights, contrib=None, freq=None, capital=10_000):
    """weights = {ticker: %}; contrib = {ticker: € por aportación}."""
    s = {"id": sid, "name": name, "initialCapital": capital, "baseCurrency": "EUR",
         "assets": [{"ticker": t, "weight": w} for t, w in weights.items()], "recurringContributions": []}
    for i, (t, a) in enumerate((contrib or {}).items()):
        s["recurringContributions"].append({"id": f"{sid}-c{i}", "ticker": t, "amount": a, "frequency": freq})
    return s


BASE_W = {"IWDA.AS": 70, "EUNH.DE": 30}
MONTHLY = strategy("base_mensual", "BASE 70/30 · mensual 300 €", BASE_W, {"IWDA.AS": 210, "EUNH.DE": 90}, "monthly")
QUARTERLY = strategy("base_trimestral", "BASE 70/30 · trimestral 900 €", BASE_W, {"IWDA.AS": 630, "EUNH.DE": 270}, "quarterly")
ANNUAL = strategy("base_anual", "BASE 70/30 · anual 3.600 €", BASE_W, {"IWDA.AS": 2520, "EUNH.DE": 1080}, "annual")
BASE_NOCONTRIB = strategy("base_sin_aport", "BASE 70/30 · sin aportaciones", BASE_W)
A = strategy("A_global", "A · Global 100 % RV", {"IWDA.AS": 100})
B = strategy("B_mixta", "B · Mixta 60/40", {"IWDA.AS": 60, "EUNH.DE": 40})
C = strategy("C_espana", "C · Concentrada España", {"SAN.MC": 33.34, "ITX.MC": 33.33, "IBE.MC": 33.33})


def cost_rows(res, scenario_names):
    rows = []
    for s in res["strategies"]:
        for sc_id, c in s["costs"].items():
            d, e = c["during"], c["exit"]
            rows.append({
                "estrategia": s["name"], "escenario": scenario_names.get(sc_id, sc_id), "id": sc_id,
                "completo": c["complete"], "no_cubierto": "|".join(map(str, c["uncovered"])),
                "aportado_total": s["total_contributed"], "n_aportaciones": s["n_contributions"],
                "compras_iniciales": c["trades"]["initial"], "compras_periodicas": c["trades"]["periodic"],
                "valor_bruto": s["gross_final"], "twr_bruta": s["gross_twr"],
                "coste_compras": d["buy"], "coste_divisa": d["fx"], "custodia": d["custody"],
                "mantenimiento": d["maintenance"], "costes_durante": d["total"],
                "valor_neto": c["net_final"], "impacto": c["impact"],
                "impacto_pct_aportado": c["impact_pct_contributed"], "costes_pct_valor_final_bruto": round(d["total"] / s["gross_final"], 6),
                "salida_estimada": e["total"], "valor_neto_tras_salida": c["net_after_exit"],
                "notas": " | ".join(c["notes"]),
            })
    return rows


def metric_rows(res):
    rows = []
    for s in res["strategies"]:
        m, ctr = s["metrics"], s.get("contributions") or {}
        rows.append({"estrategia": s["name"], "inicio": res["effective"]["start"], "fin": res["effective"]["end"],
                     "observaciones": res["effective"]["observations"],
                     "aportado_total": ctr.get("total_contributed", s["initial_capital"]), "n_aportaciones": ctr.get("count", 0),
                     "valor_final": s["final_value"], "rent_total_twr": m["total_return"], "cagr": m["cagr"],
                     "volatilidad": m["volatility"], "sharpe_rf0": m["sharpe"],
                     "max_caida": m["max_drawdown"]["value"] if m["max_drawdown"] else None,
                     "max_caida_pico": (m["max_drawdown"] or {}).get("peak_date"), "max_caida_valle": (m["max_drawdown"] or {}).get("trough_date")})
    b = res.get("benchmark")
    if b and b.get("status") == "ok":
        m = b["metrics"]
        rows.append({"estrategia": f"BENCHMARK {b['name']}", "inicio": b["effective"]["start"], "fin": b["effective"]["end"],
                     "observaciones": b["effective"]["observations"], "aportado_total": None, "n_aportaciones": None,
                     "valor_final": None, "rent_total_twr": m["total_return"], "cagr": m["cagr"], "volatilidad": m["volatility"],
                     "sharpe_rf0": m["sharpe"], "max_caida": m["max_drawdown"]["value"],
                     "max_caida_pico": m["max_drawdown"]["peak_date"], "max_caida_valle": m["max_drawdown"]["trough_date"]})
    return rows


def main():
    # E1 + E2 — costes (misma estrategia, todos los intermediarios; tres frecuencias)
    c10 = post("/costs/analyze", {"strategies": [MONTHLY, QUARTERLY, ANNUAL], **P10})
    names = {s["id"]: s["name"] for s in c10["scenarios"]}
    save_json("e1_e2_costes_10a.json", c10)
    save_csv("e1_e2_costes_10a.csv", cost_rows(c10, names))
    # E2 — métricas de mercado de las tres frecuencias (sin costes)
    b2 = post("/comparison/backtest", {"strategies": [MONTHLY, QUARTERLY, ANNUAL], **P10, "benchmark": BENCH})
    save_json("e2_backtest_10a.json", b2)
    save_csv("e2_metricas_10a.csv", metric_rows(b2))
    # E3 — tres estrategias, mismo periodo y benchmark (+ costes buy & hold con el intermediario principal)
    b3 = post("/comparison/backtest", {"strategies": [A, B, C], **P10, "benchmark": BENCH})
    save_json("e3_backtest_10a.json", b3)
    save_csv("e3_metricas_10a.csv", metric_rows(b3))
    c3 = post("/costs/analyze", {"strategies": [A, B, C], **P10})
    save_json("e3_costes_10a.json", c3)
    save_csv("e3_costes_10a.csv", [r for r in cost_rows(c3, names) if r["id"] in ("none", MAIN_BROKER)])
    # E4 — misma estrategia, 5 frente a 10 años
    for tag, per in (("10a", P10), ("5a", P5)):
        b4 = post("/comparison/backtest", {"strategies": [MONTHLY, BASE_NOCONTRIB], **per, "benchmark": BENCH})
        save_json(f"e4_backtest_{tag}.json", b4)
        save_csv(f"e4_metricas_{tag}.csv", metric_rows(b4))
        c4 = post("/costs/analyze", {"strategies": [MONTHLY, BASE_NOCONTRIB], **per})
        save_json(f"e4_costes_{tag}.json", c4)
        save_csv(f"e4_costes_{tag}.csv", [r for r in cost_rows(c4, names) if r["id"] in ("none", MAIN_BROKER)])
    # E5 — sensibilidad a costes y rotación (simulación hipotética, no histórica)
    rows = []
    for broker, years in ((MAIN_BROKER, 10), (MAIN_BROKER, 20), ("myinvestor", 10), ("bankinter_std", 10)):
        r = post("/costs/sensitivity", {"capital": 10_000, "years": years, "annual_return_pct": 5.0,
                                        "recurring_pct": 0.0, "broker": broker, "market": "EUROZONE"})
        save_json(f"e5_sensibilidad_{broker}_{years}a.json", r)
        for p in r["profiles"]:
            rows.append({"intermediario": broker, "anios": years, "perfil": p["name"], "rotacion": p["turnover"],
                         "ordenes_anio": p["orders_per_year"], "ordenes_totales": 1 + p["orders_per_year"] * years,
                         "pagado_operativa": p["paid_trading"], "pagado_recurrente": p["paid_recurring"],
                         "pagado_total": p["paid_total"], "valor_final": p["final_value"],
                         "valor_sin_costes": p["no_cost_final"], "diferencia": p["difference"],
                         "diferencia_pct": round(p["difference"] / p["no_cost_final"], 6)})
    save_csv("e5_sensibilidad.csv", rows)
    print("OK. Resultados guardados en", OUT)


if __name__ == "__main__":
    main()
