"""
Acceso a datos de mercado (Yahoo Finance mediante yfinance).

Este es el ÚNICO módulo que importa yfinance. El resto del backend trabaja con
los resultados que devuelve, lo que permite sustituirlo en los tests por un
proveedor falso y, en el futuro, cambiar de fuente sin tocar la lógica.

Todas las funciones están cacheadas (ver services/cache.py). Los TTL reflejan
lo rápido que cambia cada dato.
"""

from __future__ import annotations

import logging
from typing import Optional

import pandas as pd
import yfinance as yf

from services.cache import ttl_cached
from services.errors import DataProviderError

log = logging.getLogger(__name__)

# Caducidad de la caché (segundos)
TTL_SEARCH = 10 * 60
TTL_INFO = 60 * 60          # nombre, tipo, divisa, mercado: cambian muy poco
TTL_PRICE = 60              # último precio
TTL_HISTORY_DAILY = 60 * 60
TTL_FUND_OPERATIONS = 24 * 60 * 60  # TER: dato anual


@ttl_cached(TTL_SEARCH)
def search(query: str, max_results: int) -> list[dict]:
    try:
        return list(yf.Search(query, max_results=max_results).quotes or [])
    except Exception as exc:  # red, cambios de Yahoo, límites de uso...
        log.warning("Yahoo search failed for %r: %s", query, exc)
        raise DataProviderError(
            "No se pudo consultar el buscador de Yahoo Finance. Inténtalo de nuevo en unos segundos."
        ) from exc


@ttl_cached(TTL_INFO)
def fetch_info(symbol: str) -> dict:
    """Metadatos del activo. Para un ticker inexistente Yahoo devuelve un dict casi vacío."""
    try:
        return dict(yf.Ticker(symbol).info or {})
    except Exception as exc:
        log.warning("Yahoo info failed for %s: %s", symbol, exc)
        raise DataProviderError(
            "No se pudieron obtener los datos del activo desde Yahoo Finance."
        ) from exc


@ttl_cached(TTL_PRICE)
def fetch_last_price(symbol: str) -> Optional[float]:
    try:
        price = yf.Ticker(symbol).fast_info.get("lastPrice")
    except Exception as exc:
        log.info("fast_info lastPrice unavailable for %s: %s", symbol, exc)
        return None
    return float(price) if price is not None and pd.notna(price) else None


@ttl_cached(TTL_HISTORY_DAILY)
def fetch_daily_history(symbol: str) -> pd.DataFrame:
    """
    Histórico DIARIO completo del activo (period='max').

    auto_adjust=False para obtener a la vez:
      - 'Close':     cierre de cotización (Yahoo ya lo ajusta por splits, NO por dividendos)
      - 'Adj Close': cierre ajustado por splits y dividendos (dividendos reinvertidos)

    Se descarga una vez por activo y cualquier periodo o rango de fechas se
    obtiene recortando esta serie, sin nuevas llamadas a Yahoo.
    """
    try:
        df = yf.Ticker(symbol).history(period="max", interval="1d", auto_adjust=False)
    except Exception as exc:
        log.warning("Yahoo daily history failed for %s: %s", symbol, exc)
        raise DataProviderError(
            "No se pudo descargar el histórico de precios desde Yahoo Finance."
        ) from exc
    return df if df is not None else pd.DataFrame()


@ttl_cached(TTL_FUND_OPERATIONS)
def fetch_fund_operations(symbol: str) -> Optional[pd.DataFrame]:
    """Tabla 'fund_operations' de yfinance (incluye el expense ratio anual del fondo)."""
    try:
        ops = yf.Ticker(symbol).funds_data.fund_operations
    except Exception as exc:
        log.info("fund_operations unavailable for %s: %s", symbol, exc)
        return None
    return ops if isinstance(ops, pd.DataFrame) and not ops.empty else None
