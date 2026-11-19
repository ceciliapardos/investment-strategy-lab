"""
Tests E2E contra la aplicación EN EJECUCIÓN (backend :8000 y frontend :5173).

    python -m pytest -m e2e

Comprueban HTTP real a través del proxy de Vite. La interacción visual
(clicks, gráfico, colores) se valida manualmente: ver Acceptance tests.md.
"""

import json
import urllib.error
import urllib.parse
import urllib.request

import pytest

pytestmark = pytest.mark.e2e

FE = "http://localhost:5173"
BE = "http://localhost:8000"


def get(url):
    """Devuelve (status, body) también para respuestas 4xx/5xx."""
    try:
        with urllib.request.urlopen(url, timeout=40) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def test_backend_health():
    status, body = get(f"{BE}/api/health")
    assert status == 200 and json.loads(body)["status"] == "ok"


@pytest.mark.parametrize("path", ["/", "/markets", "/news", "/strategy-builder", "/comparison", "/costs"])
def test_frontend_routes_serve_the_app(path):
    status, body = get(f"{FE}{path}")
    assert status == 200
    assert '<div id="root">' in body


def test_proxy_valid_stock_and_etf():
    s1, b1 = get(f"{FE}/api/markets/quote/TSLA")
    s2, b2 = get(f"{FE}/api/markets/quote/VOO")
    assert s1 == 200 and json.loads(b1)["type"] == "Stock"
    assert s2 == 200 and json.loads(b2)["type"] == "ETF"


def test_proxy_invalid_ticker_404():
    status, body = get(f"{FE}/api/markets/quote/INVALIDTICKERXYZ")
    assert status == 404
    assert json.loads(body)["error"]["code"] == "ticker_not_found"


def test_proxy_performance_preset_and_custom():
    s, b = get(f"{FE}/api/markets/performance/VOO?period=5Y")
    assert s == 200 and json.loads(b)["metrics"]["cagr"] is not None
    s, b = get(f"{FE}/api/markets/performance/VOO?start=2024-01-06&end=2024-06-30")
    assert s == 200 and json.loads(b)["start"]["date"] == "2024-01-08"


def test_proxy_ter_rules():
    _, tsla = get(f"{FE}/api/markets/ter/TSLA")
    _, voo = get(f"{FE}/api/markets/ter/VOO")
    assert json.loads(tsla)["status"] == "not_applicable"
    assert json.loads(voo)["status"] == "available"


def test_proxy_news():
    s, b = get(f"{FE}/api/news")
    assert s == 200 and json.loads(b)["items"]
    s, b = get(f"{FE}/api/news/search?q=" + urllib.parse.quote("inflación"))
    assert s == 200
