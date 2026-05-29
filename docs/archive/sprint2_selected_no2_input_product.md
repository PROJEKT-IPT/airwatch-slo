# Sprint 2 Selected NO2 Input Product

This document records the selected Sentinel-5P NO2 product that will be used as the fixed input file for Sprint 2 regional aggregation work.

No regional aggregation is implemented in this task. The purpose is only to document and standardize the input product for later processing.

## Selected Product

- Product ID: `b898f30a-1d6e-4c6c-bdc2-9933a06e316e`
- Product name: `S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc`
- Product type: Sentinel-5P OFFL L2 NO2
- Format: NetCDF (`.nc`)
- NetCDF group for processing: `PRODUCT`
- Sensing start: `2025-03-11T12:19:40Z`
- Sensing end: `2025-03-11T13:18:05Z`
- File size from Copernicus metadata: `622854144` bytes
- Approximate local file size: `594 MB`

## Expected Local Path

The product should be present locally at:

```text
data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

The `.nc` file must not be committed to Git. The `data_pipeline/sample_data/` folder is ignored except for `.gitkeep`.

## Purpose For Sprint 2

This file is the selected fixed input for the next regional-processing tasks. It should be used together with Slovenian statistical region boundaries to implement and verify regional NO2 aggregation.

The file was already validated in Sprint 1:

- the NetCDF `PRODUCT` group opens successfully,
- required variables exist: `latitude`, `longitude`, `nitrogendioxide_tropospheric_column`, `qa_value`,
- the Slovenia bbox proof of concept produced valid NO2 statistics,
- `qa_value >= 0.75` was used as the initial quality threshold.

Using one fixed input product keeps Sprint 2 reproducible while the team implements geometry handling and regional aggregation.

## If The File Is Missing

First ensure `.env` contains Copernicus credentials:

```env
COPERNICUS_USERNAME=your_email_here
COPERNICUS_PASSWORD=your_password_here
```

Then download the product with the existing script:

```bash
python data_pipeline/scripts/download_s5p_no2_product.py \
  --product-id b898f30a-1d6e-4c6c-bdc2-9933a06e316e
```

Expected output location:

```text
data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

## Verify The Local File

Run from the repository root:

```bash
test -f data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc && \
ls -lh data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Optional structure check:

```bash
python data_pipeline/scripts/inspect_s5p_no2_structure.py \
  --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

## Later Tasks

This selected input product supports the upcoming Sprint 2 work:

- load Slovenian statistical region geometries,
- decide final geometry storage,
- aggregate NO2 values by region,
- store regional measurements in `region_measurement`.
