# Regional NO2 Output Validation

This document describes AIRSLO-69 validation for the Sprint 2 regional NO2 aggregation output.

The validation checks structural correctness and internal consistency. It does not write to the database and does not prove scientific accuracy.

## Validation Goal

Validate that the generated regional NO2 JSON output is ready to hand off to later database/API work.

The validation confirms:

- the file exists and is valid JSON,
- output is a list,
- exactly 12 Slovenian regions are present,
- required fields are present,
- region metadata is not empty,
- `unit` is `mol/m²`,
- `qa_threshold` is `0.75`,
- quality statuses are valid,
- numeric statistics are internally consistent,
- no-data regions have null statistics,
- optional expected regional counts match the current Sprint 2 run when provided.

## Input File

```text
data_pipeline/outputs/no2_by_region/regional_no2_results.json
```

This generated file is ignored by Git and should not be committed.

## Validation Command

Run from the repository root:

```bash
python data_pipeline/scripts/validate_regional_no2_output.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results.json \
  --expected-valid-regions 8 \
  --expected-no-data-regions 4 \
  --expected-assigned-valid-pixels 46
```

Without the optional expected count arguments, the script still validates structure, required fields, QA threshold, quality statuses and value consistency, but it does not lock the output to one specific Sentinel-5P product result.

## Expected Checks

Expected summary for the current Sprint 2 output:

```text
total regions: 12
valid regions: 8
no_valid_pixels regions: 4
total assigned valid pixels: 46
validation status: PASS
```

## Actual Validation Summary

The current generated output validates successfully:

```text
Regional NO2 output validation summary
Total regions: 12
Valid regions: 8
No-data regions: 4
Processing-error regions: 0
Total assigned valid pixels: 46
Warnings:
  - none
Errors:
  - none
Validation status: PASS
```

## Interpretation

The regional output is structurally correct and internally consistent for Sprint 2 handoff. It contains one object per Slovenian NUTS3/statistical region and uses the expected quality statuses:

- `valid` for regions with at least one assigned valid NO2 pixel,
- `no_valid_pixels` for regions without assigned valid pixels,
- `processing_error` reserved for future error handling.

The output is suitable for the next task that maps JSON rows to database records, assuming the downstream task accepts the current point-in-polygon aggregation method.

## Known Limitations

- This validation checks structure and internal consistency only.
- It does not prove scientific accuracy.
- Aggregation uses point-in-polygon assignment, not weighted pixel-footprint aggregation.
- GISCO 20M boundaries are generalized cartographic geometries.
- Some valid bbox pixels remain outside Slovenian NUTS3 regions.
- Some regions have no valid pixels for this selected product.
