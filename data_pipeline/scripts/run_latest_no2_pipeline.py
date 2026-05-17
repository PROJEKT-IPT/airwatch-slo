#!/usr/bin/env python3
"""Find, download, aggregate, validate and ingest the newest available
Sentinel-5P OFFL NO₂ product over Slovenia in a single command.

This is an orchestrator. It does not modify any existing pipeline or backend
script — it just calls them in order:

  1. Search CDSE for the newest OFFL S5P NO₂ product that intersects Slovenia.
  2. If that product is already ingested (a source_file row with the same
     external_product_id exists), exit cleanly.
  3. Download the .nc into data_pipeline/sample_data/ if it isn't already
     there.
  4. Run aggregate_no2_by_region.py → regional JSON in
     data_pipeline/outputs/no2_by_region/.
  5. Run validate_regional_no2_output.py. Abort if validation fails.
  6. Run ingest_regional_no2_measurements.py inside a one-off backend
     container using `docker compose run --rm` with a read-only bind mount
     of data_pipeline/ so the script can read the JSON without copying it
     into the backend build context.
  7. Hit /api/v1/regions/latest-measurements and print the new
     measurement_end_time exposed by the API.

AirWatch SLO is not a real-time application. This script runs once and exits;
it does not poll or schedule. To run on a schedule, wrap it in cron / launchd
/ GitHub Actions on a developer's machine.

Prerequisites:
  - Docker Desktop running, with `docker compose up -d db backend` healthy.
  - Alembic migrations already applied (this script does not run migrations).
  - .env at repo root with COPERNICUS_USERNAME and COPERNICUS_PASSWORD, and
    the POSTGRES_* variables used by the backend service in docker-compose.yml.
  - GISCO NUTS3 GeoJSON locally at
    data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson.
  - Python deps for the search/aggregate/validate scripts (requests,
    python-dotenv, xarray, numpy, netCDF4) available in the active interpreter.

Generated `.nc` and `.json` outputs remain on disk in their gitignored
directories. Nothing is copied into the backend image or committed.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import search_s5p_no2_products as search  # noqa: E402

REPO_ROOT = SCRIPT_DIR.parents[1]
SAMPLE_DIR = REPO_ROOT / "data_pipeline" / "sample_data"
OUTPUT_DIR = REPO_ROOT / "data_pipeline" / "outputs" / "no2_by_region"
REGIONS_FILE = (
    REPO_ROOT / "data_pipeline" / "reference_data" / "regions" / "raw"
    / "NUTS_RG_20M_2024_4326_LEVL_3.geojson"
)

OFFL_PREFIX = "S5P_OFFL_L2__NO2"
DEFAULT_LOOKBACK_DAYS = 14
DEFAULT_TOP = 50

POSTGRES_USER = "postgres"
POSTGRES_DB = "airwatch"
API_BASE_URL = "http://localhost:8000"


def parse_args() -> argparse.Namespace:
    today = datetime.now(timezone.utc).date()
    parser = argparse.ArgumentParser(
        description=(
            "Ingest the newest available Sentinel-5P OFFL NO2 product over "
            "Slovenia."
        ),
    )
    parser.add_argument(
        "--start-date",
        default=(today - timedelta(days=DEFAULT_LOOKBACK_DAYS)).isoformat(),
        help="Search window start (UTC, YYYY-MM-DD). Default: today - 14d.",
    )
    parser.add_argument(
        "--end-date",
        default=today.isoformat(),
        help="Search window end (UTC, YYYY-MM-DD). Default: today.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=DEFAULT_TOP,
        help=f"Max candidates to inspect from CDSE. Default {DEFAULT_TOP}.",
    )
    parser.add_argument(
        "--product-id",
        default=None,
        help=(
            "Explicit OFFL product UUID. Skips the search step. The UUID must "
            "still fall inside --start-date / --end-date."
        ),
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-run the pipeline even if the candidate is already ingested.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the candidate product but skip download / ingest.",
    )
    return parser.parse_args()


def announce(step: str) -> None:
    print(f"\n--- {step} ---")


def run_subprocess(cmd: list[str], step: str) -> None:
    announce(step)
    print("$", " ".join(cmd))
    result = subprocess.run(cmd, cwd=str(REPO_ROOT))
    if result.returncode != 0:
        raise SystemExit(f"{step} failed with exit code {result.returncode}.")


def find_newest_offl_candidate(
    start_date: str,
    end_date: str,
    top: int,
) -> dict | None:
    products = search.search_products(start_date, end_date, top)
    for product in products:
        name = product.get("Name") or ""
        if name.startswith(OFFL_PREFIX):
            return product
    return None


def product_already_ingested(product_id: str) -> bool:
    query = (
        "SELECT 1 FROM source_file WHERE external_product_id = "
        f"'{product_id}' LIMIT 1;"
    )
    completed = subprocess.run(
        [
            "docker", "compose", "exec", "-T", "db",
            "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, "-tA", "-c", query,
        ],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        sys.stderr.write(
            "Could not query the database to check ingestion state. "
            "Is `docker compose up -d db` running?\n"
            f"stderr: {completed.stderr.strip() or '<empty>'}\n"
        )
        return False
    return bool(completed.stdout.strip())


def safe_filename_from_product_name(product_name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", product_name).strip("._")
    if not cleaned:
        cleaned = "copernicus_product"
    if not cleaned.endswith((".nc", ".zip")):
        cleaned += ".nc"
    return cleaned


def ensure_downloaded(product: dict) -> Path:
    product_name = product["Name"]
    expected_path = SAMPLE_DIR / safe_filename_from_product_name(product_name)
    if expected_path.exists():
        size_mb = expected_path.stat().st_size / (1024 * 1024)
        print(f"  Local .nc already present: {expected_path} ({size_mb:.1f} MB)")
        return expected_path

    run_subprocess(
        [
            sys.executable,
            "data_pipeline/scripts/download_s5p_no2_product.py",
            "--product-id", product["Id"],
        ],
        "Download Sentinel-5P product",
    )
    if not expected_path.exists():
        raise SystemExit(
            f"Download finished but expected file missing: {expected_path}"
        )
    return expected_path


def aggregate_and_validate(product: dict, nc_path: Path) -> Path:
    if not REGIONS_FILE.exists():
        raise SystemExit(
            f"Region boundary file missing: {REGIONS_FILE}. "
            "Download GISCO NUTS3 GeoJSON locally first (see "
            "docs/slovenian_region_boundaries.md)."
        )

    sensing_start = product["ContentDate"]["Start"]
    sensing_end = product["ContentDate"]["End"]
    date_tag = sensing_start[:10].replace("-", "")
    output_path = OUTPUT_DIR / f"regional_no2_results_{date_tag}.json"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    run_subprocess(
        [
            sys.executable,
            "data_pipeline/scripts/aggregate_no2_by_region.py",
            "--no2-file", str(nc_path.relative_to(REPO_ROOT)),
            "--regions-file", str(REGIONS_FILE.relative_to(REPO_ROOT)),
            "--output", str(output_path.relative_to(REPO_ROOT)),
            "--source-product-id", product["Id"],
            "--measurement-start-time", sensing_start,
            "--measurement-end-time", sensing_end,
        ],
        "Aggregate NO2 by region",
    )

    run_subprocess(
        [
            sys.executable,
            "data_pipeline/scripts/validate_regional_no2_output.py",
            "--file", str(output_path.relative_to(REPO_ROOT)),
        ],
        "Validate regional output",
    )
    return output_path


def ingest_in_docker(output_path: Path) -> None:
    pipeline_dir = REPO_ROOT / "data_pipeline"
    rel = output_path.relative_to(pipeline_dir)
    container_path = f"/data_pipeline/{rel.as_posix()}"

    run_subprocess(
        [
            "docker", "compose", "run", "--rm",
            "-v", f"{pipeline_dir}:/data_pipeline:ro",
            "backend",
            "python", "scripts/ingest_regional_no2_measurements.py",
            "--file", container_path,
        ],
        "Ingest regional measurements",
    )


def print_api_state() -> None:
    announce("API verification")
    url = f"{API_BASE_URL}/api/v1/regions/latest-measurements"
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        print(f"  Could not reach {url}: {error}")
        return

    end_times = sorted(
        {row["measurement_end_time"] for row in data if row.get("measurement_end_time")}
    )
    products = sorted(
        {row["source_product_name"] for row in data if row.get("source_product_name")}
    )
    valid = sum(1 for row in data if row.get("quality_status") == "valid")
    no_data = sum(1 for row in data if row.get("quality_status") == "no_valid_pixels")
    print(f"  rows: {len(data)}")
    print(f"  measurement_end_time(s): {end_times}")
    print(f"  source product(s): {products}")
    print(f"  valid: {valid}  no_valid_pixels: {no_data}")


def resolve_product(args: argparse.Namespace) -> dict | None:
    if args.product_id is None:
        return find_newest_offl_candidate(args.start_date, args.end_date, args.top)

    candidates = search.search_products(args.start_date, args.end_date, args.top)
    product = next(
        (p for p in candidates if p.get("Id") == args.product_id), None
    )
    if product is None:
        raise SystemExit(
            f"Product {args.product_id} not found in window "
            f"{args.start_date}..{args.end_date}. Widen --start-date / "
            "--end-date or remove --top limits."
        )
    return product


def main() -> int:
    args = parse_args()

    print("Sentinel-5P NO2 — latest-data ingestion runner")
    print(f"Search window: {args.start_date} → {args.end_date} (UTC)")

    product = resolve_product(args)
    if product is None:
        print(
            "\nNo OFFL S5P NO2 products found in the search window. Nothing to "
            "do — try widening --start-date / --end-date."
        )
        return 0

    print()
    print("Newest OFFL candidate:")
    print(f"  Name:   {product['Name']}")
    print(f"  Id:     {product['Id']}")
    print(
        f"  Sensed: {product['ContentDate']['Start']} → "
        f"{product['ContentDate']['End']}"
    )

    if not args.force and product_already_ingested(product["Id"]):
        print(
            "\nCandidate is already ingested. Nothing to do. Re-run with "
            "--force to repeat aggregation and ingestion against the same "
            "product."
        )
        return 0

    if args.dry_run:
        print("\n[dry-run] Skipping download / aggregate / validate / ingest.")
        return 0

    nc_path = ensure_downloaded(product)
    output_path = aggregate_and_validate(product, nc_path)
    ingest_in_docker(output_path)
    print_api_state()
    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
