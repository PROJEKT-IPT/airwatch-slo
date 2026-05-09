from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class RegionResponse(BaseModel):
    id_region: int
    region_name: str
    region_code: str
    region_type: str
    bbox_lat_min: Optional[Decimal] = None
    bbox_lat_max: Optional[Decimal] = None
    bbox_lon_min: Optional[Decimal] = None
    bbox_lon_max: Optional[Decimal] = None


class LatestMeasurementResponse(BaseModel):
    id_region_measurement: int
    fk_region: int
    region_code: str
    region_name: str
    fk_indicator: int
    indicator_code: str
    indicator_name: str
    measurement_start_time: datetime
    measurement_end_time: datetime
    value_mean: Optional[Decimal] = None
    value_min: Optional[Decimal] = None
    value_max: Optional[Decimal] = None
    pixel_count_valid: int
    qa_threshold: Optional[Decimal] = None
    quality_status: Optional[str] = None
    unit: str
    source_file_id: int
    external_product_id: str
    product_name: str
    processing_run_id: int
    run_status: str
