"""
Errores de dominio. Las rutas API los traducen a códigos HTTP en main.py.
Los mensajes están pensados para mostrarse directamente al usuario.
"""


class MarketDataError(Exception):
    code = "error"
    http_status = 500

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidTickerFormat(MarketDataError):
    code = "invalid_ticker_format"
    http_status = 400


class InvalidPeriod(MarketDataError):
    code = "invalid_period"
    http_status = 400


class InvalidDateRange(MarketDataError):
    code = "invalid_date_range"
    http_status = 400


class InvalidComparison(MarketDataError):
    """La petición de comparación no es válida (nº de estrategias, pesos, capital...)."""

    code = "invalid_comparison"
    http_status = 400


class InvalidCostScenario(MarketDataError):
    """Los costes personalizados introducidos no son válidos."""

    code = "invalid_cost_scenario"
    http_status = 400


class UnusableAsset(MarketDataError):
    """Algún activo no existe, no está soportado o no tiene datos utilizables."""

    code = "unusable_asset"
    http_status = 422


class InvalidNewsQuery(MarketDataError):
    code = "invalid_news_query"
    http_status = 400


class NewsUnavailable(MarketDataError):
    """Ninguna fuente de noticias respondió."""

    code = "news_unavailable"
    http_status = 503


class TickerNotFound(MarketDataError):
    code = "ticker_not_found"
    http_status = 404


class UnsupportedAssetType(MarketDataError):
    code = "unsupported_asset_type"
    http_status = 422


class DataProviderError(MarketDataError):
    """La fuente de datos (Yahoo Finance) no respondió correctamente."""

    code = "data_provider_error"
    http_status = 502
