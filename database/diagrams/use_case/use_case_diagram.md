# AirWatch SLO MVP - Use Case Diagram

Ta dokument opisuje glavne primere uporabe za MVP sistema AirWatch SLO. Diagram temelji na datoteki `use_case_diagram.mmd`.

```mermaid
flowchart LR
    user([Uporabnik])
    admin([Administrator / Razvijalec])
    copernicus([Copernicus Data Space])

    subgraph AirWatch_SLO["Sistem AirWatch SLO"]A
        uc1((Pregled dashboarda))
        uc2((Izbira regije))
        uc3((Prikaz zadnje NO₂ meritve))
        uc4((Pregled osnovnih statistik))
        uc5((Primerjava regij))
        uc6((Pregled zgodovine meritev))
        uc7((Izvoz podatkov))

        uc8((Zagon zajema podatkov))
        uc9((Zagon obdelave podatkov))
        uc10((Shranjevanje rezultatov v bazo))
        uc11((Pregled statusa obdelave))
        uc12((Pridobivanje Copernicus podatkov))
    end

    user --> uc1
    user --> uc2
    user --> uc3
    user --> uc4
    user --> uc5
    user --> uc6
    user --> uc7

    admin --> uc8
    admin --> uc9
    admin --> uc10
    admin --> uc11

    copernicus --> uc12

    uc8 --> uc12
    uc9 --> uc10
    uc3 --> uc2
    uc4 --> uc3
    uc5 --> uc2
    uc6 --> uc2
```

## Akterji

`Uporabnik` predstavlja osebo, ki uporablja dashboard za pregled kakovosti zraka nad Slovenijo. Uporabnik izbira regije, pregleduje zadnje meritve, osnovne statistike, zgodovino, primerjave in izvozi podatke.

`Administrator / Razvijalec` predstavlja člana ekipe, ki skrbi za zajem, obdelavo in shranjevanje podatkov. V Sprintu 1 to pomeni ročni zagon skript za Sentinel-5P NO2 data discovery in obdelavo rezultatov.

`Copernicus Data Space` predstavlja zunanji vir satelitskih podatkov Sentinel-5P NO2.

## Primeri Uporabe Za Uporabnika

`Pregled dashboarda` je osnovni vstop v aplikacijo, kjer uporabnik vidi pregled stanja kakovosti zraka.

`Izbira regije` omogoča izbiro Slovenije ali posamezne regije, ko bodo dodane uradne geometrije regij.

`Prikaz zadnje NO₂ meritve` prikaže najnovejšo obdelano NO2 vrednost za izbrano regijo.

`Pregled osnovnih statistik` prikazuje `value_mean`, `value_min`, `value_max`, `pixel_count_valid`, `qa_threshold` in enoto meritve.

`Primerjava regij` omogoča primerjavo NO2 vrednosti med dvema ali več regijami.

`Pregled zgodovine meritev` omogoča prikaz časovnega trenda za izbrano regijo.

`Izvoz podatkov` omogoča izvoz izbranih meritev v CSV.

## Primeri Uporabe Za Administratorja / Razvijalca

`Zagon zajema podatkov` sproži iskanje ali prenos Copernicus Sentinel-5P NO2 produktov.

`Pridobivanje Copernicus podatkov` predstavlja povezavo s Copernicus Data Space, avtentikacijo, iskanje produktov in prenos izbrane datoteke.

`Zagon obdelave podatkov` sproži obdelavo NetCDF datoteke, uporabo `PRODUCT` skupine, filtriranje po Sloveniji in kakovostnem pragu `qa_value >= 0.75`.

`Shranjevanje rezultatov v bazo` shrani metapodatke o viru, produktu, datoteki, obdelovalnem zagonu in regionalnih meritvah.

`Pregled statusa obdelave` omogoča preverjanje, ali je obdelava uspešna, v teku ali neuspešna.

## Povezava Z MVP Podatkovnim Tokom

Use case diagram podpira osnovni MVP tok:

```text
Copernicus Sentinel-5P NO2 produkt
        -> data_pipeline
        -> PostgreSQL + PostGIS
        -> FastAPI backend
        -> React dashboard
```

Sprint 1 rezultat je začetna regionalna meritev za testni okvir Slovenije (`SI_BBOX`), izračunana iz Sentinel-5P NO2 podatkov z vrednostmi `value_mean`, `value_min`, `value_max`, `pixel_count_valid`, `qa_threshold` in enoto `mol/m²`.
