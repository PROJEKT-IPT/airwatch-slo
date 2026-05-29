# AirWatch SLO – Backend

FastAPI backend, ki streže regionalne NO₂ meritve iz PostgreSQL/PostGIS baze.
Bere konfiguracijo iz korenskega `.env`, shemo upravlja Alembic.

## Zagon

Lokalno (iz mape `backend/`):

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Z Dockerjem (iz korena projekta):

```bash
docker compose up --build backend
```

Backend teče na <http://localhost:8000> (health: `/health`). Pri lokalnem zagonu
se poveže na bazo prek `127.0.0.1`, znotraj Dockerja prek `db:5432`.

## Migracije

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
```

Migracije ustvarijo shemo, omogočijo PostGIS in seed-ajo 12 statističnih regij.
NO₂ meritve se vnesejo prek data pipeline-a (glej `../docs/03_data_pipeline.md`).

## Struktura

```text
main.py        FastAPI app in endpointi
schemas.py     Pydantic response sheme
services/      poslovna logika (poizvedbe na bazo)
database.py    SQLAlchemy povezava
alembic/       migracije sheme
scripts/       load_regions.py, ingest_regional_no2_measurements.py
tests/         pytest testi API-ja
```

## Endpointi

Aktivni endpointi (`/api/v1/regions/...`, `/processing/...`, `/health`) so
opisani v [`../docs/04_api_documentation.md`](../docs/04_api_documentation.md).

## Testi

```bash
pip install -r requirements-dev.txt
python -m pytest tests
```

