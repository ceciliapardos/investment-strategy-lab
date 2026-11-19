"""
Lógica del módulo News / Market News.

Fuentes (ver Decisiones D23 y "Datos y fuentes"):
- Google News RSS (edición España, en español): una búsqueda temática por
  categoría y el buscador libre. Google indica la fuente original de cada noticia.
- Feeds RSS oficiales del BCE y de la Reserva Federal (categoría Bancos centrales).

La CATEGORÍA de cada noticia es la búsqueda temática o el feed oficial del que
procede; no se clasifica el texto. Es simple y explicable, pero imperfecto.

Robustez:
- Cada fuente se descarga con timeout y en paralelo.
- Caché de 10 minutos por fuente. Si una fuente falla, se sirve su último
  contenido REAL descargado (máx. 6 h), marcado como "no actualizado".
- Si ninguna fuente responde se devuelve un error 503 claro. Nunca se muestran
  noticias inventadas.
"""

from __future__ import annotations

import hashlib
import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlparse

from services import news_provider as provider
from services.cache import ttl_cached
from services.errors import InvalidNewsQuery, NewsUnavailable
from services.news_provider import FeedError

log = logging.getLogger(__name__)

GOOGLE_NEWS_URL = "https://news.google.com/rss/search"
GOOGLE_LOCALE = {"hl": "es", "gl": "ES", "ceid": "ES:es"}

CATEGORIES = {
    "markets": {
        "label": "Mercados",
        "query": '(bolsa OR "Ibex 35" OR "Wall Street" OR "mercados financieros" OR "renta fija")',
    },
    "economy": {
        "label": "Economía",
        "query": '(economía OR inflación OR IPC OR PIB OR desempleo OR "política fiscal")',
    },
    "central_banks": {
        "label": "Bancos centrales",
        "query": '(BCE OR "Banco Central Europeo" OR "Reserva Federal" OR "tipos de interés" OR "Banco de España")',
    },
    "companies": {
        "label": "Empresas",
        "query": '("resultados trimestrales" OR beneficios OR OPA OR cotizadas OR facturación) empresa',
    },
    "investing": {
        "label": "Inversión",
        "query": '("fondos de inversión" OR inversores OR "planes de pensiones" OR "cartera de inversión")',
    },
    "etfs": {
        "label": "ETFs",
        # Se excluyen las noticias de ETFs de criptomonedas, que dominaban la sección.
        "query": '(ETF OR "fondos indexados" OR "fondos cotizados") -bitcoin -ethereum -cripto -criptomonedas',
    },
}

OFFICIAL_FEEDS = {
    "ecb": {
        "name": "Banco Central Europeo",
        "url": "https://www.ecb.europa.eu/rss/press.html",
        "home": "https://www.ecb.europa.eu",
        "category": "central_banks",
        "language": "en",
    },
    "fed": {
        "name": "Reserva Federal (EE. UU.)",
        "url": "https://www.federalreserve.gov/feeds/press_monetary.xml",
        "home": "https://www.federalreserve.gov",
        "category": "central_banks",
        "language": "en",
    },
}

FRESH_TTL = 10 * 60            # segundos
STALE_MAX = 6 * 60 * 60        # máximo para servir contenido anterior si la fuente cae
GOOGLE_WINDOW = "when:7d"      # portada y categorías: última semana
SEARCH_WINDOW = "when:30d"     # buscador: último mes
MAX_AGE_GOOGLE = timedelta(days=8)
MAX_AGE_OFFICIAL = timedelta(days=45)
PER_CATEGORY_IN_FRONTPAGE = 6
LIMIT = 36
SUMMARY_MAX = 220

ATTRIBUTION = (
    "Titulares obtenidos de Google News (RSS) y de los feeds oficiales del BCE y de la "
    "Reserva Federal. Cada noticia pertenece a su medio; pulsa para leerla en la fuente original."
)


