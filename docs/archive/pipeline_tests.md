# Data Pipeline Tests

AirWatch SLO ima osnovne pytest teste za podatkovni cevovod. Testi so namenjeni hitremu lokalnemu preverjanju in izvajanju v CI.

## Zagon

Iz korena projekta:

```bash
python -m pytest data_pipeline/tests
```

Če `pytest` ni nameščen:

```bash
python -m pip install -r data_pipeline/requirements-dev.txt
python -m pytest data_pipeline/tests
```

## Kaj testi preverjajo

- `crop_filter_no2_slovenia.py`: filtriranje po `qa_value >= 0.75`, ignoriranje `NaN` vrednosti NO2, izračun `mean/min/max` in primer brez veljavnih pikslov.
- `aggregate_no2_by_region.py`: dodelitev sintetičnih NO2 točk v preproste poligone, izločanje točk zunaj regij in izračun statistik po regiji.
- `validate_regional_no2_output.py`: strukturo JSON rezultata, obvezna polja, dovoljene statuse kakovosti, pravilno razmerje `value_min <= value_mean <= value_max` in pravila za `no_valid_pixels`.

## CI združljivost

Testi ne zahtevajo:

- `.env` datoteke,
- Copernicus uporabniških podatkov,
- omrežnega dostopa,
- prave Sentinel-5P `.nc` datoteke,
- povezave z bazo.

Uporabljajo majhne sintetične podatke in začasne JSON datoteke, zato so primerni za GitHub Actions.

## Omejitve

Ti testi preverjajo programsko logiko in notranjo konsistentnost rezultatov. Ne potrjujejo znanstvene točnosti Sentinel-5P obdelave in ne nadomeščajo validacije z realnimi podatki.
