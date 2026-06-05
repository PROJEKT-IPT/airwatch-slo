# Razporejeno osveževanje NO₂

AirWatch SLO ni aplikacija v realnem času — nadzorna plošča prikazuje zadnjo
**obdelano** Sentinel-5P NO₂ meritev. Brez razporejevalnika se ta "zadnja"
premakne le, ko razvijalec ročno zažene `run_latest_no2_pipeline.py`.

Ta mapa vzpostavi dnevno, samodejno osveževanje tega orkestratorja, da svežost
nadzorne plošče sledi viru OFFL produktov.

## Kaj počne

`refresh_latest_no2.sh` je tanek ovoj okoli
`data_pipeline/scripts/run_latest_no2_pipeline.py`. Ob vsakem zagonu:

1. Naloži repo `.env` (poverilnice Copernicus + Postgres).
2. Preveri, da je Docker dosegljiv in da kontejnerja `airwatch_db` ter
   `airwatch_backend` poročata `healthy`.
3. Izbere `.venv/bin/python`, če obstaja, sicer sistemski `python3`.
4. Pokliče orkestrator, ki na CDSE poišče najnovejši OFFL S5P NO₂ produkt nad
   Slovenijo. Orkestrator je idempotenten — če je najnovejši že vnešen, se
   zaključi čisto, brez ponovnega prenosa ali vnosa.
5. Doda časovno označeno vrstico v `logs/refresh_YYYY-MM-DD.log` in posodobi
   simbolno povezavo `logs/refresh_latest.log`.

Nadzorna plošča bere svežost neposredno iz baze prek
`/api/v1/regions/latest-measurements`, zato je uspešen zagon viden od konca do
konca ob naslednjem nalaganju strani.

## Pogostost

launchd plist se sproži enkrat dnevno ob **06:15 po lokalnem času**.

Zakaj ta čas:

- Sentinel-5P TROPOMI preleti Slovenijo enkrat dnevno, okoli poldneva UTC.
- Produkt **OFFL** (offline) NO₂ pride na Copernicus Data Space ~2–3 dni po
  preletu.
- Ena poizvedba na dan je najvišja pogostost, ki še prinese nove podatke;
  pogostejše poizvedovanje je le nepotrebna obremenitev CDSE.
- 06:15 je dovolj zunaj okna obdelave OFFL, zato je najnovejši razpoložljivi
  produkt zanesljivo viden, ko se opravilo zažene.

Če želite zakasnitev pod en dan, produkt NRTI (near-real-time) pride v ~3 urah,
a v ta pipeline še ni vključen.

## Namestitev (macOS, launchd)

```bash
# 1. Kopiraj plist v mapo LaunchAgents in zamenjaj pot do repozitorija.
#    <REPO_PATH> v predlogi mora postati absolutna pot do tega checkouta.
REPO_PATH="$(cd "$(dirname "$0")/../.." && pwd)"  # ali: pwd iz korena repozitorija
sed "s|<REPO_PATH>|${REPO_PATH}|g" \
  data_pipeline/automation/com.airwatch-slo.refresh-no2.plist \
  > ~/Library/LaunchAgents/com.airwatch-slo.refresh-no2.plist

# 2. Naloži agenta (registracija v launchd, da se sproži ob 06:15).
launchctl load ~/Library/LaunchAgents/com.airwatch-slo.refresh-no2.plist

# 3. (Neobvezno) Sproži enkraten zagon zdaj za preverjanje nastavitve.
launchctl start com.airwatch-slo.refresh-no2
tail -f data_pipeline/automation/logs/refresh_latest.log
```

Odstranitev:

```bash
launchctl unload ~/Library/LaunchAgents/com.airwatch-slo.refresh-no2.plist
rm ~/Library/LaunchAgents/com.airwatch-slo.refresh-no2.plist
```

## Namestitev (Linux / strežnik, systemd)

Prednostno za pravo produkcijo. Enote so v `data_pipeline/automation/systemd/`.

```bash
# 1. Kopiraj enote. Uredi .service, če se pot namestitve razlikuje od
#    /opt/airwatch-slo ali je uporabnik izvajanja drugačen od `airwatch`.
sudo install -m 0644 \
  data_pipeline/automation/systemd/airwatch-refresh-no2.service \
  data_pipeline/automation/systemd/airwatch-refresh-no2.timer \
  /etc/systemd/system/

# 2. Ponovno naloži, omogoči in zaženi časovnik.
sudo systemctl daemon-reload
sudo systemctl enable --now airwatch-refresh-no2.timer

# 3. Preveri.
systemctl list-timers airwatch-refresh-no2.timer        # naslednji sprožitveni čas
systemctl status   airwatch-refresh-no2.timer
journalctl -u airwatch-refresh-no2.service --since '24 hours ago'

# 4. Enkrat ročno sproži za preverjanje celotne verige.
sudo systemctl start airwatch-refresh-no2.service
journalctl -u airwatch-refresh-no2.service -f
```

