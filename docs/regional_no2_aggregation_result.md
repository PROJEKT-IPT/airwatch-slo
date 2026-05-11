# Regional NO2 Aggregation Result

This document records how to run the Sprint 2 point-in-polygon regional NO2 aggregation script and how to interpret its output.

The script does not write to the database. It creates a small JSON or CSV output file that can later be used for database insertion.

## Input Files

Sentinel-5P NO2 product:

```text
data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Slovenian NUTS3 region boundaries:

```text
data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson
```

Boundary filtering:

```text
CNTR_CODE = SI
LEVL_CODE = 3
```

Expected regions:

```text
12
```

## QA Threshold

The aggregation uses:

```text
qa_value >= 0.75
```

Only pixels inside the Slovenia bounding box, passing the QA filter, and having finite NO2 values are used for regional statistics.

## Command

Run from the repository root:

```bash
python data_pipeline/scripts/aggregate_no2_by_region.py \
  --no2-file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc \
  --regions-file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson \
  --output data_pipeline/outputs/no2_by_region/regional_no2_results.json \
  --source-product-id b898f30a-1d6e-4c6c-bdc2-9933a06e316e \
  --measurement-start-time 2025-03-11T12:19:40Z \
  --measurement-end-time 2025-03-11T13:18:05Z
```

`--source-product-name` is optional. If it is omitted, the script uses the input `.nc` filename. Measurement times are read from explicit arguments, then from NetCDF metadata when available, and finally from the product filename as a fallback.

## Output File

Default JSON output:

```text
data_pipeline/outputs/no2_by_region/regional_no2_results.json
```

The file contains one object per Slovenian statistical region. Generated output files in `data_pipeline/outputs/no2_by_region/` are ignored by Git except for `.gitkeep`.

## Current Run Summary

The selected Sprint 2 input product and GISCO NUTS3 boundary file were processed successfully.

```text
Slovenian regions loaded: 12
Total pixels in bbox before QA filter: 632
Valid pixels after QA filter: 69
Valid pixels assigned to regions: 46
Valid pixels outside all regions: 23
Regions with valid data: 8
Regions with no valid pixels: 4
Source product ID: b898f30a-1d6e-4c6c-bdc2-9933a06e316e
Source product name: S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
Measurement start time: 2025-03-11T12:19:40Z
Measurement end time: 2025-03-11T13:18:05Z
Output path: data_pipeline/outputs/no2_by_region/regional_no2_results.json
```

Regions with no valid pixels in this run:

```text
SI031 Pomurska
SI033 Koroška
SI038 Primorsko-notranjska
SI042 Gorenjska
```

## Output Fields

Each region object contains:

- `region_code`
- `region_name`
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

Quality statuses:

- `valid`: region has at least one valid assigned pixel.
- `no_valid_pixels`: region has zero valid assigned pixels.
- `processing_error`: reserved for future per-region error handling.

## Limitations

- This is point-in-polygon aggregation: each valid Sentinel-5P pixel is treated as one longitude/latitude point.
- The method does not use Sentinel-5P pixel footprints or weighted overlap.
- GISCO 20M boundaries are generalized cartographic geometries.
- Some regions may have no valid pixels because of orbit coverage, clouds, QA filtering, or the low number of valid pixels in the selected product.
- The output is suitable for Sprint 2 development and validation, not final scientific production without review.
