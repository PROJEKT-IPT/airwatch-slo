# 05 – Navodila za zagon in deploy

AirWatch SLO teče lokalno prek Docker Compose, v produkciji pa na Railway
(tri storitve: PostgreSQL/PostGIS, backend, frontend).

> Ta dokument ne vsebuje gesel, tokenov ali `.env` vrednosti. Vse skrivnosti se
> nastavijo kot okoljske spremenljivke v lokalni `.env` datoteki ali v
> Railway nastavitvah storitve.

## Okoljske spremenljivke

Predloga je `.env.example`. Lokalno ustvari `.env` (ni v Gitu):

```bash
cp .env.example .env
```

| Spremenljivka | Namen |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | inicializacija PostgreSQL |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` | povezava backenda na bazo |
| `CORS_ORIGINS` | dovoljeni frontend izvori (vejicno ločeni) |
| `VITE_API_URL` | backend URL za frontend (prazno = privzeto; lokalni Docker build nastavi `http://localhost:8000`) |
| `COPERNICUS_USERNAME`, `COPERNICUS_PASSWORD` | le za pipeline prenose |

## Lokalni zagon (Docker Compose)

```bash
docker compose up --build
```

Storitve in vrata (iz `docker-compose.yml`):

| Storitev | Image / build | Vrata (host:container) |
|---|---|---|
| `db` | `postgis/postgis:15-3.3` | `5433:5432` |
| `backend` | `./backend` (FastAPI/uvicorn) | `8000:8000` |
| `frontend` | `./frontend` (Vite preview) | `3000:4173` |

> **Vrata baze.** Compose mapira bazo na host vrata **5433** (da se izogne
> lokalnemu PostgreSQL na 5432). Znotraj Docker omrežja backend dosega bazo na
> `db:5432`. Za host skripte uporabi `DATABASE_PORT=5433`.

Dostop:

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:8000>
- Health: <http://localhost:8000/health>

Samo baza:

```bash
docker compose up -d db
```

## Inicializacija baze (Alembic)

Migracije se priporočeno zaženejo znotraj backend kontejnerja, da uporabijo iste
okoljske spremenljivke kot servis:

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
```

Migracije ustvarijo shemo, omogočijo PostGIS in seed-ajo 12 statističnih regij
(`010_seed_statistical_regions`). NO₂ meritve se nato vnesejo prek pipeline-a
(glej [`03_data_pipeline.md`](03_data_pipeline.md)).

Preveri tabele:

```bash
docker compose exec db psql -U postgres -d airwatch -c "\dt"
```

## Produkcija (Railway)

Projekt na Railway sestoji iz treh storitev:

### 1. PostgreSQL / PostGIS

- Railway PostgreSQL storitev z omogočenim PostGIS.
- Po prvem zagonu se nad to bazo poženejo Alembic migracije (`alembic upgrade
  head`), ki ustvarijo shemo, omogočijo PostGIS in seed-ajo regije.
- Vrednosti za povezavo (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`,
  `DATABASE_USER`, `DATABASE_PASSWORD`) prevzame backend iz okoljskih
  spremenljivk Railway Postgres storitve.

### 2. Backend

- Gradi se iz `backend/Dockerfile` (`python:3.11-slim`, `uvicorn main:app` na
  vratih `8000`).
- Potrebne okoljske spremenljivke: `DATABASE_*` (kazalec na Railway Postgres) in
  `CORS_ORIGINS` (mora vključevati javni URL frontenda).
- Javni URL: `https://airwatch-slo-production.up.railway.app`.

### 3. Frontend

- Gradi se z `frontend/nixpacks.toml`: `npm install` → `npm run build` →
  `npm run preview -- --host 0.0.0.0 --port $PORT`.
- API base se določi prek `VITE_API_URL`. Če ni nastavljen, frontend privzeto
  uporabi backend URL iz `frontend/src/api/airwatchApi.js`
  (`https://airwatch-slo-production.up.railway.app`).

> Frontend pri lokalnem Docker zagonu se zgradi z `VITE_API_URL=http://localhost:8000`,
> zato brskalnik kliče lokalni backend neposredno. Na Railway frontend kliče backend
> prek polnega URL-ja, zato je pomembno, da je `CORS_ORIGINS` na backendu pravilno
> nastavljen.

### Vnos podatkov v produkcijsko bazo

Backend image ne vsebuje pipeline skript ali `.nc` produktov, zato se NO₂
meritve generirajo lokalno (pipeline) in vnesejo v ciljno bazo z nastavljenimi
`DATABASE_*` spremenljivkami, ki kažejo na Railway Postgres. Glej
[`03_data_pipeline.md`](03_data_pipeline.md) in `database/README.md`.

