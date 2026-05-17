# Sprint 3 Selected NO₂ Input Product

This document records the newer Sentinel-5P NO₂ product selected for AIRSLO-80
("Ingest newer Sentinel-5P NO₂ product for latest available data"). It
supersedes the Sprint 2 fixed input product as the dashboard's "latest
available processed Sentinel-5P measurement" while keeping the Sprint 2 product
in the database as historical context.

AirWatch SLO is not a real-time application. This selection still represents a
single satellite overpass that was processed offline; the dashboard continues
to display the latest available *valid processed* Sentinel-5P measurement.

## Selected product

- Product ID: `1cee3f1c-b237-4532-9505-d20f9baf7daf`
- Product name: `S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_44394_03_020901_20260510T052830.nc`
- Product type: Sentinel-5P OFFL L2 NO₂
- Format: NetCDF (`.nc`)
- NetCDF group for processing: `PRODUCT`
- Sensing start: `2026-05-08T12:03:11Z`
- Sensing end: `2026-05-08T13:01:35Z`
- Approximate orbit window: ~58 minutes
- Local file size: `621336993` bytes (≈ 593 MB)
- Expected local path:
  `data_pipeline/sample_data/S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_44394_03_020901_20260510T052830.nc`

The `.nc` file is not committed (covered by `.gitignore` rule
`data_pipeline/sample_data/*`).

## Why this product

- It is the newest **OFFL** Sentinel-5P NO₂ product (sensed within the last
  ~10 days at the time of selection) that intersects the Slovenia bounding box
  and matches the `data_product.product_code = 'S5P_OFFL_L2__NO2'` row already
  seeded in the database. NRTI products were excluded so no schema changes were
  required.
- The NetCDF inspection confirmed all required variables exist:
  `latitude`, `longitude`, `nitrogendioxide_tropospheric_column`, `qa_value`.
- The aggregation produced valid data for **all 12** Slovenian NUTS3 regions
  (compared with 8 of 12 for the Sprint 2 product), so the dashboard's region
  picker has no `no_valid_pixels` rows under this newer product.

## How to reproduce locally

Follow [`docs/regional_pipeline_runbook.md`](./regional_pipeline_runbook.md)
end to end, substituting the new product's path, UUID, and sensing times.
The exact commands used here:

```bash
# 1. Search (using the existing helper) — confirm the OFFL UUID is still listed.
python data_pipeline/scripts/search_s5p_no2_products.py \
  --start-date 2026-05-03 --end-date 2026-05-17 --top 30

# 2. Download.
python data_pipeline/scripts/download_s5p_no2_product.py \
  --product-id 1cee3f1c-b237-4532-9505-d20f9baf7daf

# 3. Inspect (sanity).
python data_pipeline/scripts/inspect_s5p_no2_structure.py \
  --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_44394_03_020901_20260510T052830.nc

# 4. Aggregate.
python data_pipeline/scripts/aggregate_no2_by_region.py \
  --no2-file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20260508T114137_20260508T132308_44394_03_020901_20260510T052830.nc \
  --regions-file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson \
  --output data_pipeline/outputs/no2_by_region/regional_no2_results_20260508.json \
  --source-product-id 1cee3f1c-b237-4532-9505-d20f9baf7daf \
  --measurement-start-time 2026-05-08T12:03:11Z \
  --measurement-end-time 2026-05-08T13:01:35Z

# 5. Validate.
python data_pipeline/scripts/validate_regional_no2_output.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results_20260508.json

# 6. Ingest (Docker workaround — see runbook §11 Option B for the full
#    copy/rebuild/run/delete/rebuild dance).
cp data_pipeline/outputs/no2_by_region/regional_no2_results_20260508.json backend/
docker compose build backend
docker compose run --rm backend python scripts/ingest_regional_no2_measurements.py \
  --file /app/regional_no2_results_20260508.json
rm -f backend/regional_no2_results_20260508.json
docker compose build backend
```

## Aggregation summary

The point-in-polygon regional aggregation reported:

```text
Slovenian regions loaded:                 12
Total pixels in bbox before QA filter:  1057
Valid pixels after QA filter:            621
Valid pixels assigned to regions:        296
Valid pixels outside all regions:        325
Regions with valid data:                  12
Regions with no valid pixels:              0
```

## Validation result

```text
Total regions:                12
Valid regions:                12
No-data regions:               0
Processing-error regions:      0
Total assigned valid pixels: 296
Warnings:                   none
Errors:                     none
Validation status:          PASS
```

The expected-count flags from the Sprint 2 validation invocation
(`--expected-valid-regions 8 --expected-no-data-regions 4
--expected-assigned-valid-pixels 46`) are intentionally **not** used here —
those values were specific to the 2025-03-11 product.

