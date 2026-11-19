"""
Caché en memoria con caducidad (TTL).

Objetivo: evitar llamadas repetidas a Yahoo Finance cuando el usuario consulta
el mismo activo varias veces en poco tiempo (p. ej. ficha + TER + gráfico).

- Vive en la memoria del proceso: se vacía al reiniciar el backend.
- Solo se guardan resultados correctos. Si la función lanza una excepción,
  no se cachea nada y el siguiente intento vuelve a consultar la fuente.
"""

from __future__ import annotations

import functools
import threading
import time
from typing import Any, Callable

_REGISTRY: dict[str, "_TTLCache"] = {}


class _TTLCache:
    def __init__(self, name: str, ttl_seconds: float, maxsize: int) -> None:
        self.name = name
        self.ttl = ttl_seconds
        self.maxsize = maxsize
        self._data: dict[Any, tuple[float, Any]] = {}
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: Any) -> tuple[bool, Any]:
        with self._lock:
            item = self._data.get(key)
            if item is not None and item[0] > time.monotonic():
                self.hits += 1
                return True, item[1]
            if item is not None:
                del self._data[key]
            self.misses += 1
            return False, None

    def set(self, key: Any, value: Any) -> None:
        with self._lock:
            if len(self._data) >= self.maxsize:
                # Elimina la entrada que caduca antes (simple y suficiente aquí).
                oldest = min(self._data, key=lambda k: self._data[k][0])
                del self._data[oldest]
            self._data[key] = (time.monotonic() + self.ttl, value)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()
            self.hits = 0
            self.misses = 0

    def stats(self) -> dict:
        with self._lock:
            return {
                "ttl_seconds": self.ttl,
                "entries": len(self._data),
                "hits": self.hits,
                "misses": self.misses,
            }


def ttl_cached(ttl_seconds: float, maxsize: int = 512) -> Callable:
    """Decorador: cachea el resultado de la función según sus argumentos."""

    def decorator(fn: Callable) -> Callable:
        cache = _TTLCache(fn.__name__, ttl_seconds, maxsize)
        _REGISTRY[fn.__name__] = cache

        @functools.wraps(fn)
        def wrapper(*args):
            found, value = cache.get(args)
            if found:
                return value
            value = fn(*args)
            cache.set(args, value)
            return value

        wrapper.cache = cache  # type: ignore[attr-defined]
        return wrapper

    return decorator


def cache_stats() -> dict:
    return {name: c.stats() for name, c in _REGISTRY.items()}


def clear_all_caches() -> None:
    for c in _REGISTRY.values():
        c.clear()