# ---------------------------------------------------------------------------
# Caché por fuente con contenido "anterior" si la fuente falla
# ---------------------------------------------------------------------------
class _SourceStore:
    def __init__(self) -> None:
        self._data: dict[str, tuple[float, list[dict]]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[tuple[float, list[dict]]]:
        with self._lock:
            return self._data.get(key)

    def set(self, key: str, items: list[dict]) -> None:
        with self._lock:
            self._data[key] = (time.time(), items)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


_store = _SourceStore()


def clear_news_cache() -> None:
    _store.clear()
    search_news.cache.clear()  # type: ignore[attr-defined]


def _source_specs(category: str) -> list[dict]:
    specs = []
    keys = list(CATEGORIES) if category == "all" else [category]
    for key in keys:
        specs.append({"id": f"google:{key}", "kind": "google", "category": key,
                      "name": f"Google News · {CATEGORIES[key]['label']}"})
    for fid, feed in OFFICIAL_FEEDS.items():
        if category in ("all", feed["category"]):
            specs.append({"id": f"official:{fid}", "kind": "official", "category": feed["category"],
                          "name": feed["name"], "feed": fid})
    return specs


def _download(spec: dict) -> list[dict]:
    if spec["kind"] == "google":
        q = f"{CATEGORIES[spec['category']]['query']} {GOOGLE_WINDOW}"
        raw = provider.parse_rss(provider.fetch_feed(GOOGLE_NEWS_URL, {"q": q, **GOOGLE_LOCALE}))
        return [n for n in (_normalize_google(r, spec["category"]) for r in raw) if n]
    feed = OFFICIAL_FEEDS[spec["feed"]]
    raw = provider.parse_rss(provider.fetch_feed(feed["url"]))
    return [n for n in (_normalize_official(r, spec["feed"]) for r in raw) if n]


def _load(spec: dict) -> tuple[list[dict], dict]:
    """Devuelve (noticias, estado de la fuente)."""
    now = time.time()
    cached = _store.get(spec["id"])
    if cached and now - cached[0] < FRESH_TTL:
        return cached[1], _status(spec, "ok", cached[0])
    try:
        items = _download(spec)
        _store.set(spec["id"], items)
        return items, _status(spec, "ok", time.time())
    except FeedError as exc:
        log.warning("News source %s failed: %s", spec["id"], exc)
        if cached and now - cached[0] < STALE_MAX:
            return cached[1], _status(spec, "stale", cached[0])
        return [], _status(spec, "error", None)


def _status(spec: dict, state: str, ts: Optional[float]) -> dict:
    return {
        "id": spec["id"],
        "name": spec["name"],
        "status": state,
        "updated_at": datetime.fromtimestamp(ts, timezone.utc).isoformat() if ts else None,
    }


# ---------------------------------------------------------------------------
# Normalización
# ---------------------------------------------------------------------------
def _safe_url(url: str) -> Optional[str]:
    try:
        parsed = urlparse(url)
    except ValueError:
        return None
    return url if parsed.scheme in ("http", "https") and parsed.netloc else None


def _item_id(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def _truncate(text: str, limit: int = SUMMARY_MAX) -> Optional[str]:
    if not text:
        return None
    if len(text) <= limit:
        return text
    return text[: limit - 1].rsplit(" ", 1)[0] + "…"


def _normalize_google(raw: dict, category: Optional[str]) -> Optional[dict]:
    url = _safe_url(raw.get("link", ""))
    title = raw.get("title", "")
    if not url or not title or raw.get("published") is None:
        return None
    source = raw.get("source_name") or ""
    # Google añade " - Fuente" al final del titular.
    if source and title.endswith(f" - {source}"):
        title = title[: -len(source) - 3].rstrip()
    return {
        "id": _item_id(url),
        "title": title,
        "url": url,
        "source": source or "Fuente no indicada",
        "source_url": _safe_url(raw.get("source_url", "")),
        "published_at": raw["published"].isoformat(),
        "category": category,
        "category_label": CATEGORIES[category]["label"] if category else None,
        # La descripción de Google News es solo HTML con enlaces: no se usa.
        "summary": None,
        "language": "es",
        "via": "google_news",
    }


def _normalize_official(raw: dict, feed_id: str) -> Optional[dict]:
    feed = OFFICIAL_FEEDS[feed_id]
    url = _safe_url(raw.get("link", ""))
    title = raw.get("title", "")
    if not url or not title or raw.get("published") is None:
        return None
    summary = raw.get("description") or ""
    if summary.strip().lower() == title.strip().lower():
        summary = ""
    return {
        "id": _item_id(url),
        "title": title,
        "url": url,
        "source": feed["name"],
        "source_url": feed["home"],
        "published_at": raw["published"].isoformat(),
        "category": feed["category"],
        "category_label": CATEGORIES[feed["category"]]["label"],
        "summary": _truncate(summary),
        "language": feed["language"],
        "via": "official",
    }


_NORM_RE = re.compile(r"[^a-z0-9áéíóúñü]+")


def _dedupe_and_sort(items: list[dict], now: datetime) -> list[dict]:
    seen_urls, seen_titles, out = set(), set(), []
    for it in sorted(items, key=lambda x: x["published_at"], reverse=True):
        max_age = MAX_AGE_OFFICIAL if it["via"] == "official" else MAX_AGE_GOOGLE
        if now - datetime.fromisoformat(it["published_at"]) > max_age:
            continue
        key_title = _NORM_RE.sub(" ", it["title"].lower()).strip()
        if it["url"] in seen_urls or key_title in seen_titles:
            continue
        seen_urls.add(it["url"])
        seen_titles.add(key_title)
        out.append(it)
    return out


# ---------------------------------------------------------------------------
# API pública del servicio
# ---------------------------------------------------------------------------
def list_categories() -> list[dict]:
    return [{"key": "all", "label": "Portada"}] + [
        {"key": k, "label": v["label"]} for k, v in CATEGORIES.items()
    ]


def get_news(category: str = "all") -> dict:
    category = (category or "all").lower()
    if category != "all" and category not in CATEGORIES:
        raise InvalidNewsQuery(f"Categoría «{category}» no válida.")

    specs = _source_specs(category)
    with ThreadPoolExecutor(max_workers=len(specs)) as pool:
        results = list(pool.map(_load, specs))

    statuses = [st for _, st in results]
    if all(st["status"] == "error" for st in statuses):
        raise NewsUnavailable(
            "Ahora mismo no podemos conectar con las fuentes de noticias. Inténtalo de nuevo en unos minutos."
        )

    now = datetime.now(timezone.utc)
    if category == "all":
        # Portada equilibrada: las más recientes de cada fuente.
        pool_items = []
        for items, _ in results:
            pool_items.extend(_dedupe_and_sort(items, now)[:PER_CATEGORY_IN_FRONTPAGE])
    else:
        pool_items = [it for items, _ in results for it in items]

    items = _dedupe_and_sort(pool_items, now)[:LIMIT]
    return {
        "category": category,
        "label": "Portada" if category == "all" else CATEGORIES[category]["label"],
        "items": items,
        "sources": statuses,
        "generated_at": now.isoformat(),
        "attribution": ATTRIBUTION,
    }


@ttl_cached(FRESH_TTL, maxsize=200)
def _search_google(q: str) -> list[dict]:
    raw = provider.parse_rss(
        provider.fetch_feed(GOOGLE_NEWS_URL, {"q": f"{q} {SEARCH_WINDOW}", **GOOGLE_LOCALE})
    )
    return [n for n in (_normalize_google(r, None) for r in raw) if n]


def search_news(query: str) -> dict:
    q = _collapse_ws(query)
    if len(q) < 2 or len(q) > 80:
        raise InvalidNewsQuery("Escribe un tema de entre 2 y 80 caracteres.")
    try:
        items = _search_google(q.lower())
    except FeedError as exc:
        log.warning("News search failed for %r: %s", q, exc)
        raise NewsUnavailable(
            "No hemos podido consultar el buscador de noticias. Inténtalo de nuevo en unos minutos."
        ) from exc
    now = datetime.now(timezone.utc)
    # En la búsqueda se admiten noticias del último mes.
    fresh = [it for it in items if now - datetime.fromisoformat(it["published_at"]) <= timedelta(days=31)]
    deduped, seen = [], set()
    for it in sorted(fresh, key=lambda x: x["published_at"], reverse=True):
        key_title = _NORM_RE.sub(" ", it["title"].lower()).strip()
        if key_title in seen:
            continue
        seen.add(key_title)
        deduped.append(it)
    return {
        "query": q,
        "items": deduped[:LIMIT],
        "generated_at": now.isoformat(),
        "attribution": ATTRIBUTION,
    }


search_news.cache = _search_google.cache  # type: ignore[attr-defined]


def _collapse_ws(text: Optional[str]) -> str:
    return " ".join((text or "").split())
