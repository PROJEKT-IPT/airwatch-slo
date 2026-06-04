# 04 – API dokumentacija

FastAPI backend bere podatke iz baze in jih streže preko JSON endpointov.
Aplikacija **ni v realnem času** – endpointi vrnejo zadnjo razpoložljivo
*obdelano* Sentinel-5P NO₂ meritev. Manjkajoče vrednosti so `null`, nikoli `0`.

Vir resnice za ta dokument je `backend/main.py`, `backend/services/` in
`backend/schemas.py`.

## Base URL in dokumentacija

```text
Lokalno:    http://localhost:8000
Produkcija: https://airwatch-slo-production.up.railway.app
```

Interaktivna dokumentacija (Swagger) in OpenAPI shema:

```text
<base>/docs
<base>/openapi.json
```

Frontend uporablja `VITE_API_URL`, če je nastavljen, sicer privzeto produkcijski
backend URL, in kliče poti oblike `<base>/api/v1/...`. CORS dovoljene izvore
določa okoljska spremenljivka `CORS_ORIGINS`. V dokumentaciji ni nobenih
skrivnosti.

## Pregled endpointov

| Metoda | Pot | Uporablja frontend |
|---|---|---|
| GET | `/health` | ne (health check) |
| GET | `/api/v1/regions/latest-measurements` | da |
| GET | `/api/v1/regions/measurement-dates` | da |
| GET | `/api/v1/regions/geometries` | da |
| GET | `/api/v1/regions/compare` | da |
| GET | `/api/v1/regions/export.csv` | da |
| GET | `/api/v1/regions/{region_code}` | da |
| GET | `/api/v1/regions/{region_code}/history` | da |
| GET | `/api/v1/regions/{region_code}/history/export.csv` | da |
| GET | `/api/v1/regions/{region_code}/export.csv` | da |
| GET | `/processing/status` | da (Admin/debug) |
| GET | `/processing/history` | da (Admin/debug) |
| GET | `/`, `/regions`, `/measurements/latest` | ne (legacy, glej spodaj) |

## Skupna pravila

- Javni regionalni endpointi vračajo le regije z
  `region_type = statistical_region` (12 NUTS3 regij). Testna regija `SI_BBOX` je
  privzeto izločena; nekateri endpointi jo razkrijejo z `?include_test_region=true`.
- `quality_status`: `valid` (veljavna ocena), `no_valid_pixels` (produkt obdelan,
  a ni veljavnih pikslov po QA filtru → `value_*` so `null`), `processing_error`.
- QA prag: `qa_threshold = 0.75`.
- "Zadnja" meritev: `measurement_end_time DESC`, nato `measurement_start_time DESC`,
  nato ID meritve.

Pogosta polja v odgovorih:

| Polje | Pomen |
|---|---|
| `region_code` / `region_name` | npr. `SI032` / `Podravska` |
| `value_mean` / `value_min` / `value_max` | NO₂ statistika (`mol/m²`), lahko `null` |
| `unit` | enota, trenutno `mol/m²` |
| `pixel_count_valid` | število veljavnih pikslov po QA filtru |
| `qa_threshold` | uporabljen QA prag |
| `quality_status` | status kakovosti |
| `measurement_start_time` / `measurement_end_time` | časovno okno produkta (ISO 8601) |
| `source_product_id` / `source_product_name` | izvor (UUID / ime `.nc` datoteke) |
| `processing_run_id` | sledljivost do zagona obdelave |
| `geometry` | GeoJSON (`Polygon`/`MultiPolygon`) ali `null` |

## Endpointi

### `GET /health`

Preverjanje delovanja. Vrne `200 {"status": "healthy"}`.

### `GET /api/v1/regions/latest-measurements`

Zadnja NO₂ meritev za vsako statistično regijo (osnova za izbirnik regij,
zemljevid in značko svežine). Urejeno po `region_code`. `SI_BBOX` izločen.
Vrnjene so le regije, ki imajo meritev (tudi `no_valid_pixels` z `null` vrednostmi).

- **Parametri:** `date` (neobvezno, `YYYY-MM-DD`). Brez parametra endpoint vrne
  zadnjo razpolozljivo meritev. Z `date` vrne zadnjo meritev znotraj izbranega
  UTC dneva, npr. glede na datum Sentinel-5P `.nc` produkta.

```bash
curl "http://localhost:8000/api/v1/regions/latest-measurements?date=2026-05-08"
```

### `GET /api/v1/regions/measurement-dates`

Vrne seznam razpolozljivih datumov meritev (`YYYY-MM-DD`) za obdelane javne
statisticne regije, izpeljan iz shranjenih NetCDF (`.nc`) Sentinel-5P produktov.
Frontend ga uporablja za koledar v zavihku Pregled.

