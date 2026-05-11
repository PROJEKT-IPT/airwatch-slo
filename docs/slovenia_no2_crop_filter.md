# Slovenia NO2 Crop And QA Filter

This document describes the Sprint 2 crop/filter step for the selected Sentinel-5P NO2 product. This step crops pixels to the Slovenia bounding box and applies the initial NO2 quality filter. It does not implement aggregation by statistical region and does not write results to the database.

## Input Product

Selected product:

```text
S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Expected local path:

```text
data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

The `.nc` file must remain local and must not be committed to Git.

## Fields Used

The script opens the NetCDF file with:

```python
xarray.open_dataset(file, group="PRODUCT")
```

Required variables:

- `latitude`
- `longitude`
- `nitrogendioxide_tropospheric_column`
- `qa_value`

## Crop And Filter Settings

Default Slovenia bounding box:

```text
LAT_MIN = 45.4
LAT_MAX = 46.9
LON_MIN = 13.4
LON_MAX = 16.6
```

Default quality filter:

```text
qa_value >= 0.75
```

The `0.75` threshold is used for tropospheric NO2 because Sentinel-5P NO2 guidance commonly recommends filtering tropospheric NO2 with `qa_value > 0.75` to remove very cloudy scenes, snow/ice-covered scenes, and problematic retrievals.

## Command

Run from the repository root:

```bash
python data_pipeline/scripts/crop_filter_no2_slovenia.py \
  --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
```

Optional JSON summary:

```bash
python data_pipeline/scripts/crop_filter_no2_slovenia.py \
  --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc \
  --output data_pipeline/outputs/no2_crop_filter/slovenia_no2_crop_filter_summary.json
```

Optional CSV summary:

```bash
python data_pipeline/scripts/crop_filter_no2_slovenia.py \
  --file data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc \
  --output data_pipeline/outputs/no2_crop_filter/slovenia_no2_crop_filter_summary.csv
```

## Example Output

```text
Sentinel-5P NO2 Slovenia crop/filter summary
Input file: data_pipeline/sample_data/S5P_OFFL_L2__NO2____20250311T115807_20250311T133937_38393_03_020800_20250313T042301.nc
Bbox: lat 45.4-46.9, lon 13.4-16.6
QA threshold: 0.75
Total pixels in bbox before QA filter: 632
Valid pixels after QA filter: 69
Mean NO2: 3.306649159640074e-05
Min NO2: 1.130456894316012e-05
Max NO2: 5.404165858635679e-05
Unit: mol/m²
```

## Output Summary Files

If `--output` is provided, the script writes only a small summary file. It does not save extracted raster arrays.

Recommended output folder:

```text
data_pipeline/outputs/no2_crop_filter/
```

Generated output files in `data_pipeline/outputs/` should not be committed, except `.gitkeep` placeholders.

## Limitations

- The crop is still based on the Slovenia bounding box, not statistical region polygons.
- The script counts pixels in the bbox before QA and finite NO2 pixels after QA.
- This step does not perform spatial intersection with Slovenian statistical regions.
- This step does not write measurements to PostgreSQL.
- Regional aggregation belongs to a later Sprint 2 task.
