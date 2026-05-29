# Regional NO2 Aggregation Strategy

This document defines the Sprint 2 strategy for aggregating Sentinel-5P NO2 pixels by Slovenian statistical regions. It is a handoff document for implementation and validation tasks. It does not implement aggregation code, write database rows, or change backend/frontend behavior.

## 1. Purpose

Sprint 1 proved that AirWatch SLO can download a Sentinel-5P NO2 product, open the NetCDF `PRODUCT` group, crop data to a Slovenia bounding box, apply a quality filter, and calculate basic NO2 statistics.

Sprint 2 moves from one test region (`SI_BBOX`) to real Slovenian statistical regions. Regional aggregation is needed so the dashboard can show NO2 values per region, compare regions, and later display region-specific history.

The purpose of this strategy is to define a simple, explainable first implementation approach for AIRSLO-62. The method should be easy to validate before it is treated as final scientific processing.

## 2. Input Datasets

### Sentinel-5P NO2 Product

Selected input product:

```text
S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Expected local path:

```text
data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Product metadata:

- Product ID: `b898f30a-1d6e-4c6c-bdc2-9933a06e316e`
- Measurement start: `2025-03-11T12:19:40Z`
- Measurement end: `2025-03-11T13:18:05Z`
- Unit: `mol/m²`
- NetCDF group: `PRODUCT`

Required NetCDF variables:

- `latitude`
- `longitude`
- `nitrogendioxide_tropospheric_column`
- `qa_value`

### Slovenian Statistical Region Boundaries

Selected boundary source:

- Source: Eurostat GISCO NUTS 2024
- File: `NUTS_RG_20M_2024_4326_LEVL_3.geojson`
- Format: GeoJSON
- CRS: EPSG:4326
- Filter: `CNTR_CODE = SI`, `LEVL_CODE = 3`
- Expected Slovenian regions: 12

Relevant boundary fields:

- `NUTS_ID`: use as `region_code`
- `NUTS_NAME`: use as `region_name`
- `NAME_LATN`: fallback for `region_name`
- `geometry`: region polygon/multipolygon geometry

## 3. Coordinate Assumptions

Sentinel-5P provides latitude and longitude values for each pixel. GISCO NUTS 2024 boundaries are available in EPSG:4326.

For Sprint 2, both datasets can be compared directly in WGS84 longitude/latitude coordinates:

- Sentinel-5P point: `longitude`, `latitude`
- GISCO region geometry: EPSG:4326 polygon/multipolygon

If a future boundary source uses another CRS, it must be converted to EPSG:4326 before point-in-polygon assignment.

## 4. Pixel Filtering

Filtering should happen before regional assignment:

1. Crop Sentinel-5P pixels to the Slovenia bounding box for performance.
2. Apply the quality filter: `qa_value >= 0.75`.
3. Ignore NaN NO2 values.
4. Use only valid pixels for regional statistics.

Current confirmed crop/filter result for the selected product:

```text
total pixels in Slovenia bbox before QA filter: 632
valid pixels after QA filter: 69
qa_threshold: 0.75
unit: mol/m²
```

The quality threshold is chosen because Sentinel-5P NO2 guidance commonly recommends filtering tropospheric NO2 with `qa_value > 0.75` to remove very cloudy scenes, snow/ice-covered scenes, and problematic retrievals.

## 5. Pixel-To-Region Assignment Strategy

Use a simple point-in-polygon method for Sprint 2:

1. Treat each valid Sentinel-5P NO2 pixel as a point using its longitude and latitude.
2. For each point, test whether it falls inside a Slovenian statistical region geometry.
3. Assign the point to the first matching region.
4. If a point falls outside all regions, exclude it from regional statistics.
5. If a point falls exactly on a boundary, use the spatial library's standard `contains`/`covers` behavior and document the result.

For implementation, prefer a reliable geospatial library such as GeoPandas/Shapely if available in the data pipeline environment. The implementation should remain small and reproducible.

Boundary behavior should be documented during validation because `contains` may exclude boundary points, while `covers` includes them. For dashboard MVP results this difference is expected to be small, but it should not be hidden.

## 6. Statistics Per Region

For each Slovenian statistical region, calculate:

- `value_mean`
- `value_min`
- `value_max`
- `pixel_count_valid`
- `qa_threshold`
- `quality_status`
- `unit`
- `measurement_start_time`
- `measurement_end_time`
- `source_product_id`
- `source_product_name`

The statistics should be calculated only from valid NO2 pixels assigned to that region.

## 7. Quality Status Rules

Use the following initial quality statuses:

- `valid`: the region has at least one valid assigned pixel after QA filtering.
- `no_valid_pixels`: the region has zero valid assigned pixels after QA filtering.
- `processing_error`: processing failed for the region.

For `no_valid_pixels`, numeric statistics should be `null` in JSON output or empty fields in CSV output. `pixel_count_valid` should be `0`.

## 8. Expected Output Format

AIRSLO-62 should produce a small JSON or CSV summary, not large raster arrays.

Recommended JSON shape:

```json
[
  {
    "region_code": "SI032",
    "region_name": "Podravska",
    "value_mean": 0.000031,
    "value_min": 0.000012,
    "value_max": 0.000052,
    "pixel_count_valid": 41,
    "qa_threshold": 0.75,
    "quality_status": "valid",
    "unit": "mol/m²",
    "measurement_start_time": "2025-03-11T12:19:40Z",
    "measurement_end_time": "2025-03-11T13:18:05Z",
    "source_product_id": "b898f30a-1d6e-4c6c-bdc2-9933a06e316e",
    "source_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc"
  }
]
```

Recommended CSV columns:

```text
region_code,region_name,value_mean,value_min,value_max,pixel_count_valid,qa_threshold,quality_status,unit,measurement_start_time,measurement_end_time,source_product_id,source_product_name
```

## 9. Limitations

- Sentinel-5P is suitable for regional interpretation, not street-level analysis.
- GISCO 20M geometries are generalized cartographic boundaries, not high-resolution cadastral boundaries.
- Some regions may have no valid pixels due to clouds, orbit coverage, QA filtering, or low pixel count.
- The selected product is one orbit/time interval, so results represent only that measurement window.
- The Sprint 2 point-in-polygon method is intentionally simple and should be validated before being treated as final scientific processing.
- A future scientific refinement may consider pixel footprints or weighted spatial overlap instead of treating each pixel as a point.

## 10. Handoff To Later Tasks

This strategy is the implementation guide for:

- `AIRSLO-62 Implement NO2 aggregation by region`: implement point assignment and per-region statistics.
- `AIRSLO-69 Validate regional NO2 output`: verify region counts, no-data regions, QA behavior, and reasonableness of values.
- `AIRSLO-63 Store regional NO2 measurements in database`: map aggregation output to `region_measurement` rows.
- `AIRSLO-19 Region details endpoint`: expose region-level measurement details through the backend.
- `AIRSLO-20 Dashboard details card`: display regional NO2 details in the frontend.

The next implementation should keep the current strategy reproducible: fixed input product, documented GISCO NUTS3 boundaries, fixed QA threshold, and explicit output summaries.
