"""Tests deterministas de la caché TTL."""

import time

import pytest

from services.cache import ttl_cached


def test_second_call_is_served_from_cache():
    calls = []

    @ttl_cached(60)
    def fetch(x):
        calls.append(x)
        return x * 2

    assert fetch(2) == 4 and fetch(2) == 4
    assert calls == [2]
    assert fetch.cache.stats()["hits"] == 1
    fetch(3)
    assert calls == [2, 3]


def test_entries_expire():
    calls = []

    @ttl_cached(0.05)
    def fetch(x):
        calls.append(x)
        return x

    fetch(1)
    time.sleep(0.1)
    fetch(1)
    assert calls == [1, 1]


def test_exceptions_are_not_cached():
    calls = []

    @ttl_cached(60)
    def flaky(x):
        calls.append(x)
        if len(calls) == 1:
            raise RuntimeError("fallo temporal")
        return "ok"

    with pytest.raises(RuntimeError):
        flaky(1)
    assert flaky(1) == "ok"
    assert len(calls) == 2


def test_maxsize_is_respected():
    @ttl_cached(60, maxsize=3)
    def fetch(x):
        return x

    for i in range(10):
        fetch(i)
    assert fetch.cache.stats()["entries"] == 3
