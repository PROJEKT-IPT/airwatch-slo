# AirWatch SLO – Baza podatkov

Ta mapa vsebuje dokumentacijo baze in starejše (legacy) SQL skripte za
inicializacijo. Backend zdaj kot primarni način ustvarjanja in posodabljanja
sheme uporablja Alembic migracije.

## SQL datoteke

- `init/001_create_extensions.sql` omogoči PostGIS z `CREATE EXTENSION IF NOT EXISTS postgis;`.
- `init/002_create_tables.sql` ustvari osrednje MVP tabele iz potrjenega ER diagrama: `region`, `indicator`, `data_source`, `data_product`, `source_file`, `processing_run` in `region_measurement`.
- `init/003_seed_initial_data.sql` idempotentno vstavi začetne (seed) podatke: bbox Slovenije, indikator NO₂, vir Copernicus Data Space, produkt Sentinel-5P NO₂, en zapis prenesene datoteke, en uspešen processing run in eno obdelano regionalno NO₂ meritev.

## Alembic migracije

Alembic migracije so v `backend/alembic/versions/` in jih uporabljamo za običajen
razvoj backenda.

Za lokalni razvoj z Dockerjem je geslo PostgreSQL kontejnerja določeno s
`POSTGRES_PASSWORD` v korenskem `.env`. Backend kontejner in Alembic migracije
prav tako uporabljajo `POSTGRES_PASSWORD` kot edini vir resnice. `DATABASE_PASSWORD`
Alembic ne uporablja, ker se lahko razlikuje od dejanskega gesla, uporabljenega
ob inicializaciji storitve `db`.

Ko se Alembic zažene z gostitelja z `cd backend && alembic upgrade head`, naloži
korenski `.env` in se poveže z:

```text
postgresql://POSTGRES_USER:POSTGRES_PASSWORD@127.0.0.1:5432/POSTGRES_DB
```

Pred povezavo Alembic izpiše gostitelja, vrata, bazo in uporabnika, nikoli pa
gesla.

Vrstni red migracij:

1. `001_create_region.py`
2. `002_create_indicator.py`
3. `003_create_data_source.py`
4. `004_create_data_product.py`
5. `005_create_source_file.py`
6. `006_create_processing_run.py`
7. `007_create_region_measurement.py`
8. `008_seed_sprint_1_initial_data.py`
9. `009_region_geometry_postgis.py`
10. `010_seed_statistical_regions.py`
11. `011_optimize_regional_queries.py`

`011_optimize_regional_queries.py` doda:

- sestavljen indeks `region(region_type, region_code)` za javne regijske filtre,
- delni PostGIS `GIST` indeks na `region.geometry` za prostorske poizvedbe,
- dva sestavljena indeksa na `region_measurement`, usklajena z vzorci dostopa
  "zadnji NO₂ na regijo", ki jih uporablja backend.

## Vnos regionalnih NO₂ podatkov

Alembic ostaja vir sprememb sheme. Za vnos regionalnih NO₂ podatkov ni potrebna
nova migracija, ker obstoječe tabele že podpirajo eno vrstico `region_measurement`
na regijo, indikator, izvorno datoteko in processing run.

Naloži slovenske statistične regije (NUTS3) iz lokalne GISCO GeoJSON datoteke:

```bash
python backend/scripts/load_regions.py \
  --regions-file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson
```

Vnesi validiran regionalni NO₂ izhod:

```bash
python backend/scripts/ingest_regional_no2_measurements.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results.json
```

Ukazi, prijazni Dockerju:

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose run --rm \
  -v ./data_pipeline:/data_pipeline:ro \
  backend python scripts/load_regions.py \
  --regions-file /data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson
docker compose run --rm \
  -v ./data_pipeline:/data_pipeline:ro \
  backend python scripts/ingest_regional_no2_measurements.py \
  --file /data_pipeline/outputs/no2_by_region/regional_no2_results.json
