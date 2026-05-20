# Scheduled NO₂ refresh

AirWatch SLO is not a real-time application — the dashboard shows the latest
**processed** Sentinel-5P NO₂ measurement. Without a scheduler, that "latest"
only advances when a developer runs `run_latest_no2_pipeline.py` by hand.

This directory wires up a daily, unattended refresh of that orchestrator
so the dashboard's freshness keeps pace with the upstream OFFL feed.

## What it does

`refresh_latest_no2.sh` is a thin wrapper around
`data_pipeline/scripts/run_latest_no2_pipeline.py`. Per run, it:

1. Sources the repo `.env` (Copernicus + Postgres credentials).
2. Verifies the Docker daemon is reachable and that the `airwatch_db` and
   `airwatch_backend` containers report `healthy`.
3. Picks `.venv/bin/python` if present, otherwise system `python3`.
4. Invokes the orchestrator, which searches CDSE for the newest OFFL S5P NO₂
   product over Slovenia. The orchestrator is idempotent — if the newest is
   already ingested it exits cleanly without re-downloading or re-ingesting.
5. Appends a timestamped line to `logs/refresh_YYYY-MM-DD.log` and updates
   the `logs/refresh_latest.log` symlink.

The dashboard reads its freshness directly from the database via
`/api/v1/regions/latest-measurements`, so a successful run is observable
end-to-end the next time the page is loaded.

## Cadence

The launchd plist fires once a day at **06:15 local time**.

Why this timing:

- Sentinel-5P TROPOMI overflies Slovenia once a day, around midday UTC.
- The **OFFL** (offline) NO₂ product lands at Copernicus Data Space
  ~2–3 days after the overpass.
- One poll per day is the highest cadence that produces new data; polling
  more frequently is wasted load on CDSE.
- 06:15 local sits well clear of the OFFL processing window, so the newest
  available product is reliably visible by the time the job runs.

If you want sub-day latency, the NRTI (near-real-time) product ships within
~3 hours but is not wired into this pipeline yet.

## Install (macOS, launchd)

```bash
# 1. Copy the plist into your LaunchAgents directory and substitute the
#    repo path. <REPO_PATH> in the template must become the absolute path
#    to this checkout.
REPO_PATH="$(cd "$(dirname "$0")/../.." && pwd)"  # or: pwd from repo root
sed "s|<REPO_PATH>|${REPO_PATH}|g" \
  data_pipeline/automation/com.airwatch-slo.refresh-no2.plist \
  > ~/Library/LaunchAgents/com.airwatch-slo.refresh-no2.plist

# 2. Load the agent (registers it with launchd so it fires at 06:15).
launchctl load ~/Library/LaunchAgents/com.airwatch-slo.refresh-no2.plist

# 3. (Optional) Trigger a one-off run right now to verify the setup.
launchctl start com.airwatch-slo.refresh-no2
tail -f data_pipeline/automation/logs/refresh_latest.log
```

Uninstall:

```bash
launchctl unload ~/Library/LaunchAgents/com.airwatch-slo.refresh-no2.plist
rm ~/Library/LaunchAgents/com.airwatch-slo.refresh-no2.plist
```

## Install (Linux / server, systemd)

Preferred for any real deploy. Unit files live in
`data_pipeline/automation/systemd/`.

```bash
# 1. Copy the units. Edit the .service if your deploy path differs from
#    /opt/airwatch-slo, or the runtime user differs from `airwatch`.
sudo install -m 0644 \
  data_pipeline/automation/systemd/airwatch-refresh-no2.service \
  data_pipeline/automation/systemd/airwatch-refresh-no2.timer \
  /etc/systemd/system/

# 2. Reload, enable, start the timer.
sudo systemctl daemon-reload
sudo systemctl enable --now airwatch-refresh-no2.timer

# 3. Verify.
systemctl list-timers airwatch-refresh-no2.timer        # next fire time
systemctl status   airwatch-refresh-no2.timer
journalctl -u airwatch-refresh-no2.service --since '24 hours ago'

# 4. Fire once manually to validate the chain end-to-end.
sudo systemctl start airwatch-refresh-no2.service
journalctl -u airwatch-refresh-no2.service -f
```

