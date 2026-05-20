#!/usr/bin/env bash
# Wrapper around run_latest_no2_pipeline.py for unattended scheduling
# (launchd / cron). Loads the repo's .env, ensures Docker Compose db+backend
# are reachable, and logs each invocation to data_pipeline/automation/logs/.
#
# Exit codes:
#   0  success (newest product already ingested, OR newly ingested)
#   1  pre-flight failure (Docker daemon down, db/backend unhealthy, missing env)
#   2  orchestrator failed (search / download / aggregate / validate / ingest)

set -u
set -o pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="${REPO_ROOT}/data_pipeline/automation/logs"
LOG_FILE="${LOG_DIR}/refresh_$(date -u +%Y-%m-%d).log"

mkdir -p "${LOG_DIR}"

# launchd / cron do not inherit a shell PATH that contains Docker Desktop's
# CLI shims, Homebrew python, or the Copernicus credentials. Restore the
# things the orchestrator and `docker` need.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

# NOTE: we deliberately do not shell-source .env. Both consumers load it
# themselves -- Python via python-dotenv, Docker Compose via its built-in
# .env loader -- and shell-sourcing chokes on password characters that are
# valid for those loaders but not for bash.

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

main() {
  log "refresh_latest_no2 starting (repo=${REPO_ROOT})"

  if ! command -v docker >/dev/null 2>&1; then
    log "ERROR: docker CLI not on PATH"
    return 1
  fi

  if ! docker info >/dev/null 2>&1; then
    log "ERROR: Docker daemon not reachable (Docker Desktop probably not running)"
    return 1
  fi

  local db_status backend_status
  db_status="$(docker inspect -f '{{.State.Health.Status}}' airwatch_db 2>/dev/null || echo 'missing')"
  backend_status="$(docker inspect -f '{{.State.Health.Status}}' airwatch_backend 2>/dev/null || echo 'missing')"
  log "compose health: db=${db_status} backend=${backend_status}"

  if [[ "${db_status}" != "healthy" || "${backend_status}" != "healthy" ]]; then
    log "ERROR: db and backend must both be healthy before refresh"
    return 1
  fi

  # Cheap presence check on .env keys without shell-parsing the values.
  local env_file="${REPO_ROOT}/.env"
  if [[ ! -f "${env_file}" ]]; then
    log "ERROR: ${env_file} missing"
    return 1
  fi
  for key in COPERNICUS_USERNAME COPERNICUS_PASSWORD POSTGRES_PASSWORD; do
    if ! grep -qE "^${key}=" "${env_file}"; then
      log "ERROR: ${key} not set in .env"
      return 1
    fi
  done

  local python_bin
  if [[ -x "${REPO_ROOT}/.venv/bin/python" ]]; then
    python_bin="${REPO_ROOT}/.venv/bin/python"
  else
    python_bin="$(command -v python3 || true)"
  fi
  if [[ -z "${python_bin}" ]]; then
    log "ERROR: no python interpreter available"
    return 1
  fi
  log "python: ${python_bin}"

  cd "${REPO_ROOT}"
  if ! "${python_bin}" data_pipeline/scripts/run_latest_no2_pipeline.py; then
    log "ERROR: run_latest_no2_pipeline.py failed"
    return 2
  fi

  log "refresh_latest_no2 finished OK"
  return 0
}

main "$@" >>"${LOG_FILE}" 2>&1
exit_code=$?

# Also keep the last run easy to find regardless of date.
ln -sf "${LOG_FILE}" "${LOG_DIR}/refresh_latest.log"

exit "${exit_code}"
