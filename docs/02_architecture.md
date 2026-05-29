# 02 – Arhitektura

AirWatch SLO ima štiri glavne dele: data pipeline, bazo, backend in frontend.

```text
┌────────────────────┐
│  Data pipeline      │  Python skripte (ročno ali prek orkestratorja)
│  data_pipeline/     │  Sentinel-5P .nc → regionalni JSON
└─────────┬───────────┘
          │  ingest skripta
          ▼
┌────────────────────┐
│  PostgreSQL/PostGIS │  region, region_measurement, processing_run, …
│  database/, alembic │
└─────────┬───────────┘
          │  SQLAlchemy
          ▼
┌────────────────────┐
│  FastAPI backend    │  /api/v1/regions/*, /processing/*, /health
│  backend/           │
└─────────┬───────────┘
          │  HTTP (JSON)
          ▼
┌────────────────────┐
│  React + Vite       │  dashboard, zemljevid, trend, primerjava, CSV
│  frontend/          │
└────────────────────┘
```

## Komponente

### Data pipeline (`data_pipeline/`)

Samostojne Python skripte, ki ne tečejo v backendu. Prenesejo izbran
Sentinel-5P produkt, ga obrežejo na Slovenijo, uporabijo QA filter, agregirajo
piksle po regijah in zapišejo majhen JSON. Backend skripta nato JSON vnese v
bazo. Glej [`03_data_pipeline.md`](03_data_pipeline.md).

### Baza (PostgreSQL + PostGIS)

Shema je ustvarjena z Alembic migracijami (`backend/alembic/versions/`).
Glavne tabele:

```text
region              statistične regije + geometrija (PostGIS)
indicator           kazalnik (NO2)
data_source         vir podatkov (Copernicus Data Space)
data_product        tip produkta (S5P_OFFL_L2__NO2)
source_file         posamezna .nc datoteka
processing_run      en zagon obdelave
region_measurement  ena meritev na regijo + produkt
```

PostGIS shranjuje geometrije regij in jih streže kot GeoJSON za zemljevid.
Surove SQL skripte v `database/init/` ostajajo kot referenca; primarni vir
sheme je Alembic. Glej `database/README.md`.

### Backend (`backend/`)

FastAPI aplikacija (`backend/main.py`). Endpointi berejo iz baze prek
SQLAlchemy in service sloja (`backend/services/`), odgovori so opisani s
Pydantic shemami (`backend/schemas.py`). Backend ne piše v bazo prek API-ja –
podatke vnaša pipeline. Glej [`04_api_documentation.md`](04_api_documentation.md).

### Frontend (`frontend/`)

React + Vite dashboard. Glavni komponenti sta `Dashboard.jsx` in
`AdminProcessingStatusPage.jsx`, API klici so zbrani v
`frontend/src/api/airwatchApi.js`. Zemljevid regij uporablja Leaflet,
trend graf prikazuje zgodovino regije.

## Pretok regije skozi sistem

1. Pipeline dodeli veljavne piksle regiji (point-in-polygon) in izračuna
   statistiko → JSON.
2. Ingest skripta zapiše vrstico v `region_measurement` (povezano z
   `processing_run` in `source_file`).
3. Backend vrne zadnjo meritev regije prek `/api/v1/regions/...`.
4. Frontend prikaže vrednost, status kakovosti in sledljivost.

"Zadnja" meritev se izbere po `measurement_end_time DESC`, nato
`measurement_start_time DESC`, nato po ID-ju meritve.
