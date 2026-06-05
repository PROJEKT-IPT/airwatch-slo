# Meje slovenskih statističnih regij

Ta mapa je namenjena referenčnim podatkom o mejah regij, ki jih uporablja
data pipeline projekta AirWatch SLO.

## Izbrani vir

Kot razvojni vir za slovenske statistične regije se uporabljajo geometrije
regij Eurostat GISCO NUTS 2024.

- Ime vira: Eurostat GISCO NUTS 2024
- Družina podatkovnih nizov: Territorial units for statistics (NUTS)
- Raven regij: NUTS 3, slovenske statistične regije
- Pričakovani filter države: `CNTR_CODE = SI`
- Pričakovani filter ravni: `LEVL_CODE = 3`
- Pričakovano število slovenskih regij: 12
- Prednostni format: GeoJSON
- Prednostni CRS: EPSG:4326
- Tip geometrije: MultiPolygon / Polygon geometrije regij

Priporočeni URL vira:

```text
https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326_LEVL_3.geojson
```

Celotni NUTS 3 GeoJSON vsebuje vse evropske NUTS3 regije. To datoteko hranite
lokalno v `raw/` in je ne commitajte, razen če se ekipa namerno odloči, da je
dovolj majhna in uporabna za hranjenje v sistemu za nadzor različic.

## Lokalna razporeditev datotek

```text
data_pipeline/reference_data/regions/
├── raw/
│   └── NUTS_RG_20M_2024_4326_LEVL_3.geojson
└── processed/
    └── slovenia_nuts3_regions_2024.geojson
```

`raw/` je za prenesene izvorne datoteke. `processed/` je za prihodnjo
filtrirano datoteko samo s slovenskimi regijami.

## Polja za kasnejšo uporabo

- `region_name`: uporabi `NUTS_NAME`; po potrebi `NAME_LATN`.
- `region_code`: uporabi `NUTS_ID`, na primer `SI041`.
- `region_type`: uporabi `nuts3` ali `statistical_region`.
- `geometry`: uporabi GeoJSON geometrijo po potrditvi, da je CRS EPSG:4326.

## Pregled

Po lokalnem prenosu datoteke jo preglej z:

```bash
python data_pipeline/scripts/inspect_region_boundaries.py \
  --file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson \
  --country-code SI \
  --level 3
```

Ta skripta ne potrebuje povezave do baze.
