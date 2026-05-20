# AirWatch SLO API Dokumentacija

Ta dokument opisuje trenutno implementirane FastAPI endpoint-e za AirWatch SLO MVP. API uporablja podatke iz PostgreSQL/PostGIS baze, napolnjene z Alembic migracijami in Sprint 1 seed podatki za Sentinel-5P NO2.

## Osnovne Informacije

Privzeti lokalni naslov API-ja:

```text
http://localhost:8000
```

Interaktivna FastAPI dokumentacija:

```text
http://localhost:8000/docs
```

OpenAPI shema:

```text
http://localhost:8000/openapi.json
```

## Zagon Backend API-ja

Priporočen zagon z Dockerjem:

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose up --build backend
```

Lokalni zagon iz mape `backend/`:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend bere konfiguracijo baze iz root `.env`. Za lokalno Docker okolje je glavni vir gesla `POSTGRES_PASSWORD`.

## Endpoint: Health Check

Preveri, ali backend deluje.

```http
GET /health
```

Primer:

```bash
curl http://localhost:8000/health
```

Uspešen odgovor:

```json
{
  "status": "healthy"
}
```

## Endpoint: Root

Vrne osnovno sporočilo API-ja.

```http
GET /
```

Primer:

```bash
curl http://localhost:8000/
```

Uspešen odgovor:

```json
{
  "message": "AirWatch API"
}
```

## Endpoint: Seznam Regij

Vrne seznam regij, ki jih lahko uporabnik izbere v dashboardu.

```http
GET /regions
```

Primer:

```bash
curl http://localhost:8000/regions
```

Primer odgovora:

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

### Polja Odgovora

- `id_region`: interni ID regije v bazi.
- `region_name`: prikazno ime regije.
- `region_code`: kratka oznaka regije, na primer `SI_BBOX`.
- `region_type`: tip regije, na primer `test_bbox`.
- `bbox_lat_min`, `bbox_lat_max`, `bbox_lon_min`, `bbox_lon_max`: koordinatni okvir regije.

## Endpoint: Zadnja NO2 Meritev

Vrne najnovejšo NO2 meritev za izbrano regijo. Regijo lahko izberemo z `region_code`, `id_region` ali z aliasom `fk_region`.

```http
GET /measurements/latest?region_code=SI_BBOX
```

ali:

```http
GET /measurements/latest?id_region=1
```

ali:

```http
GET /measurements/latest?fk_region=1
```

Primer z `region_code`:

```bash
curl "http://localhost:8000/measurements/latest?region_code=SI_BBOX"
```

Primer z `id_region`:

```bash
curl "http://localhost:8000/measurements/latest?id_region=1"
```

Primer z `fk_region`:

```bash
curl "http://localhost:8000/measurements/latest?fk_region=1"
```

Primer odgovora:

```json
{
  "id_region": 1,
  "region_code": "SI_BBOX",
  "region_name": "Slovenia bbox",
  "indicator_code": "NO2",
  "indicator_name": "Nitrogen dioxide",
  "value_mean": 0.00003306649159640074,
  "value_min": 0.00001130456894316012,
  "value_max": 0.00005404165858635679,
  "pixel_count_valid": 69,
  "qa_threshold": 0.75,
  "quality_status": "valid",
  "unit": "mol/m²",
  "measurement_start_time": "2025-03-11T12:19:40+00:00",
  "measurement_end_time": "2025-03-11T13:18:05+00:00",
  "source_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc",
  "data_source_name": "Copernicus Data Space"
}
```

### Query Parametri

- `region_code`: oznaka regije, na primer `SI_BBOX`.
- `id_region`: interni ID regije v bazi.
- `fk_region`: alias za interni ID regije, uporaben pri povezavi z imeni stolpcev v tabelah.

Uporabi se natanko en parameter. Če je poslanih več selectorjev ali nobeden, API vrne napako `400`.

### Polja Odgovora

- `id_region`, `region_code`, `region_name`: regija, za katero je bila meritev izračunana.
- `indicator_code`, `indicator_name`: kazalnik kakovosti zraka. V Sprintu 1 je to `NO2`.
- `value_mean`: povprečna NO2 vrednost.
- `value_min`: najmanjša NO2 vrednost med veljavnimi piksli.
- `value_max`: največja NO2 vrednost med veljavnimi piksli.
- `pixel_count_valid`: število veljavnih pikslov po filtriranju.
- `qa_threshold`: uporabljen prag kakovosti, trenutno `0.75`.
- `quality_status`: status kakovosti obdelane meritve.
- `unit`: enota meritve, trenutno `mol/m²`.
- `measurement_start_time`, `measurement_end_time`: časovni interval satelitske meritve.
- `source_product_name`: ime Sentinel-5P izvorne datoteke.
- `data_source_name`: ime vira podatkov.

## Napake

Če ni podan noben selector regije:

```json
{
  "detail": "Provide one region selector: region_code, id_region, or fk_region."
}
```

Status:

```text
400 Bad Request
```

Če sta podana oba selectorja:

```json
{
  "detail": "Provide only one region selector: region_code, id_region, or fk_region."
}
```

Status:

```text
400 Bad Request
```

Če regija ne obstaja:

```json
{
  "detail": "Region not found."
}
```

Status:

```text
404 Not Found
```

Če za regijo ne obstaja NO2 meritev:

```json
{
  "detail": "No NO2 measurement found for the requested region."
}
```

Status:

```text
404 Not Found
```

## Endpoint: Processing Status

Vrne zadnji zapis obdelave podatkov za admin/debug preverjanje.

```http
GET /processing/status
```

Primer:

```bash
curl http://localhost:8000/processing/status
```

Primer odgovora:

```json
{
  "id_processing_run": 1,
  "run_status": "success",
  "script_name": "process_no2_slovenia_bbox.py",
  "script_version": "sprint_1_poc",
  "qa_threshold": 0.75,
  "started_at": "2025-03-11T13:30:00+00:00",
  "finished_at": "2025-03-11T13:32:00+00:00",
  "error_message": null,
  "source_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc"
}
```

Če v bazi še ni zapisov obdelave:

```json
{
  "detail": "No processing runs found."
}
```

Status:

```text
404 Not Found
```

## Trenutni Sprint 1 Podatki

Sprint 1 seed data vsebuje testno regijo:

```text
region_code = SI_BBOX
region_name = Slovenia bbox
```

Potrjena zadnja meritev:

```text
value_mean = 0.00003306649159640074
value_min = 0.00001130456894316012
value_max = 0.00005404165858635679
pixel_count_valid = 69
unit = mol/m²
```

Ti endpointi predstavljajo osnovo za dashboard funkcije: izbira regije, prikaz zadnje NO2 meritve, osnovne statistike in prikaz vira podatkov.

## Endpoint: Latest Regional NO2 Measurements

Vrne najnovejso razpolozljivo `NO2` meritev za vsako slovensko statisticno regijo.

```http
GET /api/v1/regions/latest-measurements
```

Primer:

```bash
curl http://localhost:8000/api/v1/regions/latest-measurements
```

Primer odgovora:

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

Pravila filtriranja:

- vkljucene so samo regije z `region_type = statistical_region`,
- `SI_BBOX` in druge testne regije so izkljucene iz javnega pregleda,
- regije brez `NO2` meritve niso vrnjene,
- rezultat je deterministicno urejen po `region_code`.

Pravila za izbor "latest" meritve:

- primarni kriterij je `measurement_end_time DESC`,
- pri izenacenju sledi `measurement_start_time DESC`,
- zadnji tie-breaker je `id_region_measurement DESC`.
- backend uporablja temu vrstnemu redu usklajene sestavljene indekse, da so
  pogoste regionalne poizvedbe deterministicne in hitrejse.

## Endpoint: Regional Geometries

Vrne geometrije vseh slovenskih statisticnih regij v enem klicu za prikaz na
zemljevidu.

```http
GET /api/v1/regions/geometries
```

Primer:

```bash
curl http://localhost:8000/api/v1/regions/geometries
```

Primer odgovora:

```json
[
  {
    "region_code": "SI032",
    "region_name": "Podravska",
    "region_type": "statistical_region",
    "geometry": {
      "type": "MultiPolygon",
      "coordinates": []
    }
  }
]
```

Opombe:

- endpoint vrne samo regije z `region_type = statistical_region`,
- `SI_BBOX` in druge testne regije niso vkljucene,
- rezultat je urejen po `region_code`,
- `geometry` se vrne kot GeoJSON objekt, ce je v bazi na voljo.

## Endpoint: Region Details

Vrne metapodatke regije in njeno najnovejso `NO2` meritev.

```http
GET /api/v1/regions/{region_code}
```

Primer:

```bash
curl http://localhost:8000/api/v1/regions/SI032
```

Primer odgovora:

```json
{
  "region_code": "SI032",
  "region_name": "Podravska",
  "region_type": "statistical_region",
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": []
  },
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

