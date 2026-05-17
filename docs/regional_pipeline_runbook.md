# Regional NO₂ Pipeline Runbook

## 1. Purpose

This runbook documents how a developer can reproduce the AirWatch SLO regional
NO₂ pipeline end to end:

```
selected Sentinel-5P NO₂ .nc product
        ↓ (data_pipeline/scripts/crop_filter_no2_slovenia.py — optional sanity step)
        ↓ data_pipeline/scripts/aggregate_no2_by_region.py
data_pipeline/outputs/no2_by_region/regional_no2_results.json
        ↓ data_pipeline/scripts/validate_regional_no2_output.py
        ↓ backend/scripts/ingest_regional_no2_measurements.py
PostgreSQL/PostGIS region_measurement rows
        ↓
GET /api/v1/regions/latest-measurements, GET /api/v1/regions/{region_code}
        ↓
React dashboard at http://localhost:3000
```

It is intended for local development and verification, not for production
deployment. It assumes the schema-management approach already in place: Alembic
migrations create the database schema, migration `010_seed_statistical_regions`
seeds the 12 Slovenian NUTS3 regions, and `backend/scripts/ingest_regional_no2_measurements.py`
adds the per-product `region_measurement` rows.

## 2. Important product note

AirWatch SLO is **not** a real-time application. The dashboard displays the
latest available **valid processed** Sentinel-5P NO₂ measurement for each
Slovenian statistical region. The pipeline operates on selected, downloaded
Sentinel-5P products that have been documented and frozen for the current
sprint. There is no scheduled real-time ingestion.

Limitations to keep in mind:

- Sentinel-5P TROPOMI pixels are ~3.5 × 5.5 km — values are **regional
  estimates**, not street-level measurements.
- Pixel-to-region assignment uses simple **point-in-polygon** logic, not
  weighted pixel-footprint overlap.
- Region geometries come from **GISCO 20M (generalized cartographic)**
  boundaries, not authoritative national cadastral data.
- The selected product is real but represents a single satellite overpass
  window — not a continuous live feed.

## 3. Prerequisites

Before running the pipeline locally, confirm the following:

- **Docker** and **Docker Compose** installed and the Docker daemon running.
- **Python 3.11** available locally (matches CI). Create and activate a venv if
  you intend to run the pipeline scripts on the host:

  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

- **Backend / data pipeline dependencies** installed in the active venv:

  ```bash
  pip install -r backend/requirements.txt
  pip install requests python-dotenv xarray numpy netCDF4
  pip install -r data_pipeline/requirements-dev.txt  # only if running pipeline tests
  ```

- **`.env` configured locally and not committed.** The repository's `.gitignore`
  already ignores `.env`. Use `.env.example` as the template and set at minimum:

  ```env
  POSTGRES_DB=airwatch
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=<your_local_password>

  # Required only if running host-side scripts against the local Docker DB
  # (compose maps host 5433 → container 5432; see docker-compose.yml)
  DATABASE_HOST=db
  DATABASE_PORT=5432

  COPERNICUS_USERNAME=<optional, only for download scripts>
  COPERNICUS_PASSWORD=<optional, only for download scripts>
  ```

- The **selected `.nc` product** exists locally under
  `data_pipeline/sample_data/`.

- The **GISCO NUTS3 GeoJSON** exists locally under
  `data_pipeline/reference_data/regions/raw/`.

- **Generated JSON outputs and large data files are ignored by Git** (see
  `.gitignore`). They must remain local artifacts.

## 4. Required local input files

| Path | Source | Size |
|---|---|---|
| `data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc` | Copernicus Data Space — product UUID `b898f30a-1d6e-4c6c-bdc2-9933a06e316e` | ~594 MB |
| `data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson` | Eurostat GISCO NUTS 2024 (NUTS 3, EU-wide, EPSG:4326) | ~1.5 MB |

