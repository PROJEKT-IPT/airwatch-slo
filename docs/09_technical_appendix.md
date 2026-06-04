# 09 – Tehnična priloga

Strnjen tehnični pregled aplikacije AirWatch SLO kot priloga k diplomski nalogi.
Aplikacija prikazuje **zadnjo razpoložljivo obdelano** Sentinel-5P NO₂ meritev po
slovenskih statističnih regijah; **ni v realnem času** in **ni ulična meritev**.

- Frontend (deploy): <https://airwatch-frontend-production.up.railway.app/>
- Backend (deploy): <https://airwatch-slo-production.up.railway.app/>

## 1. Struktura repozitorija

```text
airwatch-slo/
├── frontend/            React + Vite nadzorna plošča
├── backend/             FastAPI aplikacija + Alembic migracije + skripte
├── data_pipeline/       Python obdelava Sentinel-5P NO₂ (+ scheduler skripta)
├── database/            SQL init (referenca) + ER/use-case diagrami
├── docs/                dokumentacija (01–09, archive/ za starejše zapise)
├── docker-compose.yml   lokalno okolje (db + backend + frontend)
└── README.md            kratek pregled + kazalo dokumentacije
```

## 2. Frontend

React + Vite nadzorna plošča (`frontend/`).

- **Glavna stran:** `src/pages/Dashboard.jsx` (izbira regije, zadnja meritev,
  zemljevid, trend, primerjava, izvoz). Druga stran: `src/pages/AdminProcessingStatusPage.jsx`
  (interno, dostopno prek `#admin`).
- **Komponente** (`src/components/`): `RegionSelect`, `LatestMeasurementCard`,
  `RegionalMap` (Leaflet), `TrendChart` (Recharts), `RegionComparisonCard`,
  `RegionDetailsCard`, `MethodologyCard`, `Sidebar`.
- **API odjemalec:** `src/api/airwatchApi.js` (vsi klici na backend; base URL je
  `VITE_API_URL`, sicer privzeti deployani backend; poti `/api/v1/...`).
- **Večjezičnost:** `src/i18n.jsx` (SL/EN/DE; nastavi tudi `html lang`).
- **Testi:** `tests/ui/` (Vitest + Testing Library), `tests/e2e/` (Playwright).

Ukazi (iz `frontend/`):

```bash
npm install
npm run dev        # razvojni strežnik
npm run lint       # ESLint
npm test           # Vitest (UI testi)
npm run build      # produkcijska gradnja
npm run test:e2e   # Playwright E2E (prej: npx playwright install chromium)
```

## 3. Backend

FastAPI aplikacija (`backend/`).

- **`main.py`** – definicije endpointov, CORS, sestavljanje odgovorov.
- **`database.py`** – SQLAlchemy povezava; URL se sestavi iz okoljskih
  spremenljivk (`POSTGRES_*` / `DATABASE_*`).
- **`services/`** – poslovna logika in poizvedbe (`region_service.py`,
  `region_measurement_service.py`).
- **`schemas.py`** – Pydantic sheme odgovorov.
- **`scripts/`** – `load_regions.py` (nalaganje regij), `ingest_regional_no2_measurements.py`
  (vnos regionalnih meritev).
- **`alembic/`** – migracije sheme. **`tests/`** – pytest (privzeto z lažno bazo).
- **`admin_refresh.py`** – neaktiven (registracija v `main.py` zakomentirana).

Ukazi (iz `backend/`):

```bash
uvicorn main:app --reload                 # lokalni zagon API-ja
pytest                                    # testi
alembic upgrade head                      # migracije (proti nastavljeni bazi)
```

## 4. API endpointi

| Metoda | Pot | Namen |
|---|---|---|
| GET | `/health` | preverjanje delovanja |
| GET | `/api/v1/regions/latest-measurements` | zadnja meritev na regijo |
| GET | `/api/v1/regions/geometries` | GeoJSON meje regij (zemljevid) |
| GET | `/api/v1/regions/{region_code}` | podrobnosti regije + zadnja meritev |
| GET | `/api/v1/regions/{region_code}/history` | zgodovinske meritve (trend) |
| GET | `/api/v1/regions/compare` | primerjava 2–12 regij |
| GET | `/api/v1/regions/export.csv` | CSV izvoz zadnjih meritev vseh regij |
| GET | `/api/v1/regions/{region_code}/export.csv` | CSV izvoz zadnje meritve |
| GET | `/api/v1/regions/{region_code}/history/export.csv` | CSV izvoz zgodovine regije |
| GET | `/processing/status` | zadnji + zadnji uspešni zagon obdelave |
| GET | `/processing/history` | zgodovina zagonov obdelave |

