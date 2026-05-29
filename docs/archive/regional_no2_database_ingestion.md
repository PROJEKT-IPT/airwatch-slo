# Regional NO2 Database Ingestion

This document describes how Sprint 2 regional NO2 JSON output is loaded into PostgreSQL/PostGIS.

## Existing Schema

No new schema migration is required. The existing Alembic schema already has:

- `region` for `SI_BBOX` and Slovenian statistical regions,
- `indicator` for `NO2`,
- `source_file` for the Sentinel-5P product,
- `processing_run` for the aggregation run,
- `region_measurement` for one result per region.

`SI_BBOX` stays in `region` with `region_type = test_bbox`. Slovenian NUTS3 regions are loaded with:

- `NUTS_ID` as `region_code`,
- `NUTS_NAME` as `region_name`,
- `region_type = statistical_region`.

## Commands

Run migrations first:

```bash
cd backend
alembic upgrade head
cd ..
```

Load regions:

```bash
python backend/scripts/load_regions.py \
  --regions-file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson
```

Ingest regional NO2 measurements:

```bash
python backend/scripts/ingest_regional_no2_measurements.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results.json
```

Docker-friendly commands:

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose run --rm \
  -v ./data_pipeline:/data_pipeline:ro \
  backend python scripts/load_regions.py \
  --regions-file /data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson
docker compose run --rm \
  -v ./data_pipeline:/data_pipeline:ro \
  backend python scripts/ingest_regional_no2_measurements.py \
  --file /data_pipeline/outputs/no2_by_region/regional_no2_results.json
```

## SQL Verification

```sql
SELECT region_code, region_name, region_type
FROM region
ORDER BY region_code;
```

```sql
SELECT r.region_code, r.region_name, rm.value_mean, rm.value_min, rm.value_max,
       rm.pixel_count_valid, rm.quality_status, rm.unit
FROM region_measurement rm
JOIN region r ON r.id_region = rm.fk_region
ORDER BY r.region_code;
```

```sql
SELECT rm.quality_status,
       COUNT(*) AS region_count,
       SUM(rm.pixel_count_valid) AS assigned_valid_pixels
FROM region_measurement rm
JOIN processing_run pr ON pr.id_processing_run = rm.fk_processing_run
WHERE pr.script_name = 'aggregate_no2_by_region.py'
  AND pr.script_version = 'sprint_2_regional'
GROUP BY rm.quality_status
ORDER BY rm.quality_status;
```

Expected Sprint 2 summary for Maida's validated output:

- 12 regional rows,
- 8 `valid` regions,
- 4 `no_valid_pixels` regions,
- 46 assigned valid pixels.

## Idempotency

Both scripts are safe to run multiple times:

- region loading upserts by `region.region_code`,
- source file loading upserts by `source_file.external_product_id`,
- processing run loading upserts by the existing processing-run uniqueness columns,
- measurement loading upserts by the existing `region_measurement` uniqueness columns.

## Limitations

The generated GISCO GeoJSON and regional NO2 JSON files are local generated/input artifacts and are ignored by Git. They must not be committed.

## Sprint 3 regional history prototype

The Sprint 3 history prototype uses regional Sentinel-5P OFFL L2 NO2 products,
not the old `SI_BBOX` test row. The local setup currently uses two regional
`.nc` products, `2026-05-08` and `2026-05-11`, as documented in
[`docs/sprint3_history_no2_input_product.md`](./sprint3_history_no2_input_product.md)
with product metadata, validation summaries, processing commands, and the SQL
verification query for statistical-region history rows.
