# AirWatch SLO – Backend

FastAPI backend, ki streže zadnje razpoložljive regionalne NO₂ meritve iz
PostgreSQL/PostGIS baze. Bere konfiguracijo iz okoljskih spremenljivk (lokalno
iz korenskega `.env`), shemo upravlja Alembic. Backend je namenoma bralni API;
produkcijski vnos podatkov poteka prek data pipeline / ingest skript.

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

Backend teče na <http://localhost:8000> (health: `/health`, Swagger: `/docs`).
Pri lokalnem zagonu se na bazo poveže prek `127.0.0.1`, znotraj Dockerja prek
`db:5432`.

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
req.in / devreq.in       vhodi za pip-compile
requirements*.txt        zaklenjene (hash-locked) odvisnosti
```

## Endpointi

Javni (regionalni) endpointi:

| Endpoint | Namen |
|---|---|
| `GET /health` | preverjanje delovanja |
| `GET /api/v1/regions/latest-measurements` | zadnja meritev za vsako regijo (opcijsko `?date=`) |
| `GET /api/v1/regions/measurement-dates` | razpoložljivi datumi meritev |
| `GET /api/v1/regions/geometries` | GeoJSON meje regij |
| `GET /api/v1/regions/{region_code}` | podrobnosti regije + zadnja meritev |
| `GET /api/v1/regions/{region_code}/history` | zgodovina regije |
| `GET /api/v1/regions/compare` | primerjava 2–12 regij |
| `GET /api/v1/regions/export.csv` | CSV vseh zadnjih meritev |
| `GET /api/v1/regions/{region_code}/export.csv` | CSV zadnje meritve regije |
| `GET /api/v1/regions/{region_code}/history/export.csv` | CSV zgodovine regije |

Interni (admin) endpointi, zaščiteni z glavo `X-Admin-Token`:

| Endpoint | Namen |
|---|---|
| `GET /processing/status` | zadnji in zadnji uspešni processing run |
| `GET /processing/history` | zgodovina processing runov |

Podroben opis: [`../docs/04_api_documentation.md`](../docs/04_api_documentation.md).

## Admin avtentikacija

Endpointi `/processing/*` so zaščiteni prek `require_admin_password`. Vrednost
se nastavi z okoljsko spremenljivko `ADMIN_PASSWORD`:

- če `ADMIN_PASSWORD` ni nastavljen → `503` (admin onemogočen, fail-closed),
- napačen ali manjkajoč `X-Admin-Token` → `401`.

Frontend `#admin` stran pošlje geslo v tej glavi.

## Okoljske spremenljivke (samo imena)

| Spremenljivka | Namen |
|---|---|
| `DATABASE_HOST`, `DATABASE_PORT` | naslov baze |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | poverilnice baze |
| `CORS_ORIGINS` | dovoljeni izvori frontenda |
| `ADMIN_PASSWORD` | zaščita `/processing/*` |

## Odvisnosti in testi

Odvisnosti so zaklenjene s `pip-compile --generate-hashes` (`req.in` →
`requirements.txt`, `devreq.in` → `requirements-dev.txt`). Pinane so na
Python 3.11 (kot v CI).

```bash
pip install -r requirements-dev.txt
python -m pytest tests
```
