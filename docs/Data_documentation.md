# Data Discovery: Sentinel-5P NO₂

Dokument za Sprint 1, namenjen zapisu rezultatov prvega pregleda in osnovne obdelave podatkov Copernicus Sentinel-5P NO₂ za projekt AirWatch SLO.

## Namen

Namen pregleda je preveriti, ali lahko iz Copernicus Data Space pridobimo realen Sentinel-5P NO₂ produkt, ga odpremo, pregledamo njegovo strukturo in iz njega izračunamo osnovne statistike NO₂ za območje Slovenije.

Rezultat tega dokumenta je podlaga za nadaljnjo zasnovo baze, podatkovnega pipeline-a in dashboarda.

## Izbira Copernicus NO₂ produkta (product choice)

Za Sprint 1/MVP smo izbrali Sentinel-5P TROPOMI NO₂ produkt na procesnem nivoju L2.

### Izbrani produkt

- Product code: `S5P_OFFL_L2__NO2`
- Platform: `Sentinel-5P`
- Instrument: `TROPOMI`
- Processing level: `L2`
- Format: `NetCDF` (`.nc`)
- Group za branje v NetCDF: `PRODUCT`
- Glavna spremenljivka (NO₂): `nitrogendioxide_tropospheric_column`
- Spremenljivka kakovosti: `qa_value`

### Razlogi za izbiro (scope Sprint 1)

- Izbrana je OFFL (offline) varianta, ker je primerna za stabilen MVP tok in ponuja konsistentne rezultate za osnovne statistike po regiji.
- Produkt vsebuje ključne sloje, potrebne za MVP agregacijo: geolokacijo (`latitude`, `longitude`), NO₂ polje in indikator kakovosti.

### Način dostopa

- Vir: Copernicus Data Space Ecosystem (CDSE) katalog in download.
- Avtentikacija: uporabniški račun + pridobitev access tokena (skripta `data_pipeline/scripts/get_copernicus_token.py`).
- Iskanje produktov: `data_pipeline/scripts/search_s5p_no2_products.py` (časovni interval + bbox Slovenije).
- Prenos produkta: `data_pipeline/scripts/download_s5p_no2_product.py --product-id ...`.
- Branje podatkov: `xarray.open_dataset(file, group="PRODUCT")` (zahteva nameščen `netCDF4`).

### Omejitve in tradeoffi

- Velikost datotek: posamezen `.nc` produkt je velik (v praksi ~ 500–700 MB), zato ni primeren za commit v Git in ni primeren za prenos iz browserja.
- OFFL latenca: OFFL produkt ni real-time; na voljo je z zamikom glede na čas zajema (primerno za analitiko, ne pa za takojšnje opozarjanje).
- Geometrija podatkov: produkt je L2 swath (ne nujno regularna mreža); za Sprint 1 je uporabljena poenostavitev z bounding box filtrom, kasneje je potrebna prava prostorska agregacija po regijah.
- Kakovost podatkov: priporočena je filtracija z `qa_value` pragom (v Sprint 1: `qa_value >= 0.75`). Prag neposredno vpliva na število veljavnih pikslov in stabilnost statistike.
- Dostop in omejitve storitve: dostop zahteva CDSE račun; prenos lahko traja in je odvisen od omrežja/omejitev storitve (rate limiting). Skripte zato uporabljajo lokalni, ročno sprožen download.
- Reproducibilnost: za seed/test v Sprint 1 je uporabljen en konkreten prenesen produkt (Product ID je zapisan v dokumentu in seed podatkih), vendar datoteka sama ni del repozitorija.

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

### Sprint 2 izbrani vhodni produkt

Isti produkt je izbran kot fiksni vhod za Sprint 2 regionalno agregacijo po slovenskih statističnih regijah.

Namen izbire je reproducibilnost: regionalno agregacijo bomo najprej razvijali nad že preverjeno Sentinel-5P NO₂ datoteko, preden razširimo pipeline na več produktov ali časovne serije.

Podrobnosti in ukazi za preverjanje/prenos so dokumentirani v:

```text
docs/sprint2_selected_no2_input_product.md
```

### Sprint 3 novejši vhodni produkt

Za AIRSLO-80 je bil izbran novejši OFFL Sentinel-5P NO₂ produkt (`1cee3f1c-b237-4532-9505-d20f9baf7daf`, senzing 2026-05-08T12:03Z–13:01Z), ki je bil obdelan in vnesen v bazo. Sprint 2 produkt ostaja v bazi kot zgodovinski zapis. Dashboard zato prikazuje novejše obdelane regionalne meritve.

Podrobnosti so dokumentirane v:

```text
docs/sprint3_selected_no2_input_product.md
```

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

Strategija za Sprint 2 regionalno agregacijo je dokumentirana v:

```text
docs/regional_no2_aggregation_strategy.md
```

Omejitve Sentinel-5P NO₂ podatkov za regionalno interpretacijo so dokumentirane v:

```text
docs/sentinel5p_regional_interpretation_limitations.md
```

End-to-end navodila za ponovljiv regionalni NO₂ tok (od `.nc` produkta prek
agregacije in validacije do baze, API-ja in frontend preverjanja) so v:

```text
docs/regional_pipeline_runbook.md
```

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