Javni regionalni endpointi vračajo le `region_type = statistical_region` (12
NUTS3 regij); testna regija `SI_BBOX` je privzeto izločena.

**Legacy/interno:** `GET /`, `GET /regions`, `GET /measurements/latest` še
obstajajo iz zgodnjega razvoja, a jih frontend ne uporablja in ne filtrirajo
`SI_BBOX` enako. `POST /admin/refresh-latest` je definiran, a **ni registriran**
(neaktiven). Podroben opis: [`04_api_documentation.md`](04_api_documentation.md).

## 5. Baza

PostgreSQL z razširitvijo **PostGIS**. Shema se ustvari z **Alembic** migracijami
(`backend/alembic/versions/`); migracije omogočijo PostGIS in seed-ajo 12
statističnih regij.

Glavne tabele:

```text
region              regije + geometrija (PostGIS) + bbox
indicator           kazalnik (NO2)
data_source         vir (Copernicus Data Space)
data_product        tip produkta (S5P_OFFL_L2__NO2)
source_file         posamezna .nc datoteka (external_product_id)
processing_run      en zagon obdelave (fk_source_file)
region_measurement  ena meritev na regijo (fk_region, fk_source_file, fk_processing_run)
```

- **Geometrije regij** so shranjene v `region.geometry` (PostGIS) in se strežejo
  kot GeoJSON za zemljevid.
- **Regionalne NO₂ meritve** so vrstice v `region_measurement` (mean/min/max,
  število veljavnih pikslov, QA prag, status kakovosti, časovno okno).
- **Povezava:** vsak `source_file` (en produkt) ima `processing_run` (zagon
  obdelave); ta zagon ustvari 12 `region_measurement` vrstic (po ena na regijo).
  »Zadnja« meritev na regijo se izbere po `measurement_end_time DESC`.

## 6. Docker / lokalno okolje

`docker-compose.yml` definira tri storitve:

| Storitev | Image / build | Vrata (host:container) |
|---|---|---|
| `db` | `postgis/postgis:15-3.3` | `5433:5432` |
| `backend` | `./backend` (uvicorn) | `8000:8000` |
| `frontend` | `./frontend` (vite preview) | `3000:4173` |

Lokalne okoljske spremenljivke (root `.env`, iz `.env.example`): `POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_HOST`, `DATABASE_PORT`,
`DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `CORS_ORIGINS`,
`VITE_API_URL`. (Frontend pri `npm run dev` uporabi `frontend/.env.development`
→ lokalni backend.)

```bash
docker compose up -d --build      # zgradi in zaženi vse
docker compose ps                 # status storitev
docker compose logs               # dnevniki (npr. docker compose logs backend)
docker compose run --rm backend alembic upgrade head   # migracije
```

> Opomba: baza je mapirana na host vrata **5433** (znotraj omrežja `db:5432`).

## 7. Railway deploy

Tri storitve na Railway:

- **PostgreSQL / PostGIS** – shema z Alembic migracijami, seed regij.
- **Backend (FastAPI)** – gradnja iz `backend/Dockerfile` (uvicorn).
- **Frontend (React/Vite)** – gradnja prek `frontend/nixpacks.toml`
  (`npm install` → `npm run build` → `npm run preview`).

Konfiguracija (samo **imena** spremenljivk; brez vrednosti/skrivnosti):

- Backend: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`,
  `DATABASE_PASSWORD` (kazalec na Railway Postgres) in **`CORS_ORIGINS`** (mora
  vključevati javni URL frontenda).
- Frontend: **`VITE_API_URL`** (URL backenda; če prazen, privzeti deployani
  backend iz `airwatchApi.js`).
