"""
Tests deterministas del módulo News con feeds RSS sintéticos (sin red).
Los feeds reales se prueban en test_integration_news.py (marcador integration).
"""

from datetime import datetime, timedelta, timezone
from email.utils import format_datetime

import pytest
import requests

from services import news_provider, news_service
from services.errors import InvalidNewsQuery, NewsUnavailable
from services.news_provider import FeedError


def rfc822(hours_ago: float) -> str:
    return format_datetime(datetime.now(timezone.utc) - timedelta(hours=hours_ago))


def google_feed(items):
    body = "".join(
        f"""<item><title>{t} - {s}</title><link>{link}</link><pubDate>{d}</pubDate>
        <description>&lt;a href="{link}"&gt;{t}&lt;/a&gt;</description>
        <source url="https://{s.lower()}.example">{s}</source></item>"""
        for t, s, link, d in items
    )
    return f'<?xml version="1.0"?><rss version="2.0"><channel><title>Google News</title>{body}</channel></rss>'.encode()


def official_feed(items):
    body = "".join(
        f"<item><title>{t}</title><link>{link}</link><pubDate>{d}</pubDate><description>{desc}</description></item>"
        for t, link, d, desc in items
    )
    return f'<?xml version="1.0"?><rss version="2.0"><channel>{body}</channel></rss>'.encode()


class FakeFeeds:
    """Responde a fetch_feed según la URL o la búsqueda temática."""

    def __init__(self):
        self.calls = 0
        self.fail = set()   # claves que deben fallar: "markets", "ecb", "search"...

    def __call__(self, url, params=None):
        self.calls += 1
        key = self._key(url, params)
        if key in self.fail or "*" in self.fail:
            raise FeedError("timeout")
        if key == "ecb":
            return official_feed([
                ("Monetary policy decisions", "https://www.ecb.europa.eu/press/pr/1.html", rfc822(30),
                 "The Governing Council <b>decided</b> to keep rates unchanged."),
                ("Very old press release", "https://www.ecb.europa.eu/press/pr/0.html", rfc822(24 * 90), ""),
            ])
        if key == "fed":
            return official_feed([
                ("FOMC statement", "https://www.federalreserve.gov/x.htm", rfc822(50), "FOMC statement"),
            ])
        if key == "search":
            q = params["q"]
            if "nada" in q:
                return google_feed([])
            return google_feed([(f"Resultado sobre {q.split(' when')[0]}", "Expansión",
                                 "https://news.google.com/rss/articles/s1", rfc822(5))])
        # Categorías de Google News: 3 noticias por categoría, una duplicada entre categorías.
        return google_feed([
            (f"Noticia {key} 1", "Expansión", f"https://news.google.com/rss/articles/{key}1", rfc822(1)),
            (f"Noticia {key} 2", "Cinco Días", f"https://news.google.com/rss/articles/{key}2", rfc822(10)),
            ("Titular repetido en varias secciones", "El País", "https://news.google.com/rss/articles/dup", rfc822(3)),
            ("Noticia sin fecha válida", "X", f"https://news.google.com/rss/articles/{key}nd", "no-es-fecha"),
            ("Enlace peligroso", "X", "javascript:alert(1)", rfc822(2)),
            ("Noticia antigua", "X", f"https://news.google.com/rss/articles/{key}old", rfc822(24 * 20)),
        ])

    @staticmethod
    def _key(url, params):
        if "ecb.europa.eu" in url:
            return "ecb"
        if "federalreserve.gov" in url:
            return "fed"
        q = (params or {}).get("q", "")
        for key, cat in news_service.CATEGORIES.items():
            if q.startswith(cat["query"]):
                return key
        return "search"


@pytest.fixture
def feeds(monkeypatch):
    f = FakeFeeds()
    monkeypatch.setattr(news_provider, "fetch_feed", f)
    return f


# ---------------- Lectura de RSS ----------------
def test_parse_rss_extracts_metadata_only():
    items = news_provider.parse_rss(google_feed([("Titular &amp; más", "Expansión", "https://a.example/1", rfc822(1))]))
    assert items[0]["title"] == "Titular & más - Expansión"
    assert items[0]["source_name"] == "Expansión"
    assert items[0]["source_url"] == "https://expansión.example"
    assert items[0]["published"].tzinfo is not None


def test_parse_rss_invalid_xml():
    with pytest.raises(FeedError):
        news_provider.parse_rss(b"<html>no es un feed")


def test_clean_text_strips_html():
    assert news_provider.clean_text("<p>Hola <b>mundo</b> &amp; más</p>") == "Hola mundo & más"


def test_parse_date_handles_garbage():
    assert news_provider.parse_date("no-es-fecha") is None
    assert news_provider.parse_date("Wed, 11 Nov 2026 22:49:30 +0100").hour == 21  # a UTC


