from __future__ import annotations

from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session


NO2_INDICATOR_CODE = "NO2"
STATISTICAL_REGION_TYPE = "statistical_region"
EXCLUDED_PUBLIC_REGION_CODE = "SI_BBOX"


def get_no2_measurement_dates_for_statistical_regions(db: Session) -> list[date]:
    rows = db.execute(
        text(
            """
            SELECT DISTINCT
                (rm.measurement_end_time AT TIME ZONE 'UTC')::date AS measurement_date
            FROM region_measurement rm
            JOIN indicator i ON i.id_indicator = rm.fk_indicator
            JOIN region r ON r.id_region = rm.fk_region
            JOIN source_file sf ON sf.id_source_file = rm.fk_source_file
            WHERE i.indicator_code = :indicator_code
                AND r.region_type = :region_type
                AND r.region_code <> :excluded_region_code
                AND (
                    LOWER(sf.file_format) = 'netcdf'
                    OR LOWER(sf.product_name) LIKE '%.nc'
                )
            ORDER BY measurement_date DESC
            """
        ),
        {
            "indicator_code": NO2_INDICATOR_CODE,
            "region_type": STATISTICAL_REGION_TYPE,
            "excluded_region_code": EXCLUDED_PUBLIC_REGION_CODE,
        },
    ).mappings().all()
    return [row["measurement_date"] for row in rows]


def get_latest_no2_measurements_for_statistical_regions(
    db: Session,
    *,
    measurement_date: date | None = None,
) -> list[dict]:
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
                    AND (
                        :measurement_date IS NULL
                        OR (
                            rm.measurement_end_time >= (
                                CAST(:measurement_date AS date)::timestamp AT TIME ZONE 'UTC'
                            )
                            AND rm.measurement_end_time < (
                                (
                                    CAST(:measurement_date AS date)::timestamp
                                    AT TIME ZONE 'UTC'
                                ) + INTERVAL '1 day'
                            )
                        )
                    )
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
            "measurement_date": measurement_date,
        },
    ).mappings().all()
    return [dict(row) for row in rows]


def get_latest_no2_comparison_for_regions(
    db: Session,
    region_codes: list[str],
    *,
    include_test_region: bool = False,
) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                r.region_code,
                r.region_name,
                r.region_type,
                latest.value_mean,
                latest.value_min,
                latest.value_max,
                latest.pixel_count_valid,
                latest.qa_threshold,
                latest.quality_status,
                latest.unit,
                latest.measurement_start_time,
                latest.measurement_end_time,
                latest.fk_processing_run AS processing_run_id,
                sf.product_name AS source_product_name
            FROM region r
            LEFT JOIN LATERAL (
                SELECT
                    rm.fk_source_file,
                    rm.fk_processing_run,
                    rm.value_mean,
                    rm.value_min,
                    rm.value_max,
                    rm.pixel_count_valid,
                    rm.qa_threshold,
                    rm.quality_status,
                    rm.unit,
                    rm.measurement_start_time,
                    rm.measurement_end_time,
                    rm.id_region_measurement
                FROM region_measurement rm
                JOIN indicator i ON i.id_indicator = rm.fk_indicator
                WHERE rm.fk_region = r.id_region
                    AND i.indicator_code = :indicator_code
                ORDER BY
                    rm.measurement_end_time DESC,
                    rm.measurement_start_time DESC,
                    rm.id_region_measurement DESC
                LIMIT 1
            ) latest ON TRUE
            LEFT JOIN source_file sf ON sf.id_source_file = latest.fk_source_file
            WHERE r.region_code = ANY(:region_codes)
                AND (
                    :include_test_region = TRUE
                    OR r.region_type = :region_type
                )
            ORDER BY
                latest.value_mean DESC NULLS LAST,
                r.region_name
            """
        ),
        {
            "indicator_code": NO2_INDICATOR_CODE,
            "region_codes": region_codes,
            "include_test_region": include_test_region,
            "region_type": STATISTICAL_REGION_TYPE,
        },
    ).mappings().all()
    return [dict(row) for row in rows]


def get_latest_no2_measurement_for_region(
    db: Session,
    region_id: int,
    *,
    measurement_date: date | None = None,
) -> dict | None:
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
                AND (
                    :measurement_date IS NULL
                    OR (
                        rm.measurement_end_time >= (
                            CAST(:measurement_date AS date)::timestamp AT TIME ZONE 'UTC'
                        )
                        AND rm.measurement_end_time < (
                            (
                                CAST(:measurement_date AS date)::timestamp
                                AT TIME ZONE 'UTC'
                            ) + INTERVAL '1 day'
                        )
                    )
                )
            ORDER BY
                rm.measurement_end_time DESC,
                rm.measurement_start_time DESC,
                rm.id_region_measurement DESC
            LIMIT 1
            """
        ),
        {
            "region_id": region_id,
            "indicator_code": NO2_INDICATOR_CODE,
            "measurement_date": measurement_date,
        },
    ).mappings().first()
    return dict(row) if row is not None else None


def get_no2_measurement_history_for_region(
    db: Session,
    region_id: int,
    *,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    sql = """
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
    """

    params: dict = {"region_id": region_id, "indicator_code": NO2_INDICATOR_CODE}

    if start_date:
        sql += "\n                AND rm.measurement_end_time >= :start_date"
        params["start_date"] = start_date

    if end_date:
        sql += "\n                AND rm.measurement_end_time <= :end_date"
        params["end_date"] = end_date

    sql += "\n            ORDER BY\n                rm.measurement_end_time ASC,\n                rm.measurement_start_time ASC,\n                rm.id_region_measurement ASC\n            "

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(row) for row in rows]


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


def get_no2_history_csv_export_rows_for_region(db: Session, region_id: int) -> list[dict]:
    rows = db.execute(
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
                rm.measurement_end_time ASC,
                rm.measurement_start_time ASC,
                rm.id_region_measurement ASC
            """
        ),
        {"region_id": region_id, "indicator_code": NO2_INDICATOR_CODE},
    ).mappings().all()
    return [dict(row) for row in rows]


def get_latest_no2_csv_export_rows_for_statistical_regions(db: Session) -> list[dict]:
    rows = db.execute(
        text(
            """
            WITH latest_region_measurements AS (
                SELECT DISTINCT ON (rm.fk_region)
                    rm.fk_region,
                    rm.fk_indicator,
                    rm.fk_source_file,
                    rm.fk_processing_run,
                    rm.value_mean,
                    rm.value_min,
                    rm.value_max,
                    rm.pixel_count_valid,
                    rm.qa_threshold,
                    rm.quality_status,
                    rm.unit,
                    rm.measurement_start_time,
                    rm.measurement_end_time,
                    rm.id_region_measurement
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
                i.indicator_code,
                i.indicator_name,
                latest.value_mean,
                latest.value_min,
                latest.value_max,
                latest.pixel_count_valid,
                latest.qa_threshold,
                latest.quality_status,
                latest.unit,
                latest.measurement_start_time,
                latest.measurement_end_time,
                latest.fk_processing_run AS processing_run_id,
                sf.external_product_id AS source_product_id,
                sf.product_name AS source_product_name
            FROM latest_region_measurements latest
            JOIN region r ON r.id_region = latest.fk_region
            JOIN indicator i ON i.id_indicator = latest.fk_indicator
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
