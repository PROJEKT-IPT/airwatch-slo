# AirWatch SLO API Dokumentacija

Ta dokument opisuje trenutno implementirane FastAPI endpoint-e za AirWatch SLO.
API bere podatke iz PostgreSQL/PostGIS baze, napolnjene z Alembic migracijami in
seed podatki za Sentinel-5P NO₂.

> **Narava podatkov.** AirWatch SLO ni aplikacija za meritve v realnem času.
> Endpointi vračajo **zadnjo razpoložljivo veljavno obdelano** NO₂ meritev iz
> zadnjega obdelanega Sentinel-5P produkta za slovenske statistične regije.
> Vrednost je **satelitska regionalna ocena**, ne ulična meritev in ne podatek v
> živo. Manjkajoče vrednosti so predstavljene kot `null`, nikoli kot lažni `0`.

Dokument je bil pregledan in usklajen z dejansko kodo v `backend/main.py`,
`backend/services/` in `backend/schemas.py` (AIRSLO-103). Kjer obstaja
negotovost, je to izrecno označeno z **needs verification**.

---

## 1. Pregled API-ja

API je razdeljen na naslednje skupine:

| Skupina | Namen | Status |
|---|---|---|
| Health | preverjanje delovanja | aktivno |
| Javni regionalni dashboard | zadnje regionalne NO₂ meritve in podrobnosti regije | aktivno |
| Zemljevid / geometrije | GeoJSON meje statističnih regij | aktivno |
| Zgodovina / trend | zgodovinske meritve za eno regijo | aktivno |
| Primerjava | primerjava zadnjih meritev več regij | aktivno |
| Izvoz | CSV izvoz zadnje meritve regije | aktivno |
| Admin / debug | status in zgodovina obdelav (processing runi) | aktivno (interno) |
| Admin / refresh | ročni zagon osvežitve podatkov | **dormant** (privzeto izklopljeno, glej §10) |
| Legacy | zgodnji Sprint 1 endpointi, ki jih React dashboard ne uporablja | legacy |

Pregledne lastnosti vseh aktivnih endpointov:

| Metoda | Pot | Skupina | Uporablja frontend |
|---|---|---|---|
| GET | `/health` | Health | ne (infra/health check) |
| GET | `/api/v1/regions/latest-measurements` | Javni dashboard | da |
| GET | `/api/v1/regions/{region_code}` | Javni dashboard | da |
| GET | `/api/v1/regions/geometries` | Zemljevid | da |
| GET | `/api/v1/regions/{region_code}/history` | Zgodovina / trend | da |
| GET | `/api/v1/regions/compare` | Primerjava | da |
| GET | `/api/v1/regions/{region_code}/export.csv` | Izvoz | da |
| GET | `/processing/status` | Admin / debug | da (Admin/debug stran) |
| GET | `/processing/history` | Admin / debug | da (Admin/debug stran) |
| POST | `/admin/refresh-latest` | Admin / refresh | ne (dormant) |
| GET | `/` | Legacy | ne |
| GET | `/regions` | Legacy | ne |
| GET | `/measurements/latest` | Legacy | ne |

> **Pomembno glede poti.** Pravne (resnične) poti backenda so brez podvojenega
> predpone, npr. `/api/v1/regions/latest-measurements`. Frontend v brskalniku
> kliče `/api/api/v1/...`, ker uporablja proxy bazo `/api`, ki jo Vite in nginx
> nato odstranita (glej §2). Pri neposrednem `curl`-anju backenda vedno
> uporabljaj enojno predpono `/api/v1/...`.

---

## 2. Osnovni naslov (Base URL)

Privzeti lokalni naslov backenda:

```text
http://localhost:8000
```

Interaktivna FastAPI dokumentacija in OpenAPI shema:

```text
http://localhost:8000/docs
http://localhost:8000/openapi.json
```

### Frontend dostop in proxy

