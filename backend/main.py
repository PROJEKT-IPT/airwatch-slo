import os
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from schemas import LatestMeasurementResponse, ProcessingStatusResponse, RegionResponse

app = FastAPI(title="AirWatch SLO API")


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
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/measurements/latest", response_model=LatestMeasurementResponse)
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
    region_filter = (
        "region_code = :region_code" if region_code else "id_region = :id_region"
    )
    params = {"region_code": region_code, "id_region": selected_id_region}

    region = db.execute(
        text(
            f"""
            SELECT id_region
            FROM region
            WHERE {region_filter}
            """
        ),
        params,
    ).mappings().first()

    if region is None:
        raise HTTPException(
            status_code=404,
            detail="Region not found.",
        )

    row = db.execute(
        text(
            """
            SELECT
                r.id_region,
                r.region_code,
                r.region_name,
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
            JOIN region r ON r.id_region = rm.fk_region
            JOIN indicator i ON i.id_indicator = rm.fk_indicator
            JOIN source_file sf ON sf.id_source_file = rm.fk_source_file
            JOIN data_product dp ON dp.id_data_product = sf.fk_data_product
            JOIN data_source ds ON ds.id_data_source = dp.fk_data_source
            WHERE rm.fk_region = :selected_id_region
                AND i.indicator_code = 'NO2'
            ORDER BY rm.measurement_end_time DESC
            LIMIT 1
            """
        ),
        {"selected_id_region": region["id_region"]},
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="No NO2 measurement found for the requested region.",
        )

    return dict(row)


@app.get("/processing/status", response_model=ProcessingStatusResponse)
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

    return dict(row)