Neither file is committed. Download the Sentinel-5P product with
`data_pipeline/scripts/download_s5p_no2_product.py` (requires Copernicus
credentials) and the GISCO file with `curl` — both procedures are documented
in `docs/Data_documentation.md` and `docs/slovenian_region_boundaries.md`.

## 5. Start services

From the repository root:

```bash
docker compose up -d db
docker compose up -d --build backend
docker compose up -d --build frontend
```

Verify they are healthy:

```bash
docker compose ps
```

Expected service-level state:

| Service | Status | Port mapping |
|---|---|---|
| `db` | healthy | `5433:5432` (host:container — see `docker-compose.yml`) |
| `backend` | healthy | `8000:8000` |
| `frontend` | up | `3000:3000` |

> **Note on the DB host port.** Many development machines already run a local
> PostgreSQL on port `5432`, so this project's `docker-compose.yml` maps the
> container's `5432` to host port **`5433`** to avoid conflicts. Inside the
> Docker network the backend still reaches the DB at `db:5432`. If you connect
> from the host (e.g. with `psql` or a host-side Python script), use `5433`.

## 6. Run migrations

The recommended path is to run Alembic inside the backend container so it uses
the same env vars as the running backend service:

```bash
docker compose exec backend alembic upgrade head
```

You should see the migration head reach `010_seed_statistical_regions`, which
also seeds the 12 Slovenian NUTS3 regions.

> Running `alembic` from the host can fail if your local environment has a
> different `POSTGRES_PASSWORD`, `DATABASE_PORT`, or a stale virtualenv. Prefer
> the Docker variant above.

## 7. Verify regions in the database

```bash
docker compose exec db psql -U postgres -d airwatch -c "
SELECT region_code, region_name, region_type
FROM region
ORDER BY region_code;
"
```

Expected result: **12** `statistical_region` rows (SI031, SI032, SI033, SI034,
SI035, SI036, SI037, SI038, SI041, SI042, SI043, SI044) plus **1** `test_bbox`
row (`SI_BBOX`). Total **13** rows.

## 8. (Optional) Sanity-check the crop/filter step

The crop/filter script produces a small summary that confirms how many valid
NO₂ pixels remain inside the Slovenia bounding box after the QA filter. It does
not contribute to the regional results directly, but it's useful as a sanity
check before running the heavier regional aggregation.

```bash
python3 data_pipeline/scripts/crop_filter_no2_slovenia.py \
  --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc \
  --output data_pipeline/outputs/no2_crop_filter/slovenia_no2_crop_filter_summary.json
```

Expected summary for the selected product:

```text
total_pixels_in_bbox_before_qa: 632
valid_pixels_after_qa: 69
value_mean: ≈ 3.31 × 10⁻⁵ mol/m²
```

## 9. Generate the regional NO₂ JSON

```bash
python3 data_pipeline/scripts/aggregate_no2_by_region.py \
  --no2-file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc \
  --regions-file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson \
  --output data_pipeline/outputs/no2_by_region/regional_no2_results.json \
  --source-product-id b898f30a-1d6e-4c6c-bdc2-9933a06e316e \
  --measurement-start-time 2025-03-11T12:19:40Z \
  --measurement-end-time 2025-03-11T13:18:05Z
```

Expected stdout:

```text
Slovenian regions loaded: 12
Total pixels in bbox before QA filter: 632
Valid pixels after QA filter: 69
Valid pixels assigned to regions: 46
Valid pixels outside all regions: 23
Regions with valid data: 8
Regions with no valid pixels: 4
```

The generated JSON contains one object per Slovenian NUTS3 region. The file is
gitignored — do not commit it.

## 10. Validate the regional JSON

```bash
python3 data_pipeline/scripts/validate_regional_no2_output.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results.json \
  --expected-valid-regions 8 \
  --expected-no-data-regions 4 \
  --expected-assigned-valid-pixels 46
```

Expected stdout:

```text
Total regions: 12
Valid regions: 8
No-data regions: 4
Processing-error regions: 0
Total assigned valid pixels: 46
Validation status: PASS
```

The expected-count flags are optional. Running the script without them still
validates structure, required fields, allowed quality statuses, and the
`value_min ≤ value_mean ≤ value_max` relationship.

## 11. Ingest the regional JSON into the database

`backend/scripts/ingest_regional_no2_measurements.py` upserts one
`source_file` row, one `processing_run` row, and 12 `region_measurement` rows.
The unique constraints on those tables make the script idempotent — running it
twice will not create duplicates.

The script imports `database.SessionLocal`, which builds the connection URL
from `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `DATABASE_HOST` /
`DATABASE_PORT`. It does **not** read `DATABASE_URL`. Either set those vars in
your environment (or your local `.env`) and run on the host, or use the
Docker workaround below.

### Option A — Host-side ingestion (recommended when local env is set)

If your `.env` already has the correct DB credentials, the script reads them
automatically:

```bash
# Default: backend/database.py uses 127.0.0.1 when not running inside Docker.
# DATABASE_PORT must match the host-side compose mapping.
DATABASE_PORT=5433 \
python3 backend/scripts/ingest_regional_no2_measurements.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results.json
```

Or, to be fully explicit without modifying `.env`:

```bash
POSTGRES_PASSWORD='<POSTGRES_PASSWORD>' \
POSTGRES_USER='postgres' \
POSTGRES_DB='airwatch' \
DATABASE_PORT='5433' \
python3 backend/scripts/ingest_regional_no2_measurements.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results.json
```

Replace `<POSTGRES_PASSWORD>` with the value from your local `.env`. **Never
hardcode the real password in shell history, scripts, CI, or committed files.**

### Option B — Docker-based ingestion (workaround when host env doesn't work)

The backend Docker image bundles `backend/` only, so it cannot see
`data_pipeline/outputs/`. The cleanest temporary workaround is to copy the JSON
into the backend build context, rebuild the image, run the script, delete the
JSON, and rebuild the image again to ensure no JSON ends up in any cached
layer.

```bash
# 1. Copy the JSON into backend/ (gitignored: do NOT commit this file).
cp data_pipeline/outputs/no2_by_region/regional_no2_results.json backend/regional_no2_results.json

# 2. Rebuild the backend image so the JSON is present at /app/regional_no2_results.json.
docker compose build backend

# 3. Run ingestion in a one-off container.
docker compose run --rm backend python scripts/ingest_regional_no2_measurements.py \
  --file /app/regional_no2_results.json

# 4. Remove the temporary JSON from backend/.
rm -f backend/regional_no2_results.json

# 5. Rebuild backend once more so no temporary JSON lingers in image layers.
docker compose build backend
```

> ⚠️ **Do not commit `backend/regional_no2_results.json`.** It contains
> generated regional measurements. Add a `git status` check before committing
> anything (see §15).

### Expected ingestion output (either option)

```text
Ingested 12 regional NO2 measurements.
Valid regions: 8
No-data regions: 4
Assigned valid pixels: 46
```

## 12. Verify measurements in the database

```bash
docker compose exec db psql -U postgres -d airwatch -c "
SELECT r.region_code, r.region_name, rm.value_mean, rm.value_min, rm.value_max,
       rm.pixel_count_valid, rm.quality_status, rm.unit
FROM region_measurement rm
JOIN region r ON r.id_region = rm.fk_region
ORDER BY r.region_code;
"
```

Expected:

- **13 rows** total — 12 statistical regions plus the Sprint 1 `SI_BBOX` test
  row that is seeded by migration `008_seed_sprint_1_initial_data`.
- **8 valid** statistical-region rows (SI032, SI034, SI035, SI036, SI037,
  SI041, SI043, SI044) with non-null `value_mean / value_min / value_max`.
- **4 no_valid_pixels** statistical-region rows (SI031, SI033, SI038, SI042)
  with null values and `pixel_count_valid = 0`.
- **`SI_BBOX`** remains a `test_bbox` record with the Sprint 1 mean
  (~3.31 × 10⁻⁵ mol/m², `pixel_count_valid = 69`).

Optional aggregate check:

```bash
docker compose exec db psql -U postgres -d airwatch -c "
SELECT rm.quality_status,
       COUNT(*) AS region_count,
       SUM(rm.pixel_count_valid) AS assigned_valid_pixels