Frontend privzeto uporablja relativno bazo `/api` (oz. `VITE_API_URL`, če je
nastavljen) in nato dodaja pot endpointa:

- `getApiBaseUrl()` vrne `VITE_API_URL` ali privzeto `/api`,
- klic je oblike `<baza>/api/v1/...` → v brskalniku torej `/api/api/v1/...`.

Podvojeni `/api` je namenoma: proxy plast predpono odstrani.

- **Vite dev server** (`frontend/vite.config.js`): `/api` → `http://localhost:8000`
  z `rewrite: ^/api → ''`.
- **nginx (Docker)** (`frontend/nginx.conf`): `location /api/` →
  `proxy_pass http://backend:8000/;` (zaključni `/` odstrani `/api/`).

Rezultat v obeh primerih: backend prejme pravno pot `/api/v1/...` brez podvojene
predpone.

> Dokumentacija ne vsebuje skrivnosti. Gesla, tokeni in `.env` vrednosti niso
> del tega dokumenta. CORS dovoljeni izvori se berejo iz `CORS_ORIGINS`
> (privzeto localhost:3000 in localhost:5173).

---

## 3. Skupni podatkovni model in pravila

### Vrednosti `quality_status`

| Vrednost | Pomen | Vrednosti meritve |
|---|---|---|
| `valid` | veljavna regionalna NO₂ ocena | `value_mean/min/max` so prisotne |
| `no_valid_pixels` | produkt obdelan, a ni dovolj veljavnih pikslov po QA filtru | `value_*` so `null`, `pixel_count_valid = 0` |
| `processing_error` | obdelava ni vrnila zanesljivega rezultata | `value_*` so lahko `null` |
| `null` / drugo | status ni znan (robni primer) | frontend prikaže "Neznano" |

- QA prag je `qa_threshold` (trenutno `0.75`); piksli pod pragom niso vključeni.
- `no_valid_pixels` vrstice ostanejo zapisane kot **obdelani rezultati** (imajo
  `processing_run_id`), zato se pojavijo v zgodovini in primerjavi z `null`
  vrednostmi, ne kot lažna ničla.

### Regije in `SI_BBOX`

- Javni regionalni endpointi vračajo samo regije z
  `region_type = statistical_region` (12 slovenskih statističnih regij).
- `SI_BBOX` (`region_type = test_bbox`) je **testna/interna** regija in se v
  javnem dashboard toku **ne prikazuje**:
  - `latest-measurements` jo izrecno izloči po `region_code <> 'SI_BBOX'`,
  - `geometries`, `compare`, `region detail`, `history` in `export.csv` jo
    izločijo posredno, ker filtrirajo na `region_type = statistical_region`.
  - Pri endpointih, ki podpirajo `include_test_region=true`, je testna regija
    dostopna samo eksplicitno (uporablja se za interno testiranje, ne za javni
    dashboard).

### "Latest" izbira

Najnovejša meritev se izbere po: `measurement_end_time DESC`, nato
`measurement_start_time DESC`, nato `id_region_measurement DESC`. Sestavljeni
indeksi (migracija 011) podpirajo to ureditev.

### Pomembna polja odgovorov

| Polje | Pomen |
|---|---|
| `region_code` | oznaka regije, npr. `SI032` |
| `region_name` | prikazno ime regije, npr. `Podravska` |
| `region_type` | tip regije; javno vedno `statistical_region` |
| `geometry` | GeoJSON (`Polygon`/`MultiPolygon`) ali `null` |
| `value_mean` / `value_min` / `value_max` | NO₂ statistika (`mol/m²`), lahko `null` |
| `unit` | enota meritve, trenutno `mol/m²` |
| `pixel_count_valid` | število veljavnih pikslov po QA filtru |
| `qa_threshold` | uporabljen QA prag (ni v `latest-measurements`) |
| `quality_status` | status kakovosti (glej zgoraj) |
| `measurement_start_time` / `measurement_end_time` | časovno okno satelitskega produkta (ISO 8601) |
| `source_product_id` | interni/zunanji ID izvornega produkta (samo detail/history/CSV) |
| `source_product_name` | ime Sentinel-5P `.nc` datoteke |
| `processing_run_id` | ID processing run zapisa za sledljivost |

