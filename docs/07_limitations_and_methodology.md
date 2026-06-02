# 07 - Omejitve in metodologija

Ta dokument povzema, kako AirWatch SLO pripravi in prikazuje regionalne vrednosti
NO2 ter katere omejitve mora uporabnik upostevati pri interpretaciji rezultatov.

## Namen prikaza

AirWatch SLO je pregledovalnik zadnje razpolozljive obdelane vrednosti NO2 po
slovenskih statisticnih regijah. Namenjen je regionalnemu pregledu in primerjavi
med regijami, ne pa operativnemu opozarjanju, napovedovanju ali ocenjevanju
onesnazenosti na posamezni ulici.

## Vir podatkov

Podatkovni vir je Copernicus Sentinel-5P, instrument TROPOMI, produkt
`S5P_OFFL_L2__NO2`. To je satelitski vir podatkov o atmosferskem stolpcu NO2.
Vrednosti v aplikaciji zato niso neposredne meritve talnih postaj in ne
predstavljajo koncentracije pri tleh na tocni lokaciji uporabnika.

Sentinel-5P OFFL produkti so objavljeni z zamikom. Aplikacija prikaze najnovejsi
produkt, ki je bil prenesen, obdelan, validiran in vnesen v bazo.

## Metodologija obdelave

Data pipeline za vsak izbran Sentinel-5P produkt izvede naslednje korake:

1. prenese oziroma uporabi en Sentinel-5P NO2 NetCDF produkt,
2. omeji podatke na obmocje Slovenije,
3. uporabi kakovostni filter `qa_value >= 0.75`,
4. veljavne piksle dodeli statisticnim regijam,
5. za vsako regijo izracuna `value_mean`, `value_min`, `value_max` in
   `pixel_count_valid`,
6. rezultat validira in ga vnese v PostgreSQL/PostGIS bazo.

Regija brez veljavnih pikslov ostane v rezultatu, vendar dobi status
`no_valid_pixels` in `null` vrednosti. Aplikacija tak primer prikaze kot "ni
podatkov", ne kot vrednost 0.

## Kljucne omejitve

- **Aplikacija ni v realnem casu.** Prikazuje zadnjo razpolozljivo obdelano
  meritev, zato je cas prikaza odvisen od razpolozljivosti Sentinel-5P produkta
  in uspesnega zagona obdelave.
- **Aplikacija ni street-level prikaz.** En piksel TROPOMI pokriva priblizno
  3,5 x 5,5 km, zato podatki ne locijo posameznih ulic, stavb, cestnih odsekov
  ali majhnih lokalnih virov.
- **Sentinel-5P je satelitski vir.** Vrednosti so satelitske ocene atmosferskega
  stolpca NO2, ne uradne meritve talnih merilnih postaj.
- **GISCO meje so generalizirane.** Statisticne regije temeljijo na Eurostat
  GISCO NUTS mejah, ki so primerne za regionalno kartografijo, niso pa namenjene
  katastrski ali zelo natancni prostorski analizi.
- **Agregacija je poenostavljena.** Piksel je obravnavan kot tocka
  `(longitude, latitude)` in dodeljen regiji s postopkom point-in-polygon.
  Izracun ne uporablja utezevanja po satelitskem footprintu, delezu prekrivanja
  piksla z regijo, meteoroloskih modelov ali povezovanja s talnimi postajami.

## Interpretacija rezultata

`value_mean` je povprecje veljavnih satelitskih pikslov, ki so bili dodeljeni
regiji po kakovostnem filtru. Primeren je za previdno regionalno primerjavo in
spremljanje obdelanih casovnih zaporedij, ne pa za sklepanje o izpostavljenosti
na konkretni ulici ali naslovu.

Razlike med regijami je treba brati skupaj s stevilom veljavnih pikslov,
kakovostnim statusom, casom meritve in zavedanjem, da lahko oblaki, sneg,
retrieval pogoji ali zamik pri objavi produkta povzrocijo manjkajoce podatke.

## Zakljucek

AirWatch SLO namenoma uporablja regionalni prikaz, ker je ta usklajen s prostorsko
locljivostjo Sentinel-5P in z razpolozljivimi GISCO mejami. Rezultat je uporaben
kot sledljiv regionalni indikator iz satelitskih podatkov, ne kot real-time,
street-level ali uradna talna meritev kakovosti zraka.
