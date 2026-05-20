from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from services.region_measurement_service import STATISTICAL_REGION_TYPE


def get_region_geometries_for_statistical_regions(db: Session) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                r.region_code,
                r.region_name,
                r.region_type,
                CASE
                    WHEN r.geometry IS NULL THEN NULL
                    ELSE ST_AsGeoJSON(r.geometry)
                END AS geometry
            FROM region r
            WHERE r.region_type = :region_type
            ORDER BY r.region_code
            """
        ),
        {"region_type": STATISTICAL_REGION_TYPE},
    ).mappings().all()

    regions = [dict(row) for row in rows]
    for region in regions:
        region["geometry"] = _parse_geojson(region.get("geometry"))
    return regions


def get_region_details_by_code(
    db: Session,
    region_code: str,
    *,
    include_test_region: bool = False,
) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT
                r.id_region,
                r.region_code,
                r.region_name,
                r.region_type,
                CASE
                    WHEN r.geometry IS NULL THEN NULL
                    ELSE ST_AsGeoJSON(r.geometry)
                END AS geometry
            FROM region r
            WHERE r.region_code = :region_code
                AND (
                    :include_test_region = TRUE
                    OR r.region_type = :region_type
                )
            """
        ),
        {
            "region_code": region_code,
            "include_test_region": include_test_region,
            "region_type": STATISTICAL_REGION_TYPE,
        },
    ).mappings().first()

    if row is None:
        return None

    region = dict(row)
    region["geometry"] = _parse_geojson(region.get("geometry"))
    return region


def _parse_geojson(geometry_text: str | None) -> dict[str, Any] | None:
    if geometry_text is None:
        return None
    return json.loads(geometry_text)
