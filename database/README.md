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
