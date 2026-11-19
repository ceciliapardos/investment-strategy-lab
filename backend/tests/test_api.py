"""Tests deterministas de la API HTTP (códigos de estado y formato de error)."""

import pytest
from fastapi.testclient import TestClient

from main import app
from services import data_provider, news_provider
from services.errors import DataProviderError
from services.news_provider import FeedError
from tests.conftest import make_daily
from tests.test_news import FakeFeeds


@pytest.fixture
def client(fake):
    return TestClient(app, raise_server_exceptions=False)


def test_root_and_health(client):
    assert client.get("/").json()["status"] == "ok"
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and "fetch_info" in body["cache"]


def test_valid_stock(client):
    r = client.get("/api/markets/quote/TSLA")
    assert r.status_code == 200 and r.json()["type"] == "Stock"


def test_unknown_ticker_404(client):
    r = client.get("/api/markets/quote/INVALIDXYZ")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "ticker_not_found"
    assert "INVALIDXYZ" in r.json()["error"]["message"]


def test_index_is_now_supported(client):
    r = client.get("/api/markets/quote/%5EGSPC")
    assert r.status_code == 200 and r.json()["type"] == "Index"


def test_unsupported_type_422(client):
    r = client.get("/api/markets/quote/EURUSD=X")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "unsupported_asset_type"


def test_bad_format_400(client):
    r = client.get("/api/markets/quote/TS%20LA")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_ticker_format"


def test_performance_endpoint(client, fake):
    fake.histories["VOO"] = make_daily([100.0 + i for i in range(300)], start="2022-01-03")
    r = client.get("/api/markets/performance/VOO", params={"period": "6M"})
    assert r.status_code == 200 and r.json()["status"] == "ok"
    r = client.get("/api/markets/performance/VOO", params={"start": "2022-02-01", "end": "2022-06-30"})
    assert r.status_code == 200 and r.json()["period"] == "CUSTOM"


def test_performance_bad_period_and_dates(client, fake):
    fake.histories["VOO"] = make_daily([100.0, 101.0, 102.0], start="2022-01-03")
    r = client.get("/api/markets/performance/VOO", params={"period": "3X"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_period"
    r = client.get("/api/markets/performance/VOO", params={"start": "2022-06-01", "end": "2022-01-01"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_date_range"


def test_search_requires_query(client):
    assert client.get("/api/markets/search").status_code == 422
    r = client.get("/api/markets/search", params={"q": "s&p"})
    assert r.status_code == 200 and len(r.json()["results"]) == 7


def test_provider_failure_502(client, monkeypatch):
    def boom(*_):
        raise DataProviderError("No se pudieron obtener los datos del activo desde Yahoo Finance.")
    monkeypatch.setattr(data_provider, "fetch_info", boom)
    r = client.get("/api/markets/quote/TSLA")
    assert r.status_code == 502
    assert r.json()["error"]["code"] == "data_provider_error"


def test_unexpected_error_does_not_leak_details(client, monkeypatch):
    def boom(*_):
        raise RuntimeError("detalle interno secreto")
    monkeypatch.setattr(data_provider, "fetch_info", boom)
    r = client.get("/api/markets/quote/TSLA")
    assert r.status_code == 500
    assert "secreto" not in r.text
    assert r.json()["error"]["code"] == "internal_error"


# ---------------- News ----------------
def test_news_endpoints(client, monkeypatch):
    monkeypatch.setattr(news_provider, "fetch_feed", FakeFeeds())
    assert client.get("/api/news/categories").json()["categories"][0]["key"] == "all"
    r = client.get("/api/news")
    assert r.status_code == 200 and r.json()["items"]
    r = client.get("/api/news", params={"category": "etfs"})
    assert r.status_code == 200 and r.json()["label"] == "ETFs"
    r = client.get("/api/news/search", params={"q": "inflación"})
    assert r.status_code == 200 and r.json()["items"]


def test_news_unavailable_503(client, monkeypatch):
    def down(*a, **k):
        raise FeedError("timeout")
    monkeypatch.setattr(news_provider, "fetch_feed", down)
    r = client.get("/api/news")
    assert r.status_code == 503 and r.json()["error"]["code"] == "news_unavailable"
    r = client.get("/api/news/search", params={"q": "bolsa"})
    assert r.status_code == 503


def test_news_bad_input_400(client):
    assert client.get("/api/news", params={"category": "deportes"}).status_code == 400
    assert client.get("/api/news/search", params={"q": "a"}).status_code == 400