**Razlike v naboru polj po endpointih:**

- `latest-measurements`: brez `qa_threshold` in `source_product_id`.
- `compare`: ima `qa_threshold`, brez `source_product_id`.
- `region detail`, `history`: imata `qa_threshold` in `source_product_id`.
- `export.csv`: poln nabor + `indicator_code`, `indicator_name`.

### Podatki o svežini (freshness)

Ločenega "freshness" endpointa ni. Frontend značka svežine izračuna starost iz
najnovejšega `measurement_end_time` med vrnjenimi `latest-measurements`. Polje
`last_successful_at` v `/processing/status` je dodaten kazalnik svežine obdelave.

---

## 4. Health

### `GET /health`

- **Skupina:** Health · **Dostop:** javno/infra
- **Namen:** preverjanje, ali backend deluje.
- **Parametri:** brez.

```bash
curl http://localhost:8000/health
```

Odgovor `200`:

```json
{ "status": "healthy" }
```

- **Frontend:** ne uporablja neposredno (namenjeno health checkom / Dockerju).

---

## 5. Javni regionalni dashboard API

### `GET /api/v1/regions/latest-measurements`

- **Skupina:** Javni dashboard · **Dostop:** javno
- **Namen:** zadnja razpoložljiva NO₂ meritev za vsako slovensko statistično
  regijo (osnova za izbirnik regij in regionalni pregled).
- **Parametri:** brez.

```bash
curl http://localhost:8000/api/v1/regions/latest-measurements
```

Primer odgovora `200`:

```json
[
  {
    "region_code": "SI032",
    "region_name": "Podravska",
    "region_type": "statistical_region",
    "value_mean": 0.000031,
    "value_min": 0.000012,
    "value_max": 0.000052,
    "pixel_count_valid": 41,
    "quality_status": "valid",
    "unit": "mol/m²",
    "measurement_start_time": "2025-03-11T12:19:40+00:00",
    "measurement_end_time": "2025-03-11T13:18:05+00:00",
    "processing_run_id": 14,
    "source_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc"
  }
]
```

**Pravila:**

- vključene so samo regije z `region_type = statistical_region`,
- `SI_BBOX` je izrecno izločen,
- vrnjene so samo regije, ki **imajo** NO₂ meritev (vključno z `no_valid_pixels`
  vrsticami z `null` vrednostmi); regije brez kakršnekoli meritve niso v seznamu,
- rezultat je urejen po `region_code`.

**Statusi:** `200` (lahko prazen seznam) · `500` "Failed to fetch latest
regional measurements."

**Frontend:** izbirnik regij, kartica zadnje meritve (preko privzete izbire),
značka svežine, vir podatkov za zemljevid (`getRegionalLatestMeasurements`).

---

### `GET /api/v1/regions/{region_code}`

- **Skupina:** Javni dashboard · **Dostop:** javno
- **Namen:** metapodatki regije + njena zadnja NO₂ meritev in sledljivost.
- **Pot parametri:** `region_code` (npr. `SI032`).
- **Query parametri:** `include_test_region` (bool, privzeto `false`).

```bash
curl http://localhost:8000/api/v1/regions/SI032
```

Primer odgovora `200`:

