"""Admin endpoint for triggering a Sentinel-5P NO2 refresh.

This module is dormant by default: nothing in the live API references it. To
activate it at deploy time, uncomment the two `from admin_refresh import …`
lines at the bottom of `main.py`. The module itself is real Python — it can
be imported, linted, and reviewed without flipping the feature on.

The contract once activated:

    POST /admin/refresh-latest
    Header: X-Admin-Token: <shared secret>
    -> 202 Accepted, {"status": "accepted", "detail": "..."}
       Orchestrator runs in a FastAPI BackgroundTask. Result is observable
       via /api/v1/regions/latest-measurements (newest measurement_end_time
       advancing).

Deploy-time prerequisites (none of these are required to keep the dormant
file in the repo; they only matter when you uncomment the wiring):

1. Runtime env: `ADMIN_REFRESH_TOKEN=<a long random string>`. Without it the
   endpoint returns 503 — fail-closed, never accidentally unprotected.
2. Pipeline scripts bundled into the backend image (Dockerfile addition):

       COPY ../data_pipeline /app/data_pipeline

   plus the GISCO NUTS3 GeoJSON at
   `/app/data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson`.

3. Pipeline Python deps in `requirements.txt`:

       xarray>=2024.1.0
       numpy>=1.26.0
       netCDF4>=1.6.0
       requests>=2.31.0

4. `data_pipeline/scripts/run_latest_no2_pipeline.py` refactored to skip the
   `docker compose` calls when `AIRWATCH_INCONTAINER=1` is set — replace the
   psql ingestion-check with a direct SQLAlchemy query and call the
   ingestion script via `sys.executable` instead of `docker compose run`.
5. Writable volume / tmpfs mounted at `/app/data_pipeline/sample_data/` so
   the ~600 MB `.nc` downloads land somewhere with space.

Until step 4 is done, hitting the endpoint will fail with the orchestrator's
existing "docker: command not found" error. The auth layer still works,
which is what matters for reviewing the endpoint shape.
"""
from __future__ import annotations

import hmac
import logging
import os
import subprocess
import sys
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, status


logger = logging.getLogger(__name__)

ORCHESTRATOR_PATH = Path("/app/data_pipeline/scripts/run_latest_no2_pipeline.py")


def _run_refresh_orchestrator() -> None:
    """Invoke the host-side orchestrator inside the backend container.

    Runs synchronously inside the BackgroundTask worker. stdout/stderr go to
    the container's logs, which whatever runtime you deploy on will collect.
    """
    logger.info("admin refresh: invoking %s", ORCHESTRATOR_PATH)
    env = {**os.environ, "AIRWATCH_INCONTAINER": "1"}
    completed = subprocess.run(
        [sys.executable, str(ORCHESTRATOR_PATH)],
        cwd=str(ORCHESTRATOR_PATH.parents[2]),
        env=env,
        check=False,
    )
    if completed.returncode == 0:
        logger.info("admin refresh: orchestrator finished OK")
    else:
        logger.error(
            "admin refresh: orchestrator exited with code %s",
            completed.returncode,
        )


def _verify_admin_token(provided: str | None) -> None:
    expected = os.getenv("ADMIN_REFRESH_TOKEN", "")
    if not expected:
        # Fail closed — never accidentally serve an unauthenticated refresh.
        raise HTTPException(
            status_code=503,
            detail="Admin refresh disabled: ADMIN_REFRESH_TOKEN not set.",
        )
    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid admin token.")


def register_admin_routes(app: FastAPI) -> None:
    """Attach POST /admin/refresh-latest to the given FastAPI app.

    Called from main.py only after the deploy-time prerequisites listed at
    the top of this module are in place. Leaving it as an explicit function
    means a developer reviewing main.py sees one obvious uncomment site.
    """

    @app.post(
        "/admin/refresh-latest",
        status_code=status.HTTP_202_ACCEPTED,
        responses={
            401: {"description": "Missing or invalid admin token."},
            503: {"description": "Admin refresh disabled (ADMIN_REFRESH_TOKEN not set)."},
        },
    )
    def admin_refresh_latest(
        background_tasks: BackgroundTasks,
        x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
    ):
        _verify_admin_token(x_admin_token)
        background_tasks.add_task(_run_refresh_orchestrator)
        return {
            "status": "accepted",
            "detail": (
                "Refresh orchestrator dispatched. Observe completion via "
                "/api/v1/regions/latest-measurements (newest "
                "measurement_end_time advances on success)."
            ),
        }
