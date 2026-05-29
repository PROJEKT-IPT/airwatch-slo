# AirWatch SLO – Pregled podatkovnega toka (data pipeline)

Ta dokument je **enotni visokonivojski pregled** podatkovnega toka AirWatch SLO:
od Sentinel-5P NO₂ produkta do regionalnih meritev, vidnih v dashboardu.
Podrobni koraki so dokumentirani v ločenih datotekah, ki so povezane spodaj –
ta dokument jih ne podvaja, ampak razloži celoto in nanje kaže.

> Dokument je bil pregledan in usklajen z dejansko kodo v `data_pipeline/scripts/`
> in `backend/scripts/ingest_regional_no2_measurements.py` (AIRSLO-104). Kjer je
> korak deloma ročen, je to izrecno označeno.

> **Zgodovinska opomba.** Prejšnja različica tega dokumenta je bila Sprint 1
> "data discovery" zapis. Sprint-specifični zapisi (izbira produkta, PoC bbox
> obdelava) so ohranjeni kot zgodovinske reference (glej §13), tu pa je opisan
> trenutni operativni tok brez "Sprint 2/Sprint 3" terminologije.

---

## Narava podatkov

- AirWatch SLO **ni** aplikacija v realnem času in **ne** prikazuje uličnih
  meritev.
- Prikazuje **zadnjo razpoložljivo veljavno obdelano** Sentinel-5P NO₂ meritev
  za slovenske statistične regije – **satelitsko regionalno oceno**.
- Vrednosti so povprečja veljavnih pikslov, dodeljenih posamezni regiji; en
  TROPOMI piksel pokriva pribl. 3,5 × 5,5 km (glej
  [`sentinel5p_regional_interpretation_limitations.md`](sentinel5p_regional_interpretation_limitations.md)).
- Manjkajoče vrednosti so `null`, nikoli lažni `0`.

---

## Pregled toka

```text
Copernicus Sentinel-5P NO₂ OFFL L2 produkt (.nc)
  → odkrivanje + prenos               (search / download skripte)
  → pregled strukture                 (inspect skripta)
  → crop na bbox Slovenije            (crop_filter_no2_slovenia.py)
  → QA filter (qa_value >= 0.75)      (isti korak)
  → regionalne meje NUTS3             (GISCO GeoJSON, inspect_region_boundaries.py)
  → regionalna agregacija (point-in-polygon)  (aggregate_no2_by_region.py → JSON)
  → validacija JSON izhoda            (validate_regional_no2_output.py)
  → vnos v bazo                       (backend/.../ingest_regional_no2_measurements.py)
  → FastAPI /api/v1 + React dashboard
```

Celotno verigo je mogoče zagnati ročno korak za korakom (spodaj) ali z
orkestratorjem `run_latest_no2_pipeline.py` (§12). Polni end-to-end ukazi z
Docker okoljem so v [`regional_pipeline_runbook.md`](regional_pipeline_runbook.md).

---

## 1. Vir podatkov

- **Satelit / instrument:** Copernicus Sentinel-5P / TROPOMI.
- **Produkt:** `S5P_OFFL_L2__NO2` (OFFL, Level 2, NetCDF `.nc`).
- **NetCDF grupa za branje:** `PRODUCT` (`xarray.open_dataset(file, group="PRODUCT")`,
  zahteva `netCDF4`).
- Aplikacija dela z **obdelanimi satelitskimi produkti**, ne z živim senzorskim
  tokom. OFFL varianta je na voljo z zamikom glede na čas zajema.
- Posamezna `.nc` datoteka je velika (~500–700 MB). **`.nc` datoteke so lokalni
  artefakti in se ne commitajo** (`.gitignore`: `*.nc`, `data_pipeline/sample_data/*`).

Podrobnosti o izbiri produkta:
[`sprint2_selected_no2_input_product.md`](sprint2_selected_no2_input_product.md),
[`sprint3_selected_no2_input_product.md`](sprint3_selected_no2_input_product.md)
(zgodovinske reference).

## 2. Odkrivanje in prenos produktov

| Korak | Skripta | Opomba |
|---|---|---|
| Avtentikacija | `get_copernicus_token.py` | preveri poverilnice, ne izpiše celega tokena |
| Iskanje | `search_s5p_no2_products.py` | po časovnem oknu + bbox Slovenije |
| Prenos | `download_s5p_no2_product.py --product-id ...` | ročno sprožen prenos enega produkta |

- **Poverilnice (okoljske spremenljivke):** `COPERNICUS_USERNAME`,
  `COPERNICUS_PASSWORD` v root `.env`. **Vrednosti niso del dokumentacije in se
  ne commitajo** (`.gitignore`: `.env`).
