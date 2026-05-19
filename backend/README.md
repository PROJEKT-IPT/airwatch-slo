# AirWatch SLO Backend

FastAPI backend for the AirWatch SLO MVP.

## Setup

Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

The backend reads database settings from the root `.env` file. For local Docker development, the actual PostgreSQL password comes from `POSTGRES_PASSWORD`.

## Database Migrations

Run migrations inside Docker so Alembic connects to the `db` service:

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
```

## Run API

With Docker:

```bash
docker compose up --build backend
```

Locally from the backend folder:

```bash
cd backend
uvicorn main:app --reload
```

When run locally on the host, the backend connects to PostgreSQL at `127.0.0.1:5432`. When run inside Docker, it connects to the Compose service host `db`.

## Endpoints

Health check:

```bash
curl http://localhost:8000/health
```

List regions:

```bash
curl http://localhost:8000/regions
```

Get latest measurement by region code:

```bash
curl "http://localhost:8000/measurements/latest?region_code=SI_BBOX"
```

Get latest measurement by region id:

```bash
curl "http://localhost:8000/measurements/latest?id_region=1"
```

Get latest measurement by foreign-key style region id alias:

```bash
curl "http://localhost:8000/measurements/latest?fk_region=1"
```

The latest measurement endpoint returns `400` when no region selector is provided,
`404` when the region does not exist, and `404` when no NO2 measurement exists for
the requested region.

Get latest processing status:

```bash
curl http://localhost:8000/processing/status
```

The processing status endpoint returns the newest `processing_run` record and
reports whether the last pipeline run was successful. It returns `404` when no
processing runs exist yet.

Get latest NO2 measurements for all public Slovenian statistical regions:

```bash
curl http://localhost:8000/api/v1/regions/latest-measurements
```

Get region details with the latest NO2 measurement:

```bash
curl http://localhost:8000/api/v1/regions/SI032
```

Export the selected region's latest NO2 measurement as CSV:

```bash
curl -OJ http://localhost:8000/api/v1/regions/SI032/export.csv
```

The regional API endpoints:

- return one latest `NO2` measurement per statistical region,
- exclude `SI_BBOX` and other non-statistical test regions by default,
- expose the selected region's latest `NO2` measurement as a single-row CSV export,
- order the summary response by `region_code`,
- use `measurement_end_time`, `measurement_start_time`, and the measurement id
  as the deterministic latest-record ordering,
- return `404` when a requested region does not exist or has no `NO2`
  measurement yet.

## Tests

Run backend endpoint tests:

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest tests
```

The backend endpoint tests cover the Sprint 1 endpoints plus the new regional
NO2 API endpoints. More detail is documented in
[`../docs/backend_tests.md`](../docs/backend_tests.md).
