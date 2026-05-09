from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from schemas import LatestMeasurementResponse, RegionResponse

app = FastAPI(title="AirWatch SLO API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    fk_region: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    if region_code is None and fk_region is None:
        raise HTTPException(
            status_code=400,
            detail="Provide either region_code or fk_region.",
        )

    if region_code is not None and fk_region is not None:
        raise HTTPException(
            status_code=400,
            detail="Provide only one region selector: region_code or fk_region.",
        )

    region_filter = "r.region_code = :region_code" if region_code else "r.id_region = :fk_region"
    params = {"region_code": region_code, "fk_region": fk_region}

    row = db.execute(
        text(
            f"""
            SELECT
                rm.id_region_measurement,
                rm.fk_region,
                r.region_code,
                r.region_name,
                rm.fk_indicator,
                i.indicator_code,
                i.indicator_name,
                rm.measurement_start_time,
                rm.measurement_end_time,
                rm.value_mean,
                rm.value_min,
                rm.value_max,
                rm.pixel_count_valid,
                rm.qa_threshold,
                rm.quality_status,
                rm.unit,
                rm.fk_source_file AS source_file_id,
                sf.external_product_id,
                sf.product_name,
                rm.fk_processing_run AS processing_run_id,
                pr.run_status
            FROM region_measurement rm
            JOIN region r ON r.id_region = rm.fk_region
            JOIN indicator i ON i.id_indicator = rm.fk_indicator
            JOIN source_file sf ON sf.id_source_file = rm.fk_source_file
            JOIN processing_run pr ON pr.id_processing_run = rm.fk_processing_run
            WHERE {region_filter}
            ORDER BY rm.measurement_end_time DESC
            LIMIT 1
            """
        ),
        params,
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="No latest measurement found for the requested region.",
        )

    return dict(row)
