#!/usr/bin/env python3
"""Load Slovenian NUTS3/statistical regions into the region table."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))


EXPECTED_REGION_COUNT = 12
DEFAULT_REGION_TYPE = "statistical_region"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Load Slovenian NUTS3/statistical regions from a GISCO GeoJSON file."
    )
    parser.add_argument(
        "--regions-file",
        required=True,
        help="Path to NUTS level 3 GeoJSON file.",
    )
    parser.add_argument("--country-code", default="SI")
    parser.add_argument("--level", default="3")
    parser.add_argument("--region-type", default=DEFAULT_REGION_TYPE)
    return parser.parse_args()


def load_geojson(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise SystemExit(f"Regions file not found: {path}")

    with path.open("r", encoding="utf-8") as file_handle:
        data = json.load(file_handle)

    if data.get("type") != "FeatureCollection":
        raise SystemExit("Regions file must be a GeoJSON FeatureCollection.")
    return data


def resolve_region_name(properties: dict[str, Any]) -> str:
    name = properties.get("NUTS_NAME") or properties.get("NAME_LATN")
    if not str(name or "").strip():
        raise SystemExit("Region feature is missing NUTS_NAME and NAME_LATN.")
    return str(name)


def extract_regions(
    data: dict[str, Any],
    country_code: str,
    level: str,
) -> list[dict[str, str]]:
    regions: list[dict[str, str]] = []
    for feature in data.get("features", []):
        properties = feature.get("properties") or {}
        if properties.get("CNTR_CODE") != country_code:
            continue
        if str(properties.get("LEVL_CODE")) != str(level):
            continue

        region_code = properties.get("NUTS_ID")
        geometry = feature.get("geometry")
        if not str(region_code or "").strip():
            raise SystemExit("Region feature is missing NUTS_ID.")
        if not geometry:
            raise SystemExit(f"Region {region_code} is missing geometry.")

        regions.append(
            {
                "region_code": str(region_code),
                "region_name": resolve_region_name(properties),
                "geometry_geojson": json.dumps(geometry),
            }
        )

    regions.sort(key=lambda item: item["region_code"])
    if len(regions) != EXPECTED_REGION_COUNT:
        raise SystemExit(
            f"Expected {EXPECTED_REGION_COUNT} Slovenian NUTS3 regions, "
            f"found {len(regions)}."
        )
    return regions


def upsert_regions(regions: list[dict[str, str]], region_type: str) -> None:
    from sqlalchemy import text

    from database import SessionLocal

    statement = text(
        """
        INSERT INTO region (
            region_name,
            region_code,
            region_type,
            geometry,
            bbox_lat_min,
            bbox_lat_max,
            bbox_lon_min,
            bbox_lon_max
        )
        SELECT
            :region_name,
            :region_code,
            :region_type,
            region_geom.geometry,
            ST_YMin(Box3D(region_geom.geometry)),
            ST_YMax(Box3D(region_geom.geometry)),
            ST_XMin(Box3D(region_geom.geometry)),
            ST_XMax(Box3D(region_geom.geometry))
        FROM (
            SELECT ST_Multi(
                ST_SetSRID(ST_GeomFromGeoJSON(:geometry_geojson), 4326)
            ) AS geometry
        ) AS region_geom
        ON CONFLICT (region_code) DO UPDATE SET
            region_name = EXCLUDED.region_name,
            region_type = EXCLUDED.region_type,
            geometry = EXCLUDED.geometry,
            bbox_lat_min = EXCLUDED.bbox_lat_min,
            bbox_lat_max = EXCLUDED.bbox_lat_max,
            bbox_lon_min = EXCLUDED.bbox_lon_min,
            bbox_lon_max = EXCLUDED.bbox_lon_max,
            updated_at = NOW()
        """
    )

    with SessionLocal() as session:
        for region in regions:
            session.execute(statement, {**region, "region_type": region_type})
        session.commit()


def main() -> None:
    args = parse_args()
    regions_file = Path(args.regions_file)
    if not regions_file.is_absolute():
        regions_file = PROJECT_ROOT / regions_file

    data = load_geojson(regions_file)
    regions = extract_regions(data, args.country_code, args.level)
    upsert_regions(regions, args.region_type)

    print(f"Loaded {len(regions)} regions into region table.")
    print(f"Region type: {args.region_type}")
    print("Region codes: " + ", ".join(region["region_code"] for region in regions))


if __name__ == "__main__":
    main()
