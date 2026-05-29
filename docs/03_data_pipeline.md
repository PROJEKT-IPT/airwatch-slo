# 03 – Data pipeline

Data pipeline pretvori izbran Sentinel-5P NO₂ produkt v regionalne meritve v
bazi. Skripte so v `data_pipeline/scripts/` (obdelava) in `backend/scripts/`
(vnos v bazo). Pipeline ne prenaša podatkov samodejno – vsak korak se zažene
eksplicitno, ali pa se cela veriga zažene z orkestratorjem.

```text
.nc produkt → crop/filter → QA filter → regionalna agregacija → validacija → vnos v bazo
```

## 1. Izbira in prenos produkta

| Korak | Skripta | Opomba |
|---|---|---|
| Avtentikacija | `get_copernicus_token.py` | preveri poverilnice, ne izpiše celega tokena |
| Iskanje | `search_s5p_no2_products.py` | po časovnem oknu in bbox Slovenije |
| Prenos | `download_s5p_no2_product.py --product-id ...` | prenese en izbran produkt |
| Pregled | `inspect_s5p_no2_structure.py` | preveri NetCDF strukturo pred obdelavo |

- **Produkt:** `S5P_OFFL_L2__NO2` (OFFL, Level 2, NetCDF `.nc`, grupa `PRODUCT`).
- Posamezna datoteka je velika (~600 MB) in se **ne commita**; shrani se v
  `data_pipeline/sample_data/` (gitignored).
- Poverilnice (`COPERNICUS_USERNAME`, `COPERNICUS_PASSWORD`) se berejo iz
  root `.env` in niso del dokumentacije.

Zahtevane spremenljivke v grupi `PRODUCT`: `latitude`, `longitude`,
`nitrogendioxide_tropospheric_column`, `qa_value`.

## 2. Crop / filter za Slovenijo

`crop_filter_no2_slovenia.py` omeji piksle na bounding box Slovenije in uporabi
QA filter. Bounding box: `lat 45.4–46.9`, `lon 13.4–16.6`.

Izhod je le majhen povzetek (število pikslov v bbox pred QA filtrom, število
veljavnih pikslov po filtru, `value_mean/min/max`). Rasterska polja se ne
shranjujejo. Ta korak je predvsem sanity-check pred agregacijo.

## 3. QA filter

- Pravilo: **`qa_value >= 0.75`**.
- Piksli z NaN vrednostjo NO₂ so izločeni.
- Piksli pod pragom niso vključeni v statistiko.

QA prag je pravilo za presejanje kakovosti (odstrani oblačne, snežne in
problematične retrievale), ne znanstveno jamstvo pravilnosti meritve.

## 4. Regionalne meje

- **Vir:** Eurostat GISCO NUTS 2024, Level 3.
- Filter `CNTR_CODE = SI`, `LEVL_CODE = 3` → **12 slovenskih statističnih
  regij**.
- CRS: EPSG:4326 (WGS84).
- GeoJSON je lokalna referenca v `data_pipeline/reference_data/regions/raw/` in
  se **ne commita**.
- Pregled mej: `inspect_region_boundaries.py` (izpiše CRS, število regij,
  atribute).

## 5. Regionalna agregacija

`aggregate_no2_by_region.py` dodeli veljavne piksle regijam in izračuna
statistiko:

- vsak veljaven piksel je obravnavan kot točka `(longitude, latitude)`,
- **point-in-polygon** dodelitev v NUTS3 geometrijo (podpira `Polygon` in
  `MultiPolygon`); piksel se dodeli prvi ustrezni regiji,
- statistika na regijo: `value_mean`, `value_min`, `value_max`,
  `pixel_count_valid`, `quality_status`, `qa_threshold` (`0.75`), `unit`
  (`mol/m²`), časovno okno in podatki o izvoru.

Regija brez veljavnih pikslov dobi `quality_status = no_valid_pixels`,
`pixel_count_valid = 0` in `null` vrednosti, a ostane v izhodu kot obdelan
rezultat. Izhod je JSON z eno vrstico na regijo (12 vrstic).

## 6. Validacija

`validate_regional_no2_output.py` preveri **strukturno doslednost** JSON
izhoda (ne znanstvene pravilnosti):

- pričakovano število regij (privzeto 12), brez podvojenih `region_code`,
- obvezna polja, `unit = mol/m²`, `qa_threshold = 0.75`,
- `quality_status ∈ {valid, no_valid_pixels, processing_error}`,
- pri `valid`: `pixel_count_valid > 0` in `value_min <= value_mean <= value_max`,
- pri `no_valid_pixels`: `pixel_count_valid == 0` in `null` vrednosti.

Neobvezni parametri (`--expected-valid-regions` itd.) omogočajo preverjanje
glede na znan referenčni produkt. Ob napaki skripta vrne izhodni status `1`.

## 7. Vnos v bazo

`backend/scripts/ingest_regional_no2_measurements.py` vnese validiran JSON v
tabelo `region_measurement`:

- naredi **upsert** `source_file`, `processing_run` in `region_measurement`,
- regije morajo že obstajati (najprej `backend/scripts/load_regions.py`),
- **idempotentno** prek `ON CONFLICT ... DO UPDATE` – ponoven zagon ne podvaja
  zapisov.

Po vnosu so podatki vidni prek `/api/v1/regions/latest-measurements`.

## Orkestrator (cela veriga naenkrat)

```bash
python data_pipeline/scripts/run_latest_no2_pipeline.py
```

Zažene iskanje → prenos → agregacijo → validacijo → vnos → preverjanje API-ja za
najnovejši razpoložljiv OFFL produkt nad Slovenijo. Je idempotenten (če je
najnovejši produkt že vnesen, se konča brez sprememb). Uporabne zastavice:
`--dry-run`, `--start-date` / `--end-date`, `--product-id`, `--force`.

Skripta sama ne razporeja. Za dnevno osveževanje obstaja wrapper z launchd /
systemd / cron – glej `data_pipeline/automation/README.md`.

## Testi

```bash
python -m pip install -r data_pipeline/requirements-dev.txt
python -m pytest data_pipeline/tests
```

Testi uporabljajo sintetične podatke in ne zahtevajo poverilnic, omrežja, prave
`.nc` datoteke ali baze. Preverjajo programsko logiko, ne znanstvene točnosti.

