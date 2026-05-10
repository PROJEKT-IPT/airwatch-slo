from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RegionResponse(BaseModel):
    id_region: int
    region_name: str
    region_code: str
    region_type: str
    bbox_lat_min: Optional[float] = None
    bbox_lat_max: Optional[float] = None
    bbox_lon_min: Optional[float] = None
    bbox_lon_max: Optional[float] = None


class LatestMeasurementResponse(BaseModel):
    id_region: int
    region_code: str
    region_name: str
    indicator_code: str
    indicator_name: str
    value_mean: Optional[float] = None
    value_min: Optional[float] = None
    value_max: Optional[float] = None
    pixel_count_valid: int
    qa_threshold: Optional[float] = None
    quality_status: Optional[str] = None
    unit: str
    measurement_start_time: datetime
    measurement_end_time: datetime
    source_product_name: str
    data_source_name: str
