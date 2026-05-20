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

SAMPLE_STATISTICAL_REGION = {
    "id_region": 2,
    "region_name": "Podravska",
    "region_code": "SI032",
    "region_type": "statistical_region",
    "geometry": {
        "type": "MultiPolygon",
        "coordinates": [[[[15.0, 46.5], [15.1, 46.5], [15.1, 46.6], [15.0, 46.5]]]],
    },
}

SAMPLE_STATISTICAL_REGION_GEOMETRY_TEXT = (
    '{"type":"MultiPolygon","coordinates":[[[[15.0,46.5],'
    "[15.1,46.5],[15.1,46.6],[15.0,46.5]]]]}"
)

SAMPLE_REGION_LATEST_MEASUREMENT = {
    "region_code": "SI032",
    "region_name": "Podravska",
    "region_type": "statistical_region",
    "value_mean": 3.1e-05,
    "value_min": 1.2e-05,
    "value_max": 5.2e-05,
    "pixel_count_valid": 41,
    "quality_status": "valid",
    "unit": "mol/m2",
    "measurement_start_time": datetime(2025, 3, 11, 12, 19, 40, tzinfo=timezone.utc),
    "measurement_end_time": datetime(2025, 3, 11, 13, 18, 5, tzinfo=timezone.utc),
    "processing_run_id": 14,
    "source_product_name": (
        "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_"
        "38393_03_020800_20250313T042301.nc"
    ),
}

SAMPLE_REGION_COMPARISON_MEASUREMENT = {
    "region_code": "SI036",
    "region_name": "Osrednjeslovenska",
    "region_type": "statistical_region",
    "value_mean": 4.2e-05,
    "value_min": 1.4e-05,
    "value_max": 6.4e-05,
    "pixel_count_valid": 59,
    "qa_threshold": 0.75,
    "quality_status": "valid",
    "unit": "mol/m2",
    "measurement_start_time": datetime(2025, 3, 11, 12, 19, 40, tzinfo=timezone.utc),
    "measurement_end_time": datetime(2025, 3, 11, 13, 18, 5, tzinfo=timezone.utc),
    "processing_run_id": 14,
    "source_product_name": (
        "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_"
        "38393_03_020800_20250313T042301.nc"
    ),
}

SAMPLE_REGION_DETAIL_MEASUREMENT = {
    "value_mean": 3.1e-05,
    "value_min": 1.2e-05,
    "value_max": 5.2e-05,
    "pixel_count_valid": 41,
    "qa_threshold": 0.75,
    "quality_status": "valid",
    "unit": "mol/m2",
    "measurement_start_time": datetime(2025, 3, 11, 12, 19, 40, tzinfo=timezone.utc),
    "measurement_end_time": datetime(2025, 3, 11, 13, 18, 5, tzinfo=timezone.utc),
    "processing_run_id": 14,
    "source_product_id": "b898f30a-1d6e-4c6c-bdc2-9933a06e316e",
    "source_product_name": (
        "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_"
        "38393_03_020800_20250313T042301.nc"
    ),
}

SAMPLE_REGION_HISTORY_MEASUREMENTS = [
    {
        "value_mean": 2.8e-05,
        "value_min": 1.0e-05,
        "value_max": 4.8e-05,
        "pixel_count_valid": 32,
        "qa_threshold": 0.75,
        "quality_status": "valid",
        "unit": "mol/m2",
        "measurement_start_time": datetime(2025, 3, 11, 12, 19, 40, tzinfo=timezone.utc),
        "measurement_end_time": datetime(2025, 3, 11, 13, 18, 5, tzinfo=timezone.utc),
        "processing_run_id": 13,
        "source_product_id": "b898f30a-1d6e-4c6c-bdc2-9933a06e316e",
        "source_product_name": (
            "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_"
            "38393_03_020800_20250313T042301.nc"
        ),
    },
    {
        "value_mean": 3.1e-05,
        "value_min": 1.2e-05,
        "value_max": 5.2e-05,
        "pixel_count_valid": 41,
        "qa_threshold": 0.75,
        "quality_status": "valid",
        "unit": "mol/m2",
        "measurement_start_time": datetime(2026, 5, 8, 12, 3, 11, tzinfo=timezone.utc),
        "measurement_end_time": datetime(2026, 5, 8, 13, 1, 35, tzinfo=timezone.utc),
        "processing_run_id": 14,
        "source_product_id": "1cee3f1c-b237-4532-9505-d20f9baf7daf",
        "source_product_name": (
            "S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_"
            "44394_03_020901_20260510T052830.nc"
        ),
    },
]