def test_fetch_feed_timeout(monkeypatch):
    def slow(*a, **k):
        raise requests.Timeout()
    monkeypatch.setattr(news_provider.requests, "get", slow)
    with pytest.raises(FeedError, match="timeout"):
        news_provider.fetch_feed("https://example.com/rss")


def test_fetch_feed_http_error(monkeypatch):
    class Resp:
        status_code = 403
        def __enter__(self): return self
        def __exit__(self, *a): return False
    monkeypatch.setattr(news_provider.requests, "get", lambda *a, **k: Resp())
    with pytest.raises(FeedError, match="403"):
        news_provider.fetch_feed("https://example.com/rss")


# ---------------- Portada y categorías ----------------
def test_frontpage_mixes_categories_and_official_feeds(feeds):
    r = news_service.get_news("all")
    cats = {it["category"] for it in r["items"]}
    assert cats == set(news_service.CATEGORIES)
    assert any(it["via"] == "official" for it in r["items"])
    assert all(s["status"] == "ok" for s in r["sources"])
    assert r["attribution"]


def test_items_are_sorted_deduplicated_and_clean(feeds):
    items = news_service.get_news("all")["items"]
    dates = [it["published_at"] for it in items]
    assert dates == sorted(dates, reverse=True)
    titles = [it["title"] for it in items]
    assert titles.count("Titular repetido en varias secciones") == 1
    assert not any(t.endswith(" - Expansión") for t in titles)       # sufijo de Google eliminado
    assert all(it["url"].startswith("https://") for it in items)      # sin javascript:
    assert not any("sin fecha" in t or "antigua" in t for t in titles)


def test_item_fields(feeds):
    it = next(i for i in news_service.get_news("markets")["items"] if i["title"] == "Noticia markets 1")
    assert it["source"] == "Expansión"
    assert it["category_label"] == "Mercados"
    assert it["summary"] is None  # Google News no aporta resumen utilizable
    assert it["via"] == "google_news"


def test_central_banks_include_official_summaries(feeds):
    items = news_service.get_news("central_banks")["items"]
    ecb = next(i for i in items if i["source"] == "Banco Central Europeo")
    assert ecb["summary"] == "The Governing Council decided to keep rates unchanged."
    fed = next(i for i in items if i["source"].startswith("Reserva Federal"))
    assert fed["summary"] is None  # descripción igual al titular -> no se repite
    assert not any("Very old" in i["title"] for i in items)


def test_invalid_category(feeds):
    with pytest.raises(InvalidNewsQuery):
        news_service.get_news("deportes")


# ---------------- Robustez ----------------
def test_partial_failure_still_returns_news(feeds):
    feeds.fail = {"markets", "ecb"}
    r = news_service.get_news("all")
    status = {s["id"]: s["status"] for s in r["sources"]}
    assert status["google:markets"] == "error" and status["official:ecb"] == "error"
    assert status["google:economy"] == "ok"
    assert r["items"] and not any(it["category"] == "markets" for it in r["items"])


def test_total_failure_raises_unavailable(feeds):
    feeds.fail = {"*"}
    with pytest.raises(NewsUnavailable):
        news_service.get_news("all")


def test_cache_avoids_refetching(feeds):
    news_service.get_news("markets")
    calls = feeds.calls
    news_service.get_news("markets")
    assert feeds.calls == calls


def test_stale_content_is_served_when_source_fails(feeds, monkeypatch):
    news_service.get_news("markets")
    # Simula que han pasado 20 minutos (caché caducada) y que la fuente cae.
    real_time = news_service.time.time
    monkeypatch.setattr(news_service.time, "time", lambda: real_time() + 20 * 60)
    feeds.fail = {"*"}
    r = news_service.get_news("markets")
    assert r["items"]
    assert {s["status"] for s in r["sources"]} == {"stale"}


def test_stale_content_expires(feeds, monkeypatch):
    news_service.get_news("markets")
    real_time = news_service.time.time
    monkeypatch.setattr(news_service.time, "time", lambda: real_time() + 7 * 3600)
    feeds.fail = {"*"}
    with pytest.raises(NewsUnavailable):
        news_service.get_news("markets")


# ---------------- Buscador ----------------
def test_search_returns_results(feeds):
    r = news_service.search_news("  Inditex   resultados ")
    assert r["query"] == "Inditex resultados"
    assert r["items"][0]["title"].startswith("Resultado sobre")


def test_search_without_results(feeds):
    assert news_service.search_news("nada de nada")["items"] == []


@pytest.mark.parametrize("q", ["", " ", "a", "x" * 81])
def test_search_validation(feeds, q):
    with pytest.raises(InvalidNewsQuery):
        news_service.search_news(q)


def test_search_failure(feeds):
    feeds.fail = {"search"}
    with pytest.raises(NewsUnavailable):
        news_service.search_news("bolsa")


def test_search_is_cached(feeds):
    news_service.search_news("bolsa")
    calls = feeds.calls
    news_service.search_news("BOLSA")
    assert feeds.calls == calls
