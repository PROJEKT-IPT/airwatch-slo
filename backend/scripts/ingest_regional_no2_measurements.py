#!/usr/bin/env python3
"""Ingest validated regional NO2 JSON output into region_measurement."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))


EXPECTED_REGION_COUNT = 12
DEFAULT_INDICATOR_CODE = "NO2"
DEFAULT_DATA_PRODUCT_CODE = "S5P_OFFL_L2__NO2"
DEFAULT_SCRIPT_NAME = "aggregate_no2_by_region.py"
DEFAULT_SCRIPT_VERSION = "sprint_2_regional"
DEFAULT_BBOX_USED = "GISCO NUTS 2024 SI NUTS3 statistical regions"
ALLOWED_QUALITY_STATUSES = {"valid", "no_valid_pixels", "processing_error"}
REQUIRED_FIELDS = {
    "region_code",
    "region_name",
    "value_mean",
    "value_min",
    "value_max",
    "pixel_count_valid",
    "qa_threshold",
    "quality_status",
    "unit",
    "measurement_start_time",
    "measurement_end_time",
    "source_product_id",
    "source_product_name",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest regional NO2 aggregation JSON into PostgreSQL."
    )
    parser.add_argument("--file", required=True, help="Path to regional NO2 JSON output.")
    parser.add_argument("--indicator-code", default=DEFAULT_INDICATOR_CODE)
    parser.add_argument("--data-product-code", default=DEFAULT_DATA_PRODUCT_CODE)
    parser.add_argument("--script-name", default=DEFAULT_SCRIPT_NAME)
    parser.add_argument("--script-version", default=DEFAULT_SCRIPT_VERSION)
    parser.add_argument("--bbox-used", default=DEFAULT_BBOX_USED)
    return parser.parse_args()


def parse_iso_datetime(value: Any, field_name: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a non-empty ISO datetime string.")
    parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def optional_decimal(value: Any, field_name: str) -> Optional[Decimal]:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ValueError(f"{field_name} must be numeric or null.")
    return Decimal(str(value))


def required_decimal(value: Any, field_name: str) -> Decimal:
    result = optional_decimal(value, field_name)
    if result is None:
        raise ValueError(f"{field_name} must be numeric.")
    return result


def load_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise SystemExit(f"Regional NO2 JSON file not found: {path}")

    with path.open("r", encoding="utf-8") as file_handle:
        data = json.load(file_handle)

    if not isinstance(data, list):
        raise SystemExit("Regional NO2 JSON output must be a list.")
    if len(data) != EXPECTED_REGION_COUNT:
        raise SystemExit(f"Expected {EXPECTED_REGION_COUNT} rows, found {len(data)}.")

    rows: list[dict[str, Any]] = []
    seen_region_codes: set[str] = set()
    for index, row in enumerate(data):
        region_code = _validate_measurement_row(index, row, seen_region_codes)
        seen_region_codes.add(region_code)
        rows.append(row)
    return rows


def _validate_measurement_row(index: int, row: Any, seen_region_codes: set[str]) -> str:
    """Validate one input row and return its region_code (raises on invalid)."""
    if not isinstance(row, dict):
        raise SystemExit(f"Row {index} is not an object.")
    missing = sorted(REQUIRED_FIELDS - set(row.keys()))
    if missing:
        raise SystemExit(f"Row {index} is missing fields: {', '.join(missing)}")

    region_code = str(row["region_code"]).strip()
    quality_status = str(row["quality_status"]).strip()
    pixel_count_valid = row["pixel_count_valid"]
    if not region_code:
        raise SystemExit(f"Row {index} has empty region_code.")
    if region_code in seen_region_codes:
        raise SystemExit(f"Duplicate region_code in input: {region_code}")
    if quality_status not in ALLOWED_QUALITY_STATUSES:
        raise SystemExit(f"Unsupported quality_status for {region_code}: {quality_status}")
    if (
        not isinstance(pixel_count_valid, int)
        or isinstance(pixel_count_valid, bool)
        or pixel_count_valid < 0
    ):
        raise SystemExit(
            f"pixel_count_valid for {region_code} must be a non-negative integer."
        )
    return region_code


def require_single_metadata_value(rows: list[dict[str, Any]], field_name: str) -> Any:
    values = {row[field_name] for row in rows}
    if len(values) != 1:
        raise SystemExit(f"All rows must have the same {field_name}.")
    value = values.pop()
    if value is None or not str(value).strip():
        raise SystemExit(f"{field_name} is required.")
    return value


def fetch_required_id(session: Any, statement: str, params: dict[str, Any], label: str) -> int:
    from sqlalchemy import text

    row = session.execute(text(statement), params).mappings().first()
    if row is None:
        raise SystemExit(f"Required database row not found: {label}")
    return int(row["id"])


def ensure_source_file(
    session: Any,
    data_product_code: str,
    source_product_id: str,
    source_product_name: str,
    measurement_start_time: datetime,
    measurement_end_time: datetime,
) -> int:
    from sqlalchemy import text

    data_product_id = fetch_required_id(
        session,
        """
        SELECT id_data_product AS id
        FROM data_product
        WHERE product_code = :product_code
        """,
        {"product_code": data_product_code},
        f"data_product.product_code={data_product_code}",
    )

    row = session.execute(
        text(
            """
            INSERT INTO source_file (
                fk_data_product,
                external_product_id,
                product_name,
                file_format,
                sensing_start_at,
                sensing_end_at,
                download_status
            )
            VALUES (
                :fk_data_product,
                :external_product_id,
                :product_name,
                'NetCDF',
                :sensing_start_at,
                :sensing_end_at,
                'downloaded'
            )
            ON CONFLICT (external_product_id) DO UPDATE SET
                fk_data_product = EXCLUDED.fk_data_product,
                product_name = EXCLUDED.product_name,
                sensing_start_at = EXCLUDED.sensing_start_at,
                sensing_end_at = EXCLUDED.sensing_end_at,
                download_status = EXCLUDED.download_status,
                updated_at = NOW()
            RETURNING id_source_file
            """
        ),
        {
            "fk_data_product": data_product_id,
            "external_product_id": source_product_id,
            "product_name": source_product_name,
            "sensing_start_at": measurement_start_time,
            "sensing_end_at": measurement_end_time,
        },
    ).mappings().one()
    return int(row["id_source_file"])


def ensure_processing_run(
    session: Any,
    source_file_id: int,
    script_name: str,
    script_version: str,
    qa_threshold: Decimal,
    bbox_used: str,
    finished_at: datetime,
) -> int:
    from sqlalchemy import text

    row = session.execute(
        text(
            """
            INSERT INTO processing_run (
                fk_source_file,
                run_status,
                script_name,
                script_version,
                qa_threshold,
                bbox_used,
                started_at,
                finished_at
            )
            VALUES (
                :fk_source_file,
                'success',
                :script_name,
                :script_version,
                :qa_threshold,
                :bbox_used,
                :finished_at,
                :finished_at
            )
            ON CONFLICT (
                fk_source_file,
                script_name,
                script_version,
                qa_threshold,
                bbox_used
            ) DO UPDATE SET
                run_status = EXCLUDED.run_status,
                finished_at = EXCLUDED.finished_at,
                error_message = NULL,
                updated_at = NOW()
            RETURNING id_processing_run
            """
        ),
        {
            "fk_source_file": source_file_id,
            "script_name": script_name,
            "script_version": script_version,
            "qa_threshold": qa_threshold,
            "bbox_used": bbox_used,
            "finished_at": finished_at,
        },
    ).mappings().one()
    return int(row["id_processing_run"])


def ingest_rows(
    rows: list[dict[str, Any]],
    indicator_code: str,
    data_product_code: str,
    script_name: str,
    script_version: str,
    bbox_used: str,
) -> int:
    from sqlalchemy import text

    from database import SessionLocal

    source_product_id = str(require_single_metadata_value(rows, "source_product_id"))
    source_product_name = str(require_single_metadata_value(rows, "source_product_name"))
    start_time = parse_iso_datetime(
        require_single_metadata_value(rows, "measurement_start_time"),
        "measurement_start_time",
    )
    end_time = parse_iso_datetime(
        require_single_metadata_value(rows, "measurement_end_time"),
        "measurement_end_time",
    )
    qa_threshold = required_decimal(
        require_single_metadata_value(rows, "qa_threshold"),
        "qa_threshold",
    )

    measurement_statement = text(
        """
        INSERT INTO region_measurement (
            fk_region,
            fk_indicator,
            fk_source_file,
            fk_processing_run,
            measurement_start_time,
            measurement_end_time,
            value_mean,
            value_min,
            value_max,
            pixel_count_valid,
            qa_threshold,
            quality_status,
            unit
        )
        SELECT
            r.id_region,
            :fk_indicator,
            :fk_source_file,
            :fk_processing_run,
            :measurement_start_time,
            :measurement_end_time,
            :value_mean,
            :value_min,
            :value_max,
            :pixel_count_valid,
            :qa_threshold,
            :quality_status,
            :unit
        FROM region r
        WHERE r.region_code = :region_code
        ON CONFLICT (
            fk_region,
            fk_indicator,
            fk_source_file,
            fk_processing_run
        ) DO UPDATE SET
            measurement_start_time = EXCLUDED.measurement_start_time,
            measurement_end_time = EXCLUDED.measurement_end_time,
            value_mean = EXCLUDED.value_mean,
            value_min = EXCLUDED.value_min,
            value_max = EXCLUDED.value_max,
            pixel_count_valid = EXCLUDED.pixel_count_valid,
            qa_threshold = EXCLUDED.qa_threshold,
            quality_status = EXCLUDED.quality_status,
            unit = EXCLUDED.unit,
            updated_at = NOW()
        RETURNING id_region_measurement
        """
    )

    with SessionLocal() as session:
        indicator_id = fetch_required_id(
            session,
            """
            SELECT id_indicator AS id
            FROM indicator
            WHERE indicator_code = :indicator_code
            """,
            {"indicator_code": indicator_code},
            f"indicator.indicator_code={indicator_code}",
        )
        source_file_id = ensure_source_file(
            session,
            data_product_code=data_product_code,
            source_product_id=source_product_id,
            source_product_name=source_product_name,
            measurement_start_time=start_time,
            measurement_end_time=end_time,
        )
        processing_run_id = ensure_processing_run(
            session,
            source_file_id=source_file_id,
            script_name=script_name,
            script_version=script_version,
            qa_threshold=qa_threshold,
            bbox_used=bbox_used,
            finished_at=end_time,
        )

        ingested_count = 0
        for row in rows:
            result = session.execute(
                measurement_statement,
                {
                    "fk_indicator": indicator_id,
                    "fk_source_file": source_file_id,
                    "fk_processing_run": processing_run_id,
                    "measurement_start_time": parse_iso_datetime(
                        row["measurement_start_time"], "measurement_start_time"
                    ),
                    "measurement_end_time": parse_iso_datetime(
                        row["measurement_end_time"], "measurement_end_time"
                    ),
                    "value_mean": optional_decimal(row["value_mean"], "value_mean"),
                    "value_min": optional_decimal(row["value_min"], "value_min"),
                    "value_max": optional_decimal(row["value_max"], "value_max"),
                    "pixel_count_valid": row["pixel_count_valid"],
                    "qa_threshold": required_decimal(row["qa_threshold"], "qa_threshold"),
                    "quality_status": row["quality_status"],
                    "unit": row["unit"],
                    "region_code": row["region_code"],
                },
            ).mappings().first()
            if result is None:
                raise SystemExit(
                    f"Region not found in database: {row['region_code']}. "
                    "Run load_regions.py first."
                )
            ingested_count += 1

        session.commit()
    return ingested_count


def main() -> None:
    args = parse_args()
    input_file = Path(args.file)
    if not input_file.is_absolute():
        input_file = PROJECT_ROOT / input_file

    rows = load_rows(input_file)
    ingested_count = ingest_rows(
        rows=rows,
        indicator_code=args.indicator_code,
        data_product_code=args.data_product_code,
        script_name=args.script_name,
        script_version=args.script_version,
        bbox_used=args.bbox_used,
    )

    valid_regions = sum(1 for row in rows if row["quality_status"] == "valid")
    no_data_regions = sum(1 for row in rows if row["quality_status"] == "no_valid_pixels")
    assigned_pixels = sum(
        int(row["pixel_count_valid"])
        for row in rows
        if row["quality_status"] == "valid"
    )
    print(f"Ingested {ingested_count} regional NO2 measurements.")
    print(f"Valid regions: {valid_regions}")
    print(f"No-data regions: {no_data_regions}")
    print(f"Assigned valid pixels: {assigned_pixels}")


if __name__ == "__main__":
    main()
