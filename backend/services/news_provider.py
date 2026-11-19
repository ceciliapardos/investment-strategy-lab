"""
Descarga y lectura de feeds RSS de noticias.

Único módulo de noticias con acceso a red. No hace scraping de páginas web:
solo lee feeds RSS publicados por sus responsables (Google News, BCE, Fed).

Solo se extraen metadatos: titular, enlace, fecha, fuente y, si el feed lo
incluye, su descripción breve. Nunca se descarga el artículo completo.
"""

from __future__ import annotations

import html
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Optional

import requests

log = logging.getLogger(__name__)

USER_AGENT = "InvestmentStrategyLab/0.3 (proyecto academico; lector RSS)"
TIMEOUT = (4, 6)          # segundos: (conexión, lectura)
MAX_BYTES = 3_000_000     # un feed RSS no debería superar unos cientos de KB


class FeedError(Exception):
    """El feed no se pudo descargar o interpretar."""


def fetch_feed(url: str, params: Optional[dict] = None) -> bytes:
    try:
        resp = requests.get(
            url, params=params, timeout=TIMEOUT, stream=True,
            headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml"},
        )
    except requests.Timeout as exc:
        raise FeedError("timeout") from exc
    except requests.RequestException as exc:
        raise FeedError(f"network: {type(exc).__name__}") from exc

    with resp:
        if resp.status_code != 200:
            raise FeedError(f"HTTP {resp.status_code}")
        content = resp.raw.read(MAX_BYTES + 1, decode_content=True)
    if len(content) > MAX_BYTES:
        raise FeedError("feed demasiado grande")
    return content


_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def clean_text(value: Optional[str]) -> str:
    """Quita etiquetas HTML y entidades, y normaliza espacios."""
    if not value:
        return ""
    text = html.unescape(_TAG_RE.sub(" ", value))
    return _WS_RE.sub(" ", text).strip()


def parse_date(value: Optional[str]) -> Optional[datetime]:
    """Fecha RFC 822 de RSS -> datetime en UTC. None si no es interpretable."""
    if not value:
        return None
    try:
        dt = parsedate_to_datetime(value.strip())
    except (TypeError, ValueError, IndexError):
        return None
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_rss(content: bytes) -> list[dict]:
    """Lee un RSS 2.0 y devuelve una lista de elementos con metadatos básicos."""
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise FeedError("XML no válido") from exc

    def full_text(parent, tag: str) -> str:
        # itertext() recoge también el texto de etiquetas HTML sin escapar.
        el = parent.find(tag)
        return "".join(el.itertext()) if el is not None else ""

    items = []
    for item in root.iter("item"):
        source = item.find("source")
        items.append(
            {
                "title": clean_text(full_text(item, "title")),
                "link": (item.findtext("link") or "").strip(),
                "published": parse_date(item.findtext("pubDate")),
                "description": clean_text(full_text(item, "description")),
                "source_name": clean_text(source.text) if source is not None else "",
                "source_url": (source.get("url") or "").strip() if source is not None else "",
            }
        )
    return items