Why systemd over plain cron: `Persistent=true` makes the unit catch up if
the VM was down at 06:15, journald gives you proper log aggregation, and
the timer survives reboots without a `crontab` edit.

## Install (Linux / server, cron — fallback)

The wrapper script is plain bash and works under cron too. Sample crontab
entry (daily at 06:15):

```
15 6 * * * /absolute/path/to/airwatch-slo/data_pipeline/automation/refresh_latest_no2.sh
```

cron does not need any of the launchd plist substitutions — the script
resolves the repo root from its own location.

## Deploy-time activation of POST /admin/refresh-latest

The repo also ships a dormant HTTP-trigger surface for the same orchestrator
at `backend/admin_refresh.py`. It is **not wired into the live API** — the
two `from admin_refresh import …` lines in `backend/main.py` are commented
out. To activate it when you deploy the backend somewhere with no local
launchd / systemd timer (or in addition to one):

1. Uncomment the two `register_admin_routes(app)` lines in
   `backend/main.py`.
2. Set `ADMIN_REFRESH_TOKEN=<long random string>` in the runtime env. If
   the variable is missing the endpoint returns 503 — fail-closed.
3. Add `xarray`, `numpy`, `netCDF4`, `requests` to
   `backend/requirements.txt` so the orchestrator's deps are available
   inside the backend image.
4. Bundle the pipeline scripts into the backend image. In the deployment
   Dockerfile, after the existing `COPY . .`:

   ```Dockerfile
   COPY ../data_pipeline /app/data_pipeline
   ```

   Plus a writable mount (or `RUN mkdir -p`) for
   `/app/data_pipeline/sample_data/` so the ~600 MB `.nc` downloads land
   somewhere with space.
5. Refactor `data_pipeline/scripts/run_latest_no2_pipeline.py` to skip its
   `docker compose` calls when `AIRWATCH_INCONTAINER=1` is set — replace
   the `psql` ingestion-check with a direct SQLAlchemy lookup, and call
   `backend/scripts/ingest_regional_no2_measurements.py` via
   `sys.executable` instead of `docker compose run --rm backend …`.

After deploy, trigger from whatever scheduler your platform offers
(GitHub Actions, k8s CronJob, Fly.io scheduled machines, etc.):

```bash
curl -X POST https://<host>/admin/refresh-latest \
  -H "X-Admin-Token: ${ADMIN_REFRESH_TOKEN}"
# -> 202 Accepted; observe completion via the dashboard or:
curl https://<host>/api/v1/regions/latest-measurements
```

## Prerequisites

The same prerequisites as `run_latest_no2_pipeline.py`:

- Docker Desktop / Docker Engine running, with `docker compose up -d db backend`
  in a healthy state. **If Docker is closed at refresh time the run fails
  cleanly with exit code 1**; this is logged but not retried.
- Repo `.env` with `COPERNICUS_USERNAME`, `COPERNICUS_PASSWORD`, and
  `POSTGRES_*` populated.
- The GISCO NUTS3 GeoJSON present at the path the orchestrator expects
  (`data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson`).
- Python with `requests`, `python-dotenv`, `xarray`, `numpy`, `netCDF4` available
  to the chosen interpreter.

## Verifying it works

After a run, the dashboard's "Podatki nazadnje osveženi" indicator (top-right
of the header) should reflect the new `measurement_end_time`. From the shell:

```bash
curl -s http://localhost:8000/api/v1/regions/latest-measurements \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); \
                print(max(r["measurement_end_time"] for r in d))'
```

That value advancing day-over-day is the contract: "new data is ready
to be displayed" = the API's latest `measurement_end_time` changed.

## Logs

- `logs/refresh_YYYY-MM-DD.log` — one file per UTC day, append-only.
- `logs/refresh_latest.log` — symlink to today's log.
- `logs/launchd.stdout.log` / `logs/launchd.stderr.log` — anything the wrapper
  prints before its own logging is wired up (rare; mostly empty).

All log files are gitignored under `data_pipeline/automation/logs/`.
