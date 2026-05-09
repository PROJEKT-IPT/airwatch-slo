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
curl "http://localhost:8000/measurements/latest?fk_region=1"
```

The latest measurement endpoint returns `404` when no measurement exists for the requested region.
