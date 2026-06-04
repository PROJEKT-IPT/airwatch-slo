import logging
import os
import re
import csv
from io import StringIO
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    LatestMeasurementResponse,
    ProcessingRunHistoryItem,
    ProcessingStatusResponse,
    RegionComparisonResponse,
    RegionCsvExportRow,
    RegionDetailsResponse,
    RegionGeometryResponse,
    RegionHistoryResponse,
    RegionLatestMeasurementSummaryResponse,
    RegionResponse,
)
from services.region_measurement_service import (
    get_latest_no2_csv_export_rows_for_statistical_regions,
    get_latest_no2_comparison_for_regions,
    get_latest_no2_csv_export_row_for_region,
    get_latest_no2_measurement_for_region,
    get_latest_no2_measurements_for_statistical_regions,
    get_no2_history_csv_export_rows_for_region,
    get_no2_measurement_history_for_region,
)
from services.region_service import (
    get_region_details_by_code,
    get_region_geometries_for_statistical_regions,
)

app = FastAPI(title="AirWatch SLO API")
logger = logging.getLogger(__name__)


def _safe_log(value: object) -> str:
    """Neutralize user-supplied values before logging them.

    Removes CR/LF/control characters so a crafted region code cannot forge or
    inject extra log lines (log-injection hardening).
    """
    return re.sub(r"[\x00-\x1f\x7f]", " ", str(value))[:200]


REGION_NOT_FOUND_DETAIL = "Region not found."
NO_NO2_MEASUREMENT_DETAIL = "No NO2 measurement found for the requested region."

_BAD_REQUEST = {"description": "Invalid request parameters."}
_NOT_FOUND = {"description": "The requested region or measurement was not found."}
_SERVER_ERROR = {"description": "Unexpected error while querying the database."}


# DEPLOY: uncomment these two lines once `admin_refresh.py`'s deploy
# prerequisites are in place (see that module's docstring for the checklist).
# Activating this exposes POST /admin/refresh-latest with X-Admin-Token auth.
# from admin_refresh import register_admin_routes
# register_admin_routes(app)


def get_cors_origins() -> list[str]:
    raw_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [
        origin.strip()
        for origin in raw_origins.split(",")
        if origin.strip()
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Token"],
)


@app.get("/health")
def health_check():
    return JSONResponse(content={"status": "healthy"}, status_code=200)


@app.get("/")
def root():
    return {"message": "AirWatch API"}


