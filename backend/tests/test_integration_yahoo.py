"""
Tests de INTEGRACIÓN con Yahoo Finance real (requieren internet).

    python -m pytest -m integration

No comprueban si un activo ha subido o bajado (eso depende del mercado), sino
que la estructura, la clasificación y los cálculos son coherentes.
"""

from datetime import date, timedelta

import pytest

from services import market_service as ms
from services.cache import cache_stats
from services.errors import TickerNotFound, UnsupportedAssetType

pytestmark = pytest.mark.integration


def test_tsla_is_a_stock_without_ter():
    q = ms.get_quote("TSLA")
    assert q["type"] == "Stock" and q["currency"] == "USD" and q["price"] > 0
    assert ms.get_ter("TSLA")["status"] == "not_applicable"


def test_voo_is_an_etf_with_plausible_ter():
    q = ms.get_quote("VOO")
    assert q["type"] == "ETF" and q["price"] > 0
    t = ms.get_ter("VOO")
    assert t["status"] == "available"
    assert 0 < t["value"] <= 0.01  # VOO publica 0,03 %; nunca un 3 %


def test_ucits_etf_never_gets_an_invented_ter():
    t = ms.get_ter("VWCE.DE")
    assert t["applicable"] is True
    assert t["status"] in {"available", "not_available"}
    if t["status"] == "available":
        assert 0 < t["value"] <= 0.05


@pytest.mark.parametrize("sym, expected", [
    ("^GSPC", "Index"), ("BTC-USD", "Crypto"), ("ES=F", "Future"), ("VFIAX", "Fund"),
])
def test_new_asset_types(sym, expected):
    assert ms.get_quote(sym)["type"] == expected
    r = ms.get_performance(sym, "1Y")
    assert r["status"] == "ok" and r["observations"] > 100


def test_invalid_ticker_not_found():
    with pytest.raises(TickerNotFound):
        ms.get_quote("INVALIDTICKERXYZ")


def test_currency_pair_unsupported():
    with pytest.raises(UnsupportedAssetType):
        ms.get_quote("EURUSD=X")


def test_search_only_returns_supported_types():
    res = ms.search_assets("S&P 500")
    assert res, "La búsqueda no devolvió resultados"
    assert {r["type"] for r in res} <= set(ms.SUPPORTED_TYPES.values())


@pytest.mark.parametrize("period", list(ms.PRESETS))
def test_performance_structure(period):
    r = ms.get_performance("VOO", period)
    assert r["status"] == "ok", r["message"]
    dates = [p["date"] for p in r["series"]]
    assert dates == sorted(dates) and len(set(dates)) == len(dates)
    first, last = r["start"]["adj"], r["end"]["adj"]
    assert r["metrics"]["total_return"] == pytest.approx(last / first - 1, abs=1e-4)
    assert r["metrics"]["max_drawdown"]["value"] <= 0
    assert all(p["dd"] <= 0 for p in r["series"])


def test_ten_years_really_covers_ten_years():
    r = ms.get_performance("VOO", "10Y")
    start, end = date.fromisoformat(r["start"]["date"]), date.fromisoformat(r["end"]["date"])
    assert abs((end - start) - timedelta(days=3652)) < timedelta(days=6)
    assert r["metrics"]["cagr"] is not None


def test_custom_range_with_weekend_start():
    # 2024-01-06 fue sábado.
    r = ms.get_performance("VOO", start="2024-01-06", end="2024-06-30")
    assert r["start"]["date"] == "2024-01-08"
    assert r["metrics"]["cagr"] is None


def test_voo_dividends_make_total_return_exceed_price_return():
    m = ms.get_performance("VOO", "5Y")["metrics"]
    assert m["total_return"] > m["price_return"]


def test_repeated_requests_use_cache():
    ms.get_performance("TSLA", "1Y")
    misses = cache_stats()["fetch_daily_history"]["misses"]
    for p in ("1M", "5Y", "MAX"):
        ms.get_performance("TSLA", p)
    ms.get_performance("TSLA", start="2020-01-01", end="2021-01-01")
    assert cache_stats()["fetch_daily_history"]["misses"] == misses
