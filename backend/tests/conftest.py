"""
Proveedores de datos FALSOS para los tests deterministas.

Sustituyen el acceso a Yahoo Finance y a los feeds de noticias por datos fijos,
de forma que los tests no dependen de internet ni del movimiento del mercado.
"""

import pandas as pd
import pytest

from services import data_provider, news_service
from services.cache import clear_all_caches

FAKE_INFO = {
    "TSLA": {"quoteType": "EQUITY", "longName": "Tesla, Inc.", "currency": "USD",
             "fullExchangeName": "NasdaqGS", "regularMarketPrice": 250.0},
    "VOO": {"quoteType": "ETF", "longName": "Vanguard S&P 500 ETF", "currency": "USD",
            "fullExchangeName": "NYSEArca", "netExpenseRatio": 0.03},
    # ETF con TER solo en info (en puntos porcentuales): 0.07 -> 0,07 %
    "ONLYNET.L": {"quoteType": "ETF", "longName": "ETF solo netExpenseRatio", "currency": "GBP",
                  "netExpenseRatio": 0.07},
    # ETF sin ningún dato de TER
    "NOTER.DE": {"quoteType": "ETF", "longName": "ETF sin TER", "currency": "EUR"},
    # ETF con dato no plausible (0 %)
    "ZERO": {"quoteType": "ETF", "longName": "ETF dato cero", "currency": "USD"},
    "^GSPC": {"quoteType": "INDEX", "longName": "S&P 500", "currency": "USD"},
    "BTC-USD": {"quoteType": "CRYPTOCURRENCY", "longName": "Bitcoin USD", "currency": "USD"},
    "ES=F": {"quoteType": "FUTURE", "longName": "E-Mini S&P 500", "currency": "USD"},
    "VFIAX": {"quoteType": "MUTUALFUND", "longName": "Vanguard 500 Index Admiral", "currency": "USD"},
    "NOTERFUND": {"quoteType": "MUTUALFUND", "longName": "Fondo sin TER", "currency": "EUR"},
    "EURUSD=X": {"quoteType": "CURRENCY", "longName": "EUR/USD"},
    "7203.T": {"quoteType": "EQUITY", "longName": "Toyota Motor", "currency": "JPY"},
    "QQQ": {"quoteType": "ETF", "longName": "Invesco QQQ Trust", "currency": "USD"},
    "IWDA.AS": {"quoteType": "ETF", "longName": "iShares Core MSCI World", "currency": "EUR"},
    "SAN.MC": {"quoteType": "EQUITY", "longName": "Banco Santander", "currency": "EUR"},
    "VUSA.L": {"quoteType": "ETF", "longName": "Vanguard S&P 500 UCITS (peniques)", "currency": "GBp"},
    "NOCCY": {"quoteType": "ETF", "longName": "ETF sin divisa", "currency": ""},
    "CHFETF": {"quoteType": "ETF", "longName": "ETF en francos", "currency": "CHF"},
    # Así responde Yahoo a un ticker inexistente: un dict casi vacío.
    "INVALIDXYZ": {"trailingPegRatio": None},
}

FAKE_FUND_OPS = {
    "VOO": pd.DataFrame(
        {"VOO": [0.0003, 0.02], "Category Average": [0.0072, 0.94]},
        index=["Annual Report Expense Ratio", "Annual Holdings Turnover"],
    ),
    "VFIAX": pd.DataFrame({"VFIAX": [0.0004]}, index=["Annual Report Expense Ratio"]),
    "ZERO": pd.DataFrame(
        {"ZERO": [0.0], "Category Average": [0.005]},
        index=["Annual Report Expense Ratio"],
    ),
}

FAKE_SEARCH = [
    {"symbol": "^GSPC", "quoteType": "INDEX", "shortname": "S&P 500", "exchDisp": "SNP"},
    {"symbol": "SPY", "quoteType": "ETF", "longname": "SPDR S&P 500 ETF Trust", "exchDisp": "NYSEArca"},
    {"symbol": "ES=F", "quoteType": "FUTURE", "shortname": "E-Mini S&P 500"},
    {"symbol": "VOO", "quoteType": "ETF", "longname": "Vanguard S&P 500 ETF", "exchDisp": "NYSEArca"},
    {"symbol": "VOO", "quoteType": "ETF", "longname": "Vanguard S&P 500 ETF (duplicado)"},
    {"symbol": "EURUSD=X", "quoteType": "CURRENCY", "shortname": "EUR/USD"},
    {"symbol": "OPT1", "quoteType": "OPTION", "shortname": "Una opción"},
    {"symbol": "BTC-USD", "quoteType": "CRYPTOCURRENCY", "shortname": "Bitcoin USD"},
    {"symbol": "VFIAX", "quoteType": "MUTUALFUND", "shortname": "Vanguard 500 Index Admiral"},
    {"symbol": "AAPL", "quoteType": "EQUITY", "longname": "Apple Inc.", "exchDisp": "NASDAQ"},
]


def make_daily(closes, adj=None, start="2020-01-01", freq="B", tz="America/New_York"):
    """Histórico diario sintético con columnas Close y Adj Close."""
    idx = pd.date_range(start, periods=len(closes), freq=freq, tz=tz)
    adj = closes if adj is None else adj
    return pd.DataFrame({"Close": closes, "Adj Close": adj}, index=idx)


class FakeProvider:
    def __init__(self):
        self.calls = {"info": 0, "price": 0, "history": 0, "fund_ops": 0, "search": 0}
        self.histories = {}
        self.prices = {"TSLA": 251.5, "VOO": 500.0}

    def fetch_info(self, symbol):
        self.calls["info"] += 1
        return dict(FAKE_INFO.get(symbol, {"trailingPegRatio": None}))

    def fetch_last_price(self, symbol):
        self.calls["price"] += 1
        return self.prices.get(symbol)

    def fetch_daily_history(self, symbol):
        self.calls["history"] += 1
        return self.histories.get(symbol, pd.DataFrame())

    def fetch_fund_operations(self, symbol):
        self.calls["fund_ops"] += 1
        return FAKE_FUND_OPS.get(symbol)

    def search(self, query, max_results):
        self.calls["search"] += 1
        return list(FAKE_SEARCH)


@pytest.fixture(autouse=True)
def _clear_caches():
    clear_all_caches()
    news_service.clear_news_cache()
    yield
    clear_all_caches()
    news_service.clear_news_cache()


@pytest.fixture
def fake(monkeypatch):
    fp = FakeProvider()
    for name in ("fetch_info", "fetch_last_price", "fetch_daily_history", "fetch_fund_operations", "search"):
        monkeypatch.setattr(data_provider, name, getattr(fp, name))
    return fp
