"""Rutas /api/costs/* (validan la forma de la petición y delegan)."""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from routers.comparison import StrategyIn
from services import cost_service

router = APIRouter()


class CustomCostsIn(BaseModel):
    """Costes introducidos por el usuario. Porcentajes en % (0,25 = 0,25 %)."""
    buy_fixed: Optional[float] = None
    buy_rate: Optional[float] = None
    buy_min: Optional[float] = None
    sell_fixed: Optional[float] = None
    sell_rate: Optional[float] = None
    sell_min: Optional[float] = None
    fx_rate: Optional[float] = None
    custody_rate: Optional[float] = None
    maintenance: Optional[float] = None


class AnalyzeIn(BaseModel):
    strategies: list[StrategyIn] = Field(..., max_length=10)
    period: Optional[str] = Field(default=None, max_length=5)
    start: Optional[str] = Field(default=None, max_length=10)
    end: Optional[str] = Field(default=None, max_length=10)
    custom: Optional[CustomCostsIn] = None


class SensitivityIn(BaseModel):
    """Supuestos del ejercicio de sensibilidad (hipotético, separado del backtest real)."""
    capital: float
    years: int
    annual_return_pct: float
    recurring_pct: float = 0.0
    broker: str = Field(default="none", max_length=40)
    market: str = Field(default="EUROZONE", max_length=12)


@router.post("/sensitivity")
def sensitivity(body: SensitivityIn):
    """Cómo erosionan los costes el interés compuesto según el perfil de rotación (simulación educativa)."""
    return cost_service.sensitivity(body.capital, body.years, body.annual_return_pct, body.recurring_pct,
                                    body.broker, body.market)


@router.get("/brokers")
def brokers():
    """Intermediarios del dataset versionado, con fuente y fecha de consulta."""
    return cost_service.list_brokers()


@router.post("/analyze")
def analyze(body: AnalyzeIn):
    """
    Costes de intermediación de 1 a 6 estrategias sobre el backtest histórico
    (misma ventana y precios que Strategy Comparison), para todos los escenarios:
    sin costes, cada intermediario del dataset y, si se envía, el personalizado.
    """
    return cost_service.analyze(
        [s.model_dump() for s in body.strategies], body.period, body.start, body.end,
        body.custom.model_dump() if body.custom else None,
    )
