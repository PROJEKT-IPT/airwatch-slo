# AirWatch SLO – Frontend

React + Vite dashboard, ki prikazuje zadnje razpoložljive obdelane regionalne
NO₂ meritve iz backend API-ja. Zemljevid regij uporablja Leaflet, trend graf
pa Recharts.

> Prikaz ni v realnem času in ni meritev na ravni ulice – gre za regionalne
> satelitske ocene, agregirane po 12 slovenskih statističnih regijah.

## Zagon

Frontend je pinan na Node.js 20.19+ (`../.nvmrc` in `package.json` `engines`).

```bash
nvm use
npm install
npm run dev      # dev server na http://localhost:3000
```

Z Dockerjem (iz korena projekta):

```bash
docker compose up --build frontend
```

## Konfiguracija API-ja

Vsi API klici so centralizirani v `src/api/airwatchApi.js`; komponente ne
sestavljajo URL-jev same. Bazni URL se določi iz `VITE_API_URL`, sicer se
uporabi privzeti deployani backend; poti so oblike `<base>/api/v1/...`.

Pri lokalnem razvoju `npm run dev` prebere `frontend/.env.development`, ki kaže
na lokalni backend, da dev ne gre v produkcijo:

```env
# frontend/.env.development
VITE_API_URL=http://localhost:8000
```

## Pogledi

Dashboard je map-first; navigacija je v stranskem meniju:

- `satellite` – razlaga Sentinel-5P in približen orbitalni prikaz,
- `overview` – zemljevid Slovenije z izbrano meritvijo, legendo in preklopom
  med absolutno vrednostjo in odstopanjem od povprečja,
- `trend` – zgodovinski graf izbrane regije z izborom obdobja,
- `comparison` – primerjava zadnjih vrednosti po regijah,
- `data` – podrobnosti, sledljivost in CSV izvozi,
- `learn` (Razloženo) – poenostavljena, pedagoška razlaga,
- `about` – opis projekta in ekipe,
- `#admin` – interni status obdelave, zaščiten s prijavo (gl. spodaj).

## Struktura

```text
src/
  App.jsx                  layout, hash usmerjanje, admin gate
  api/airwatchApi.js       vsi API klici in CSV izvozne poti
  i18n.jsx                 prevodi SL/EN/DE
  pages/
    Dashboard.jsx                glavni dashboard
    AdminProcessingStatusPage.jsx  interni status obdelave
  components/
    Sidebar, RegionalMap, RegionSelect, LatestMeasurementCard,
    TrendChart, RegionComparisonCard, RegionDetailsCard,
    MeasurementDatePicker, MapZoomSlider, SatelliteCard,
    MethodologyCard, LearnCard, AdminLoginGate
```

## Admin pregled (`#admin`)

Interni pregled statusa obdelave podatkov je dostopen na `#admin` in zaščiten z
geslom. Frontend pošlje geslo backendu (`/processing/*`); ob uspehu se žeton
shrani v `sessionStorage`. Geslo se na strežniku nastavi prek `ADMIN_PASSWORD`;
če ni nastavljeno, backend vrne 503 in prijava to jasno sporoči.

## Ukazi

```bash
nvm use
npm run dev        # razvojni server
npm run build      # produkcijska gradnja
npm run lint       # ESLint
npm test           # Vitest (UI testi)
npm run test:e2e   # Playwright E2E (najprej: npx playwright install chromium)
```

Pričakovano: `npm test` → 3 testne datoteke (app, dashboard, adminLoginGate),
`npm run test:e2e` → glavni uporabniški tok.

## Opombe

- Manjkajoče meritve se prikažejo kot "ni podatkov", ne kot ničla.
- Komponente prikazujejo loading, error in "ni podatkov" stanja.
- Podprti so prevodi SL/EN/DE ter nastavitve dostopnosti (večje besedilo, visok
  kontrast, manj gibanja); izbira se shrani v `localStorage`.
- Stranski meni diskretno prikaže datum zadnjih razpoložljivih podatkov.
- Več o endpointih: [`../docs/04_api_documentation.md`](../docs/04_api_documentation.md).
```