FROM region_measurement rm
JOIN region r ON r.id_region = rm.fk_region
WHERE r.region_type = 'statistical_region'
GROUP BY rm.quality_status
ORDER BY rm.quality_status;
"
```

Expected: `valid → 8 / 46`, `no_valid_pixels → 4 / 0`.

## 13. Verify the API

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/regions/latest-measurements
curl http://localhost:8000/api/v1/regions/SI041
curl http://localhost:8000/api/v1/regions/SI031
curl http://localhost:8000/api/v1/regions/SI_BBOX
curl "http://localhost:8000/api/v1/regions/SI_BBOX?include_test_region=true"
```

Expected:

- `/health` → `200 {"status":"healthy"}`.
- `/api/v1/regions/latest-measurements` → `200`, JSON array of **12**
  statistical regions, sorted by `region_code`, `SI_BBOX` excluded.
- `/api/v1/regions/SI041` → `200`, `latest_measurement.quality_status = "valid"`,
  non-null `value_mean`, full GeoJSON `geometry`.
- `/api/v1/regions/SI031` → `200`, `latest_measurement.quality_status = "no_valid_pixels"`,
  `value_mean = null`, `pixel_count_valid = 0`, GeoJSON `geometry` still
  returned.
- `/api/v1/regions/SI_BBOX` → `404 {"detail":"Region not found."}` (test region
  is hidden by default).
- `/api/v1/regions/SI_BBOX?include_test_region=true` → `200`, Sprint 1
  measurement (`pixel_count_valid = 69`, `quality_status = "valid"`), `geometry`
  may be `null` because `SI_BBOX` has only a bounding box and no PostGIS
  polygon.

## 14. Verify the frontend

- Open <http://localhost:3000> in a browser.
- The region dropdown must contain exactly **12** Slovenian statistical region
  names (Pomurska … Obalno-kraška). `SI_BBOX` / "Slovenia bbox" must **not**
  appear.
- Selecting a valid region (e.g. **SI041 Osrednjeslovenska**) shows:
  - the headline NO₂ value with unit `mol/m²`,
  - a "Veljavno" quality badge,
  - the metadata strip with selected region name, measurement end time, and
    source product label,
  - a populated "Izvor in sledljivost podatka" card with
    `Sentinel-5P / Copernicus`, the product name and full UUID, processing
    run id, measurement start/end, QA threshold, and pixel count.
- Selecting a no-data region (e.g. **SI031 Pomurska**) shows:
  - a "Ni podatkov" badge,
  - the no-data explanation "Ni veljavnih podatkov za izbrano regijo …",
  - **no fake NO₂ value**,
  - the provenance card still showing the source product, product id, processing
    run id, measurement window, QA threshold, and `pixel_count_valid = 0`, with
    a note explaining the product was processed but yielded no valid pixels.
- Browser DevTools console: no React warnings/errors.

## 15. Cleanup checklist

Before committing anything, run:

```bash
git status
```

Confirm that **none** of the following appear under "Changes to be committed"
or "Untracked files" (they are all gitignored):

- `.env` and any other env files
- `*.nc` Sentinel-5P products under `data_pipeline/sample_data/`
- `backend/regional_no2_results.json` (the Option B workaround copy)
- `data_pipeline/outputs/no2_by_region/regional_no2_results.json` and any other
  files under `data_pipeline/outputs/`
