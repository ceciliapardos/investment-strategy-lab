"""
Tests de INTEGRACIÓN con las fuentes de noticias reales (requieren internet).

    python -m pytest -m integration

Comprueban que los feeds responden y tienen la estructura esperada. No
comprueban el contenido concreto de las noticias, que cambia cada día.
"""

from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import pytest

from services import news_provider, news_service

pytestmark = pytest.mark.integration


def test_frontpage_real_news():
    r = news_service.get_news("all")
    assert len(r["items"]) >= 10
    ok_sources = [s for s in r["sources"] if s["status"] == "ok"]
    assert len(ok_sources) >= len(r["sources"]) - 1, r["sources"]
    now = datetime.now(timezone.utc)
    for it in r["items"]:
        assert it["title"] and it["source"]
        assert urlparse(it["url"]).scheme == "https"
        published = datetime.fromisoformat(it["published_at"])
        assert now - published < timedelta(days=46)


@pytest.mark.parametrize("category", list(news_service.CATEGORIES))
def test_each_category_returns_news(category):
    r = news_service.get_news(category)
    assert r["items"], f"Sin noticias en {category}"
    assert all(it["category"] == category for it in r["items"])


@pytest.mark.parametrize("feed_id", list(news_service.OFFICIAL_FEEDS))
def test_official_feeds_parse(feed_id):
    feed = news_service.OFFICIAL_FEEDS[feed_id]
    items = news_provider.parse_rss(news_provider.fetch_feed(feed["url"]))
    assert items and items[0]["title"] and items[0]["link"].startswith("https://")


def test_search_real():
    r = news_service.search_news("Banco Central Europeo")
    assert r["items"]
    assert all(it["category"] is None for it in r["items"])


def test_search_without_results_real():
    assert news_service.search_news("qzxqzx noexisteestetema 98765")["items"] == []
