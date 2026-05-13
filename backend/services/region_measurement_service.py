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
            WITH ranked_measurements AS (
                SELECT
                    rm.id_region_measurement,
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
                    rm.measurement_end_time,
                    ROW_NUMBER() OVER (
                        PARTITION BY rm.fk_region
                        ORDER BY
                            rm.measurement_end_time DESC,
                            rm.measurement_start_time DESC,
                            rm.id_region_measurement DESC
                    ) AS row_num
                FROM region_measurement rm
                JOIN indicator i ON i.id_indicator = rm.fk_indicator
                WHERE i.indicator_code = :indicator_code
            )
            SELECT
                r.region_code,
                r.region_name,
                r.region_type,
                ranked.value_mean,
                ranked.value_min,
                ranked.value_max,
                ranked.pixel_count_valid,
                ranked.quality_status,
                ranked.unit,
                ranked.measurement_start_time,
                ranked.measurement_end_time,
                ranked.fk_processing_run AS processing_run_id,
                sf.product_name AS source_product_name
            FROM ranked_measurements ranked
            JOIN region r ON r.id_region = ranked.fk_region
            JOIN source_file sf ON sf.id_source_file = ranked.fk_source_file
            WHERE ranked.row_num = 1
                AND r.region_type = :region_type
                AND r.region_code <> :excluded_region_code
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