```json
{
  "region_code": "SI032",
  "region_name": "Podravska",
  "region_type": "statistical_region",
  "geometry": { "type": "MultiPolygon", "coordinates": [] },
  "latest_measurement": {
    "value_mean": 0.000031,
    "value_min": 0.000012,
    "value_max": 0.000052,
    "pixel_count_valid": 41,
    "qa_threshold": 0.75,
    "quality_status": "valid",
    "unit": "mol/m²",
    "measurement_start_time": "2025-03-11T12:19:40+00:00",
    "measurement_end_time": "2025-03-11T13:18:05+00:00",
    "processing_run_id": 14,
    "source_product_id": "b898f30a-1d6e-4c6c-bdc2-9933a06e316e",
    "source_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc"
  }
}
```

**Statusi / napake:**

- `200` uspeh,
- `404` "Region not found." – regija ne obstaja ali ni javna,
- `404` "No NO2 measurement found for the requested region." – regija obstaja, a
  nima NO₂ meritve,
- `500` "Failed to fetch region details."

**Opombe:** `geometry` se vrne kot GeoJSON (`ST_AsGeoJSON`) ali `null`. Testne
regije zahtevajo `?include_test_region=true`.

**Frontend:** kartica zadnje meritve, kartica podrobnosti regije, kartica izvora
(`getRegionDetails`; `404` se obravnava kot "ni podatkov", ne kot napaka).

---

## 6. Zemljevid / geometrije

### `GET /api/v1/regions/geometries`

- **Skupina:** Zemljevid · **Dostop:** javno
- **Namen:** GeoJSON meje vseh statističnih regij v enem klicu za prikaz na
  zemljevidu.
- **Parametri:** brez (`include_test_region` ni podprt; vedno samo statistične
  regije).

```bash
curl http://localhost:8000/api/v1/regions/geometries
```

Primer odgovora `200`:

```json
[
  {
    "region_code": "SI032",
    "region_name": "Podravska",
    "region_type": "statistical_region",
    "geometry": { "type": "MultiPolygon", "coordinates": [] }
  }
]
```

**Pravila:** samo `region_type = statistical_region` (zato je `SI_BBOX`
izključen), urejeno po `region_code`, `geometry` je GeoJSON ali `null`.

**Statusi:** `200` · `500` "Failed to fetch regional geometries."

**Frontend:** Leaflet zemljevid regij (`getRegionGeometries`); meritve za
barvanje statusa se združijo z `latest-measurements`.

---

## 7. Zgodovina / trend

### `GET /api/v1/regions/{region_code}/history`

- **Skupina:** Zgodovina / trend · **Dostop:** javno
- **Namen:** zgodovinske NO₂ meritve za eno regijo (trend graf).
- **Pot parametri:** `region_code`.
- **Query parametri:**
  - `start_date` (neobvezno) – `YYYY-MM-DD` ali ISO časovni žig; vključujoče
    (`measurement_end_time >= start_date`),
  - `end_date` (neobvezno) – enako, vključujoče (`<= end_date`),
  - `include_test_region` (bool, privzeto `false`).
  - **`limit` ni podprt** – endpoint vrne vse meritve v (morebitnem) oknu.

```bash
curl "http://localhost:8000/api/v1/regions/SI032/history"
curl "http://localhost:8000/api/v1/regions/SI032/history?start_date=2026-05-01&end_date=2026-05-15"
```

Primer odgovora `200`:

```json
{
  "region_code": "SI032",
  "region_name": "Podravska",
  "region_type": "statistical_region",
  "measurements": [
    {
      "value_mean": 0.000028,
      "value_min": 0.000010,
      "value_max": 0.000048,
      "pixel_count_valid": 32,
      "qa_threshold": 0.75,
      "quality_status": "valid",
      "unit": "mol/m²",
      "measurement_start_time": "2025-03-11T12:19:40+00:00",
      "measurement_end_time": "2025-03-11T13:18:05+00:00",
      "processing_run_id": 13,
      "source_product_id": "b898f30a-1d6e-4c6c-bdc2-9933a06e316e",
      "source_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc"
    }
  ]
}
```

**Pravila:** meritve urejene **naraščajoče** po `measurement_end_time`; vrstice
`no_valid_pixels` ostanejo v zgodovini z `null` vrednostmi.

