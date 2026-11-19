"""Rutas /api/news/*."""

from fastapi import APIRouter, Query

from services import news_service

router = APIRouter()


@router.get("/categories")
def categories():
    return {"categories": news_service.list_categories()}


@router.get("")
def news(category: str = Query(default="all", max_length=20)):
    """Portada (category=all) o una categoría concreta."""
    return news_service.get_news(category)


@router.get("/search")
def search(q: str = Query(..., min_length=1, max_length=120)):
    """Búsqueda libre de noticias del último mes."""
    return news_service.search_news(q)
