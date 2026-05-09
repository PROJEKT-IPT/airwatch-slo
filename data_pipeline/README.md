# AirWatch SLO Data Pipeline

Sprint 1 data discovery scripts for Sentinel-5P NO2 products from the Copernicus Data Space Ecosystem.

These scripts do not download anything automatically. They give you local commands to authenticate, search products over Slovenia, download one selected product, inspect the NetCDF structure, and calculate initial NO2 statistics for the Slovenia bounding box.

## Setup

Create `.env` in the repository root:

```env
COPERNICUS_USERNAME=your_email_here
COPERNICUS_PASSWORD=your_password_here
```

Install Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install requests python-dotenv xarray numpy netCDF4
```

`netCDF4` is needed by xarray to open Sentinel-5P NetCDF groups with `group="PRODUCT"`.

## Slovenia Discovery Constants

- Latitude: `45.4` to `46.9`
- Longitude: `13.4` to `16.6`
- Initial quality filter: `qa_value >= 0.75`
- Required NetCDF variables: `latitude`, `longitude`, `nitrogendioxide_tropospheric_column`, `qa_value`

## Run Commands

Check that credentials work without printing the full token:

```bash
python data_pipeline/scripts/get_copernicus_token.py
```

Search products over Slovenia:

```bash
python data_pipeline/scripts/search_s5p_no2_products.py --start-date 2024-01-01 --end-date 2024-01-31
```

Download one selected product:

```bash
python data_pipeline/scripts/download_s5p_no2_product.py --product-id PRODUCT_UUID_FROM_SEARCH
```

Inspect the downloaded NetCDF PRODUCT group:

```bash
python data_pipeline/scripts/inspect_s5p_no2_structure.py --file data_pipeline/sample_data/YOUR_PRODUCT.nc
```

Calculate NO2 statistics for the Slovenia bounding box:

```bash
python data_pipeline/scripts/process_no2_slovenia_bbox.py --file data_pipeline/sample_data/YOUR_PRODUCT.nc
```

## Data Safety

Do not commit `.env`, `.nc`, `.zip`, or downloaded Copernicus products. The `sample_data/` directory is ignored except for `.gitkeep`.