- **Lokacija prenosa:** `data_pipeline/sample_data/` (gitignored; sledi se le
  `.gitkeep`).
- Prenos je **ročen** – skripte ničesar ne prenašajo samodejno; reproducibilnost
  zagotavlja en konkreten, dokumentiran produkt.

## 3. Pregled vhodnega produkta

Skripta `inspect_s5p_no2_structure.py` preveri strukturo NetCDF datoteke pred
obdelavo. Pomembno je potrditi prisotnost zahtevanih spremenljivk v grupi
`PRODUCT`:

- `latitude` – geografska širina piksla,
- `longitude` – geografska dolžina piksla,
- `nitrogendioxide_tropospheric_column` – vrednost NO₂ (troposferski stolpec),
- `qa_value` – indikator kakovosti piksla.

Vsi obdelovalni koraki berejo iz grupe `PRODUCT` prek `xarray`.

## 4. Crop / filter za Slovenijo

Skripta `crop_filter_no2_slovenia.py` omeji piksle na bounding box Slovenije in
uporabi QA filter (en korak).

- **Privzeti bbox:** `lat 45.4–46.9`, `lon 13.4–16.6`.
- **Izhod je samo povzetek** (`total_pixels_in_bbox_before_qa`,
  `valid_pixels_after_qa`, `value_mean/min/max`, `unit`). **Rasterska polja se ne
  shranjujejo.** Neobvezni `--output` zapiše majhen JSON/CSV povzetek.
- `total_pixels_in_bbox_before_qa` = število pikslov, ki padejo v bbox **pred**
  uporabo QA filtra (vsi piksli v okviru, ne glede na kakovost ali NaN).

Ta korak je predvsem **sanity-check**; dejanske regionalne vrednosti izračuna
agregacija (§6). Več:
[`slovenia_no2_crop_filter.md`](slovenia_no2_crop_filter.md).

> Sprint 1 PoC skripta `process_no2_slovenia_bbox.py` (samo bbox statistika) je
> ohranjena kot zgodovinski predhodnik tega koraka.

## 5. QA filter

- Pravilo: **`qa_value >= 0.75`**.
- Piksli z NaN NO₂ vrednostjo so izločeni iz statistike (`np.isfinite`).
- Piksli pod QA pragom niso vključeni v izračun.
- QA prag je **pravilo za presejanje kakovosti**, ne znanstveno jamstvo
  pravilnosti meritve. Prag neposredno vpliva na število veljavnih pikslov in
  stabilnost statistike.

## 6. Regionalne meje

- **Vir:** Eurostat **GISCO NUTS 2024**, Level 3 (statistične regije).
- **12 slovenskih statističnih regij** (filter `CNTR_CODE = SI` in
  `LEVL_CODE = 3`); agregacija zahteva natanko 12 regij.
- **Koordinate:** EPSG:4326 / WGS84 (agregacija preveri CRS; zavrne ne-4326/CRS84).
- **Surovi GeoJSON je lokalna referenca in se ne commita**
  (`.gitignore`: `data_pipeline/reference_data/regions/raw/*`); sledi se le
  `.gitkeep`, da mapa obstaja.
- Pregled in preverjanje meja: `inspect_region_boundaries.py` (izpiše CRS,
  število regij, atribute, imena; opozori, če SI/NUTS3 ni 12).

Več: [`slovenian_region_boundaries.md`](slovenian_region_boundaries.md).

## 7. Regionalna agregacija

Skripta `aggregate_no2_by_region.py` dodeli veljavne piksle regijam in izračuna
statistiko.

- Vsak veljaven Sentinel-5P piksel se obravnava kot **točka (longitude, latitude)**
  z NO₂ vrednostjo.
- **Point-in-polygon** dodelitev v NUTS3 geometrijo (čisti Python ray-casting;
  podpira `Polygon` in `MultiPolygon`, upošteva luknje). Piksel se dodeli prvi
  ustrezni regiji.
- Statistika **na regijo** (polja JSON izhoda):

  | Polje | Opomba |
  |---|---|
  | `region_code`, `region_name` | NUTS3 koda in ime |
  | `value_mean`, `value_min`, `value_max` | `null`, če ni veljavnih pikslov |
  | `pixel_count_valid` | število dodeljenih veljavnih pikslov |
  | `quality_status` | `valid` ali `no_valid_pixels` |
  | `qa_threshold`, `unit` | `0.75`, `mol/m²` |
  | `measurement_start_time`, `measurement_end_time` | iz argumentov → NetCDF atributov → imena datoteke |
  | `source_product_id` | neobvezno; `null`, če ni podan z `--source-product-id` |
  | `source_product_name` | privzeto ime `.nc` datoteke |