### `GET /api/v1/regions/geometries`

GeoJSON meje vseh statističnih regij v enem klicu za prikaz na zemljevidu.
Urejeno po `region_code`.

### `GET /api/v1/regions/compare`

Primerjava zadnjih meritev 2–12 regij, urejeno `value_mean DESC NULLS LAST`,
nato `region_name`.

- **Parametri:** `region_codes` (ponovljiv parameter ali vejicno ločen seznam;
  potrebne vsaj 2, največ 12 različnih), `include_test_region` (privzeto `false`).
- **Napake:** `400` (manj kot 2 ali več kot 12), `404` (regija ne obstaja ali
  nima meritve).

```bash
curl "http://localhost:8000/api/v1/regions/compare?region_codes=SI032&region_codes=SI036"
```

### `GET /api/v1/regions/{region_code}`

Metapodatki regije (vključno z geometrijo) + zadnja meritev in sledljivost.

- **Parametri:** `include_test_region` (privzeto `false`), `date` (neobvezno,
  `YYYY-MM-DD`; vrne meritev znotraj izbranega UTC dneva).
- **Napake:** `404` "Region not found." / "No NO2 measurement found for the
  requested region.".

### `GET /api/v1/regions/{region_code}/history`

Zgodovinske meritve za eno regijo (trend graf), urejene **naraščajoče** po
`measurement_end_time`.

- **Parametri:** `start_date`, `end_date` (oboje neobvezno, vključujoče;
  `YYYY-MM-DD` ali ISO), `include_test_region`. `limit` ni podprt.
- **Napake:** `404` (regija ali zgodovina ne obstaja).

### `GET /api/v1/regions/export.csv`

Zadnja meritev za vse javne statistične regije kot CSV (ena glava + do 12
vrstic), urejeno po `region_code`. Ime datoteke: `airwatch-regions-latest.csv`.
`404`, če v bazi ni nobene javne regionalne meritve.

```bash
curl -OJ http://localhost:8000/api/v1/regions/export.csv
```

### `GET /api/v1/regions/{region_code}/export.csv`

Zadnja meritev regije kot CSV (ena glava + ena vrstica). Ime datoteke:
`airwatch-region-<region_code>-latest.csv` (z malimi črkami). `404`, če regija
nima meritve.

```bash
curl -OJ http://localhost:8000/api/v1/regions/SI032/export.csv
```

### `GET /api/v1/regions/{region_code}/history/export.csv`

Celotna zgodovina meritev izbrane regije kot CSV (ena glava + več vrstic),
urejeno **naraščajoče** po `measurement_end_time`. Ime datoteke:
`airwatch-region-<region_code>-history.csv`. `404`, če regija ali zgodovina ne
obstaja.

```bash
curl -OJ http://localhost:8000/api/v1/regions/SI032/history/export.csv
```

### `GET /processing/status`

Zadnji `processing_run` in zadnja **uspešna** posodobitev (polja
`last_successful_run_id`, `last_successful_at`, `last_successful_product_name`,
lahko `null`). `404`, če ni nobenega zagona. Uporablja Admin/debug stran.

### `GET /processing/history`

Seznam zadnjih zagonov obdelave; vsak vključuje `valid_region_count` (število
regij s `pixel_count_valid > 0`). Parametri `limit` (privzeto `20`, `1`–`200`) in
`offset`. Prazen seznam, če ni zagonov.

## Legacy endpointi

`GET /`, `GET /regions` in `GET /measurements/latest` so ostanki zgodnjega
razvoja. Še delujejo, a jih React dashboard ne uporablja in **ne** filtrirajo
`SI_BBOX` enako kot javni `/api/v1` tok. Za javni dashboard uporabljaj
`/api/v1/regions/...`.

## Neaktivni endpoint

`POST /admin/refresh-latest` je definiran v `backend/admin_refresh.py`, a **ni
registriran** v `backend/main.py` (vrstici sta zakomentirani), zato v trenutni
konfiguraciji ne obstaja. Aktivacijski koraki so opisani v
`data_pipeline/automation/README.md`.

## Hitro preverjanje

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/regions/latest-measurements
curl http://localhost:8000/api/v1/regions/SI041
curl http://localhost:8000/api/v1/regions/geometries
curl "http://localhost:8000/api/v1/regions/compare?region_codes=SI041&region_codes=SI032"
curl -OJ http://localhost:8000/api/v1/regions/export.csv
curl -OJ http://localhost:8000/api/v1/regions/SI041/export.csv
curl -OJ http://localhost:8000/api/v1/regions/SI041/history/export.csv
curl http://localhost:8000/processing/status
```
