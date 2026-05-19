# Backend Tests

Backend tests cover the Sprint 1 API contract without requiring a running
PostgreSQL/PostGIS database.

## Covered Endpoints

- `GET /regions`
- `GET /measurements/latest?region_code=SI_BBOX`
- `GET /measurements/latest?region_code=UNKNOWN`
- `GET /api/v1/regions/latest-measurements`
- `GET /api/v1/regions/SI032`
- `GET /api/v1/regions/SI032/export.csv`

The tests use FastAPI dependency overrides to replace `get_db` with a small fake
session. This keeps the tests focused on API behavior, response schemas, and
status codes.

## Run Locally

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest tests
```

On Windows, prefer the same Python version used by CI:

```powershell
cd backend
py -3.11 -m pip install -r requirements-dev.txt
py -3.11 -m pytest tests
```

## Expected Result

```text
7 passed
```

## Notes

These tests do not run Alembic migrations and do not connect to a real database.
Database migration coverage should be added separately when schema-level tests
are introduced.
