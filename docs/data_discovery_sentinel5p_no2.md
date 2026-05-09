# Data Discovery: Sentinel-5P NO₂

Dokument za Sprint 1, namenjen zapisu rezultatov prvega pregleda in osnovne obdelave podatkov Copernicus Sentinel-5P NO₂ za projekt AirWatch SLO.

## Namen

Namen pregleda je preveriti, ali lahko iz Copernicus Data Space pridobimo realen Sentinel-5P NO₂ produkt, ga odpremo, pregledamo njegovo strukturo in iz njega izračunamo osnovne statistike NO₂ za območje Slovenije.

Rezultat tega dokumenta je podlaga za nadaljnjo zasnovo baze, podatkovnega pipeline-a in dashboarda.

---

## Iskanje produktov

- Datum izvedbe: 9. 5. 2025
- Ukaz za iskanje:

```bash
python data_pipeline/scripts/search_s5p_no2_products.py --start-date 2025-03-08 --end-date 2025-03-12
```

- Začetni datum iskanja: `2025-03-08`
- Končni datum iskanja: `2025-03-12`
- Območje Slovenije: `lat 45.4–46.9`, `lon 13.4–16.6`
- Načrtovan filter kakovosti: `qa_value >= 0.75`

---

## Najdeni produkti

Primeri najdenih Sentinel-5P OFFL Level 2 NO₂ produktov nad območjem Slovenije:

```text
Name: S5P_OFFL_L2__NO2____20250312T113910_20250312T132040_38407_03_020800_20250314T040215.nc
Product ID: 29c7bd09-38cb-49fe-9785-9efacbee7216
Start date: 2025-03-12T12:00:45.000000Z
End date: 2025-03-12T12:59:08.000000Z

Name: S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
Product ID: b898f30a-1d6e-4c6c-bdc2-9933a06e316e
Start date: 2025-03-11T12:19:40.000000Z
End date: 2025-03-11T13:18:05.000000Z

Name: S5P_OFFL_L2__NO2____20250308T111325_20250308T125456_38350_03_020800_20250310T033030.nc
Product ID: 2c327f1f-9876-4616-972d-bb1b093b797d
Start date: 2025-03-08T11:35:00.000000Z
End date: 2025-03-08T12:33:23.000000Z
```

---

## Prenesen produkt

Za testno obdelavo je bil uporabljen naslednji produkt:

- Product ID: `b898f30a-1d6e-4c6c-bdc2-9933a06e316e`
- Ime datoteke: `S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc`
- Lokalna pot:

```text
data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

- Velikost datoteke: približno `594 MB`
- Format: `NetCDF`
- Opomba: `.nc` datoteke niso vključene v Git repozitorij, ker so dodane v `.gitignore`.

---

## Struktura NetCDF datoteke

Produkt je bil odprt z uporabo knjižnice `xarray` in grupe `PRODUCT`.

Ukaz:

```bash
python data_pipeline/scripts/inspect_s5p_no2_structure.py --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Rezultat pregleda:

```text
Dimensions:
  scanline: 4174
  ground_pixel: 450
  time: 1
  corner: 4
  layer: 34

Coordinates:
  latitude
  longitude

Data variables:
  qa_value
  nitrogendioxide_tropospheric_column
  nitrogendioxide_tropospheric_column_precision
  averaging_kernel
  air_mass_factor_troposphere
  air_mass_factor_total

Required variable check:
  latitude: OK
  longitude: OK
  nitrogendioxide_tropospheric_column: OK
  qa_value: OK
```

### Ključna polja

Za MVP so pomembna naslednja polja:

- `latitude` – geografska širina piksla,
- `longitude` – geografska dolžina piksla,
- `nitrogendioxide_tropospheric_column` – vrednost NO₂,
- `qa_value` – indikator kakovosti podatka.

---

## Statistika NO₂ za območje Slovenije

Za prvi proof of concept je bila uporabljena poenostavljena prostorska omejitev z bounding boxom za Slovenijo.

Uporabljen prostorski filter:

```text
LAT_MIN = 45.4
LAT_MAX = 46.9
LON_MIN = 13.4
LON_MAX = 16.6
```

Uporabljen filter kakovosti:

```text
qa_value >= 0.75
```

Ukaz:

```bash
python data_pipeline/scripts/process_no2_slovenia_bbox.py --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Rezultat:

```text
Valid pixel count: 69
Mean NO2: 3.306649159640074e-05
Min NO2: 1.130456894316012e-05
Max NO2: 5.404165858635679e-05
Unit: mol/m²
```

---

## Vpliv na zasnovo baze

Na podlagi pregleda podatkov potrebujemo predvsem naslednje tabele:

### `source_file`

Hrani podatke o prenesenem Copernicus produktu.

Predvidena polja:

- `id_source_file`
- `fk_data_product`
- `external_product_id`
- `file_name`
- `file_format`
- `file_size_bytes`
- `sensing_start_at`
- `sensing_end_at`
- `download_status`
- `created_at`

### `region_measurement`

Hrani izračunane statistike za regijo in kazalnik.

Predvidena polja:

- `id_region_measurement`
- `fk_region`
- `fk_indicator`
- `fk_source_file`
- `measurement_date`
- `value_mean`
- `value_min`
- `value_max`
- `unit`
- `pixel_count_valid`
- `qa_threshold`
- `quality_status`
- `created_at`

Za Sprint 1 lahko rezultat bounding box obdelave uporabimo kot testno meritev. V Sprintu 2 je treba obdelavo nadgraditi iz slovenskega bounding boxa na agregacijo po statističnih regijah.

---

## Zaključek

Data discovery je uspešen. Potrjeno je, da lahko projekt:

1. pridobi access token za Copernicus Data Space,
2. poišče Sentinel-5P NO₂ produkte nad Slovenijo,
3. prenese realen NetCDF produkt,
4. odpre grupo `PRODUCT`,
5. prebere ključna polja za NO₂,
6. filtrira podatke po območju Slovenije in kakovosti,
7. izračuna osnovne NO₂ statistike.

Ta rezultat potrjuje tehnično izvedljivost osnovnega podatkovnega toka za MVP AirWatch SLO.
