# AirWatch SLO Database

This folder contains the database documentation and legacy raw SQL initialization scripts for the AirWatch SLO MVP. The backend now uses Alembic migrations as the primary way to create and update the schema.

## SQL Files

- `init/001_create_extensions.sql` enables PostGIS with `CREATE EXTENSION IF NOT EXISTS postgis;`.
- `init/002_create_tables.sql` creates the core MVP tables from the approved ER diagram: `region`, `indicator`, `data_source`, `data_product`, `source_file`, `processing_run`, and `region_measurement`.
- `init/003_seed_initial_data.sql` inserts idempotent Sprint 1 seed data for the Slovenia bbox, NO2 indicator, Copernicus Data Space source, Sentinel-5P NO2 product, one downloaded source file record, one successful processing run, and one processed regional NO2 measurement.

## Alembic Migrations

Alembic migrations live in `backend/alembic/versions/` and should be used for normal backend development.

For local Docker development, the PostgreSQL container password is defined by `POSTGRES_PASSWORD` in the root `.env` file. The backend container and Alembic migrations also use `POSTGRES_PASSWORD` as the single source of truth. `DATABASE_PASSWORD` is not used by Alembic, because it may differ from the actual password used when the `db` service initializes PostgreSQL.

When Alembic is run from the host machine with `cd backend && alembic upgrade head`, it loads the root `.env` file and connects with:

```text
postgresql://POSTGRES_USER:POSTGRES_PASSWORD@127.0.0.1:5432/POSTGRES_DB
```

For the team `.env`, that resolves to the safe target shape:

```text
postgresql://postgres:<hidden>@127.0.0.1:5432/airwatch
```

Alembic prints the host, port, database, and user before connecting, but never prints the password.

Migration order:

1. `001_create_region.py`
2. `002_create_indicator.py`
3. `003_create_data_source.py`
4. `004_create_data_product.py`
5. `005_create_source_file.py`
6. `006_create_processing_run.py`
7. `007_create_region_measurement.py`
8. `008_seed_sprint_1_initial_data.py`
9. `009_region_geometry_postgis.py`
10. `010_seed_statistical_regions.py`
11. `011_optimize_regional_queries.py`

`011_optimize_regional_queries.py` adds:

- a composite `region(region_type, region_code)` index for public regional filters,
- a partial PostGIS `GIST` index on `region.geometry` for spatial lookups,
- two composite `region_measurement` indexes aligned with "latest NO2 per region"
  access patterns used by the backend.

## Sprint 2 Regional NO2 Database Load

Sprint 2 keeps Alembic as the source of schema changes. No new schema migration is required for regional NO2 ingestion because the existing tables already support one `region_measurement` row per region, indicator, source file, and processing run.

Load Slovenian NUTS3/statistical regions from the local GISCO GeoJSON file:

```bash
python backend/scripts/load_regions.py \
  --regions-file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson
```

Ingest Maida's validated regional NO2 output:

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

The ingestion is idempotent. It reuses `region.region_code`, `source_file.external_product_id`, the existing `processing_run` uniqueness rule, and the `region_measurement` uniqueness rule to update existing rows instead of creating duplicates.

Verify loaded regions:

```sql
SELECT region_code, region_name, region_type
FROM region
ORDER BY region_code;
```

Verify regional NO2 measurements:

```sql
SELECT r.region_code, r.region_name, rm.value_mean, rm.value_min, rm.value_max,
       rm.pixel_count_valid, rm.quality_status, rm.unit
FROM region_measurement rm
JOIN region r ON r.id_region = rm.fk_region
ORDER BY r.region_code;
```

Verify Sprint 2 summary:

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

Install backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Run all migrations inside the backend Docker service:

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
```

Rollback one migration:

```bash
docker compose run --rm backend alembic downgrade -1
```

Check the current migration:

```bash
docker compose run --rm backend alembic current
```

Check created tables in PostgreSQL:

```bash
docker exec -it airwatch_db psql -U postgres -d airwatch -c "\\dt"
```

Check the Sprint 1 measurement:

```bash
docker exec -it airwatch_db psql -U postgres -d airwatch -c "SELECT rm.value_mean, rm.value_min, rm.value_max, rm.pixel_count_valid, rm.unit FROM region_measurement rm;"
```

If your local `.env` uses a different `POSTGRES_USER` or `POSTGRES_DB`, replace `postgres` and `airwatch` in those commands.
When Alembic runs inside the backend Docker service, it connects to the database service at `db:5432`. The backend `DATABASE_PASSWORD` value is sourced from `POSTGRES_PASSWORD`, matching the password used to initialize the `db` service.

## Run Locally With Docker PostgreSQL

Start the database container:

```bash
docker compose up -d db
```

The `db` service initializes PostgreSQL with `POSTGRES_PASSWORD`. Keep backend and migration configuration aligned with that variable.

The preferred path is Alembic. The raw SQL scripts can still be run manually if needed:

```bash
docker exec -i airwatch_db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-airwatch}" < database/init/001_create_extensions.sql
docker exec -i airwatch_db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-airwatch}" < database/init/002_create_tables.sql
docker exec -i airwatch_db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-airwatch}" < database/init/003_seed_initial_data.sql
```

If your shell does not have `POSTGRES_USER` and `POSTGRES_DB` loaded, use the defaults from `docker-compose.yml`:

```bash
docker exec -i airwatch_db psql -U postgres -d airwatch < database/init/001_create_extensions.sql
docker exec -i airwatch_db psql -U postgres -d airwatch < database/init/002_create_tables.sql
docker exec -i airwatch_db psql -U postgres -d airwatch < database/init/003_seed_initial_data.sql
```

## Sprint 1 Seed Data

The seed data represents the first Sentinel-5P NO2 proof of concept for Slovenia. It stores one test bbox region, the NO2 indicator in `mol/m²`, Copernicus source metadata, Sentinel-5P OFFL L2 NO2 product metadata, one source file discovered during Sprint 1, one successful processing run with `qa_threshold = 0.75`, and one regional measurement with mean, min, max, and valid pixel count.

This data supports the MVP dashboard flow: select a region, query the latest NO2 measurement, show source metadata, and later build historical trends and region comparison views.
