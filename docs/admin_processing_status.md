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

If no processing run exists, the endpoint returns `404`.

## Frontend View

The frontend sidebar has an `Admin/debug` item. The page calls
`GET /processing/status` and shows whether the latest processing run was
successful, running, failed, or unknown.

The page includes basic loading, error, and empty states.

## Local Check

```bash
curl http://localhost:8000/processing/status
```

Then open the frontend and choose `Admin/debug` in the sidebar.