SAMPLE_REGION_CSV_EXPORT_ROW = {
    "region_code": "SI032",
    "region_name": "Podravska",
    "region_type": "statistical_region",
    "indicator_code": "NO2",
    "indicator_name": "Nitrogen dioxide",
    "value_mean": 3.1e-05,
    "value_min": 1.2e-05,
    "value_max": 5.2e-05,
    "pixel_count_valid": 41,
    "qa_threshold": 0.75,
    "quality_status": "valid",
    "unit": "mol/m2",
    "measurement_start_time": datetime(2025, 3, 11, 12, 19, 40, tzinfo=timezone.utc),
    "measurement_end_time": datetime(2025, 3, 11, 13, 18, 5, tzinfo=timezone.utc),
    "processing_run_id": 14,
    "source_product_id": "b898f30a-1d6e-4c6c-bdc2-9933a06e316e",
    "source_product_name": (
        "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_"
        "38393_03_020800_20250313T042301.nc"
    ),
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

        if "WITH latest_region_measurements AS" in query:
            return FakeMappingResult([SAMPLE_REGION_LATEST_MEASUREMENT])

        if "r.region_code = ANY(:region_codes)" in query:
            rows_by_code = {
                SAMPLE_REGION_LATEST_MEASUREMENT["region_code"]: {
                    **SAMPLE_REGION_LATEST_MEASUREMENT,
                    "qa_threshold": 0.75,
                },
                SAMPLE_REGION_COMPARISON_MEASUREMENT["region_code"]: (
                    SAMPLE_REGION_COMPARISON_MEASUREMENT
                ),
            }
            rows = [
                rows_by_code[region_code]
                for region_code in params.get("region_codes", [])
                if region_code in rows_by_code
            ]
            rows.sort(
                key=lambda row: (
                    row["value_mean"] is None,
                    -(row["value_mean"] or 0),
                    row["region_name"],
                )
            )
            return FakeMappingResult(rows)

        if (
            "ST_AsGeoJSON" in query
            and "FROM region r" in query
            and "ORDER BY r.region_code" in query
        ):
            return FakeMappingResult(
                [
                    {
                        "region_code": SAMPLE_STATISTICAL_REGION["region_code"],
                        "region_name": SAMPLE_STATISTICAL_REGION["region_name"],
                        "region_type": SAMPLE_STATISTICAL_REGION["region_type"],
                        "geometry": SAMPLE_STATISTICAL_REGION_GEOMETRY_TEXT,
                    }
                ]
            )

        if "ST_AsGeoJSON" in query and "FROM region r" in query:
            if params.get("region_code") == SAMPLE_STATISTICAL_REGION["region_code"]:
                return FakeMappingResult(
                    [
                        {
                            "id_region": SAMPLE_STATISTICAL_REGION["id_region"],
                            "region_code": SAMPLE_STATISTICAL_REGION["region_code"],
                            "region_name": SAMPLE_STATISTICAL_REGION["region_name"],
                            "region_type": SAMPLE_STATISTICAL_REGION["region_type"],
                            "geometry": SAMPLE_STATISTICAL_REGION_GEOMETRY_TEXT,
                        }
                    ]
                )
            return FakeMappingResult([])

        if "LEFT JOIN LATERAL" in query and "latest.indicator_code" in query:
            if params.get("region_code") == SAMPLE_REGION["region_code"]:
                return FakeMappingResult([SAMPLE_MEASUREMENT])
            if params.get("id_region") == SAMPLE_REGION["id_region"]:
                return FakeMappingResult([SAMPLE_MEASUREMENT])
            return FakeMappingResult([])

        if "sf.external_product_id AS source_product_id" in query:
            if params.get("region_id") == SAMPLE_STATISTICAL_REGION["id_region"]:
                if "rm.measurement_end_time ASC" in query:
                    return FakeMappingResult(SAMPLE_REGION_HISTORY_MEASUREMENTS)
                if "r.region_code" in query and "i.indicator_name" in query:
                    return FakeMappingResult([SAMPLE_REGION_CSV_EXPORT_ROW])
                return FakeMappingResult([SAMPLE_REGION_DETAIL_MEASUREMENT])
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


def test_get_latest_region_measurements_returns_statistical_region_rows(client):
    response = client.get("/api/v1/regions/latest-measurements")

    assert response.status_code == 200
    data = response.json()
    assert data == [
        {
            "region_code": "SI032",
            "region_name": "Podravska",
            "region_type": "statistical_region",
            "value_mean": SAMPLE_REGION_LATEST_MEASUREMENT["value_mean"],
            "value_min": SAMPLE_REGION_LATEST_MEASUREMENT["value_min"],
            "value_max": SAMPLE_REGION_LATEST_MEASUREMENT["value_max"],
            "pixel_count_valid": 41,
            "quality_status": "valid",
            "unit": "mol/m2",
            "measurement_start_time": "2025-03-11T12:19:40Z",
            "measurement_end_time": "2025-03-11T13:18:05Z",
            "processing_run_id": 14,
            "source_product_name": SAMPLE_REGION_LATEST_MEASUREMENT["source_product_name"],
        }
    ]


def test_compare_regions_returns_requested_statistical_regions_sorted_by_value(client):
    response = client.get(
        "/api/v1/regions/compare?region_codes=SI032&region_codes=SI036"
    )

    assert response.status_code == 200
    data = response.json()
    assert [row["region_code"] for row in data] == ["SI036", "SI032"]
    assert data[0]["region_name"] == "Osrednjeslovenska"
    assert data[0]["value_mean"] == SAMPLE_REGION_COMPARISON_MEASUREMENT["value_mean"]
    assert data[0]["qa_threshold"] == 0.75
    assert data[0]["processing_run_id"] == 14


def test_compare_regions_accepts_comma_separated_region_codes(client):
    response = client.get("/api/v1/regions/compare?region_codes=SI032,SI036")

    assert response.status_code == 200
    assert [row["region_code"] for row in response.json()] == ["SI036", "SI032"]


def test_compare_regions_returns_400_for_too_few_regions(client):
    response = client.get("/api/v1/regions/compare?region_codes=SI032")

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Provide at least two region_codes to compare."
    }