Zakaj systemd namesto navadnega crona: `Persistent=true` poskrbi, da enota
nadoknadi zamujen zagon, če je bil VM ob 06:15 izklopljen, journald omogoča
pravo združevanje dnevnikov, časovnik pa preživi ponovne zagone brez urejanja
`crontab`.

## Namestitev (Linux / strežnik, cron — rezervna možnost)

Ovojna skripta je navaden bash in deluje tudi pod cronom. Primer vnosa v
crontab (dnevno ob 06:15):

```
15 6 * * * /absolute/path/to/airwatch-slo/data_pipeline/automation/refresh_latest_no2.sh
```

cron ne potrebuje nobenih zamenjav iz launchd plista — skripta razreši koren
repozitorija iz svoje lokacije.

## Aktivacija POST /admin/refresh-latest ob namestitvi

Repo vsebuje tudi mirujočo HTTP-sprožilno površino za isti orkestrator v
`backend/admin_refresh.py`. **Ni vključena v živi API** — vrstici
`from admin_refresh import …` v `backend/main.py` sta zakomentirani. Za
aktivacijo, ko backend namestite nekam brez lokalnega launchd / systemd
časovnika (ali poleg njega):

1. Odkomentirajte vrstici `register_admin_routes(app)` v `backend/main.py`.
2. Nastavite `ADMIN_REFRESH_TOKEN=<long random string>` v okolju izvajanja. Če
   spremenljivka manjka, endpoint vrne 503 — fail-closed.
3. Dodajte `xarray`, `numpy`, `netCDF4`, `requests` v `backend/requirements.txt`,
   da so odvisnosti orkestratorja na voljo v backend imageu.
4. Vključite pipeline skripte v backend image. V produkcijskem Dockerfile, za
   obstoječim `COPY . .`:

   ```Dockerfile
   COPY ../data_pipeline /app/data_pipeline
   ```

   Poleg tega zapisljiv mount (ali `RUN mkdir -p`) za
   `/app/data_pipeline/sample_data/`, da ~600 MB `.nc` prenosi pristanejo nekam
   s prostorom.
5. Predelajte `data_pipeline/scripts/run_latest_no2_pipeline.py`, da preskoči
   `docker compose` klice, ko je nastavljen `AIRWATCH_INCONTAINER=1` — zamenjajte
   `psql` preverjanje vnosa z neposredno SQLAlchemy poizvedbo in pokličite
   `backend/scripts/ingest_regional_no2_measurements.py` prek `sys.executable`
   namesto `docker compose run --rm backend …`.

Po namestitvi sprožite iz razporejevalnika, ki ga ponuja vaša platforma
(GitHub Actions, k8s CronJob, Fly.io scheduled machines itd.):

```bash
curl -X POST https://<host>/admin/refresh-latest \
  -H "X-Admin-Token: ${ADMIN_REFRESH_TOKEN}"
# -> 202 Accepted; zaključek spremljaj prek nadzorne plošče ali:
curl https://<host>/api/v1/regions/latest-measurements
```

## Predpogoji

Enaki predpogoji kot za `run_latest_no2_pipeline.py`:

- Docker Desktop / Docker Engine teče, z `docker compose up -d db backend` v
  zdravem stanju. **Če je Docker ob času osveževanja zaprt, zagon čisto odpove z
  izhodno kodo 1**; to je zabeleženo, a ni ponovljeno.
- Repo `.env` z izpolnjenimi `COPERNICUS_USERNAME`, `COPERNICUS_PASSWORD` in
  `POSTGRES_*`.
- GISCO NUTS3 GeoJSON na poti, ki jo orkestrator pričakuje
  (`data_pipeline/reference_data/regions/raw/NUTS_RG_20M_2024_4326_LEVL_3.geojson`).
- Python z razpoložljivimi `requests`, `python-dotenv`, `xarray`, `numpy`,
  `netCDF4` za izbrani interpreter.

## Preverjanje delovanja

Po zagonu naj bo nova vrednost `measurement_end_time` vidna na nadzorni plošči
(kartica meritve izbrane regije) oziroma prek API-ja. Iz lupine:

```bash
curl -s http://localhost:8000/api/v1/regions/latest-measurements \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); \
                print(max(r["measurement_end_time"] for r in d))'
```

Ta vrednost, ki se iz dneva v dan premika, je pogodba: "novi podatki so
pripravljeni za prikaz" = zadnji `measurement_end_time` v API-ju se je spremenil.

## Dnevniki

- `logs/refresh_YYYY-MM-DD.log` — ena datoteka na UTC dan, samo dodajanje.
- `logs/refresh_latest.log` — simbolna povezava na današnji dnevnik.
- `logs/launchd.stdout.log` / `logs/launchd.stderr.log` — kar ovoj izpiše, preden
  je njegovo lastno beleženje vzpostavljeno (redko; večinoma prazno).

Vse datoteke dnevnikov so gitignorirane pod `data_pipeline/automation/logs/`.
