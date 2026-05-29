# Slovenian Statistical Region Boundaries

This document records the Sprint 2 boundary-data decision for moving AirWatch SLO from the Sprint 1 test region `SI_BBOX` to real Slovenian statistical regions. This task only covers boundary source discovery and documentation. It does not implement NO2 aggregation, backend endpoint changes, frontend changes, or database loading.

## Decision

For Sprint 2 development, use Eurostat GISCO NUTS 2024 region geometries for Slovenian statistical regions at NUTS 3 level.

This is an official Eurostat source and is directly available as GeoJSON in EPSG:4326, which makes it practical for the Python data pipeline and later PostGIS loading. SURS/STAGE remains the preferred national context source, but GISCO is the selected implementation source for this Sprint because it provides simple, reproducible NUTS boundary downloads with stable NUTS IDs.

## Source

- Source name: Eurostat GISCO NUTS 2024
- Source URL: https://gisco-services.ec.europa.eu/distribution/v2/nuts/nuts-2024-files.html
- Single-file download URL: https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326_LEVL_3.geojson
- Official Eurostat GISCO page: https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics
- Data format: GeoJSON
- CRS: EPSG:4326
- Geometry type: region polygons / multipolygons
- Region level: Slovenian statistical regions, NUTS 3
- Expected number of Slovenian regions: 12
- Downloaded raw file size during local inspection: about 1.5 MB

Eurostat describes NUTS as a hierarchical system with NUTS 3 representing small regions for specific diagnoses. The GISCO distribution API provides NUTS datasets in multiple formats, projections and scales, including GeoJSON and EPSG:4326.

## Why Not Commit The Full Source File

The recommended download file contains all European NUTS3 regions, not only Slovenia. It should be downloaded locally into `data_pipeline/reference_data/regions/raw/` and inspected there. We should avoid committing the full raw GIS file unless the team explicitly decides the size and licensing are appropriate.

A future task can create a small Slovenia-only `processed/slovenia_nuts3_regions_2024.geojson` file after the team confirms licensing and preferred geometry simplification.

## Local Folder Structure

```text
data_pipeline/reference_data/regions/
├── README.md
├── raw/
│   └── .gitkeep
└── processed/
    └── .gitkeep
```

Recommended local raw filename:

```text
data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson
```

Recommended future filtered filename:

```text
data_pipeline/reference_data/regions/processed/slovenia_nuts3_regions_2024.geojson
```

## How To Download Locally

Run from the repository root:

```bash
curl -L \
  "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326_LEVL_3.geojson" \
  -o data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson
```

Do not commit large downloaded GIS source files by default.

## How To Inspect

Run from the repository root:

```bash
python data_pipeline/scripts/inspect_region_boundaries.py \
  --file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson \
  --country-code SI \
  --level 3
```

The script prints:

- total number of features in the file,
- number of filtered Slovenian NUTS3 features,
- available attribute columns,
- region names and codes,
- whether geometries exist,
- whether CRS appears to be EPSG:4326.

The script uses only the Python standard library and does not require a database connection.

## Local Inspection Result

The downloaded GISCO file was inspected locally with the command above.

```text
All features in file: 1345
Filtered features: 12
Country code filter: SI
Level filter: 3
CRS: urn:ogc:def:crs:EPSG::4326
CRS is EPSG:4326: yes
All filtered features have geometry: yes
```

## Expected Fields

Expected fields in the GISCO NUTS dataset:

- `CAPT`
- `CC_STAT`
- `CNTR_CODE`: country code. Use `SI`.
- `COAST_TYPE`: coastal typology.
- `EFTA_STAT`
- `EU_STAT`
- `ISO3_CODE`
- `LEVL_CODE`: NUTS level. Use `3`.
- `MOUNT_TYPE`: mountain typology.
- `NAME_ENGL`
- `NAME_FREN`
- `NAME_GERM`
- `NAME_LATN`: region name in Latin characters.
- `NUTS_ID`: NUTS region code.
- `NUTS_NAME`: region name.
- `SVRG_UN`
- `URBN_TYPE`: urban typology.

Recommended mapping for later database loading:

- `region.region_code`: `NUTS_ID`
- `region.region_name`: `NUTS_NAME`, fallback to `NAME_LATN`
- `region.region_type`: `nuts3`
- `region.geometry`: GeoJSON geometry converted to PostGIS geometry

## Expected Slovenian NUTS3 Regions

The expected Slovenian statistical regions are:

| NUTS ID | Region name |
| --- | --- |
| `SI031` | Pomurska |
| `SI032` | Podravska |
| `SI033` | Koroška |
| `SI034` | Savinjska |
| `SI035` | Zasavska |
| `SI036` | Posavska |
| `SI037` | Jugovzhodna Slovenija |
| `SI038` | Primorsko-notranjska |
| `SI041` | Osrednjeslovenska |
| `SI042` | Gorenjska |
| `SI043` | Goriška |
| `SI044` | Obalno-kraška |

## Limitations

- GISCO boundaries are cartographic/generalized geometries, not necessarily the most detailed cadastral or surveying geometries.
- The selected file is an EU-wide NUTS3 file, so it must be filtered to `CNTR_CODE = SI` and `LEVL_CODE = 3`.
- SURS/STAGE and GURS remain relevant official Slovenian sources. If a later task requires legally authoritative or higher-resolution national boundaries, compare GISCO with SURS/STAGE or GURS before database loading.
- This task does not decide final PostGIS storage strategy. That belongs to `AIRSLO-60 Decide and implement region geometry storage`.

## Follow-Up Tasks Supported

This boundary decision supports:

- `AIRSLO-60 Decide and implement region geometry storage`
- `AIRSLO-59 Load Slovenian region geometries into database`
- `AIRSLO-62 Implement NO2 aggregation by region`
