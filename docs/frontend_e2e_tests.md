# Frontend Tests

Frontend now has two complementary test layers:

- basic UI tests with Vitest and Testing Library,
- browser-level E2E tests with Playwright.

## Basic UI Tests

Basic UI tests cover the fast feedback layer around the React dashboard:

- default selection of the first region with a valid latest measurement,
- rendering of the selected region's measurement details and CSV export link,
- switching to another region and updating the visible cards,
- switching from the dashboard to the admin/debug page.

The UI tests mock the frontend API module, so they run without backend startup,
database access, or seeded local data.

Run them locally:

```powershell
cd frontend
npm install
npm test
```

Run lint locally:

```powershell
npm run lint
```

## Frontend E2E Tests

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
npm test      -> 3 passed
npm run test:e2e -> 1 passed
```
