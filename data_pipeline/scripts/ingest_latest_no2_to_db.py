#!/usr/bin/env python3
"""Ingest the newest available day's BEST OFFL Sentinel-5P NO2 product over
Slovenia into a target PostgreSQL/PostGIS database (e.g. the deployed Railway
DB), without Docker. Intended for a scheduled daily run (GitHub Actions cron).

Why "best of day": Slovenia is usually imaged by two adjacent overpasses per
day. The later one is often a swath-edge orbit with few valid pixels, so naively
taking the newest-by-time product can make the dashboard's "latest" view mostly
"no data". This picks, for the newest available day, the overpass with the most
valid pixels over Slovenia and ingests only that one.

Chain per candidate: download -> aggregate; then validate + ingest the best.
Idempotent: if the newest day already has an ingested overpass it exits 0
without downloading (the day has been handled).

Target DB credentials come from a single `TARGET_DATABASE_URL` (or
`DATABASE_URL`) postgresql://user:pass@host:port/dbname, or from the individual
DATABASE_HOST / DATABASE_PORT / POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD
env vars. Copernicus credentials come from COPERNICUS_USERNAME /
COPERNICUS_PASSWORD (env or repo .env).
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
OUTDIR = os.path.join(REPO_ROOT, "data_pipeline", "outputs", "no2_by_region")
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


def aggregate(nc, out, pid, mstart, mend):
    """Aggregate one product; return (ok, valid_regions, stdout)."""
    r = run([PY, os.path.join(SCRIPTS, "aggregate_no2_by_region.py"),
             "--no2-file", nc, "--regions-file", GEO, "--output", out,
             "--source-product-id", pid,
             "--measurement-start-time", mstart, "--measurement-end-time", mend])
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-600:])
        return False, -1, r.stdout
    m = re.search(r"Regions with valid data:\s*(\d+)", r.stdout)
    return True, (int(m.group(1)) if m else 0), r.stdout


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start-date", help="UTC date; default = today - 14 days")
    ap.add_argument("--end-date", help="UTC date; default = today")
    ap.add_argument("--top", type=int, default=50)
    ap.add_argument("--force", action="store_true",
                    help="Re-process the newest day even if already ingested.")
    args = ap.parse_args()

    apply_database_url()
    sys.path.insert(0, SCRIPTS)
    sys.path.insert(0, os.path.join(REPO_ROOT, "backend"))
    import search_s5p_no2_products as search
    import database as dbm
    from sqlalchemy import create_engine, text

    now = datetime.now(timezone.utc)
    end = args.end_date or now.strftime("%Y-%m-%d")
    # OFFL is published a few days to ~a week after the overpass, so look back
    # far enough to catch the newest available OFFL day even with that lag.
    start = args.start_date or (now - timedelta(days=14)).strftime("%Y-%m-%d")
    print(f"Search window: {start} -> {end} (UTC)", flush=True)

    products = search.search_products(start, end, args.top)
    offl = [p for p in products if (p.get("Name") or "").startswith(OFFL_PREFIX)]
    if not offl:
        print("No OFFL product over Slovenia in window. Nothing to do.")
        return 0

    # newest available day, and all overpasses on it (search is desc by Start)
    newest_day = offl[0]["ContentDate"]["Start"][:10]
    candidates = [p for p in offl if p["ContentDate"]["Start"][:10] == newest_day]
    print(f"Newest day: {newest_day} ({len(candidates)} overpass(es))", flush=True)

    engine = create_engine(dbm.build_database_url(), pool_pre_ping=True)
    ids = [c["Id"] for c in candidates]
    with engine.connect() as conn:
        present = conn.execute(
            text("SELECT external_product_id FROM source_file "
                 "WHERE external_product_id = ANY(:ids)"),
            {"ids": ids},
        ).scalars().all()
    if present and not args.force:
        print(f"Newest day {newest_day} already ingested ({len(present)} overpass[es]). "
              "Nothing to do.")
        return 0

    # download + aggregate each overpass, keep the one with most valid regions
    best = None  # (valid_regions, out_path, product)
    tmp = []
    try:
        for c in candidates:
            pid = c["Id"]
            mstart = c["ContentDate"]["Start"][:19] + "Z"
            mend = c["ContentDate"]["End"][:19] + "Z"
            r = run([PY, os.path.join(SCRIPTS, "download_s5p_no2_product.py"),
                     "--product-id", pid])
            m = re.search(r"Downloaded product to:\s*(\S+)", r.stdout)
            if not m:
                sys.stderr.write((r.stderr or r.stdout)[-500:])
                print(f"  {pid[:8]} DOWNLOAD FAILED, skipping this overpass")
                continue
            nc = m.group(1)
            tmp.append(nc)
            out = os.path.join(OUTDIR, f"latest_{pid}.json")
            tmp.append(out)
            ok, valid, _ = aggregate(nc, out, pid, mstart, mend)
            print(f"  {pid[:8]} valid_regions={valid}", flush=True)
            try:
                os.remove(nc)  # free ~600 MB as soon as aggregated
            except OSError:
                pass
            if ok and (best is None or valid > best[0]):
                best = (valid, out, c)

        if best is None:
            print("No overpass could be processed. Nothing ingested.")
            return 1

        valid, out, c = best
        print(f"Best overpass: {c['Id'][:8]} ({valid} valid regions) -> ingest", flush=True)
        r = run([PY, os.path.join(SCRIPTS, "validate_regional_no2_output.py"), "--file", out])
        if r.returncode != 0 or "PASS" not in r.stdout:
            sys.stderr.write((r.stdout + r.stderr)[-600:])
            print("VALIDATE FAILED")
            return 1
        r = run([PY, os.path.join(REPO_ROOT, "backend", "scripts",
                 "ingest_regional_no2_measurements.py"), "--file", out])
        print(r.stdout[-400:])
        if r.returncode != 0:
            sys.stderr.write(r.stderr[-600:])
            print("INGEST FAILED")
            return 1
        print(f"OK: ingested best overpass for {newest_day} into target DB.")
        return 0
    finally:
        for f in tmp:
            try:
                if f and os.path.exists(f):
                    os.remove(f)
            except OSError:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
