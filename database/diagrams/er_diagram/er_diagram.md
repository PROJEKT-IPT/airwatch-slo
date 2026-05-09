# AirWatch SLO MVP ER diagram

Ta ER diagram prikazuje MVP podatkovni tok od Copernicus Sentinel-5P NO2 produktov do obdelanih regionalnih meritev za AirWatch SLO dashboard.

```mermaid
erDiagram
    region {
        integer id_region PK
        string name
        string code
        string region_type
        geometry geometry
        float bbox_lat_min
        float bbox_lat_max
        float bbox_lon_min
        float bbox_lon_max
        datetime created_at
        datetime updated_at
    }

    indicator {
        integer id_indicator PK
        string code
        string name
        string description
        string unit
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    data_source {
        integer id_data_source PK
        string name
        string provider
        string access_url
        string license_name
        string description
        datetime created_at
        datetime updated_at
    }

    data_product {
        integer id_data_product PK
        integer fk_data_source
        string product_code
        string platform
        string instrument
        string processing_level
        string variable_name
        string product_group
        string description
        datetime created_at
        datetime updated_at
    }

    source_file {
        integer id_source_file PK
        integer fk_data_product
        string copernicus_product_id
        string product_name
        string local_file_path
        string file_format
        bigint file_size_bytes
        string checksum
        datetime content_start_time
        datetime content_end_time
        datetime downloaded_at
        datetime created_at
        datetime updated_at
    }

    processing_run {
        integer id_processing_run PK
        integer fk_source_file
        string run_status
        string script_name
        string script_version
        float qa_threshold
        string bbox_used
        datetime started_at
        datetime finished_at
        string error_message
        datetime created_at
        datetime updated_at
    }

    region_measurement {
        integer id_region_measurement PK
        integer fk_region
        integer fk_indicator
        integer fk_source_file
        integer fk_processing_run
        datetime measurement_start_time
        datetime measurement_end_time
        float value_mean
        float value_min
        float value_max
        integer pixel_count_valid
        float qa_threshold
        string unit
        datetime created_at
        datetime updated_at
    }

    data_source ||--o{ data_product : provides
    data_product ||--o{ source_file : has
    source_file ||--o{ processing_run : processed_by
    source_file ||--o{ region_measurement : produces
    processing_run ||--o{ region_measurement : creates
    region ||--o{ region_measurement : has
    indicator ||--o{ region_measurement : measures
```

## Opis tabel

`region` hrani slovenske regije, ki jih lahko uporabnik izbere v dashboardu. MVP se lahko začne z okvirjem za celotno Slovenijo, kasneje pa ga je mogoče zamenjati ali razširiti z uradnimi geometrijami regij za prikaz trendov in primerjavo regij.

`indicator` definira merljive kazalnike kakovosti zraka. V Sprintu 1 vsebuje NO2 z enoto `mol/m²`; tabela omogoča dodajanje prihodnjih kazalnikov brez spremembe merilnega modela.

`data_source` hrani metapodatke o viru podatkov, na primer Copernicus Data Space, vključno s ponudnikom, dostopnim URL-jem, licenco in opisom.

`data_product` hrani metapodatke o Sentinel-5P NO2 produktu in je povezana s tabelo `data_source`. Podatkovno odkrivanje je potrdilo, da NetCDF skupina `PRODUCT` vsebuje `latitude`, `longitude`, `nitrogendioxide_tropospheric_column` in `qa_value`; spremenljivka NO2 je predstavljena s stolpcem `variable_name`.

`source_file` hrani metapodatke za eno preneseno datoteko Copernicus produkta, vključno s Copernicus ID-jem produkta, imenom produkta, lokalno potjo, formatom datoteke, velikostjo datoteke, kontrolno vsoto in časovnim intervalom vsebine. Prenesene datoteke `.nc` in `.zip` morajo ostati zunaj Gita.

`processing_run` sledi vsaki izvedbi obdelovalnega skripta nad izvorno datoteko. Beleži status, identiteto skripta, `qa_threshold`, uporabljeni bbox, časovne oznake in morebitno sporočilo o napaki, kar omogoča ponovljivost rezultatov.

`region_measurement` hrani obdelane regionalne statistike, ki jih uporablja dashboard: `value_mean`, `value_min`, `value_max`, `pixel_count_valid`, `qa_threshold` in `unit`. Vsaka vrstica povezuje regijo, kazalnik, izvorno datoteko in obdelovalni zagon za določen časovni interval meritve.

## Opis povezav

En `data_source` lahko zagotavlja več zapisov `data_product`. En `data_product` ima lahko več prenesenih zapisov `source_file`. Ena datoteka `source_file` je lahko obdelana v več zapisih `processing_run`, na primer ob spremembi skripta ali pragov kakovosti.

Vsak `processing_run` lahko ustvari več zapisov `region_measurement`, na primer en zapis za vsako slovensko regijo. Vsak `region_measurement` pripada natanko eni regiji `region` in enemu kazalniku `indicator`, kar podpira poizvedbe za zadnjo meritev v dashboardu, zgodovinske trende in primerjavo regij.

Za poizvedbo zadnje vrednosti v dashboardu se `region_measurement` filtrira po `fk_region` in `fk_indicator`, uredi padajoče po `measurement_end_time`, nato pa se prebere najnovejša obdelana vrstica.
