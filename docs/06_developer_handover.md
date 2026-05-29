# 08 – Predaja razvijalcu

Vstopna točka za novega razvijalca. Predpostavlja že prebran
[`02_architecture.md`](02_architecture.md).

## Struktura repozitorija

```text
backend/         FastAPI app, SQLAlchemy, Alembic migracije, ingest skripte
frontend/        React + Vite dashboard
data_pipeline/   Sentinel-5P obdelava + orkestrator + automation
database/        SQL init (referenca) + ER/use-case diagrami
docs/            ta dokumentacija (+ docs/archive/ za podrobne/zgodovinske zapise)
docker-compose.yml
.env.example
```

Komponentni README-ji ostajajo poleg kode in vsebujejo natančne ukaze:

- `backend/README.md` – backend setup, migracije, endpointi, testi
- `data_pipeline/README.md` – pipeline ukazi
- `data_pipeline/automation/README.md` – razporejeno osveževanje (launchd/systemd/cron)
- `database/README.md` – shema, migracije, vnos podatkov

## Lokalni razvoj

Cel sklad prek Dockerja: glej [`05_deployment_guide.md`](05_deployment_guide.md).

Backend brez Dockerja:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev      # dev server na http://localhost:3000
```

## Testi

| Sklop | Ukaz | Pričakovano |
|---|---|---|
| Backend | `cd backend && pip install -r requirements-dev.txt && python -m pytest tests` | 7 passed |
| Frontend (Vitest) | `cd frontend && npm test` | 3 passed |
| Frontend E2E (Playwright) | `cd frontend && npx playwright install chromium && npm run test:e2e` | 1 passed |
| Data pipeline | `python -m pip install -r data_pipeline/requirements-dev.txt && python -m pytest data_pipeline/tests` | pass |

Backend in frontend testi mockajo bazo/API, zato ne potrebujejo PostgreSQL ali
seed podatkov. Pipeline testi uporabljajo sintetične podatke.

## CI

GitHub Actions (`.github/workflows/ci.yml`) teče ob vsakem `push` in
`pull_request`. Preverja:

- da niso sledeni nevarni artefakti (`.env`, `.nc`, veliki GIS/data izhodi),
- backend: `compileall` + testi (če obstajajo),
- data pipeline: `compileall` + testi (če obstajajo),
- frontend: `npm ci`, lint, `npm test`, `npm run build`.

CI **ne** deploya, ne uporablja skrivnosti, ne prenaša Sentinel-5P produktov in
ne zaganja baze/migracij.

## Razporejeno osveževanje podatkov

Aplikacija ni v realnem času; "zadnja" meritev napreduje šele ob vnosu novega
produkta. `data_pipeline/automation/` vsebuje wrapper okoli orkestratorja in
launchd/systemd/cron primere (privzeto dnevno ob 06:15). Podrobnosti in dormant
HTTP-trigger (`POST /admin/refresh-latest`) so opisani v
`data_pipeline/automation/README.md`.

## Stvari, ki jih je dobro vedeti

- **Vrata baze 5433.** Compose mapira bazo na host vrata `5433` (znotraj omrežja
  `db:5432`). Host skripte potrebujejo `DATABASE_PORT=5433`.
- **Vnos v bazo iz host okolja.** `ingest_regional_no2_measurements.py` gradi
  povezavo iz `POSTGRES_*` / `DATABASE_*`, ne iz `DATABASE_URL`. Backend Docker
  image ne vsebuje `data_pipeline/outputs/`; za vnos prek kontejnerja glej
  obhod v `docs/archive/regional_pipeline_runbook.md` (§11, Option B).
- **Frontend API base.** `frontend/src/api/airwatchApi.js` uporablja
  `VITE_API_URL`, sicer privzeto produkcijski Railway backend URL, in kliče
  `<base>/api/v1/...`. (Starejša dokumentacija je omenjala podvojeno predpono
  `/api/api/v1` za lokalni proxy – preveri trenutno obnašanje za svoj scenarij.)
- **Neaktivni admin endpoint.** `backend/admin_refresh.py` obstaja, a je v
  `backend/main.py` zakomentiran.
- **`script_version = sprint_2_regional`.** Ingest skripta ima ta label kot
  privzetek tudi za novejše produkte; gre za kozmetičen follow-up, ne napako.

## Arhiv

`docs/archive/` hrani podrobne in sprint-specifične zapise (runbook,
agregacijska strategija/rezultati, validacija, izbira produktov, omejitve,
testi, CI). Uporabni za poglobitev ali zgodovinski kontekst; aktualni povzetek
je v dokumentih `01`–`06`.

Najkoristnejši v arhivu:

- `archive/regional_pipeline_runbook.md` – polni end-to-end ukazi z Dockerjem
- `archive/API_documentation.md` – obširnejša referenca endpointov
- `archive/Data_documentation.md` – podroben opis pipeline toka
- `archive/sprint3_selected_no2_input_product.md` – trenutni "zadnji" produkt
  (2026-05-08, vseh 12 regij veljavnih)
