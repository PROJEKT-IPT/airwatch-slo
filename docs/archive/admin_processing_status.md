# Admin Processing Status

AirWatch SLO includes a small admin/debug view for checking the latest data
processing run.

## Backend Endpoint

```text
GET /processing/status
```

The endpoint reads the newest row from `processing_run`, joins it to
`source_file`, and returns:

- processing run id,
- run status,
- script name and version,
- QA threshold,
- start and finish time,
- optional error message,
- source product name.

It also reports the newest successful run (if any):

- last successful run id,
- timestamp of the last successful update,
- product name for the last successful run.

If no processing run exists, the endpoint returns `404`.

## Backend Endpoint: Processing History

```text
GET /processing/history?limit=20&offset=0
```

The endpoint returns a list of recent processing runs ordered by the newest
timestamp (finish or start time). Each row includes:

- processing run id,
- run status,
- script name and version,
- QA threshold,
- start and finish time,
- source product name,
- number of regions with valid data (pixel_count_valid > 0).

If no processing runs exist, the response is an empty list.

## Frontend View

The frontend sidebar has an `Admin/debug` item. The page calls
`GET /processing/status` and shows whether the latest processing run was
successful, running, failed, or unknown. It also highlights the last
successful update time and product for quick troubleshooting.

The page includes basic loading, error, and empty states.

The page also shows a history list with the latest processing runs, the source
product name, count of regions with valid data, and the run status.

## Local Check

```bash
curl http://localhost:8000/processing/status
```

Then open the frontend and choose `Admin/debug` in the sidebar.
