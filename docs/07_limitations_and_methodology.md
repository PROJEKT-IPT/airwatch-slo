# 07 - Omejitve in metodologija

Ta dokument povzema, kako AirWatch SLO pripravi in prikazuje regionalne vrednosti
NO2 ter katere omejitve mora uporabnik upoštevati pri interpretaciji rezultatov.

## Namen prikaza

AirWatch SLO je pregledovalnik zadnje razpoložljive obdelane vrednosti NO2 po
slovenskih statističnih regijah. Namenjen je regionalnemu pregledu in primerjavi
med regijami, ne pa operativnemu opozarjanju, napovedovanju ali ocenjevanju
onesnaženosti na posamezni ulici.

## Vir podatkov

Podatkovni vir je Copernicus Sentinel-5P, instrument TROPOMI, produkt
`S5P_OFFL_L2__NO2`. To je satelitski vir podatkov o atmosferskem stolpcu NO2.
Vrednosti v aplikaciji zato niso neposredne meritve talnih postaj in ne
predstavljajo koncentracije pri tleh na točni lokaciji uporabnika.

Sentinel-5P OFFL produkti so objavljeni z zamikom. Aplikacija prikaže najnovejši
produkt, ki je bil prenesen, obdelan, validiran in vnesen v bazo.

## Metodologija obdelave

Data pipeline za vsak izbran Sentinel-5P produkt izvede naslednje korake:

1. prenese oziroma uporabi en Sentinel-5P NO2 NetCDF produkt,
2. omeji podatke na območje Slovenije,
3. uporabi kakovostni filter `qa_value >= 0.75`,
4. veljavne piksle dodeli statističnim regijam,
5. za vsako regijo izračuna `value_mean`, `value_min`, `value_max` in
   `pixel_count_valid`,
6. rezultat validira in ga vnese v PostgreSQL/PostGIS bazo.

Regija brez veljavnih pikslov ostane v rezultatu, vendar dobi status
`no_valid_pixels` in `null` vrednosti. Aplikacija tak primer prikaže kot "ni
podatkov", ne kot vrednost 0.

## Ključne omejitve

- **Aplikacija ni v realnem času.** Prikazuje zadnjo razpoložljivo obdelano
  meritev, zato je čas prikaza odvisen od razpoložljivosti Sentinel-5P produkta
  in uspešnega zagona obdelave.
- **Aplikacija ni street-level prikaz.** En piksel TROPOMI pokriva približno
  3,5 x 5,5 km, zato podatki ne ločijo posameznih ulic, stavb, cestnih odsekov
  ali majhnih lokalnih virov.
- **Sentinel-5P je satelitski vir.** Vrednosti so satelitske ocene atmosferskega
  stolpca NO2, ne uradne meritve talnih merilnih postaj.
- **GISCO meje so generalizirane.** Statistične regije temeljijo na Eurostat
  GISCO NUTS mejah, ki so primerne za regionalno kartografijo, niso pa namenjene
  katastrski ali zelo natančni prostorski analizi.
- **Agregacija je poenostavljena.** Piksel je obravnavan kot točka
  `(longitude, latitude)` in dodeljen regiji s postopkom point-in-polygon.
  Izračun ne uporablja uteževanja po satelitskem footprintu, deležu prekrivanja
  piksla z regijo, meteoroloških modelov ali povezovanja s talnimi postajami.

## Interpretacija rezultata

`value_mean` je povprečje veljavnih satelitskih pikslov, ki so bili dodeljeni
regiji po kakovostnem filtru. Primeren je za previdno regionalno primerjavo in
spremljanje obdelanih časovnih zaporedij, ne pa za sklepanje o izpostavljenosti
na konkretni ulici ali naslovu.

Razlike med regijami je treba brati skupaj s številom veljavnih pikslov,
kakovostnim statusom, časom meritve in zavedanjem, da lahko oblaki, sneg,
retrieval pogoji ali zamik pri objavi produkta povzročijo manjkajoče podatke.

## Zaključek

AirWatch SLO namenoma uporablja regionalni prikaz, ker je ta usklajen s prostorsko
ločljivostjo Sentinel-5P in z razpoložljivimi GISCO mejami. Rezultat je uporaben
kot sledljiv regionalni indikator iz satelitskih podatkov, ne kot real-time,
street-level ali uradna talna meritev kakovosti zraka.