**Statusi / napake:**

- `200` uspeh,
- `404` "Region not found.",
- `404` "No NO2 measurement history found for the requested region.",
- `500` "Failed to fetch region history."

**Frontend:** trend graf in datumski filter `Od/Do` (`getRegionHistory`;
frontend naredi dva klica – polnega za nabor datumov in omejenega za prikaz;
`404` se obravnava kot prazno stanje).

---

## 8. Primerjava

### `GET /api/v1/regions/compare`

- **Skupina:** Primerjava · **Dostop:** javno
- **Namen:** zadnje NO₂ meritve za 2–12 izbranih statističnih regij, urejene od
  najvišje do najnižje vrednosti.
- **Query parametri:**
  - `region_codes` (obvezno) – ponovljiv parameter **ali** vejicno ločen seznam;
    normalizira se v velike črke in odstrani podvojitve; potrebne so vsaj **2** in
    največ **12** različnih regij,
  - `include_test_region` (bool, privzeto `false`).

```bash
curl "http://localhost:8000/api/v1/regions/compare?region_codes=SI032&region_codes=SI036"
curl "http://localhost:8000/api/v1/regions/compare?region_codes=SI032,SI036"
```

Primer odgovora `200`:

```json
[
  {
    "region_code": "SI036",
    "region_name": "Osrednjeslovenska",
    "region_type": "statistical_region",
    "value_mean": 0.000042,
    "value_min": 0.000014,
    "value_max": 0.000064,
    "pixel_count_valid": 59,
    "qa_threshold": 0.75,
    "quality_status": "valid",
    "unit": "mol/m²",
    "measurement_start_time": "2025-03-11T12:19:40+00:00",
    "measurement_end_time": "2025-03-11T13:18:05+00:00",
    "processing_run_id": 14,
    "source_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc"
  }
]
```

**Pravila:** ureditev `value_mean DESC NULLS LAST`, nato `region_name`. Regije z
`no_valid_pixels` (imajo `processing_run_id`, a `value_mean = null`) so vključene
na koncu; regije brez kakršnekoli meritve sprožijo `404`.

**Statusi / napake:**

- `200` uspeh,
- `400` "Provide at least two region_codes to compare.",
- `400` "Compare at most 12 regions in one request.",
- `404` `{ "message": "One or more regions were not found.", "region_codes": [...] }`,
- `404` `{ "message": "No NO2 measurement found for one or more requested regions.", "region_codes": [...] }`,
- `500` "Failed to compare regions."

**Frontend:** kartica primerjave regij; frontend pošlje kode vseh naloženih regij
(`getRegionComparison`). Če je na voljo manj kot 2 regiji, frontend klic izpusti.

---

## 9. Izvoz

### `GET /api/v1/regions/{region_code}/export.csv`

- **Skupina:** Izvoz · **Dostop:** javno
- **Namen:** zadnja NO₂ meritev izbrane regije kot CSV datoteka za prenos.
- **Pot parametri:** `region_code`.
- **Query parametri:** `include_test_region` (bool, privzeto `false`).

```bash
curl -OJ http://localhost:8000/api/v1/regions/SI032/export.csv
```

**Odziv:**

- `Content-Type: text/csv; charset=utf-8`,
- `Content-Disposition: attachment; filename="airwatch-region-<region_code>-latest.csv"`,
  pri čemer je `<region_code>` zapisan z **malimi črkami** (npr.
  `airwatch-region-si032-latest.csv`),
- ena vrstica z glavo + ena vrstica podatkov za trenutno najnovejšo meritev.

Stolpci (vrstni red glave):

```csv
region_code,region_name,region_type,indicator_code,indicator_name,value_mean,value_min,value_max,pixel_count_valid,qa_threshold,quality_status,unit,measurement_start_time,measurement_end_time,processing_run_id,source_product_id,source_product_name
```

