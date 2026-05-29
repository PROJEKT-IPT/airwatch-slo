# Sprint 3 History NO2 Input Products

This document records the two regional Sentinel-5P NO2 NetCDF products used for
the Sprint 3 history prototype. Both products are real Sentinel-5P OFFL L2 NO2
`.nc` files that can be processed through the regional pipeline. They are
separate from the old `SI_BBOX` proof-of-concept row.

The goal is to have at least two regional overpasses available so future
history/trend work can use multiple measurement timestamps instead of relying
on the old bounding-box test data.

## Local `.nc` files

Both products are stored locally under `data_pipeline/sample_data/` and are not
committed to Git.

| Role | Product ID | Product name | Sensing end |
|------|------------|--------------|-------------|
| Regional history product | `1cee3f1c-b237-4532-9505-d20f9baf7daf` | `S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_44394_03_020901_20260510T052830.nc` | `2026-05-08T13:01:35Z` |
| Regional history product | `7cb32546-02b3-446f-98a1-fac9085802b3` | `S5P_OFFL_L2__NO2____20260511T104452_20260511T122622_44436_03_020901_20260513T031436.nc` | `2026-05-11T12:04:50Z` |

Current local files:

```text
data_pipeline/sample_data/S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_44394_03_020901_20260510T052830.nc
data_pipeline/sample_data/S5P_OFFL_L2__NO2____20260511T104452_20260511T122622_44436_03_020901_20260513T031436.nc
```

The `2026-05-08` product was downloaded as the second regional `.nc` file. Its
NetCDF structure was inspected and contains the required variables:
`latitude`, `longitude`, `nitrogendioxide_tropospheric_column`, and `qa_value`.

## Product 1: 2026-05-08

- Product ID: `1cee3f1c-b237-4532-9505-d20f9baf7daf`
- Product name: `S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_44394_03_020901_20260510T052830.nc`
- Product type: Sentinel-5P OFFL L2 NO2
- Format: NetCDF (`.nc`)
- NetCDF group for processing: `PRODUCT`
- Sensing start: `2026-05-08T12:03:11Z`
- Sensing end: `2026-05-08T13:01:35Z`
- Local file size: `621336993` bytes
- Local path:
  `data_pipeline/sample_data/S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_44394_03_020901_20260510T052830.nc`

This product is also documented in
[`docs/sprint3_selected_no2_input_product.md`](./sprint3_selected_no2_input_product.md).
That document records the previous aggregation result for this product:

```text
Total regions:                12
Valid regions:                12
No-data regions:               0
Processing-error regions:      0
Total assigned valid pixels: 296
Validation status:          PASS
```

## Product 2: 2026-05-11

- Product ID: `7cb32546-02b3-446f-98a1-fac9085802b3`
- Product name: `S5P_OFFL_L2__NO2____20260511T104452_20260511T122622_44436_03_020901_20260513T031436.nc`
- Product type: Sentinel-5P OFFL L2 NO2
- Format: NetCDF (`.nc`)
- NetCDF group for processing: `PRODUCT`
- Sensing start: `2026-05-11T11:06:26Z`
- Sensing end: `2026-05-11T12:04:50Z`
- Local file size: `620596797` bytes
- Local path:
  `data_pipeline/sample_data/S5P_OFFL_L2__NO2____20260511T104452_20260511T122622_44436_03_020901_20260513T031436.nc`
- Current validated regional output:
  `data_pipeline/outputs/no2_by_region/regional_no2_results_20260511.json`

The current local `2026-05-11` regional JSON validates as:

```text
Total regions:                12
Valid regions:                 6
No-data regions:               6
Processing-error regions:      0
Total assigned valid pixels:  35
Validation status:          PASS
```

Regions with valid data in this product are `SI031`, `SI035`, `SI037`,
`SI038`, `SI041`, and `SI042`. The remaining statistical regions are recorded
as `no_valid_pixels`.

## Processing commands

Generate regional output for the `2026-05-08` product:

```bash
python data_pipeline/scripts/aggregate_no2_by_region.py \
  --no2-file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_44394_03_020901_20260510T052830.nc \
  --regions-file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson \
  --output data_pipeline/outputs/no2_by_region/regional_no2_results_20260508.json \
  --source-product-id 1cee3f1c-b237-4532-9505-d20f9baf7daf \
  --measurement-start-time 2026-05-08T12:03:11Z \
  --measurement-end-time 2026-05-08T13:01:35Z
```

Validate the generated `2026-05-08` output:

```bash
python data_pipeline/scripts/validate_regional_no2_output.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results_20260508.json
```

Validate the existing `2026-05-11` output:

```bash
python data_pipeline/scripts/validate_regional_no2_output.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results_20260511.json
```

Ingest either regional output with the existing idempotent ingestion script:

```bash
docker compose run --rm \
  -v ./data_pipeline:/data_pipeline:ro \
  backend python scripts/ingest_regional_no2_measurements.py \
  --file /data_pipeline/outputs/no2_by_region/regional_no2_results_YYYYMMDD.json
```

Replace `YYYYMMDD` with `20260508` or `20260511`.

## `SI_BBOX` is not a history product

The database may still contain the old `SI_BBOX` measurement from Sprint 1. It
is a `test_bbox` row and should not be counted as one of the regional history
products. The history prototype should use statistical-region rows only:

```sql
SELECT sf.external_product_id,
       sf.product_name,
       COUNT(*) AS regional_rows,
       COUNT(*) FILTER (WHERE rm.quality_status = 'valid') AS valid_rows,
       COUNT(*) FILTER (WHERE rm.quality_status = 'no_valid_pixels') AS no_data_rows,
       MAX(rm.measurement_end_time) AS measurement_end_time
FROM region_measurement rm
JOIN source_file sf ON sf.id_source_file = rm.fk_source_file
JOIN region r ON r.id_region = rm.fk_region
WHERE r.region_type = 'statistical_region'
GROUP BY sf.external_product_id, sf.product_name
ORDER BY measurement_end_time DESC;
```

For the history prototype, this query should show one 12-row regional group per
ingested Sentinel-5P product.

## Files that must remain uncommitted

- `data_pipeline/sample_data/*.nc`
- `data_pipeline/outputs/no2_by_region/*.json`
- temporary backend copies of generated regional JSON files
- `.env`

## References

- [`docs/regional_pipeline_runbook.md`](./regional_pipeline_runbook.md)
- [`docs/sprint3_selected_no2_input_product.md`](./sprint3_selected_no2_input_product.md)
- [`docs/regional_no2_database_ingestion.md`](./regional_no2_database_ingestion.md)