@app.get("/regions", response_model=list[RegionResponse])
def get_regions(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT
                id_region,
                region_name,
                region_code,
                region_type,
                bbox_lat_min,
                bbox_lat_max,
                bbox_lon_min,
                bbox_lon_max
            FROM region
            ORDER BY region_name
            """
        )
    ).mappings().all()
    return [dict(row) for row in rows]


@app.get(
    "/measurements/latest",
    response_model=LatestMeasurementResponse,
    responses={400: _BAD_REQUEST, 404: _NOT_FOUND},
)
def get_latest_measurement(
    region_code: Optional[str] = Query(default=None),
    id_region: Optional[int] = Query(default=None),
    fk_region: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    region_code = region_code.strip() if region_code else None
    selectors = [
        region_code is not None,
        id_region is not None,
        fk_region is not None,
    ]

    if not any(selectors):
        raise HTTPException(
            status_code=400,
            detail="Provide one region selector: region_code, id_region, or fk_region.",
        )

    if sum(selectors) > 1:
        raise HTTPException(
            status_code=400,
            detail="Provide only one region selector: region_code, id_region, or fk_region.",
        )

    selected_id_region = id_region if id_region is not None else fk_region
    params = {"region_code": region_code, "id_region": selected_id_region}

    row = db.execute(
        text(
            """
            SELECT
                r.id_region,
                r.region_code,
                r.region_name,
                latest.indicator_code,
                latest.indicator_name,
                latest.value_mean,
                latest.value_min,
                latest.value_max,
                latest.pixel_count_valid,
                latest.qa_threshold,
                latest.quality_status,
                latest.unit,
                latest.measurement_start_time,
                latest.measurement_end_time,
                latest.source_product_name,
                latest.data_source_name
            FROM region r
            LEFT JOIN LATERAL (
                SELECT
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
                    sf.product_name AS source_product_name,
                    ds.source_name AS data_source_name
                FROM region_measurement rm
                JOIN indicator i ON i.id_indicator = rm.fk_indicator
                JOIN source_file sf ON sf.id_source_file = rm.fk_source_file
                JOIN data_product dp ON dp.id_data_product = sf.fk_data_product
                JOIN data_source ds ON ds.id_data_source = dp.fk_data_source
                WHERE rm.fk_region = r.id_region
                    AND i.indicator_code = 'NO2'
                ORDER BY
                    rm.measurement_end_time DESC,
                    rm.measurement_start_time DESC,
                    rm.id_region_measurement DESC
                LIMIT 1
            ) latest ON TRUE
            WHERE (
                (:region_code IS NOT NULL AND r.region_code = :region_code)
                OR (:id_region IS NOT NULL AND r.id_region = :id_region)
            )
            """
        ),
        params,
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail=REGION_NOT_FOUND_DETAIL,
        )

    if row["indicator_code"] is None:
        raise HTTPException(
            status_code=404,
            detail=NO_NO2_MEASUREMENT_DETAIL,
        )

    return dict(row)


@app.get(
    "/api/v1/regions/latest-measurements",
    response_model=list[RegionLatestMeasurementSummaryResponse],
    responses={500: _SERVER_ERROR},
)
def get_latest_region_measurements(db: Session = Depends(get_db)):
    try:
        return get_latest_no2_measurements_for_statistical_regions(db)
    except SQLAlchemyError as exc:
        logger.exception("Failed to fetch latest regional NO2 measurements")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch latest regional measurements.",
        ) from exc


@app.get(
    "/api/v1/regions/compare",
    response_model=list[RegionComparisonResponse],
    responses={400: _BAD_REQUEST, 404: _NOT_FOUND, 500: _SERVER_ERROR},
)
def compare_regions(
    region_codes: Optional[list[str]] = Query(default=None),
    include_test_region: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    normalized_region_codes = _normalize_region_codes(region_codes)

    if len(normalized_region_codes) < 2:
        raise HTTPException(
            status_code=400,
            detail="Provide at least two region_codes to compare.",
        )

    if len(normalized_region_codes) > 12:
        raise HTTPException(
            status_code=400,
            detail="Compare at most 12 regions in one request.",
        )

    try:
        rows = get_latest_no2_comparison_for_regions(
            db,
            normalized_region_codes,
            include_test_region=include_test_region,
        )
        found_region_codes = {row["region_code"] for row in rows}
        missing_region_codes = [
            region_code
            for region_code in normalized_region_codes
            if region_code not in found_region_codes
        ]

        if missing_region_codes:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": "One or more regions were not found.",
                    "region_codes": missing_region_codes,
                },
            )

        missing_measurement_codes = [
            row["region_code"]
            for row in rows
            if row["processing_run_id"] is None
        ]
        if missing_measurement_codes:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": "No NO2 measurement found for one or more requested regions.",
                    "region_codes": missing_measurement_codes,
                },
            )

        return rows
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Failed to compare regions %s", _safe_log(normalized_region_codes))
        raise HTTPException(
            status_code=500,
            detail="Failed to compare regions.",
        ) from exc


def _normalize_region_codes(region_codes: Optional[list[str]]) -> list[str]:
    if not region_codes:
        return []

    normalized_region_codes = []
    seen_region_codes = set()
    for raw_region_code in region_codes:
        for region_code in raw_region_code.split(","):
            normalized_region_code = region_code.strip().upper()
            if (
                normalized_region_code
                and normalized_region_code not in seen_region_codes
            ):
                normalized_region_codes.append(normalized_region_code)
                seen_region_codes.add(normalized_region_code)

    return normalized_region_codes


@app.get(
    "/api/v1/regions/geometries",
    response_model=list[RegionGeometryResponse],
    responses={500: _SERVER_ERROR},
)
def get_region_geometries(db: Session = Depends(get_db)):
    try:
        return get_region_geometries_for_statistical_regions(db)
    except SQLAlchemyError as exc:
        logger.exception("Failed to fetch regional geometries")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch regional geometries.",
        ) from exc


@app.get(
    "/api/v1/regions/export.csv",
    responses={404: _NOT_FOUND, 500: _SERVER_ERROR},
)
def export_latest_regions_csv(db: Session = Depends(get_db)):
    try:
        export_rows = get_latest_no2_csv_export_rows_for_statistical_regions(db)
        if not export_rows:
            raise HTTPException(
                status_code=404,
                detail="No NO2 measurements found for statistical regions.",
            )

        return _build_csv_response(
            export_rows,
            filename="airwatch-regions-latest.csv",
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Failed to export latest regional CSV")
        raise HTTPException(
            status_code=500,
            detail="Failed to export latest regional CSV.",
        ) from exc


@app.get(
    "/api/v1/regions/{region_code}",
    response_model=RegionDetailsResponse,
    responses={404: _NOT_FOUND, 500: _SERVER_ERROR},
)
def get_region_details(
    region_code: str,
    include_test_region: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    normalized_region_code = region_code.strip()

    try:
        region = get_region_details_by_code(
            db,
            normalized_region_code,
            include_test_region=include_test_region,
        )
        if region is None:
            raise HTTPException(status_code=404, detail=REGION_NOT_FOUND_DETAIL)

        latest_measurement = get_latest_no2_measurement_for_region(db, region["id_region"])
        if latest_measurement is None:
            raise HTTPException(
                status_code=404,
                detail=NO_NO2_MEASUREMENT_DETAIL,
            )

        return {
            "region_code": region["region_code"],
            "region_name": region["region_name"],
            "region_type": region["region_type"],
            "geometry": region["geometry"],
            "latest_measurement": latest_measurement,
        }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Failed to fetch region details for %s", _safe_log(normalized_region_code))
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch region details.",
        ) from exc


@app.get(
    "/api/v1/regions/{region_code}/history",
    response_model=RegionHistoryResponse,
    responses={404: _NOT_FOUND, 500: _SERVER_ERROR},
)
def get_region_history(
    region_code: str,
    include_test_region: bool = Query(default=False),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    normalized_region_code = region_code.strip()

    try:
        region = get_region_details_by_code(
            db,
            normalized_region_code,
            include_test_region=include_test_region,
        )
        if region is None:
            raise HTTPException(status_code=404, detail=REGION_NOT_FOUND_DETAIL)

        measurements = get_no2_measurement_history_for_region(
            db,
            region["id_region"],
            start_date=start_date,
            end_date=end_date,
        )
        if not measurements:
            raise HTTPException(
                status_code=404,
                detail="No NO2 measurement history found for the requested region.",
            )

        return {
            "region_code": region["region_code"],
            "region_name": region["region_name"],
            "region_type": region["region_type"],
            "measurements": measurements,
        }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Failed to fetch region history for %s", _safe_log(normalized_region_code))
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch region history.",
        ) from exc


@app.get(
    "/api/v1/regions/{region_code}/history/export.csv",
    responses={404: _NOT_FOUND, 500: _SERVER_ERROR},
)
def export_region_history_csv(
    region_code: str,
    include_test_region: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    normalized_region_code = region_code.strip()

    try:
        region = get_region_details_by_code(
            db,
            normalized_region_code,
            include_test_region=include_test_region,
        )
        if region is None:
            raise HTTPException(status_code=404, detail=REGION_NOT_FOUND_DETAIL)

        export_rows = get_no2_history_csv_export_rows_for_region(
            db,
            region["id_region"],
        )
        if not export_rows:
            raise HTTPException(
                status_code=404,
                detail="No NO2 measurement history found for the requested region.",
            )

        return _build_csv_response(
            export_rows,
            filename=f"airwatch-region-{region['region_code'].lower()}-history.csv",
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception(
            "Failed to export regional history CSV for %s",
            _safe_log(normalized_region_code),
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to export regional history CSV.",
        ) from exc


@app.get(
    "/api/v1/regions/{region_code}/export.csv",
    responses={404: _NOT_FOUND, 500: _SERVER_ERROR},
)
def export_region_csv(
    region_code: str,
    include_test_region: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    normalized_region_code = region_code.strip()

    try:
        region = get_region_details_by_code(
            db,
            normalized_region_code,
            include_test_region=include_test_region,
        )
        if region is None:
            raise HTTPException(status_code=404, detail=REGION_NOT_FOUND_DETAIL)

        export_row = get_latest_no2_csv_export_row_for_region(db, region["id_region"])
        if export_row is None:
            raise HTTPException(
                status_code=404,
                detail=NO_NO2_MEASUREMENT_DETAIL,
            )

        return _build_csv_response(
            [export_row],
            filename=f"airwatch-region-{region['region_code'].lower()}-latest.csv",
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Failed to export regional CSV for %s", _safe_log(normalized_region_code))
        raise HTTPException(
            status_code=500,
            detail="Failed to export regional CSV.",
        ) from exc


def _build_csv_response(rows: list[dict], *, filename: str) -> StreamingResponse:
    validated_rows = [RegionCsvExportRow.model_validate(row) for row in rows]
    csv_rows = [row.model_dump(mode="json") for row in validated_rows]
    csv_buffer = StringIO()
    writer = csv.DictWriter(csv_buffer, fieldnames=list(csv_rows[0].keys()))
    writer.writeheader()
    writer.writerows(csv_rows)
    csv_buffer.seek(0)

    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get(
    "/processing/status",
    response_model=ProcessingStatusResponse,
    responses={404: _NOT_FOUND},
)
def get_processing_status(db: Session = Depends(get_db)):
    row = db.execute(
        text(
            """
            SELECT
                pr.id_processing_run,
                pr.run_status,
                pr.script_name,
                pr.script_version,
                pr.qa_threshold,
                pr.started_at,
                pr.finished_at,
                pr.error_message,
                sf.product_name AS source_product_name
            FROM processing_run pr
            JOIN source_file sf ON sf.id_source_file = pr.fk_source_file
            ORDER BY
                COALESCE(pr.finished_at, pr.started_at) DESC,
                pr.id_processing_run DESC
            LIMIT 1
            """
        )
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="No processing runs found.",
        )

    last_success_row = db.execute(
        text(
            """
            SELECT
                pr.id_processing_run AS last_successful_run_id,
                COALESCE(pr.finished_at, pr.started_at) AS last_successful_at,
                sf.product_name AS last_successful_product_name
            FROM processing_run pr
            JOIN source_file sf ON sf.id_source_file = pr.fk_source_file
            WHERE pr.run_status = 'success'
            ORDER BY
                COALESCE(pr.finished_at, pr.started_at) DESC,
                pr.id_processing_run DESC
            LIMIT 1
            """
        )
    ).mappings().first()

    response = dict(row)
    if last_success_row:
        response.update(last_success_row)
    else:
        response.update(
            {
                "last_successful_run_id": None,
                "last_successful_at": None,
                "last_successful_product_name": None,
            }
        )

    return response


@app.get("/processing/history", response_model=list[ProcessingRunHistoryItem])
def get_processing_history(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT
                pr.id_processing_run,
                pr.run_status,
                pr.script_name,
                pr.script_version,
                pr.qa_threshold,
                pr.started_at,
                pr.finished_at,
                pr.error_message,
                sf.product_name AS source_product_name,
                COUNT(DISTINCT rm.fk_region)
                    FILTER (WHERE rm.pixel_count_valid > 0) AS valid_region_count
            FROM processing_run pr
            JOIN source_file sf ON sf.id_source_file = pr.fk_source_file
            LEFT JOIN region_measurement rm
                ON rm.fk_processing_run = pr.id_processing_run
            GROUP BY
                pr.id_processing_run,
                pr.run_status,
                pr.script_name,
                pr.script_version,
                pr.qa_threshold,
                pr.started_at,
                pr.finished_at,
                pr.error_message,
                sf.product_name
            ORDER BY
                COALESCE(pr.finished_at, pr.started_at) DESC,
                pr.id_processing_run DESC
            LIMIT :limit
            OFFSET :offset
            """
        ),
        {"limit": limit, "offset": offset},
    ).mappings().all()

    return [dict(row) for row in rows]
