# AirWatch SLO – Data pipeline

Skripte za odkrivanje in obdelavo podatkov Sentinel-5P NO₂ iz Copernicus Data
Space Ecosystema.

Skripte ničesar ne prenašajo samodejno. Ponujajo lokalne ukaze za avtentikacijo,
iskanje produktov nad Slovenijo, prenos enega izbranega produkta, pregled
strukture NetCDF datoteke in izračun začetnih NO₂ statistik za omejitveni
pravokotnik (bbox) Slovenije.

## Priprava

Ustvarite `.env` v korenu repozitorija:

```env
COPERNICUS_USERNAME=your_email_here
COPERNICUS_PASSWORD=your_password_here
```

Namestite Python odvisnosti:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install requests python-dotenv xarray numpy netCDF4
```

`netCDF4` potrebuje xarray za odpiranje skupin Sentinel-5P NetCDF z
`group="PRODUCT"`.

## Konstante za območje Slovenije

- Zemljepisna širina: `45.4` do `46.9`
- Zemljepisna dolžina: `13.4` do `16.6`
- Začetni kakovostni filter: `qa_value >= 0.75`
- Potrebne NetCDF spremenljivke: `latitude`, `longitude`, `nitrogendioxide_tropospheric_column`, `qa_value`

## Ukazi za zagon

Preveri, da poverilnice delujejo, brez izpisa celotnega žetona:

```bash
python data_pipeline/scripts/get_copernicus_token.py
```

Iskanje produktov nad Slovenijo:

```bash
python data_pipeline/scripts/search_s5p_no2_products.py --start-date 2024-01-01 --end-date 2024-01-31
```

Prenos enega izbranega produkta:

```bash
python data_pipeline/scripts/download_s5p_no2_product.py --product-id PRODUCT_UUID_FROM_SEARCH
```

Pregled skupine PRODUCT v preneseni NetCDF datoteki:

```bash
python data_pipeline/scripts/inspect_s5p_no2_structure.py --file data_pipeline/sample_data/YOUR_PRODUCT.nc
```

Izračun NO₂ statistik za bbox Slovenije:

```bash
python data_pipeline/scripts/process_no2_slovenia_bbox.py --file data_pipeline/sample_data/YOUR_PRODUCT.nc
```

Omejitev/filtriranje izbranega produkta na bbox Slovenije in uporaba NO₂ QA filtra:

```bash
python data_pipeline/scripts/crop_filter_no2_slovenia.py \
  --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Po želji shrani kratek JSON povzetek:

```bash
python data_pipeline/scripts/crop_filter_no2_slovenia.py \
  --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc \
  --output data_pipeline/outputs/no2_crop_filter/slovenia_no2_crop_filter_summary.json
```

Agregacija veljavnih NO₂ pikslov po slovenskih statističnih regijah (NUTS3):

```bash
python data_pipeline/scripts/aggregate_no2_by_region.py \
  --no2-file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc \
  --regions-file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson \
  --output data_pipeline/outputs/no2_by_region/regional_no2_results.json \
  --source-product-id b898f30a-1d6e-4c6c-bdc2-9933a06e316e \
  --measurement-start-time 2025-03-11T12:19:40Z \
  --measurement-end-time 2025-03-11T13:18:05Z
```

Validacija ustvarjenega regionalnega NO₂ izhoda:

```bash
python data_pipeline/scripts/validate_regional_no2_output.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results.json \
  --expected-valid-regions 8 \
  --expected-no-data-regions 4 \
  --expected-assigned-valid-pixels 46
```

Zagon lahkih pipeline testov:

```bash
python -m pip install -r data_pipeline/requirements-dev.txt
python -m pytest data_pipeline/tests
```

Testi uporabljajo sintetične matrike, poligone in začasne JSON datoteke. Ne
potrebujejo Copernicus poverilnic, omrežnega dostopa, prave `.nc` datoteke ali
povezave do baze. Več podrobnosti je v [`docs/archive/pipeline_tests.md`](../docs/archive/pipeline_tests.md).

## Zagon celotne verige na najnovejšem razpoložljivem OFFL produktu

Ko Docker teče in so migracije izvedene, orkestratorska skripta zažene celotno
verigo (iskanje → prenos → agregacija → validacija → vnos → preverjanje API-ja)
za najnovejši razpoložljivi Sentinel-5P OFFL NO₂ produkt nad Slovenijo:

```bash
python data_pipeline/scripts/run_latest_no2_pipeline.py
```

Skripta je idempotentna — če je najnovejši produkt že vnešen, se zaključi čisto,
brez dotikanja baze. Uporabite `--dry-run` za predogled kandidata brez prenosa,
`--start-date` / `--end-date` za razširitev iskalnega okna, `--product-id` za
prisilo določenega UUID-ja in `--force` za ponoven vnos že prisotnega produkta.
Skripta sama ne razporeja zagonov; za periodični zagon jo ovijte v cron /
launchd / GitHub Actions.

## Varnost podatkov

Ne commitajte `.env`, `.nc`, `.zip` ali prenesenih Copernicus produktov. Mapa
`sample_data/` je ignorirana, razen `.gitkeep`.
