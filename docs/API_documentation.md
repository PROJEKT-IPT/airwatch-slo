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

Vrne najnovejšo NO2 meritev za izbrano regijo. Regijo lahko izberemo z `region_code` ali z `id_region`.

```http
GET /measurements/latest?region_code=SI_BBOX
```

ali:

```http
GET /measurements/latest?id_region=1
```

Primer z `region_code`:

```bash
curl "http://localhost:8000/measurements/latest?region_code=SI_BBOX"
```

Primer z `id_region`:

```bash
curl "http://localhost:8000/measurements/latest?id_region=1"
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

Uporabi se natanko en parameter. Če sta poslana oba ali nobeden, API vrne napako `400`.

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
  "detail": "Provide either region_code or id_region."
}
```

Status:

```text
400 Bad Request
```

Če sta podana oba selectorja:

```json
{
  "detail": "Provide only one region selector: region_code or id_region."
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