- **`no_valid_pixels`:** regija brez dodeljenih veljavnih pikslov dobi
  `quality_status = no_valid_pixels`, `pixel_count_valid = 0` in `null` vrednosti
  (ostane v izhodu kot obdelan rezultat).
- Skripta poroča tudi **piksle zunaj vseh regij** (bbox vključuje območja izven
  Slovenije, meje pa so generalizirane – glej §11).

> `processing_run_id` **ni** del JSON izhoda agregacije; dodeli se šele ob vnosu
> v bazo (§9). Status `processing_error` je dovoljen v validaciji/bazi, vendar ga
> trenutna agregacijska skripta ne generira (uporablja samo `valid` /
> `no_valid_pixels`).

Več: [`regional_no2_aggregation_strategy.md`](regional_no2_aggregation_strategy.md),
[`regional_no2_aggregation_result.md`](regional_no2_aggregation_result.md).

## 8. Validacija

Skripta `validate_regional_no2_output.py` preveri **strukturno in interno
doslednost** JSON izhoda – **ne dokazuje znanstvene pravilnosti** vrednosti.

Preverja med drugim:

- izhod je seznam s pričakovanim številom regij (privzeto 12),
- prisotnost obveznih polj, brez podvojenih `region_code`,
- `unit = mol/m²`, `qa_threshold = 0.75`,
- `quality_status ∈ {valid, no_valid_pixels, processing_error}`,
- pri `valid`: `pixel_count_valid > 0` in `value_min <= value_mean <= value_max`,
- pri `no_valid_pixels`: `pixel_count_valid == 0` in `null` vrednosti.

Neobvezni pričakovani parametri (`--expected-valid-regions`,
`--expected-no-data-regions`, `--expected-assigned-valid-pixels`) omogočajo
preverjanje glede na znan referenčni produkt. Ob napaki skripta vrne izhodni
status `1`. Pričakovani izhodi za konkretne produkte so dokumentirani v
[`regional_no2_validation.md`](regional_no2_validation.md).

## 9. Vnos v bazo

Skripta `backend/scripts/ingest_regional_no2_measurements.py` vnese validiran
regionalni JSON v tabelo `region_measurement`.

- Bere 12-vrstični JSON; zahteva enotne `source_product_id`,
  `source_product_name`, časovni okvir in `qa_threshold` čez vse vrstice.
- **Preslikava:**
  - poišče `data_product` po `product_code` (privzeto `S5P_OFFL_L2__NO2`),
  - **upsert** `source_file` po `external_product_id`,
  - **upsert** `processing_run` (`run_status = success`),
  - **upsert** `region_measurement` na regijo (povezava prek `region_code`).
- Regije morajo **že obstajati** v bazi (najprej `backend/scripts/load_regions.py`);
  sicer skripta javi `Region not found ...`.
- **Idempotentno** prek `ON CONFLICT ... DO UPDATE`; ponoven zagon ne podvaja
  zapisov.
- Pričakovani izpis: `Ingested N regional NO2 measurements.` + število veljavnih
  in brez-podatkovnih regij ter dodeljenih pikslov.

### Docker workaround (ko backend kontejner ne vidi izhoda pipeline-a)

Če lokalno okolje ne dosega baze, je vnos mogoč prek backend kontejnerja
(runbook §11, Option B): kopiraj JSON v `backend/`, ponovno zgradi sliko, zaženi
skripto v enkratnem kontejnerju, **nato izbriši začasni JSON** in znova zgradi
sliko. **`backend/regional_no2_results.json` je gitignored in se ne commita.**
Polni ukazi: [`regional_pipeline_runbook.md`](regional_pipeline_runbook.md) §11.

## 10. Povezava z API in frontendom

Po vnosu so podatki vidni prek FastAPI `/api/v1` endpointov; React dashboard
bere regionalne zadnje meritve, podrobnosti regije, zgodovino, primerjavo, CSV
izvoz in geometrije. Točka, kjer izhod pipeline-a postane viden, je tabela
`region_measurement` → endpoint `GET /api/v1/regions/latest-measurements`.
Podrobnosti endpointov: [`API_documentation.md`](API_documentation.md).

## 11. Znane omejitve

- Sentinel-5P **ni ulična meritev** (piksel ~3,5 × 5,5 km).
- Aplikacija **ni v realnem času**; OFFL produkti so na voljo z zamikom.
- Razpoložljivost produktov je odvisna od satelitskega preleta in objave v
  Copernicus Data Space.
- Nekateri produkti imajo za določene regije **ničveljavnih pikslov**
  (oblačnost, kakovost retrieval-a) → `no_valid_pixels`.
- GISCO **20M** meje so **generalizirane** (poenostavljene).
- Trenutna agregacija je **point-in-polygon**, ne pixel-footprint utežena.
- **Veljavni piksli zunaj vseh regij** so možni, ker bbox vključuje območja
  izven Slovenije, meje pa so generalizirane.