**Statusi / napake:**

- `200` uspeh (CSV stream),
- `404` "Region not found.",
- `404` "No NO2 measurement found for the requested region.",
- `500` "Failed to export regional CSV."

**Kdaj je izvoz onemogočen:** strežnik vedno vrne `404`, če regija nima meritve.
V frontendu je gumb "Izvozi CSV" onemogočen, dokler ni izbrane regije z veljavno
meritvijo (`getRegionCsvExportUrl` zgradi URL; gumb je `disabled` brez podatka).

---

## 10. Admin / debug API

### `GET /processing/status`

- **Skupina:** Admin / debug · **Dostop:** interno (Admin/debug stran)
- **Namen:** zadnji processing run + zadnja **uspešna** posodobitev za hitro
  preverjanje podatkovnega toka.
- **Parametri:** brez.

```bash
curl http://localhost:8000/processing/status
```

Primer odgovora `200`:

```json
{
  "id_processing_run": 22,
  "run_status": "success",
  "script_name": "run_latest_no2_pipeline.py",
  "script_version": "0.1.0",
  "qa_threshold": 0.75,
  "started_at": "2025-03-11T13:20:00+00:00",
  "finished_at": "2025-03-11T13:23:00+00:00",
  "error_message": null,
  "source_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937.nc",
  "last_successful_run_id": 22,
  "last_successful_at": "2025-03-11T13:23:00+00:00",
  "last_successful_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937.nc"
}
```

> **Posodobljeno (AIRSLO-103):** odgovor zdaj vključuje polja
> `last_successful_run_id`, `last_successful_at` in `last_successful_product_name`
> (zadnji **uspešni** run; lahko `null`, če uspešnega zagona še ni bilo). Prejšnja
> dokumentacija teh polj ni navajala.

**Statusi:** `200` · `404` "No processing runs found." (v bazi ni nobenega
processing run zapisa).

**Frontend:** Admin/debug stran, glava statusa in povzetek (`getProcessingStatus`;
`404` se obravnava kot prazno stanje).

---

### `GET /processing/history`

- **Skupina:** Admin / debug · **Dostop:** interno (Admin/debug stran)
- **Namen:** zgodovina obdelav za pregled preteklih runov.
- **Query parametri:**
  - `limit` (int, privzeto `20`, dovoljeno `1`–`200`),
  - `offset` (int, privzeto `0`, `>= 0`).

```bash
curl "http://localhost:8000/processing/history?limit=5&offset=0"
```

Primer odgovora `200`:

```json
[
  {
    "id_processing_run": 7,
    "run_status": "success",
    "script_name": "run_latest_no2_pipeline.py",
    "script_version": "0.1.0",
    "qa_threshold": 0.75,
    "started_at": "2025-03-12T08:30:00+00:00",
    "finished_at": "2025-03-12T08:33:00+00:00",
    "error_message": null,
    "source_product_name": "S5P_OFFL_L2__NO2____20250312T062021_20250312T080151.nc",
    "valid_region_count": 12
  }
]
```

- `valid_region_count` je število različnih regij s `pixel_count_valid > 0` v tem
  runu. Urejeno po `COALESCE(finished_at, started_at) DESC`, nato
  `id_processing_run DESC`.

**Statusi:** `200` (prazen seznam, če ni runov – ne vrača `404`).

**Frontend:** Admin/debug seznam zgodovine obdelav (`getProcessingHistory`).

---

### `POST /admin/refresh-latest` — **dormant (privzeto izklopljeno)**

> **needs verification / ni aktivno.** Endpoint je definiran v
> `backend/admin_refresh.py`, vendar njegova registracija v `backend/main.py`
> **ni vključena** (vrstici `from admin_refresh import register_admin_routes` in
> `register_admin_routes(app)` sta zakomentirani). V trenutno delujočem API-ju
> ta pot **ne obstaja** (vrnila bi `404`). Spodnji opis velja šele po aktivaciji
> ob deployu.

