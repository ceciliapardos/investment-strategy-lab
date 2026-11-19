"""
Tests deterministas del rendimiento histórico (get_performance) con históricos
sintéticos: periodos, fechas personalizadas, fines de semana, históricos cortos,
ausencia de datos y métricas.
"""

from datetime import date, timedelta

import numpy as np
import pandas as pd
import pytest

from analytics import metrics
from services import market_service as ms
from services.errors import InvalidDateRange, InvalidPeriod
from tests.conftest import make_daily


@pytest.fixture
def voo_3y(fake):
    """~3 años de días hábiles (lun-vie) con dividendos: Adj Close != Close."""
    n = 780
    rng = np.random.default_rng(42)
    close = 100 * np.cumprod(1 + rng.normal(0.0004, 0.01, n))
    adj = close * np.linspace(0.94, 1.0, n)  # dividendos reinvertidos
    fake.histories["VOO"] = make_daily(close, adj, start="2021-01-04")
    return fake.histories["VOO"]


# ---------------- Periodos predefinidos ----------------
def test_preset_1y_uses_daily_adjusted_closes(voo_3y):
    r = ms.get_performance("VOO", "1Y")
    last = voo_3y.index[-1].tz_localize(None).normalize()
    assert r["status"] == "ok" and r["period"] == "1Y"
    assert r["end"]["date"] == last.date().isoformat()
    assert r["requested"]["start"] == (last - pd.DateOffset(years=1)).date().isoformat()
    # Rentabilidad = último ajustado / primero ajustado - 1, con todos los cierres.
    adj = voo_3y["Adj Close"]
    adj.index = adj.index.tz_localize(None).normalize()
    w = adj[adj.index >= pd.Timestamp(r["requested"]["start"])]
    assert r["observations"] == len(w)
    assert r["metrics"]["total_return"] == pytest.approx(w.iloc[-1] / w.iloc[0] - 1, abs=1e-6)
    # La rentabilidad solo por precio usa Close y es menor por los dividendos.
    assert r["metrics"]["price_return"] < r["metrics"]["total_return"]


@pytest.mark.parametrize("period", ["1M", "6M", "YTD", "1Y", "5Y", "10Y", "MAX"])
def test_all_presets_return_ordered_series(voo_3y, period):
    r = ms.get_performance("VOO", period)
    dates = [p["date"] for p in r["series"]]
    assert dates == sorted(dates) and len(set(dates)) == len(dates)
    assert r["series"][0]["date"] == r["start"]["date"]
    assert r["series"][-1]["date"] == r["end"]["date"]


def test_ytd_starts_on_first_session_of_the_year(voo_3y):
    r = ms.get_performance("VOO", "YTD")
    first_session = voo_3y.index[voo_3y.index.year == voo_3y.index[-1].year][0]
    assert r["start"]["date"] == first_session.date().isoformat()


def test_presets_longer_than_history_warn(voo_3y):
    r = ms.get_performance("VOO", "5Y")
    assert any(n["code"] == "history_starts_later" for n in r["notices"])
    assert r["start"]["date"] == "2021-01-04"
    assert not ms.get_performance("VOO", "MAX")["notices"]


def test_invalid_period(voo_3y):
    with pytest.raises(InvalidPeriod):
        ms.get_performance("VOO", "3X")


# ---------------- Fechas personalizadas ----------------
def test_custom_range_starting_on_saturday(voo_3y):
    r = ms.get_performance("VOO", start="2022-01-01", end="2022-12-31")  # 1/1/2022 = sábado
    assert r["period"] == "CUSTOM"
    assert r["start"]["date"] == "2022-01-03"  # lunes: primer cierre disponible
    assert r["end"]["date"] == "2022-12-30"    # viernes: último cierre del periodo
    codes = {n["code"] for n in r["notices"]}
    assert {"start_adjusted", "end_adjusted"} <= codes


def test_custom_range_does_not_invent_weekend_observations(voo_3y):
    r = ms.get_performance("VOO", start="2022-03-01", end="2022-03-31")
    weekdays = {pd.Timestamp(p["date"]).dayofweek for p in r["series"]}
    assert weekdays <= {0, 1, 2, 3, 4}
    assert r["observations"] == 23  # días hábiles de marzo de 2022


@pytest.mark.parametrize("start, end", [
    ("2022-06-01", "2022-01-01"),   # inicial posterior a final
    ("2022-01-01", "2022-01-01"),   # misma fecha
    ("2022-13-01", "2022-12-31"),   # fecha imposible
    ("01/01/2022", "2022-12-31"),   # formato incorrecto
    ("2022-01-01", None),           # falta la final
])
def test_invalid_custom_ranges(voo_3y, start, end):
    with pytest.raises(InvalidDateRange):
        ms.get_performance("VOO", start=start, end=end)


def test_start_in_the_future_is_rejected(voo_3y):
    future = (date.today() + timedelta(days=10)).isoformat()
    later = (date.today() + timedelta(days=20)).isoformat()
    with pytest.raises(InvalidDateRange):
        ms.get_performance("VOO", start=future, end=later)


def test_end_in_the_future_is_clamped(voo_3y):
    future = (date.today() + timedelta(days=30)).isoformat()
    r = ms.get_performance("VOO", start="2023-01-02", end=future)
    assert any(n["code"] == "end_in_future" for n in r["notices"])


def test_custom_start_before_history(voo_3y):
    r = ms.get_performance("VOO", start="2015-01-01", end="2021-06-30")
    assert r["start"]["date"] == "2021-01-04"
    assert any(n["code"] == "history_starts_later" for n in r["notices"])


