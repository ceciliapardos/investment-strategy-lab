"""Tests deterministas de clasificación, ficha, TER y búsqueda (proveedor falso)."""

import pytest

from services import market_service as ms
from services.errors import InvalidTickerFormat, TickerNotFound, UnsupportedAssetType


# ---------------- Formato de ticker ----------------
@pytest.mark.parametrize("bad", ["", "   ", "TS LA", "A" * 25, "VOO;DROP", "<script>"])
def test_invalid_ticker_format(fake, bad):
    with pytest.raises(InvalidTickerFormat):
        ms.get_quote(bad)


def test_ticker_is_normalized(fake):
    assert ms.get_quote("  tsla ")["ticker"] == "TSLA"


# ---------------- Clasificación ----------------
@pytest.mark.parametrize("sym, expected", [
    ("TSLA", "Stock"), ("VOO", "ETF"), ("^GSPC", "Index"),
    ("BTC-USD", "Crypto"), ("ES=F", "Future"), ("VFIAX", "Fund"),
])
def test_supported_types(fake, sym, expected):
    assert ms.get_quote(sym)["type"] == expected


def test_currency_pairs_remain_unsupported(fake):
    with pytest.raises(UnsupportedAssetType):
        ms.get_quote("EURUSD=X")


def test_unknown_ticker_is_not_found(fake):
    for fn in (ms.get_quote, ms.get_ter, ms.get_performance):
        with pytest.raises(TickerNotFound):
            fn("INVALIDXYZ")


def test_type_notes_only_where_relevant(fake):
    assert ms.get_quote("TSLA")["type_note"] is None
    assert "dividendos" in ms.get_quote("^GSPC")["type_note"]
    assert "365" in ms.get_quote("BTC-USD")["type_note"]


# ---------------- Ficha ----------------
def test_quote_fields(fake):
    q = ms.get_quote("TSLA")
    assert (q["ticker"], q["name"], q["type"], q["currency"], q["price"], q["exchange"]) == (
        "TSLA", "Tesla, Inc.", "Stock", "USD", 251.5, "NasdaqGS")


def test_quote_price_falls_back_to_info(fake):
    fake.prices.pop("TSLA")
    assert ms.get_quote("TSLA")["price"] == 250.0


# ---------------- TER ----------------
@pytest.mark.parametrize("sym", ["TSLA", "^GSPC", "BTC-USD", "ES=F"])
def test_ter_not_applicable_with_reason(fake, sym):
    t = ms.get_ter(sym)
    assert t["status"] == "not_applicable" and t["value"] is None and t["reason"]


def test_ter_etf_from_fund_operations_uses_fund_column(fake):
    t = ms.get_ter("VOO")
    assert t["status"] == "available"
    assert t["value"] == pytest.approx(0.0003)  # no 0.0072 (media de la categoría)
    assert t["source"] == "yahoo_fund_operations"


def test_ter_fund(fake):
    assert ms.get_ter("VFIAX")["value"] == pytest.approx(0.0004)
    assert ms.get_ter("NOTERFUND")["status"] == "not_available"


def test_ter_net_expense_ratio_is_in_percentage_points(fake):
    # Regresión del posible error x100: 0.07 en info significa 0,07 %, no 7 %.
    t = ms.get_ter("ONLYNET.L")
    assert t["value"] == pytest.approx(0.0007)
    assert t["source"] == "yahoo_net_expense_ratio"


def test_ter_etf_without_data_is_not_available(fake):
    t = ms.get_ter("NOTER.DE")
    assert t["status"] == "not_available" and t["value"] is None


def test_ter_implausible_value_is_discarded(fake):
    assert ms.get_ter("ZERO")["status"] == "not_available"


# ---------------- Búsqueda ----------------
def test_search_returns_supported_types_without_duplicates(fake):
    res = ms.search_assets("s&p 500")
    assert [r["ticker"] for r in res] == ["^GSPC", "SPY", "ES=F", "VOO", "BTC-USD", "VFIAX", "AAPL"]
    assert "EURUSD=X" not in [r["ticker"] for r in res]
    assert res[1]["exchange"] == "NYSEArca"


def test_search_empty_query(fake):
    assert ms.search_assets("   ") == []
    assert fake.calls["search"] == 0
