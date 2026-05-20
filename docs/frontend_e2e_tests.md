# Frontend E2E Tests

Frontend E2E tests cover the main regional user flow on the React dashboard.

## Covered Flow

- dashboard load,
- automatic selection of the first region with a valid latest measurement,
- rendering of the selected region's latest NO2 measurement,
- switching to another statistical region,
- CSV export link and download for the selected region.

The E2E test mocks the regional API responses in the browser. This keeps the
test stable and independent from local PostgreSQL, backend startup, and seeded
regional data.

## Run Locally

Install frontend dependencies:

```powershell
cd frontend
npm install
```

Install the Playwright Chromium browser once:

```powershell
npx playwright install chromium
```

Run the test:

```powershell
npm run test:e2e
```

## Expected Result

```text
1 passed
```
