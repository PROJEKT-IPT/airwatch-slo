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

## Tests

Run backend endpoint tests:

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest tests
```

The Sprint 1 endpoint tests cover `GET /regions`, `GET /measurements/latest`,
and the not-found response for an unknown region. More detail is documented in
[`../docs/backend_tests.md`](../docs/backend_tests.md).
