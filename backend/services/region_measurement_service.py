from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session


NO2_INDICATOR_CODE = "NO2"
STATISTICAL_REGION_TYPE = "statistical_region"
EXCLUDED_PUBLIC_REGION_CODE = "SI_BBOX"


def get_latest_no2_measurements_for_statistical_regions(db: Session) -> list[dict]:
    rows = db.execute(
        text(
            """
            WITH latest_region_measurements AS (
                SELECT DISTINCT ON (rm.fk_region)
                    rm.fk_region,
                    rm.fk_source_file,
                    rm.fk_processing_run,
                    rm.value_mean,
                    rm.value_min,
                    rm.value_max,
                    rm.pixel_count_valid,
                    rm.quality_status,
                    rm.unit,
                    rm.measurement_start_time,
                    rm.measurement_end_time
                FROM region_measurement rm
                JOIN indicator i ON i.id_indicator = rm.fk_indicator
                JOIN region r ON r.id_region = rm.fk_region
                WHERE i.indicator_code = :indicator_code
                    AND r.region_type = :region_type
                    AND r.region_code <> :excluded_region_code
                ORDER BY
                    rm.fk_region,
                    rm.measurement_end_time DESC,
                    rm.measurement_start_time DESC,
                    rm.id_region_measurement DESC
            )
            SELECT
                r.region_code,
                r.region_name,
                r.region_type,
                latest.value_mean,
                latest.value_min,
                latest.value_max,
                latest.pixel_count_valid,
                latest.quality_status,
                latest.unit,
                latest.measurement_start_time,
                latest.measurement_end_time,
                latest.fk_processing_run AS processing_run_id,
                sf.product_name AS source_product_name
            FROM latest_region_measurements latest
            JOIN region r ON r.id_region = latest.fk_region
            JOIN source_file sf ON sf.id_source_file = latest.fk_source_file
            ORDER BY r.region_code
            """
        ),
        {
            "indicator_code": NO2_INDICATOR_CODE,
            "region_type": STATISTICAL_REGION_TYPE,
            "excluded_region_code": EXCLUDED_PUBLIC_REGION_CODE,
        },
    ).mappings().all()
    return [dict(row) for row in rows]


def get_latest_no2_measurement_for_region(db: Session, region_id: int) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT
                rm.value_mean,
                rm.value_min,
                rm.value_max,
                rm.pixel_count_valid,
                rm.qa_threshold,
                rm.quality_status,
                rm.unit,
                rm.measurement_start_time,
                rm.measurement_end_time,
                rm.fk_processing_run AS processing_run_id,
                sf.external_product_id AS source_product_id,
                sf.product_name AS source_product_name
            FROM region_measurement rm
            JOIN indicator i ON i.id_indicator = rm.fk_indicator
            JOIN source_file sf ON sf.id_source_file = rm.fk_source_file
            WHERE rm.fk_region = :region_id
                AND i.indicator_code = :indicator_code
            ORDER BY
                rm.measurement_end_time DESC,
                rm.measurement_start_time DESC,
                rm.id_region_measurement DESC
            LIMIT 1
            """
        ),
        {"region_id": region_id, "indicator_code": NO2_INDICATOR_CODE},
    ).mappings().first()
    return dict(row) if row is not None else None


def get_latest_no2_csv_export_row_for_region(db: Session, region_id: int) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT
                r.region_code,
                r.region_name,
                r.region_type,
                i.indicator_code,
                i.indicator_name,
                rm.value_mean,
                rm.value_min,
                rm.value_max,
                rm.pixel_count_valid,
                rm.qa_threshold,
                rm.quality_status,
                rm.unit,
                rm.measurement_start_time,
                rm.measurement_end_time,
                rm.fk_processing_run AS processing_run_id,
                sf.external_product_id AS source_product_id,
                sf.product_name AS source_product_name
            FROM region_measurement rm
            JOIN region r ON r.id_region = rm.fk_region
            JOIN indicator i ON i.id_indicator = rm.fk_indicator
            JOIN source_file sf ON sf.id_source_file = rm.fk_source_file
            WHERE rm.fk_region = :region_id
                AND i.indicator_code = :indicator_code
            ORDER BY
                rm.measurement_end_time DESC,
                rm.measurement_start_time DESC,
                rm.id_region_measurement DESC
            LIMIT 1
            """
        ),
        {"region_id": region_id, "indicator_code": NO2_INDICATOR_CODE},
    ).mappings().first()
    return dict(row) if row is not None else None
