import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


os.environ.setdefault("POSTGRES_PASSWORD", "test-password")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import get_db  # noqa: E402
from main import app  # noqa: E402


SAMPLE_REGION = {
    "id_region": 1,
    "region_name": "Slovenia bbox",
    "region_code": "SI_BBOX",
    "region_type": "test_bbox",
    "bbox_lat_min": 45.4,
    "bbox_lat_max": 46.9,
    "bbox_lon_min": 13.4,
    "bbox_lon_max": 16.6,
}

SAMPLE_MEASUREMENT = {
    "id_region": 1,
    "region_code": "SI_BBOX",
    "region_name": "Slovenia bbox",
    "indicator_code": "NO2",
    "indicator_name": "Nitrogen dioxide",
    "value_mean": 3.306649159640074e-05,
    "value_min": 1.130456894316012e-05,
    "value_max": 5.404165858635679e-05,
    "pixel_count_valid": 69,
    "qa_threshold": 0.75,
    "quality_status": "valid",
    "unit": "mol/m²",
    "measurement_start_time": datetime(2025, 3, 11, 12, 19, 40, tzinfo=timezone.utc),
    "measurement_end_time": datetime(2025, 3, 11, 13, 18, 5, tzinfo=timezone.utc),
    "source_product_name": (
        "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_"
        "38393_03_020800_20250313T042301.nc"
    ),
    "data_source_name": "Copernicus Data Space",
}


class FakeMappingResult:
    def __init__(self, rows):
        self.rows = rows

    def mappings(self):
        return self

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None


class FakeSprint1Session:
    def execute(self, statement, params=None):
        query = str(statement)
        params = params or {}

        if "FROM region" in query and "ORDER BY region_name" in query:
            return FakeMappingResult([SAMPLE_REGION])

        if "SELECT id_region" in query and "FROM region" in query:
            if params.get("region_code") == SAMPLE_REGION["region_code"]:
                return FakeMappingResult([{"id_region": SAMPLE_REGION["id_region"]}])
            if params.get("id_region") == SAMPLE_REGION["id_region"]:
                return FakeMappingResult([{"id_region": SAMPLE_REGION["id_region"]}])
            return FakeMappingResult([])

        if "FROM region_measurement" in query:
            if params.get("selected_id_region") == SAMPLE_REGION["id_region"]:
                return FakeMappingResult([SAMPLE_MEASUREMENT])
            return FakeMappingResult([])

        raise AssertionError(f"Unexpected SQL in test fake: {query}")


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = lambda: FakeSprint1Session()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_get_regions_returns_regions(client):
    response = client.get("/regions")

    assert response.status_code == 200
    assert response.json() == [SAMPLE_REGION]


def test_get_latest_measurement_returns_sprint1_measurement(client):
    response = client.get("/measurements/latest?region_code=SI_BBOX")

    assert response.status_code == 200
    data = response.json()
    assert data["region_code"] == "SI_BBOX"
    assert data["region_name"] == "Slovenia bbox"
    assert data["indicator_code"] == "NO2"
    assert data["value_mean"] == SAMPLE_MEASUREMENT["value_mean"]
    assert data["value_min"] == SAMPLE_MEASUREMENT["value_min"]
    assert data["value_max"] == SAMPLE_MEASUREMENT["value_max"]
    assert data["unit"] == "mol/m²"
    assert data["pixel_count_valid"] == 69
    assert data["quality_status"] == "valid"
    assert data["measurement_end_time"].startswith("2025-03-11T13:18:05")


def test_get_latest_measurement_returns_404_for_unknown_region(client):
    response = client.get("/measurements/latest?region_code=UNKNOWN")

    assert response.status_code == 404
    assert response.json() == {"detail": "Region not found."}