def test_compare_regions_returns_404_for_unknown_region(client):
    response = client.get(
        "/api/v1/regions/compare?region_codes=SI032&region_codes=UNKNOWN"
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": {
            "message": "One or more regions were not found.",
            "region_codes": ["UNKNOWN"],
        }
    }


def test_get_region_geometries_returns_statistical_region_geometries(client):
    response = client.get("/api/v1/regions/geometries")

    assert response.status_code == 200
    data = response.json()
    assert data == [
        {
            "region_code": "SI032",
            "region_name": "Podravska",
            "region_type": "statistical_region",
            "geometry": SAMPLE_STATISTICAL_REGION["geometry"],
        }
    ]


def test_get_region_details_returns_latest_measurement_and_geometry(client):
    response = client.get("/api/v1/regions/SI032")

    assert response.status_code == 200
    data = response.json()
    assert data["region_code"] == "SI032"
    assert data["region_name"] == "Podravska"
    assert data["region_type"] == "statistical_region"
    assert data["geometry"]["type"] == "MultiPolygon"
    assert data["latest_measurement"]["value_mean"] == SAMPLE_REGION_DETAIL_MEASUREMENT["value_mean"]
    assert data["latest_measurement"]["processing_run_id"] == 14
    assert (
        data["latest_measurement"]["source_product_id"]
        == "b898f30a-1d6e-4c6c-bdc2-9933a06e316e"
    )


def test_get_region_details_returns_404_for_unknown_statistical_region(client):
    response = client.get("/api/v1/regions/UNKNOWN")

    assert response.status_code == 404
    assert response.json() == {"detail": "Region not found."}


def test_get_region_history_returns_measurements_ordered_oldest_first(client):
    response = client.get("/api/v1/regions/SI032/history")

    assert response.status_code == 200
    data = response.json()
    assert data["region_code"] == "SI032"
    assert data["region_name"] == "Podravska"
    assert data["region_type"] == "statistical_region"
    assert len(data["measurements"]) == 2
    assert [
        measurement["measurement_end_time"]
        for measurement in data["measurements"]
    ] == [
        "2025-03-11T13:18:05Z",
        "2026-05-08T13:01:35Z",
    ]
    assert data["measurements"][0]["source_product_id"] == (
        "b898f30a-1d6e-4c6c-bdc2-9933a06e316e"
    )
    assert data["measurements"][1]["processing_run_id"] == 14


def test_get_region_history_returns_404_for_unknown_statistical_region(client):
    response = client.get("/api/v1/regions/UNKNOWN/history")

    assert response.status_code == 404
    assert response.json() == {"detail": "Region not found."}


def test_export_region_csv_returns_latest_measurement_csv(client):
    response = client.get("/api/v1/regions/SI032/export.csv")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert (
        response.headers["content-disposition"]
        == 'attachment; filename="airwatch-region-si032-latest.csv"'
    )

    csv_lines = response.text.strip().splitlines()
    assert csv_lines[0].startswith("region_code,region_name,region_type,indicator_code")
    assert "SI032,Podravska,statistical_region,NO2,Nitrogen dioxide" in csv_lines[1]
    assert "2025-03-11T13:18:05Z" in csv_lines[1]
