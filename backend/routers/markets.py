"""
Rutas /api/markets/*.

Las rutas solo validan parámetros y delegan en services.market_service.
Los errores de dominio (ticker no encontrado, tipo no soportado...) se
convierten en respuestas HTTP en main.py.
"""

from typing import Optional

from fastapi import APIRouter, Query

from services import market_service

router = APIRouter()


@router.get("/search")
def search(q: str = Query(..., min_length=1, max_length=60)):
    """Busca acciones y ETFs por ticker o nombre."""
    return {"results": market_service.search_assets(q)}


@router.get("/quote/{ticker}")
def quote(ticker: str):
    """Precio actual y metadatos. 404 si no existe; 422 si no es acción ni ETF."""
    return market_service.get_quote(ticker)


@router.get("/performance/{ticker}")
def performance(
    ticker: str,
    period: Optional[str] = Query(default=None, max_length=5),
    start: Optional[str] = Query(default=None, max_length=10, description="AAAA-MM-DD"),
    end: Optional[str] = Query(default=None, max_length=10, description="AAAA-MM-DD"),
):
    """
    Rendimiento histórico con datos diarios.
    - Periodo predefinido: period = 1M, 6M, YTD, 1Y, 5Y, 10Y, MAX (por defecto 1Y)
    - Rango personalizado: start y end (tienen prioridad sobre period)
    """
    return market_service.get_performance(ticker, period, start, end)


@router.get("/ter/{ticker}")
def ter(ticker: str):
    """TER / expense ratio. Acción -> no aplica. ETF sin dato -> no disponible."""
    return market_service.get_ter(ticker)