Opombe:

- endpoint privzeto vrne samo statisticne regije,
- za testne regije je potreben `?include_test_region=true`,
- ce regija ne obstaja, API vrne `404 Region not found.`,
- ce regija obstaja, a nima `NO2` meritve, API vrne
  `404 No NO2 measurement found for the requested region.`,
- `geometry` se vrne kot GeoJSON objekt, ce je v bazi na voljo,
- prostorski dostop do `geometry` je pripravljen za PostGIS `GIST` indeks.

## Endpoint: Region NO2 History

Vrne zgodovinske `NO2` meritve za izbrano statisticno regijo. Endpoint je
namenjen trend grafu za eno regijo in vrne vse obdelane regionalne rezultate,
vkljucno z vrsticami `quality_status = no_valid_pixels`, kjer so vrednosti
meritve `null`.

```http
GET /api/v1/regions/{region_code}/history
```

Primer:

```bash
curl http://localhost:8000/api/v1/regions/SI032/history
```

Primer odgovora:

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

Pravila:

- endpoint privzeto vrne samo regije z `region_type = statistical_region`,
- testne regije, kot je `SI_BBOX`, niso izpostavljene brez
  `?include_test_region=true`,
- meritve so urejene od najstarejse do najnovejse po `measurement_end_time`,
  nato `measurement_start_time`, nato `id_region_measurement`,