- the raw GISCO GeoJSON under `data_pipeline/reference_data/regions/raw/`

If any of these appear, do **not** stage them. Investigate `.gitignore` first
rather than force-adding.

## 16. Troubleshooting

- **`alembic.ini not found`** → run Alembic from `backend/` or, preferably, use
  `docker compose exec backend alembic upgrade head`.
- **`password authentication failed for user "postgres"`** when running
  Alembic/scripts from the host → your host `POSTGRES_PASSWORD` does not match
  the password the `db` service was initialized with. Either align your
  `.env` with the value the container has (run `docker compose down -v` and
  bring it back up to reinitialize with the new password — **this drops the
  DB**), or run the command via `docker compose exec` instead.
- **`could not connect to server: Connection refused` on port 5432 from the
  host** → the project's compose file maps the DB to host port **5433**. Set
  `DATABASE_PORT=5433` for host-side scripts, or connect via
  `docker compose exec db psql ...`.
- **`Regional NO2 JSON file not found` inside the backend container** → the
  backend image does not include `data_pipeline/outputs/`. Use Option B in
  §11 (copy + rebuild) or run the script from the host (Option A).
- **API returns 0 regional measurements** → migration head not reached, or
  ingestion script not run yet. Re-run §6, §7, §11, then §12.
- **Frontend still shows the old endpoints / SI_BBOX in dropdown** → the
  frontend image was not rebuilt after AIRSLO-31. Rebuild with
  `docker compose up -d --build frontend` and confirm the bundled JS only
  references `/api/v1/regions/...` and `/processing/status`.
- **Port 5432 already in use on host** when bringing up the `db` service →
  another local PostgreSQL is running. Stop it (`brew services stop postgresql`
  or equivalent) or keep the `5433:5432` mapping documented here.

## 17. Definition of done

The run is complete when all of the following hold:

- [ ] `docker compose ps` shows `db`, `backend`, `frontend` as **healthy / up**.
- [ ] `alembic upgrade head` reports the head at `010_seed_statistical_regions`.
- [ ] §7 query returns **13 region rows** (12 statistical_region + 1 SI_BBOX).
- [ ] `regional_no2_results.json` exists locally and prints **12 regions, 8
      valid, 4 no_valid_pixels, 46 assigned pixels** in §9.
- [ ] `validate_regional_no2_output.py` reports **Validation status: PASS**
      with the expected counts.
- [ ] §11 ingestion prints **Ingested 12 regional NO2 measurements / Valid
      regions: 8 / No-data regions: 4 / Assigned valid pixels: 46**.
- [ ] §12 query returns the expected breakdown.
- [ ] All six §13 API calls return the expected statuses.
- [ ] §14 frontend checks pass.
- [ ] `git status` is clean of any of the artifacts listed in §15.

## References

- `docs/Data_documentation.md` — Sentinel-5P NO₂ data discovery and selected product.
- `docs/sprint2_selected_no2_input_product.md` — frozen Sprint 2 input product.
- `docs/sprint3_selected_no2_input_product.md` — newer (2026-05-08) OFFL product ingested under AIRSLO-80; the dashboard's current "latest available processed Sentinel-5P measurement".
- `docs/slovenian_region_boundaries.md` — GISCO NUTS3 boundary decision.
- `docs/slovenia_no2_crop_filter.md` — crop/filter step details.
- `docs/regional_no2_aggregation_strategy.md` — pixel-to-region strategy.
- `docs/regional_no2_aggregation_result.md` — expected aggregation results.
- `docs/regional_no2_validation.md` — validation rules and outcomes.
- `docs/regional_no2_database_ingestion.md` — DB ingestion details.
- `docs/sentinel5p_regional_interpretation_limitations.md` — interpretation
  caveats.
- `docs/API_documentation.md` — full API endpoint reference.
- `docs/pipeline_tests.md` — synthetic-data pipeline tests.
- `docs/ci.md` — GitHub Actions workflow.