- **Skupina:** Admin / refresh · **Dostop:** interno, zaščiteno z žetonom
- **Namen:** ročno sprožiti osvežitev (orkestrator zažene zadnji NO₂ pipeline v
  ozadju).
- **Glava (header):** `X-Admin-Token: <skrivni žeton>` (vrednost iz okoljske
  spremenljivke `ADMIN_REFRESH_TOKEN`; v dokumentaciji namerno ni prikazana).

Pogodba (po aktivaciji):

- `202 Accepted` → `{ "status": "accepted", "detail": "..." }`; rezultat je
  opazljiv prek `latest-measurements` (napreduje najnovejši
  `measurement_end_time`),
- `401` "Invalid admin token." – manjkajoč ali napačen žeton,
- `503` "Admin refresh disabled: ADMIN_REFRESH_TOKEN not set." – žeton ni
  nastavljen (fail-closed; nikoli neavtenticirano).

Aktivacijski predpogoji so opisani v docstringu `backend/admin_refresh.py`
(pipeline skripte v sliki backenda, deps, writable volume itd.).

---

## 11. Legacy endpointi

Ti endpointi so iz zgodnjega Sprinta 1, so še implementirani, vendar jih
**React dashboard ne uporablja**. Ohranjeni so za združljivost in ročno
testiranje. Ne filtrirajo `SI_BBOX` na enak način kot javni `/api/v1` endpointi.

### `GET /` (legacy)

```bash
curl http://localhost:8000/
```

```json
{ "message": "AirWatch API" }
```

### `GET /regions` (legacy)

Vrne **vse** regije iz tabele `region` (vključno s `SI_BBOX` testno regijo) s
`bbox_*` koordinatami. Urejeno po `region_name`.

```bash
curl http://localhost:8000/regions
```

```json
[
  {
    "id_region": 1,
    "region_name": "Slovenia bbox",
    "region_code": "SI_BBOX",
    "region_type": "test_bbox",
    "bbox_lat_min": 45.4,
    "bbox_lat_max": 46.9,
    "bbox_lon_min": 13.4,
    "bbox_lon_max": 16.6
  }
]
```

> Ker `/regions` ne izloča testnih regij, ni primeren za javni dashboard. Javni
> tok uporablja `/api/v1/regions/latest-measurements` in `/api/v1/regions/geometries`.

### `GET /measurements/latest` (legacy)

Vrne zadnjo NO₂ meritev za eno regijo, izbrano z natanko enim selektorjem:
`region_code`, `id_region` ali `fk_region` (alias za `id_region`).

```bash
curl "http://localhost:8000/measurements/latest?region_code=SI_BBOX"
```

**Napake:** `400` (noben ali več kot en selektor), `404` "Region not found.",
`404` "No NO2 measurement found for the requested region.".

> Naslednik v javnem toku je `GET /api/v1/regions/{region_code}`, ki vrne tudi
> geometrijo in sledljivost ter privzeto izloči testne regije.

---

## 12. Preslikava frontend funkcija → endpoint

| Frontend funkcija / komponenta | Endpoint | API odjemalec (`airwatchApi.js`) |
|---|---|---|
| Izbirnik regij (dropdown) | `GET /api/v1/regions/latest-measurements` | `getRegionalLatestMeasurements` |
| Kartica zadnje meritve | `GET /api/v1/regions/{region_code}` | `getRegionDetails` |
| Regionalni zemljevid | `GET /api/v1/regions/geometries` (+ latest-measurements za barve) | `getRegionGeometries` |
| Trend graf + datumski filter | `GET /api/v1/regions/{region_code}/history` | `getRegionHistory` |
| Primerjava regij | `GET /api/v1/regions/compare` | `getRegionComparison` |
| Izvoz CSV | `GET /api/v1/regions/{region_code}/export.csv` | `getRegionCsvExportUrl` |
| Značka svežine (freshness) | izpeljano iz `latest-measurements` (`measurement_end_time`) | `getRegionalLatestMeasurements` |
| Kartica izvora / sledljivost | `GET /api/v1/regions/{region_code}` | `getRegionDetails` |
| Admin/debug status | `GET /processing/status` | `getProcessingStatus` |
| Admin/debug zgodovina | `GET /processing/history` | `getProcessingHistory` |