- vrstice z `no_valid_pixels` ostanejo v zgodovini kot obdelani rezultati,
- ce regija ne obstaja, API vrne `404 Region not found.`,
- ce regija obstaja, a nima zgodovinskih `NO2` meritev, API vrne
  `404 No NO2 measurement history found for the requested region.`.

## Endpoint: Region Comparison

Vrne najnovejse `NO2` meritve za dve do dvanajst izbranih statisticnih regij,
urejene od najvisje do najnizje vrednosti. Regije brez veljavnih pikslov so
vkljucene kot obdelani rezultati z `quality_status = no_valid_pixels` in
`value_mean = null`.

```http
GET /api/v1/regions/compare?region_codes=SI032&region_codes=SI036
```

Primer:

```bash
curl "http://localhost:8000/api/v1/regions/compare?region_codes=SI032&region_codes=SI036"
```

Endpoint sprejme tudi vejicno locen seznam:

```bash
curl "http://localhost:8000/api/v1/regions/compare?region_codes=SI032,SI036"
```

Primer odgovora:

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
    "unit": "mol/mÂ²",
    "measurement_start_time": "2025-03-11T12:19:40+00:00",
    "measurement_end_time": "2025-03-11T13:18:05+00:00",
    "processing_run_id": 14,
    "source_product_name": "S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc"
  }
]
```

Pravila:

- `region_codes` je obvezen in mora vsebovati vsaj dve razlicni regiji,
- v enem klicu je dovoljenih najvec dvanajst regij,
- privzeto so dovoljene samo regije z `region_type = statistical_region`,
- testne regije, kot je `SI_BBOX`, niso javno izpostavljene brez
  `?include_test_region=true`,
- ce katera izmed zahtevanih regij ne obstaja ali ni javna, API vrne `404`,
- ce katera izmed zahtevanih regij se nima `NO2` meritve, API vrne `404`.

## Endpoint: Region CSV Export

Vrne najnovejso `NO2` meritev za izbrano regijo kot CSV datoteko za prenos.

```http
GET /api/v1/regions/{region_code}/export.csv
```

Primer:

```bash
curl -OJ http://localhost:8000/api/v1/regions/SI032/export.csv
```

Primer vsebine CSV:

```csv
region_code,region_name,region_type,indicator_code,indicator_name,value_mean,value_min,value_max,pixel_count_valid,qa_threshold,quality_status,unit,measurement_start_time,measurement_end_time,processing_run_id,source_product_id,source_product_name
SI032,Podravska,statistical_region,NO2,Nitrogen dioxide,0.000031,0.000012,0.000052,41,0.75,valid,mol/m²,2025-03-11T12:19:40+00:00,2025-03-11T13:18:05+00:00,14,b898f30a-1d6e-4c6c-bdc2-9933a06e316e,S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Opombe:

- endpoint vrne eno CSV vrstico za trenutno najnovejso `NO2` meritev izbrane regije,
- ime datoteke je v obliki `airwatch-region-{region_code}-latest.csv`,
- za testne regije je potreben `?include_test_region=true`,
- ce regija ne obstaja, API vrne `404 Region not found.`,
- ce regija obstaja, a nima `NO2` meritve, API vrne
  `404 No NO2 measurement found for the requested region.`.

## Omejitve in predpostavke

- Endpointa trenutno vracata samo najnovejso `NO2` meritev. Zgodovinski grafi in
  trende bodo gradili nadaljnji endpointi na istem modelu `region_measurement`.
- Regije brez podatkov niso del `latest-measurements` seznama. Frontend mora ta
  primer obravnavati kot "ni se podatkov".
- Javni regionalni overview namerno ne prikazuje `SI_BBOX`, ker gre za Sprint 1
  testno regijo in ne za statistično regijo Slovenije.