# ---------------- Ausencia de datos / histórico insuficiente ----------------
def test_weekend_only_range_has_no_data(voo_3y):
    r = ms.get_performance("VOO", start="2022-01-01", end="2022-01-02")
    assert r["status"] == "no_data" and r["metrics"] is None and r["series"] == []
    assert "sesión" in r["message"]


def test_range_before_history_has_no_data(voo_3y):
    r = ms.get_performance("VOO", start="2010-01-01", end="2015-01-01")
    assert r["status"] == "no_data" and "04/01/2021" in r["message"]
    assert r["notices"] == []  # sin avisos contradictorios


def test_single_observation_is_insufficient(voo_3y):
    r = ms.get_performance("VOO", start="2022-01-07", end="2022-01-08")  # viernes + sábado
    assert r["status"] == "no_data" and r["metrics"] is None
    assert len(r["series"]) == 1 and "al menos 2" in r["message"]


def test_asset_without_history(fake):
    r = ms.get_performance("TSLA", "1Y")
    assert r["status"] == "no_data" and r["series"] == []


def test_nan_and_non_positive_prices_are_dropped(fake):
    close = [100.0, np.nan, 102.0, 0.0, 104.0, 105.0]
    fake.histories["TSLA"] = make_daily(close, close, start="2024-01-01")
    r = ms.get_performance("TSLA", "MAX")
    assert r["observations"] == 4
    assert r["metrics"]["total_return"] == pytest.approx(0.05)


# ---------------- Métricas ----------------
def test_cagr_requires_one_year(voo_3y):
    short = ms.get_performance("VOO", start="2022-01-03", end="2022-11-30")
    assert short["metrics"]["cagr"] is None and "1 año" in short["metrics"]["cagr_reason"]
    long = ms.get_performance("VOO", start="2021-06-01", end="2023-06-01")
    assert long["metrics"]["cagr"] is not None and long["metrics"]["cagr_reason"] is None


def test_cagr_matches_definition(fake):
    # 100 -> 121 entre dos fechas separadas exactamente 731 días.
    idx = pd.to_datetime(["2020-01-01", "2022-01-01"]).tz_localize("America/New_York")
    fake.histories["VOO"] = pd.DataFrame({"Close": [100.0, 121.0], "Adj Close": [100.0, 121.0]}, index=idx)
    r = ms.get_performance("VOO", "MAX")
    assert r["metrics"]["cagr"] == pytest.approx(1.21 ** (365.25 / 731) - 1, abs=1e-6)


def test_volatility_needs_twenty_returns(voo_3y):
    r = ms.get_performance("VOO", start="2022-03-01", end="2022-03-15")
    assert r["metrics"]["volatility"] is None and "20" in r["metrics"]["volatility_reason"]
    r = ms.get_performance("VOO", "1M")
    assert r["observations"] >= 21 and r["metrics"]["volatility"] is not None


def test_volatility_annualization_by_asset_type(fake):
    rng = np.random.default_rng(1)
    prices = 100 * np.cumprod(1 + rng.normal(0, 0.02, 200))
    fake.histories["BTC-USD"] = make_daily(prices, start="2024-01-01", freq="D", tz="UTC")
    fake.histories["TSLA"] = make_daily(prices, start="2024-01-01", freq="B")
    btc = ms.get_performance("BTC-USD", "MAX")["metrics"]
    tsla = ms.get_performance("TSLA", "MAX")["metrics"]
    assert btc["periods_per_year"] == 365 and tsla["periods_per_year"] == 252
    assert btc["volatility"] == pytest.approx(tsla["volatility"] * np.sqrt(365 / 252), abs=1e-5)


def test_max_drawdown_and_chart_drawdown(fake):
    close = [100, 120, 90, 110, 130, 125]
    fake.histories["TSLA"] = make_daily(close, start="2024-01-01")
    r = ms.get_performance("TSLA", "MAX")
    mdd = r["metrics"]["max_drawdown"]
    assert mdd["value"] == pytest.approx(-0.25)
    assert (mdd["peak_date"], mdd["trough_date"]) == ("2024-01-02", "2024-01-03")
    assert [p["dd"] for p in r["series"]] == pytest.approx([0, 0, -0.25, -0.083333, 0, -0.038462], abs=1e-5)


def test_metrics_match_pure_functions(voo_3y):
    r = ms.get_performance("VOO", "MAX")
    adj = voo_3y["Adj Close"]
    assert r["metrics"]["volatility"] == pytest.approx(metrics.annualized_volatility(adj), abs=1e-6)
    assert r["metrics"]["max_drawdown"]["value"] == pytest.approx(metrics.max_drawdown(adj)["value"], abs=1e-6)


# ---------------- Gráfico ----------------
def test_downsampling_keeps_drawdown_points(fake):
    n = 3000
    close = np.linspace(100, 200, n)
    close[1234] = 300.0   # máximo
    close[1240] = 60.0    # mínimo posterior
    fake.histories["TSLA"] = make_daily(close, start="2010-01-01")
    r = ms.get_performance("TSLA", "MAX")
    dates = {p["date"] for p in r["series"]}
    mdd = r["metrics"]["max_drawdown"]
    assert len(r["series"]) <= ms.MAX_CHART_POINTS + 3
    assert mdd["peak_date"] in dates and mdd["trough_date"] in dates
    assert r["observations"] == n  # las métricas usan todos los cierres


def test_market_local_dates_are_preserved(fake):
    # Cierres de Tokio a medianoche +09:00: no deben pasar al día anterior.
    fake.histories["7203.T"] = make_daily([100.0, 101.0, 102.0], start="2024-03-04", tz="Asia/Tokyo")
    r = ms.get_performance("7203.T", "MAX")
    assert [p["date"] for p in r["series"]] == ["2024-03-04", "2024-03-05", "2024-03-06"]