- Rezultati so **regionalne satelitske ocene**, ne uradne meritve talnih postaj.

## 12. Reproducibilnost / ukazi

Kratek pregled (kode regij in produkti so primeri):

```bash
# Pregled mej
python data_pipeline/scripts/inspect_region_boundaries.py \
  --file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson

# Crop/filter povzetek (sanity-check)
python data_pipeline/scripts/crop_filter_no2_slovenia.py \
  --file data_pipeline/sample_data/<PRODUCT>.nc

# Regionalna agregacija → JSON
python data_pipeline/scripts/aggregate_no2_by_region.py \
  --no2-file data_pipeline/sample_data/<PRODUCT>.nc \
  --regions-file data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson \
  --output data_pipeline/outputs/no2_by_region/regional_no2_results.json \
  --source-product-id <UUID> \
  --measurement-start-time <ISO8601> --measurement-end-time <ISO8601>

# Validacija
python data_pipeline/scripts/validate_regional_no2_output.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results.json

# Vnos v bazo (host-side; glej runbook za Docker workaround)
python backend/scripts/ingest_regional_no2_measurements.py \
  --file data_pipeline/outputs/no2_by_region/regional_no2_results.json

# Preverjanje baze / API-ja
curl http://localhost:8000/api/v1/regions/latest-measurements
```

**Celoten end-to-end** (Docker, migracije, preverjanje baze/API/frontend) je v
[`regional_pipeline_runbook.md`](regional_pipeline_runbook.md) – ta dokument ga
namerno ne podvaja.

**Orkestrator (najnovejši produkt naenkrat):**

```bash
python data_pipeline/scripts/run_latest_no2_pipeline.py
```

Zažene celotno verigo (search → download → aggregate → validate → ingest →
preverjanje API-ja) za najnovejši razpoložljiv OFFL produkt nad Slovenijo.
Idempotenten; uporabne zastavice `--dry-run`, `--start-date` / `--end-date`,
`--product-id`, `--force`. Ne razporeja sam – za periodičnost ga ovij v
cron / launchd / GitHub Actions.

Lahki testi pipeline-a (sintetični podatki, brez poverilnic/omrežja/baze):

```bash
python -m pytest data_pipeline/tests
```

Več: [`pipeline_tests.md`](pipeline_tests.md).

## 13. Čiščenje in Git higiena

**Nikoli ne commitaj:**

- `.env` in poverilnic (`COPERNICUS_*`, tokenov),
- `.nc` (in `.zip`) Copernicus produktov,
- generiranih JSON/CSV izhodov pod `data_pipeline/outputs/...`,
- začasne backend kopije JSON-a (`backend/regional_no2_results.json` iz Docker
  workarounda),
- surovih velikih GIS datotek pod
  `data_pipeline/reference_data/regions/raw/...`.

Sledi se le `.gitkeep` datotekam (da mape obstajajo). Ustrezna pravila so že v
korenskem `.gitignore`. Po Docker workaroundu odstrani začasni JSON in ponovno
zgradi sliko (glej §9 in runbook §15 "Cleanup checklist").

## 14. Povezane podrobne reference

| Dokument | Vsebina |
|---|---|
| [`regional_pipeline_runbook.md`](regional_pipeline_runbook.md) | polni end-to-end ukazi (Docker, migracije, vnos, preverjanje) |
| [`slovenian_region_boundaries.md`](slovenian_region_boundaries.md) | izbira in vir mej (GISCO NUTS 2024) |
| [`slovenia_no2_crop_filter.md`](slovenia_no2_crop_filter.md) | crop/filter korak |
| [`regional_no2_aggregation_strategy.md`](regional_no2_aggregation_strategy.md) | strategija agregacije |
| [`regional_no2_aggregation_result.md`](regional_no2_aggregation_result.md) | zagon in interpretacija izhoda |
| [`regional_no2_validation.md`](regional_no2_validation.md) | validacija izhoda |
| [`sentinel5p_regional_interpretation_limitations.md`](sentinel5p_regional_interpretation_limitations.md) | omejitve interpretacije |
| [`pipeline_tests.md`](pipeline_tests.md) | testi pipeline-a |
| [`API_documentation.md`](API_documentation.md) | API endpointi nad podatki |
| [`sprint2_selected_no2_input_product.md`](sprint2_selected_no2_input_product.md), [`sprint3_selected_no2_input_product.md`](sprint3_selected_no2_input_product.md) | izbira produktov (zgodovinske reference) |

Operativni vstopni točki sta `data_pipeline/README.md` (lokalni ukazi) in
zgornji runbook (celotni tok).
