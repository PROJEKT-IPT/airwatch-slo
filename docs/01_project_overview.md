# 01 – Pregled projekta

AirWatch SLO je spletna aplikacija za prikaz regionalnih vrednosti dušikovega
dioksida (NO₂) nad Slovenijo na podlagi satelitskih podatkov Copernicus
Sentinel-5P (instrument TROPOMI).

## Kaj aplikacija prikazuje

Uporabnik v dashboardu izbere slovensko statistično regijo in vidi:

- zadnjo razpoložljivo veljavno NO₂ vrednost regije,
- datum in čas zajema satelitskega produkta ter ime vira,
- osnovno statistiko (`value_mean`, `value_min`, `value_max`, število veljavnih
  pikslov, QA prag),
- zgodovinski trend regije,
- primerjavo več regij,
- izvoz zadnje meritve regije v CSV.

Podatki so razdeljeni na **12 slovenskih statističnih regij** (NUTS3).

## Kaj AirWatch SLO ni

To so namerne lastnosti, ne pomanjkljivosti:

- **Ni aplikacija v realnem času.** Prikazuje *zadnjo razpoložljivo obdelano*
  Sentinel-5P NO₂ meritev. Produkti Sentinel-5P OFFL so na voljo z nekajdnevnim
  zamikom glede na satelitski prelet.
- **Ni ulična meritev.** En piksel TROPOMI pokriva približno 3,5 × 5,5 km, zato
  podatki ne morejo razločiti posameznih ulic, stavb ali točkovnih virov.
  Vrednosti so **regionalne satelitske ocene**, ne meritve talnih postaj.
- Manjkajoče vrednosti so prikazane kot "ni podatkov" (`null`), nikoli kot
  lažna ničla.

Podrobnosti o interpretaciji so v
[`07_limitations_and_methodology.md`](07_limitations_and_methodology.md).

## Glavni podatkovni tok

```text
Copernicus Sentinel-5P NO₂ produkt (.nc)
  → Python data pipeline (crop, QA filter, regionalna agregacija, validacija)
  → PostgreSQL + PostGIS baza
  → FastAPI backend
  → React dashboard
```

## Tehnologije

- **Backend:** Python, FastAPI, SQLAlchemy, Alembic
- **Baza:** PostgreSQL + PostGIS
- **Data pipeline:** Python (requests, xarray, numpy, netCDF4)
- **Frontend:** React + Vite, Leaflet (zemljevid)
- **Lokalno okolje:** Docker Compose
- **Produkcijski deploy:** Railway
