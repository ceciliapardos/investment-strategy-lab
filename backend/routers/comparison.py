"""Rutas /api/comparison/* (solo validan la forma de la petición y delegan)."""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services import backtest_service

router = APIRouter()


class AssetIn(BaseModel):
    ticker: str = Field(..., max_length=20)
    weight: Optional[float] = None


class ContributionIn(BaseModel):
    """Aportación periódica a un activo de la estrategia (frecuencia: monthly | quarterly | annual)."""
    id: Optional[str] = Field(default=None, max_length=64)
    ticker: Optional[str] = Field(default=None, max_length=20)
    amount: Optional[float] = None
    frequency: Optional[str] = Field(default=None, max_length=12)


class StrategyIn(BaseModel):
    id: str = Field(..., max_length=64)
    name: str = Field(..., max_length=80)
    initialCapital: Optional[float] = None
    baseCurrency: str = "EUR"
    assets: list[AssetIn] = Field(default_factory=list, max_length=25)
    recurringContributions: list[ContributionIn] = Field(default_factory=list, max_length=50)


class BacktestIn(BaseModel):
    strategies: list[StrategyIn] = Field(..., max_length=10)
    period: Optional[str] = Field(default=None, max_length=5)
    start: Optional[str] = Field(default=None, max_length=10)
    end: Optional[str] = Field(default=None, max_length=10)
    benchmark: Optional[str] = Field(default=None, max_length=20)


@router.get("/benchmarks")
def benchmarks():
    """Índices de referencia disponibles (qué serie se usa y qué representa)."""
    return {"benchmarks": [{"id": k, **{f: v[f] for f in ("ticker", "name", "kind", "kind_label", "description")}}
                           for k, v in backtest_service.BENCHMARKS.items()]}


@router.post("/backtest")
def backtest(body: BacktestIn):
    """
    Backtest histórico (buy & hold, en euros, periodo común) de 2 a 6 estrategias.
    Periodo: period = 1Y | 3Y | 5Y | 10Y | MAX  o  start/end (AAAA-MM-DD).
    """
    return backtest_service.run_comparison(
        [s.model_dump() for s in body.strategies], body.period, body.start, body.end, benchmark=body.benchmark
    )
