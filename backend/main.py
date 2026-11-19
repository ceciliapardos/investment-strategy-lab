"""
Investment Strategy Lab — API (FastAPI)

Arranque (desde la carpeta backend/):
    python -m uvicorn main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import comparison, costs, markets, news
from services.cache import cache_stats
from services.errors import MarketDataError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("isl")

API_VERSION = "0.3.0"

app = FastAPI(
    title="Investment Strategy Lab API",
    version=API_VERSION,
    description="API educativa de análisis histórico. No es asesoramiento financiero.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(MarketDataError)
async def market_error_handler(_: Request, exc: MarketDataError):
    return JSONResponse(
        status_code=exc.http_status,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception):
    # El detalle técnico se registra en el log, nunca se envía al usuario.
    log.exception("Unexpected error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_error",
                "message": "Se ha producido un error inesperado. Inténtalo de nuevo.",
            }
        },
    )


app.include_router(markets.router, prefix="/api/markets", tags=["markets"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(comparison.router, prefix="/api/comparison", tags=["comparison"])
app.include_router(costs.router, prefix="/api/costs", tags=["costs"])


@app.get("/")
def root():
    return {"status": "ok", "service": "Investment Strategy Lab API", "version": API_VERSION}


@app.get("/api/health")
def health():
    """Estado del servicio y uso de la caché (útil para comprobar que funciona)."""
    return {"status": "ok", "version": API_VERSION, "cache": cache_stats()}
