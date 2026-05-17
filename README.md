# AirWatch SLO

AirWatch SLO je spletna analitična platforma za spremljanje kakovosti zraka nad Slovenijo na podlagi satelitskih podatkov Copernicus, primarno Sentinel-5P NO2.

MVP je osredotočen na osnovni podatkovni tok:

```text
Copernicus Sentinel-5P NO2 produkt
        -> Python data pipeline
        -> obdelava podatkov za Slovenijo / regije
        -> PostgreSQL + PostGIS baza
        -> FastAPI backend
        -> React dashboard
```

## Cilj MVP-ja

Uporabnik mora v končni verziji MVP-ja lahko:

- odpreti spletni dashboard,
- izbrati slovensko regijo,
- videti zadnjo razpoložljivo NO2 vrednost,
- videti datum meritve in vir podatkov,
- pregledati zgodovinski trend,
- primerjati regije,
- izvoziti rezultate v CSV.

Sprint 1 trenutno pokriva podatkovno odkrivanje za Sentinel-5P NO2, začetni ER model, Alembic migracije in seed podatke za bazo.

## Tehnologije

- Backend: Python, FastAPI
- Frontend: React, Vite
- Baza: PostgreSQL + PostGIS
- Data pipeline: Python, requests, xarray, numpy
- Infrastruktura: Docker, Docker Compose

## Struktura projekta

```text
airwatch-slo/
├── backend/                 FastAPI aplikacija
├── frontend/                React dashboard
├── data_pipeline/           Sentinel-5P NO2 discovery in processing skripte
├── database/                ER diagram, SQL inicializacija in seed podatki
├── docs/                    projektna dokumentacija
├── docker-compose.yml       lokalno Docker okolje
├── .env.example             primer konfiguracije brez skrivnosti
└── README.md
```

## Predpogoji

- Docker in Docker Compose
- Python 3 za lokalni data pipeline
- Copernicus Data Space račun za iskanje in prenos Sentinel-5P produktov

## Konfiguracija

Ustvari lokalno `.env` datoteko iz primera:

```bash
cp .env.example .env
```

Nato v `.env` nastavi vsaj:

```env
POSTGRES_DB=airwatch
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_local_password

COPERNICUS_USERNAME=your_email_here
COPERNICUS_PASSWORD=your_password_here
```

Frontend privzeto uporablja relativno pot `/api`. Lokalni Vite server in Docker nginx to pot preusmerita na backend. Če frontend kliče API neposredno iz brskalnika, nastavi `CORS_ORIGINS` v `.env.example` slogu.

Datoteka `.env` vsebuje skrivnosti in ne sme biti commitana v Git.

## Zagon z Dockerjem

Zaženi celotno lokalno okolje:

```bash
docker compose up --build
```

Ali samo bazo:

```bash
docker compose up -d db
```

Dostop:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Backend health check: http://localhost:8000/health
- PostgreSQL: `localhost:5432`

## Inicializacija baze

Primarni način inicializacije baze je Alembic. Zaženi migracije znotraj backend Docker servisa, da se poveže na Compose database service `db`:

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
```

Preveri tabele:

```bash
docker compose exec db psql -U postgres -d airwatch -c "\dt"
```

Raw SQL skripte v `database/init/` ostajajo kot referenca, vendar za razvoj uporabljaj Alembic:

- `001_create_extensions.sql` omogoči PostGIS.
- `002_create_tables.sql` ustvari core MVP tabele.
- `003_seed_initial_data.sql` doda Sprint 1 seed podatke.

Sprint 1 seed podatki predstavljajo:

- testno regijo `SI_BBOX` za Slovenijo,
- kazalnik `NO2` z enoto `mol/m²`,
- Copernicus Data Space vir,
- Sentinel-5P OFFL L2 NO2 produkt,
- eno odkrito/preneseno izvorno datoteko,
- en uspešen processing run,
- eno obdelano regionalno meritev za Slovenijo bbox.

## Data Pipeline

Data pipeline je v `data_pipeline/` in ne prenaša podatkov samodejno. Skripte omogočajo lokalno avtentikacijo, iskanje produktov, prenos izbranega produkta, pregled NetCDF strukture in izračun NO2 statistik.

Namestitev lokalnih odvisnosti:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install requests python-dotenv xarray numpy netCDF4
```

Uporabni ukazi:

```bash
python data_pipeline/scripts/get_copernicus_token.py
python data_pipeline/scripts/search_s5p_no2_products.py --start-date 2025-03-11 --end-date 2025-03-11
python data_pipeline/scripts/download_s5p_no2_product.py --product-id PRODUCT_UUID_FROM_SEARCH
python data_pipeline/scripts/inspect_s5p_no2_structure.py --file data_pipeline/sample_data/YOUR_PRODUCT.nc
python data_pipeline/scripts/process_no2_slovenia_bbox.py --file data_pipeline/sample_data/YOUR_PRODUCT.nc
```

Prenesene `.nc` in `.zip` datoteke ostanejo v `data_pipeline/sample_data/` in ne smejo biti commitane.

## Dokumentacija

- ER diagram: `database/diagrams/er_diagram.md`
- Database navodila: `database/README.md`
- Data pipeline navodila: `data_pipeline/README.md`
- CI navodila: `docs/ci.md`
- Sentinel-5P NO2 discovery template: `docs/data_discovery_sentinel5p_no2.md`
- Regional NO₂ pipeline runbook: `docs/regional_pipeline_runbook.md`
- Predlagana struktura projekta: `structure.md`

## Lokalni razvoj

Backend lokalno:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend lokalno:

```bash
cd frontend
npm install
npm run dev
```

Frontend lokalno teče na `http://localhost:3000` in kliče backend prek `/api` proxyja na `http://localhost:8000`.

## Varnost in Git pravila

Ne commitaj:

- `.env`
- Copernicus prijavnih podatkov
- access tokenov
- `.nc` ali `.zip` produktov
- lokalnih virtualnih okolij
- velikih generiranih podatkovnih datotek

Repozitorij vsebuje samo skripte, dokumentacijo, shemo baze in seed metapodatke, ne pa dejanskih prenesenih Copernicus produktov.
