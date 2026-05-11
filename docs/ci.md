# Continuous Integration

AirWatch SLO uses GitHub Actions for basic CI checks. This is CI only, not deployment.

## When CI Runs

The workflow runs on:

- every `push`,
- every `pull_request`.

Workflow file:

```text
.github/workflows/ci.yml
```

## What CI Checks

### Repository Safety

CI fails if unsafe files are tracked:

- `.env`
- `.nc` files
- large generated GIS/data files such as `.zip`, `.tif`, `.tiff`, `.h5` under data folders

### Backend

CI uses Python 3.11 and:

- installs `backend/requirements.txt`,
- runs `python -m compileall backend`,
- runs backend tests only if test files exist.

Missing backend tests do not fail CI.

### Data Pipeline

CI uses Python 3.11 and:

- installs documented data pipeline dependencies,
- runs `python -m compileall data_pipeline`,
- runs data pipeline tests only if test files exist.

CI does not run scripts that require Copernicus credentials or the large Sentinel-5P `.nc` product.

### Frontend

CI uses Node.js 20 and:

- installs dependencies with `npm ci`,
- runs `npm run lint` only if a lint script exists,
- runs `npm run build`.

Missing lint script does not fail CI.

## What CI Intentionally Does Not Do

CI does not:

- deploy the application,
- use real secrets,
- require `.env`,
- authenticate with Copernicus,
- download Sentinel-5P products,
- run scripts that need large local `.nc` files,
- start PostgreSQL/PostGIS services,
- run Alembic migrations.

## Why Real Data Downloads Are Not Part Of CI

Sentinel-5P products are large, require Copernicus credentials, and depend on external service availability. Running real downloads in CI would make the workflow slow, fragile, and dependent on secrets. The data pipeline is therefore checked with syntax/import-level validation and targeted tests when they are added.
