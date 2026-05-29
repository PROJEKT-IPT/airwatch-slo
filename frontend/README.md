# AirWatch SLO – Frontend

React + Vite dashboard, ki prikazuje regionalne NO₂ meritve iz backend API-ja.
Zemljevid regij uporablja Leaflet, trend graf prikazuje zgodovino regije.

## Zagon

```bash
npm install
npm run dev      # dev server na http://localhost:3000
```

Z Dockerjem (iz korena projekta):

```bash
docker compose up --build frontend
```

## Konfiguracija API-ja

Frontend uporablja `VITE_API_URL`, če je nastavljen, sicer privzeti backend URL
iz `src/api/airwatchApi.js`, in kliče poti oblike `<base>/api/v1/...`.

```env
VITE_API_URL=        # prazno = privzeti backend
```

## Struktura

```text
src/
  App.jsx                  glavni layout in usmerjanje
  api/airwatchApi.js       vsi API klici
  pages/                   Dashboard.jsx, AdminProcessingStatusPage.jsx
  components/              RegionSelect, RegionalMap, TrendChart,
                           LatestMeasurementCard, RegionComparisonCard,
                           DataProvenanceCard, DataQualityCard, …
```

## Ukazi

```bash
npm run dev        # razvojni server
npm run build      # produkcijska gradnja
npm run lint       # ESLint
npm test           # Vitest (UI testi)
npm run test:e2e   # Playwright E2E (najprej: npx playwright install chromium)
```

Pričakovano: `npm test → 3 passed`, `npm run test:e2e → 1 passed`.

## Opombe

- Manjkajoče meritve se prikažejo kot "ni podatkov", ne kot ničla.
- Komponente prikazujejo loading, error in "ni podatkov" stanja.
- Več o endpointih: [`../docs/04_api_documentation.md`](../docs/04_api_documentation.md).