- Migracije na Railway: `alembic upgrade head` proti Railway bazi.
- Vnos podatkov v Railway: regionalni JSON se vnese s skripto
  `ingest_regional_no2_measurements.py` z `DATABASE_*` spremenljivkami,
  usmerjenimi na Railway (glej §8). Dnevni samodejni vnos: GitHub Actions cron
  `.github/workflows/refresh-no2.yml` (skrivnosti: `COPERNICUS_USERNAME`,
  `COPERNICUS_PASSWORD`, `RAILWAY_DATABASE_URL`).

## 8. Podatkovni tok (data pipeline)

Veriga od Sentinel-5P produkta do meritev v bazi (skripte v
`data_pipeline/scripts/`, vnos v `backend/scripts/`):

1. **Izbira/prenos produkta** – Sentinel-5P `S5P_OFFL_L2__NO2` (OFFL, NetCDF
   `.nc`, ~600 MB; grupa `PRODUCT`).
2. **Crop/filter za Slovenijo** – omejitev na bounding box (`lat 45.4–46.9`,
   `lon 13.4–16.6`).
3. **QA filter** – `qa_value >= 0.75`; NaN izločeni.
4. **Regionalna agregacija** – point-in-polygon dodelitev pikslov NUTS3 regijam,
   statistika na regijo → JSON.
5. **Validacija** – strukturna doslednost izhoda (12 regij, obvezna polja,
   `value_min ≤ value_mean ≤ value_max`).
6. **Vnos v bazo** – upsert `source_file`/`processing_run`/`region_measurement`
   (idempotentno).

Primeri ukazov (poti so ogradne vrednosti):

```bash
python data_pipeline/scripts/download_s5p_no2_product.py --product-id <UUID>
python data_pipeline/scripts/crop_filter_no2_slovenia.py --file <nc_path>
python data_pipeline/scripts/aggregate_no2_by_region.py \
  --no2-file <nc_path> --regions-file <nuts3_geojson_path> \
  --output <regional_json_path> --source-product-id <UUID> \
  --measurement-start-time <ISO8601> --measurement-end-time <ISO8601>
python data_pipeline/scripts/validate_regional_no2_output.py --file <regional_json_path>
python backend/scripts/ingest_regional_no2_measurements.py --file <regional_json_path>
```

Pomožni skripti: `run_latest_no2_pipeline.py` (orkestrator za lokalno bazo prek
Dockerja) in `ingest_latest_no2_to_db.py` (vnos najnovejšega dne v ciljno bazo,
brez Dockerja – uporablja ga dnevni scheduler).

## 9. Testiranje

- **Frontend:** `npm run lint`, `npm test` (Vitest), `npm run build`,
  `npm run test:e2e` (Playwright – glavni uporabniški tok).
- **Backend:** `pytest` (z lažno bazo prek dependency override; ne zahteva
  PostgreSQL).
- **Data pipeline:** `python -m pytest data_pipeline/tests` (sintetični podatki,
  brez omrežja/poverilnic/baze).
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) – lint, testi, build za
  frontend; `compileall` + testi za backend in pipeline; preverjanje, da niso
  sledeni nedovoljeni artefakti.
- **Ročno (deploy):** `GET /health`, `GET /api/v1/regions/latest-measurements`,
  preverjanje nadzorne plošče v brskalniku.

## 10. Znane omejitve

- **Ni v realnem času** – prikazana je zadnja razpoložljiva *obdelana* OFFL
  meritev; OFFL produkt je objavljen z zamikom nekaj dni do ~tedna.
- **Ni ulična meritev** – piksel TROPOMI ~3,5 × 5,5 km; vrednosti so regionalne
  satelitske ocene.
- **Ni uradna meritev talnih postaj.**
- Posamezne regije imajo lahko **`no_valid_pixels`** (oblačnost, QA filter) →
  prikaže se »ni podatkov«, ne lažna ničla.
- Agregacija je **point-in-polygon** (ne footprint-utežena); meje so GISCO 20M
  (generalizirane).
- **Generirani `.nc` produkti in JSON izhodi se ne commitajo** (gitignored);
  ostanejo lokalni artefakti.
  