```

Vnos je idempotenten. Ponovno uporabi `region.region_code`,
`source_file.external_product_id`, pravilo edinstvenosti `processing_run` in
pravilo edinstvenosti `region_measurement`, da posodobi obstoječe vrstice
namesto ustvarjanja dvojnikov.

Preveri naložene regije:

```sql
SELECT region_code, region_name, region_type
FROM region
ORDER BY region_code;
```

Preveri regionalne NO₂ meritve:

```sql
SELECT r.region_code, r.region_name, rm.value_mean, rm.value_min, rm.value_max,
       rm.pixel_count_valid, rm.quality_status, rm.unit
FROM region_measurement rm
JOIN region r ON r.id_region = rm.fk_region
ORDER BY r.region_code;
```

Preveri povzetek:

```sql
SELECT rm.quality_status,
       COUNT(*) AS region_count,
       SUM(rm.pixel_count_valid) AS assigned_valid_pixels
FROM region_measurement rm
JOIN processing_run pr ON pr.id_processing_run = rm.fk_processing_run
WHERE pr.script_name = 'aggregate_no2_by_region.py'
  AND pr.script_version = 'sprint_2_regional'
GROUP BY rm.quality_status
ORDER BY rm.quality_status;
```

Namesti backend odvisnosti:

```bash
cd backend
pip install -r requirements.txt
```

Zaženi vse migracije znotraj backend Docker storitve:

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
```

Razveljavi eno migracijo:

```bash
docker compose run --rm backend alembic downgrade -1
```

Preveri trenutno migracijo:

```bash
docker compose run --rm backend alembic current
```

Preveri ustvarjene tabele v PostgreSQL:

```bash
docker exec -it airwatch_db psql -U postgres -d airwatch -c "\\dt"
```

Preveri začetno meritev:

```bash
docker exec -it airwatch_db psql -U postgres -d airwatch -c "SELECT rm.value_mean, rm.value_min, rm.value_max, rm.pixel_count_valid, rm.unit FROM region_measurement rm;"
```

Če lokalni `.env` uporablja drugačen `POSTGRES_USER` ali `POSTGRES_DB`, v teh
ukazih zamenjajte `postgres` in `airwatch`. Ko Alembic teče znotraj backend Docker
storitve, se poveže na bazo na `db:5432`. Backend vrednost `DATABASE_PASSWORD`
izhaja iz `POSTGRES_PASSWORD`, kar ustreza geslu za inicializacijo storitve `db`.

## Lokalni zagon z Docker PostgreSQL

Zaženi bazni kontejner:

```bash
docker compose up -d db
```

Storitev `db` inicializira PostgreSQL s `POSTGRES_PASSWORD`. Konfiguracijo
backenda in migracij usklajujte s to spremenljivko.

Prednostna pot je Alembic. Surove SQL skripte je po potrebi še vedno mogoče
zagnati ročno:

```bash
docker exec -i airwatch_db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-airwatch}" < database/init/001_create_extensions.sql
docker exec -i airwatch_db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-airwatch}" < database/init/002_create_tables.sql
docker exec -i airwatch_db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-airwatch}" < database/init/003_seed_initial_data.sql
```

Če lupina nima naloženih `POSTGRES_USER` in `POSTGRES_DB`, uporabite privzete
vrednosti iz `docker-compose.yml`:

```bash
docker exec -i airwatch_db psql -U postgres -d airwatch < database/init/001_create_extensions.sql
docker exec -i airwatch_db psql -U postgres -d airwatch < database/init/002_create_tables.sql
docker exec -i airwatch_db psql -U postgres -d airwatch < database/init/003_seed_initial_data.sql
```

## Začetni (seed) podatki

Začetni podatki predstavljajo prvi dokaz koncepta Sentinel-5P NO₂ za Slovenijo.
Hranijo eno testno bbox regijo, indikator NO₂ v `mol/m²`, metapodatke vira
Copernicus, metapodatke produkta Sentinel-5P OFFL L2 NO₂, eno izvorno datoteko,
en uspešen processing run z `qa_threshold = 0.75` in eno regionalno meritev s
povprečjem, minimumom, maksimumom in številom veljavnih pikslov.

Ti podatki podpirajo osnovni tok MVP nadzorne plošče: izbira regije, poizvedba po
zadnji NO₂ meritvi, prikaz metapodatkov vira ter kasneje zgodovinski trendi in
primerjava regij.
