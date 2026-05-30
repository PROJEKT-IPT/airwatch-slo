#!/usr/bin/env python3
"""Ingest the newest available OFFL Sentinel-5P NO2 product over Slovenia into
a target PostgreSQL/PostGIS database (e.g. the deployed Railway DB), without
Docker. Intended for a scheduled daily run (GitHub Actions cron).

Chain: search -> download -> aggregate -> validate -> ingest. Idempotent: if
the newest product is already present in the target DB it exits 0 without
downloading.

Target DB credentials come from a single `TARGET_DATABASE_URL` (or
`DATABASE_URL`) of the form postgresql://user:pass@host:port/dbname, or from the
individual DATABASE_HOST / DATABASE_PORT / POSTGRES_DB / POSTGRES_USER /
POSTGRES_PASSWORD env vars. Copernicus credentials come from COPERNICUS_USERNAME
/ COPERNICUS_PASSWORD (env or repo .env).
"""
import argparse
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote, urlparse

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPTS = os.path.join(REPO_ROOT, "data_pipeline", "scripts")
GEO = os.path.join(
    REPO_ROOT, "data_pipeline", "reference_data", "regions", "raw",
    "NUTS_RG_20M_2024_4326_LEVL_3.geojson",
)
OFFL_PREFIX = "S5P_OFFL_L2__NO2"
PY = sys.executable


def apply_database_url() -> None:
    """Map TARGET_DATABASE_URL / DATABASE_URL onto the vars database.py reads."""
    url = os.environ.get("TARGET_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        return
    u = urlparse(url)
    if u.hostname:
        os.environ["DATABASE_HOST"] = u.hostname
    if u.port:
        os.environ["DATABASE_PORT"] = str(u.port)
    if u.username:
        os.environ["POSTGRES_USER"] = unquote(u.username)
    if u.password:
        os.environ["POSTGRES_PASSWORD"] = unquote(u.password)
    dbname = (u.path or "").lstrip("/")
    if dbname:
        os.environ["POSTGRES_DB"] = dbname


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start-date", help="UTC date; default = today - 7 days")
    ap.add_argument("--end-date", help="UTC date; default = today")
    ap.add_argument("--top", type=int, default=50)
    ap.add_argument("--force", action="store_true",
                    help="Re-ingest even if the newest product is already present.")
    args = ap.parse_args()

    apply_database_url()
    sys.path.insert(0, SCRIPTS)
    sys.path.insert(0, os.path.join(REPO_ROOT, "backend"))
    import search_s5p_no2_products as search
    import database as dbm
    from sqlalchemy import create_engine, text

    now = datetime.now(timezone.utc)
    end = args.end_date or now.strftime("%Y-%m-%d")
    start = args.start_date or (now - timedelta(days=7)).strftime("%Y-%m-%d")
    print(f"Search window: {start} -> {end} (UTC)", flush=True)

    products = search.search_products(start, end, args.top)
    offl = [p for p in products if (p.get("Name") or "").startswith(OFFL_PREFIX)]
    if not offl:
        print("No OFFL product over Slovenia in window. Nothing to do.")
        return 0

    product = offl[0]  # search is ordered by ContentDate/Start desc -> newest
    pid = product["Id"]
    name = product["Name"]
    mstart = product["ContentDate"]["Start"][:19] + "Z"
    mend = product["ContentDate"]["End"][:19] + "Z"
    print(f"Newest OFFL: {name}  ({product['ContentDate']['Start'][:10]})", flush=True)

    engine = create_engine(dbm.build_database_url(), pool_pre_ping=True)
    with engine.connect() as conn:
        present = conn.execute(
            text("SELECT 1 FROM source_file WHERE external_product_id = :i LIMIT 1"),
            {"i": pid},
        ).first()
    if present and not args.force:
        print("Newest product already ingested in target DB. Nothing to do.")
        return 0

    out = os.path.join(
        REPO_ROOT, "data_pipeline", "outputs", "no2_by_region", f"latest_{pid}.json"
    )
    nc = None
    try:
        r = run([PY, os.path.join(SCRIPTS, "download_s5p_no2_product.py"),
                 "--product-id", pid])
        m = re.search(r"Downloaded product to:\s*(\S+)", r.stdout)
        if not m:
            sys.stderr.write((r.stderr or r.stdout)[-600:])
            print("DOWNLOAD FAILED")
            return 1
        nc = m.group(1)

        r = run([PY, os.path.join(SCRIPTS, "aggregate_no2_by_region.py"),
                 "--no2-file", nc, "--regions-file", GEO, "--output", out,
                 "--source-product-id", pid,
                 "--measurement-start-time", mstart, "--measurement-end-time", mend])
        print(r.stdout[-700:])
        if r.returncode != 0:
            sys.stderr.write(r.stderr[-600:])
            print("AGGREGATE FAILED")
            return 1

        r = run([PY, os.path.join(SCRIPTS, "validate_regional_no2_output.py"),
                 "--file", out])
        if r.returncode != 0 or "PASS" not in r.stdout:
            sys.stderr.write((r.stdout + r.stderr)[-600:])
            print("VALIDATE FAILED")
            return 1

        r = run([PY, os.path.join(REPO_ROOT, "backend", "scripts",
                 "ingest_regional_no2_measurements.py"), "--file", out])
        print(r.stdout[-500:])
        if r.returncode != 0:
            sys.stderr.write(r.stderr[-600:])
            print("INGEST FAILED")
            return 1

        print("OK: ingested newest product into target DB.")
        return 0
    finally:
        for path in (nc, out):
            try:
                if path and os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