## Database state after ingestion

The ingestion script created one new `source_file` row, one new
`processing_run` row (`processing_run_id = 3`, `script_version =
sprint_2_regional`, the version label kept from the existing script — see
follow-ups), and **12 new `region_measurement` rows**. The Sprint 2 rows
remain in place as history.

Per-product breakdown of `region_measurement` for statistical regions:

```text
S5P_OFFL_L2__NO2____20260508T114137_…052830.nc | valid           | 12 | 2026-05-08 13:01:35+00
S5P_OFFL_L2__NO2____20250311T115807_…042301.nc | valid           |  8 | 2025-03-11 13:18:05+00
S5P_OFFL_L2__NO2____20250311T115807_…042301.nc | no_valid_pixels |  4 | 2025-03-11 13:18:05+00
```

Total: 24 statistical-region rows + 1 SI_BBOX Sprint 1 row = 25 rows in
`region_measurement`. The Sprint 1 `SI_BBOX` test row is unchanged.

## API verification

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/regions/latest-measurements
curl http://localhost:8000/api/v1/regions/SI041
curl http://localhost:8000/api/v1/regions/SI031
```

Observed results after ingestion:

- `/health` → `200 {"status":"healthy"}`.
- `/api/v1/regions/latest-measurements` → 12 rows, **all** with
  `measurement_end_time = 2026-05-08T13:01:35Z` and source product set to the
  new `.nc`. No row references the Sprint 2 2025-03-11 product (the API picks
  the latest by `measurement_end_time DESC`).
- `/api/v1/regions/SI041` → `quality_status=valid`,
  `value_mean ≈ 1.99 × 10⁻⁵ mol/m²`, `processing_run_id = 3`,
  `source_product_id = 1cee3f1c-b237-4532-9505-d20f9baf7daf`.
- `/api/v1/regions/SI031` → `quality_status=valid`,
  `pixel_count_valid = 22` (was `no_valid_pixels` under the Sprint 2 product).

## Dashboard verification

Opening <http://localhost:3000>:

- All 12 statistical regions appear in the dropdown without
  `(ni veljavnih pikslov)` suffixes, because every region now has a valid
  measurement under the newer product.
- Selecting any region (e.g. SI041 or SI031) shows the new
  `2026-05-08T13:01:35Z` measurement end time, the new product name, and the
  new product UUID (`1cee3f1c-…`) in the "Izvor in sledljivost podatka"
  provenance card.

## Files that must remain uncommitted

- `data_pipeline/sample_data/S5P_OFFL_L2__NO2____20260508T114137_….nc` —
  gitignored by `data_pipeline/sample_data/*`.
- `data_pipeline/outputs/no2_by_region/regional_no2_results_20260508.json` —
  gitignored by `data_pipeline/outputs/no2_by_region/*`.
- `backend/regional_no2_results_20260508.json` (temporary during Option B
  ingestion) — **not** gitignored by default; was removed immediately after
  ingestion and the backend image was rebuilt to flush it from any cached
  layer.
- `.env` (Copernicus + DB credentials) — gitignored.

## Limitations

- Sentinel-5P TROPOMI pixels are ~3.5 × 5.5 km. Values remain **regional
  estimates**, not street-level air-quality measurements.
- The pipeline still uses **point-in-polygon** pixel assignment, not weighted
  pixel-footprint overlap. 325 of 621 QA-passing pixels in the bbox fell
  outside the GISCO NUTS3 generalized boundaries for this product — expected
  behaviour, but worth noting as boundary slack.
- The selected product is a single OFFL overpass, not a continuous time
  series. The dashboard's "latest available valid measurement" advances only
  when a new product is ingested.
- The processing_run row carries `script_version = sprint_2_regional` because
  the ingestion script's default has not been bumped. This is a label-only
  follow-up — see "Limitations / follow-ups" in the AIRSLO-80 report.

## References

- [`docs/regional_pipeline_runbook.md`](./regional_pipeline_runbook.md) —
  end-to-end runbook used as the procedural reference here.
- [`docs/sprint2_selected_no2_input_product.md`](./sprint2_selected_no2_input_product.md) —
  the previous (2025-03-11) selected product, kept in the database for
  historical comparison.
- [`docs/regional_no2_aggregation_strategy.md`](./regional_no2_aggregation_strategy.md) —
  describes the aggregation method.
- [`docs/sentinel5p_regional_interpretation_limitations.md`](./sentinel5p_regional_interpretation_limitations.md) —
  caveats about Sentinel-5P interpretation.