---

## 13. Primeri curl ukazov za ročno preverjanje

```bash
# Health
curl http://localhost:8000/health

# Javni regionalni dashboard
curl http://localhost:8000/api/v1/regions/latest-measurements
curl http://localhost:8000/api/v1/regions/SI041
curl http://localhost:8000/api/v1/regions/geometries

# Zgodovina / trend (z neobveznim datumskim oknom)
curl "http://localhost:8000/api/v1/regions/SI041/history"
curl "http://localhost:8000/api/v1/regions/SI041/history?start_date=2026-05-01&end_date=2026-05-15"

# Primerjava (potrebni vsaj 2 region_codes)
curl "http://localhost:8000/api/v1/regions/compare?region_codes=SI041&region_codes=SI032"

# Izvoz CSV (z imenom datoteke iz Content-Disposition)
curl -OJ http://localhost:8000/api/v1/regions/SI041/export.csv

# Admin / debug
curl http://localhost:8000/processing/status
curl "http://localhost:8000/processing/history?limit=5"
```

> Kode regij (`SI041`, `SI032`, …) zamenjaj z dejansko `region_code` vrednostjo iz
> `latest-measurements`. Razpoložljivost je odvisna od seed/obdelanih podatkov v
> bazi (**needs verification** v konkretnem okolju).

---

## 14. Kontrolni seznam ročnega preverjanja

- [ ] `GET /health` vrne `{"status":"healthy"}` (`200`).
- [ ] `latest-measurements` vrne slovenske statistične regije (pričakovano do 12,
      odvisno od obdelanih podatkov – **needs verification**).
- [ ] `SI_BBOX` se **ne** pojavi v `latest-measurements`, `geometries`, `compare`,
      `region detail` ali `history` (brez `include_test_region=true`).
- [ ] `region detail` vrne `latest_measurement` in polja sledljivosti
      (`source_product_id`, `processing_run_id`).
- [ ] `geometries` vrne GeoJSON (`Polygon`/`MultiPolygon`) ali `null`.
- [ ] `history` vrne trend vrstice, urejene naraščajoče; datumski filter omeji
      okno.
- [ ] `compare` z 2+ regijami vrne ranžiran seznam (`value_mean DESC NULLS LAST`).
- [ ] `compare` z 1 regijo vrne `400`; z neobstoječo regijo vrne `404` s seznamom
      `region_codes`.
- [ ] `export.csv` prenese datoteko z imenom `airwatch-region-<koda>-latest.csv`.
- [ ] `processing/status` vrne stanje + `last_successful_*` polja; `processing/history`
      vrne sezname runov z `valid_region_count`.
- [ ] Manjkajoče vrednosti so `null`, ne `0`.

---

## 15. Omejitve in opombe

- Endpointi vračajo zadnji **obdelani** Sentinel-5P produkt, ne podatkov v
  realnem času.
- Regije brez kakršnekoli NO₂ meritve niso del `latest-measurements`; frontend ta
  primer obravnava kot "ni še podatkov".
- `POST /admin/refresh-latest` je dokumentiran kot pogodba, a je v trenutni
  konfiguraciji **dormant** (glej §10). Pred uporabo je potrebna aktivacija in
  preverjanje deploy predpogojev.
- Število 12 statističnih regij temelji na seed migraciji `010_seed_statistical_regions`;
  dejansko vrnjeno število je odvisno od obdelanih meritev (**needs verification**).
