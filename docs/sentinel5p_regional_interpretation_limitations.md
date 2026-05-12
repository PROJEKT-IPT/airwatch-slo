# Sentinel-5P NO2 Regional Interpretation Limitations

This document explains how AirWatch SLO interprets Sentinel-5P TROPOMI NO2 data
and why the dashboard uses regional values instead of street-level estimates.

## Not Street-Level Data

Sentinel-5P measures atmospheric composition with TROPOMI pixels that are roughly
3.5 x 5.5 km at nominal resolution. One pixel can cover several square
kilometres, so the data cannot resolve individual streets, buildings, road
segments, parking lots, or small point sources.

For AirWatch SLO this means:

- NO2 values should not be interpreted as street-level exposure.
- Differences inside one city are usually below the spatial detail Sentinel-5P
  can reliably observe.
- Displaying values at street or neighbourhood level would imply false
  precision.
- Values represent satellite-derived atmospheric column measurements, not direct
  ground-level sensor readings.

## Why Regional Aggregation Is Used

AirWatch SLO aggregates valid Sentinel-5P NO2 pixels to Slovenian regions because
regional interpretation is better aligned with the spatial resolution of the
sensor.

Regional aggregation helps because:

- each region can contain multiple satellite pixels,
- averaging reduces single-pixel noise,
- cloudy or invalid pixels can be excluded before calculating regional means,
- region-level values are more stable for comparing areas and later time series,
- administrative regions match the way environmental indicators are often
  reported and discussed.

The dashboard should therefore present NO2 as a regional indicator. It should not
offer street-level claims unless the project later adds a separate, validated
data-fusion model that combines Sentinel-5P with ground stations or other
high-resolution data sources.

## What `qa_value` Means

Each Sentinel-5P pixel includes a `qa_value`, a quality assurance value between
0 and 1. It summarizes how reliable the retrieval is for that pixel.

For NO2, low `qa_value` can be caused by:

- cloud contamination,
- snow or ice,
- difficult surface reflectance conditions,
- high solar zenith angle,
- retrieval or algorithm convergence problems.

AirWatch SLO uses the standard NO2 filter:

```text
qa_value >= 0.75
```

Pixels below this threshold are excluded from statistics. They should not be
used in regional means because low-quality pixels can bias results.

## Why Data Can Be Missing

Missing data does not automatically mean the data pipeline is broken. It can be a
normal result of satellite observation and QA filtering.

Common reasons include:

- Dense clouds: TROPOMI cannot reliably measure through dense cloud cover.
- All pixels filtered out: a region can have no valid pixels after applying
  `qa_value >= 0.75`.
- Satellite overpass timing: Sentinel-5P has about one relevant overpass per day;
  if that overpass is cloudy, there may be no valid daily value.
- Product or ingestion gaps: source products can be delayed, unavailable, or not
  downloaded by the pipeline.
- Processing errors: local processing can fail before measurements are written to
  the database.

Small regions are especially sensitive because they may contain fewer pixels. If
all of those pixels fail the QA filter, the region should be shown as no data
rather than forcing an unreliable value.

## Dashboard Interpretation

Dashboard values should be read as QA-filtered regional summaries:

- `value_mean`: mean NO2 value from valid pixels assigned to the region,
- `value_min`: minimum valid pixel value in the region,
- `value_max`: maximum valid pixel value in the region,
- `pixel_count_valid`: number of pixels that passed the QA filter,
- `qa_threshold`: quality threshold used during processing,
- `quality_status`: whether the regional result is usable or missing.

Recommended interpretation:

| Status | Meaning |
|---|---|
| `valid` | At least one valid pixel was available and regional statistics were calculated. |
| `no_valid_pixels` | No pixels passed the QA filter for that region. |
| `processing_error` | Processing failed before a reliable regional result was produced. |

## End-User Wording

Sentinel-5P / TROPOMI NO2 data is satellite-derived and averaged over pixels of
several square kilometres. AirWatch SLO shows QA-filtered regional values, not
street-level pollution exposure. Cloud cover, satellite coverage, or processing
gaps can cause data to be missing for some regions or dates.

## References

- ESA Sentinel-5P TROPOMI user guides:
  <https://sentinels.copernicus.eu/web/sentinel/copernicus/sentinel-5p>
- Veefkind et al. (2012), TROPOMI on the ESA Sentinel-5 Precursor, Remote
  Sensing of Environment.
