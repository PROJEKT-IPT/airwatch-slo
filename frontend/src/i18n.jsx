/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'airwatch-language'
const DEFAULT_LANGUAGE = 'sl'

const locales = {
  sl: 'sl-SI',
  en: 'en-US',
  de: 'de-DE',
}

export const supportedLanguages = [
  { code: 'sl', label: 'SL' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
]

const translations = {
  sl: {
    languageName: 'Slovenščina',
    languageToggleLabel: 'Jezik vmesnika',
    switchToEnglish: 'Preklopi na angleščino',
    accessibilityTitle: 'Dostopnost',
    accessibilityLargeText: 'Večje besedilo',
    accessibilityHighContrast: 'Visok kontrast',
    accessibilityReduceMotion: 'Manj gibanja',
    brandSubtitle: 'Satelitsko spremljanje kakovosti zraka nad Slovenijo',
    navMain: 'Glavna navigacija',
    navOverview: 'Pregled',
    navTrend: 'Zgodovinski trend',
    navComparison: 'Primerjava regij',
    navDataExport: 'Podatki & izvoz',
    navMap: 'Karta regij',
    navMethodology: 'Metodologija',
    navSuggestions: 'Predloge',
    navAbout: 'O aplikaciji',
    collapseSidebar: 'Skrči',
    expandSidebar: 'Razširi stranski meni',
    aboutLead: 'O aplikaciji in viru podatkov.',
    aboutText1:
      'AirWatch SLO prikazuje zadnjo razpoložljivo obdelano meritev NO₂ po 12 slovenskih statističnih regijah na podlagi satelitskih podatkov Copernicus Sentinel-5P (TROPOMI).',
    aboutText2:
      'Vrednosti so regionalne satelitske ocene – niso meritve v realnem času in ne meritve na ravni ulice. Manjkajoče vrednosti pomenijo, da za regijo ni bilo dovolj veljavnih pikslov.',
    aboutVisionText:
      'Jedro rešitve ni le prikaz zemljevida, temveč pretvorba kompleksnih satelitskih (EO) podatkov v razumljive, primerljive in uporabne informacije. Za izbrano regijo lahko hitro preverite stanje, spremljate trende, primerjate regije in izvozite rezultate za nadaljnjo analizo ali poročanje.',
    aboutUsersTitle: 'Za koga je',
    aboutUsersResearchers:
      'Raziskovalci, študenti in okoljski analitiki – hiter vpogled v regionalne razlike, zgodovinske trende in izvoz podatkov.',
    aboutUsersPublic:
      'Javne ustanove, občine in okoljske organizacije – razumljiv regionalni pregled za poročila in ozaveščanje.',
    aboutUsersEducation: 'Srednje šole, univerze in učitelji – poenostavljen prikaz za pedagoško uporabo.',
    aboutFeaturesTitle: 'Kaj omogoča',
    aboutFeature1: 'Izberete regijo na zemljevidu in vidite zadnje razpoložljivo stanje NO₂.',
    aboutFeature2: 'Odprete podroben pregled regije z datumom zadnje meritve in izvornim satelitskim produktom.',
    aboutFeature3: 'Spremljate zgodovinski trend po regiji in primerjate regije med seboj.',
    aboutFeature4: 'Izvozite podatke vseh regij v CSV za nadaljnjo analizo ali poročanje.',
    aboutLimitsTitle: 'Omejitve',
    aboutLimitsText:
      'Prostorska ločljivost Sentinel-5P ne omogoča interpretacije na ravni ulice ali posameznega mesta, zato je rešitev namenoma omejena na regionalni nivo. Prikaz ni v realnem času; kadar za izbrani dan ni dovolj kakovostnih podatkov, sistem prikaže zadnji veljavni sloj in jasno označi datum.',
    aboutScopeTitle: 'Kaj namenoma ni vključeno',
    aboutScopeText:
      'Rešitev ne vključuje napovedovanja kakovosti zraka ali strojnih (ML) prognoz, mobilne aplikacije, sistema opozoril ter prikaza na ravni občin, ulic ali posameznih merilnih točk.',
    aboutDataTitle: 'Vir podatkov in tehnologija',
    aboutDataText:
      'Podatki izhajajo iz Copernicus Sentinel-5P (instrument TROPOMI). Agregirane regionalne časovne vrste in metapodatki se hranijo v bazi PostgreSQL/PostGIS, vsaka vrednost pa je sledljiva do izvornega produkta in časa satelitskega preleta.',
    aboutTeamTitle: 'Ekipa',
    aboutTeamText: 'AirWatch SLO – ekipa: Maida Ćivić, Matija Čoh in Aleš Fon Cafnik (Projekt IPT).',
    mapViewLead: 'Klik na regijo jo izbere. Barva prikazuje odstopanje NO₂ od povprečja regij.',
    trendViewLead: 'Zgodovinski potek NO₂ za izbrano regijo. Po potrebi omejite časovno obdobje.',
    comparisonViewLead: 'Primerjava zadnjih razpoložljivih vrednosti NO₂ med regijami.',
    methodologyViewLead: 'Kaj pomenijo podatki Sentinel-5P, kakovostni filter in omejitve.',
    navSatellite: 'Satelit',
    satLiveTitle: 'Kje je Sentinel-5P trenutno?',
    satLiveText:
      'Spodnji prikaz sproti preračuna približno trenutno pod-satelitsko točko Sentinel-5P iz javnih orbitalnih elementov TLE. To je lokacija satelita, ne meritev NO₂ v realnem času.',
    satLiveHowText:
      'Deluje tako, da aplikacija prebere dva TLE zapisa za orbito, iz njiju izračuna trenutni položaj satelita glede na čas UTC in ga preslika na zemljevid kot točko neposredno pod satelitom. Koordinate, višina in hitrost so zato orbitalna ocena, prikaz pa se samodejno osveži približno vsakih 15 sekund.',
    satLatitude: 'Zemljepisna širina',
    satLongitude: 'Zemljepisna dolžina',
    satAltitude: 'Višina',
    satVelocity: 'Hitrost',
    satLiveSource:
      'Preračunano ob {time} po lokalnem času iz TLE elementov z epoho {epoch} UTC. Prikaz je informativen in se posodobi približno vsakih 15 sekund.',
    satMapAria: 'Leaflet zemljevid z ocenjeno trenutno lokacijo satelita Sentinel-5P',
    satOtherSats:
      'Za orientacijo so prikazani tudi nekateri drugi Copernicus sateliti in ISS. Naš satelit (Sentinel-5P) je posebej označen. Zemljevid lahko povečate in premikate; vse lokacije so približne.',
    satWhatTitle: 'Kaj je naš satelit?',
    satIntro:
      'AirWatch SLO podatke črpa iz evropskega satelita Sentinel-5P (program Copernicus, ESA/EU). Ta z instrumentom TROPOMI iz vesolja meri onesnaževala v ozračju, med njimi tudi dušikov dioksid (NO₂), ki ga prikazujemo po slovenskih statističnih regijah.',
    satFactInstrumentLabel: 'Instrument',
    satFactInstrumentValue: 'TROPOMI',
    satFactLaunchLabel: 'Izstrelitev',
    satFactLaunchValue: 'Oktober 2017',
    satFactOrbitLabel: 'Višina orbite',
    satFactOrbitValue: '≈ 824 km',
    satFactResolutionLabel: 'Prostorska ločljivost',
    satFactResolutionValue: '≈ 3,5 × 5,5 km',
    satWhereTitle: 'Kje se nahaja in kako kroži',
    satWhereText:
      'Sentinel-5P kroži okoli Zemlje v sončno-sinhroni orbiti na višini približno 824 km. Čez isto območje preleti enkrat dnevno, vedno ob približno enakem lokalnem času (okoli 13:30), zato so dnevni posnetki med seboj primerljivi. V enem dnevu prečka celoten planet in tako zajame tudi vso Slovenijo.',
    satTropomiTitle: 'Aparat TROPOMI',
    satTropomiText:
      'TROPOMI (TROPOspheric Monitoring Instrument) je spektrometer na satelitu Sentinel-5P. Zaznava, kako ozračje absorbira in razprši sončno svetlobo, iz teh spektralnih odtisov pa se izračunajo stolpci plinov v atmosferi.',
    satTropomiNo2:
      'Za AirWatch SLO je ključen produkt NO₂: najprej vzamemo satelitske piksle nad Slovenijo, odstranimo meritve slabše kakovosti in nato izračunamo regionalna povprečja. Zato aplikacija prikazuje sledljive regionalne ocene, ne neposrednih talnih senzorjev.',
    satDataTitle: 'Kakšne podatke zajema',
    satDataText:
      'Instrument TROPOMI meri sončno svetlobo, ki se odbije skozi ozračje, in iz nje izračuna količine več plinov in onesnaževal v zraku:',
    satDataFocus:
      'V tej aplikaciji prikazujemo samo dušikov dioksid (NO₂) – plin, ki nastaja predvsem pri prometu in kurjenju goriv.',
    satAerosolsClouds: 'aerosoli in oblaki',
    satProcessTitle: 'Kako podatki pridejo do prikaza',
    satProcessText:
      'Surove satelitske produkte (Sentinel-5P L2) prevzamemo, filtriramo po kakovosti in povprečimo po posamezni statistični regiji. Za vsako regijo prikažemo zadnjo razpoložljivo obdelano meritev.',
    satNotRealTime:
      'Prikaz ni v realnem času in ni meritev na ravni ulice. En piksel pokriva več kilometrov, prikazane vrednosti pa so regionalne satelitske ocene.',
    dashboardTitle: 'Pregled NO₂ po slovenskih statističnih regijah',
    dashboardSubtitle:
      'Zadnja razpoložljiva obdelana meritev NO₂ iz satelitskih produktov Sentinel-5P. Prikaz ni v realnem času.',
    heroAria: 'Izbrana regija in zadnja meritev',
    analysis: 'Analiza',
    analysisLead:
      'Zgodovinski trend izbrane regije in primerjava regij po zadnji razpoložljivi vrednosti NO₂.',
    dataMethodology: 'Podatki in metodologija',
    dataMethodologyLead: 'Podrobnosti meritve, izvor in sledljivost podatka ter kako brati rezultat.',
    latestMeasurement: 'Zadnja meritev',
    notRealTimeNote: 'Ni v realnem času',
    concentrationLow: 'Nizka koncentracija',
    concentrationModerate: 'Srednja koncentracija',
    concentrationHigh: 'Visoka koncentracija',
    lastMeasurement: 'Zadnja meritev',
    loading: 'Nalaganje...',
    noData: 'Ni podatka',
    today: 'danes',
    yesterday: 'včeraj',
    daysAgo: 'pred {count} dnevi',
    regionLoadError:
      'Statističnih regij ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so podatki naloženi v bazo.',
    geometryLoadError:
      'Geometrij statističnih regij ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so regionalne meje naložene v bazo.',
    comparisonLoadError:
      'Primerjave regij ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so podatki naloženi v bazo.',
    detailLoadError:
      'Podrobnosti izbrane regije ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so podatki naloženi v bazo.',
    selectedRegion: 'Izbrana regija',
    noRegionSelected: 'Ni izbrane regije',
    selectRegionForMeasurement:
      'Izberite statistično regijo za prikaz zadnje razpoložljive veljavne meritve.',
    loadingLatestMeasurement: 'Nalaganje zadnje razpoložljive veljavne meritve NO₂...',
    measurementLoadErrorTitle: 'Napaka pri nalaganju meritve',
    noStoredMeasurementTitle: 'Za izbrano regijo ni shranjene meritve',
    noStoredMeasurementText:
      'Za izbrano regijo trenutno ni shranjene zadnje razpoložljive veljavne meritve NO₂. Poskusite drugo regijo ali preverite status obdelave podatkov.',
    latestValidMeasurement: 'Zadnja razpoložljiva veljavna meritev',
    validPixels: 'Veljavnih pikslov',
    qaThreshold: 'QA prag',
    rankLabel: 'Uvrstitev',
    measurementTime: 'Čas meritve',
    productSource: 'Vir produkta',
    status: 'Status',
    valid: 'Veljavno',
    noValidPixels: 'Ni veljavnih pikslov',
    noDataStatus: 'Ni podatkov',
    processingError: 'Napaka obdelave',
    unknown: 'Neznano',
    noValidDataTitle: 'Ni veljavnih podatkov za izbrano regijo',
    noValidDataText:
      'Za izbrani Sentinel-5P produkt v tej regiji ni bilo dovolj veljavnih NO₂ pikslov po kakovostnem filtru (qa_value >= 0.75). Pogost vzrok so oblaki, sneg ali nizka kakovost retrievala.',
    measurementProcessingErrorTitle: 'Napaka pri obdelavi meritve',
    measurementProcessingErrorText:
      'Izbrane meritve trenutno ni mogoče prikazati kot zanesljive vrednosti, ker se obdelava ni uspešno zaključila. Vrednosti zato niso prikazane.',
    no2UnavailableTitle: 'Vrednost NO₂ ni na voljo',
    no2UnavailableText: 'Za izbrano regijo ni dovolj veljavnih podatkov za izračun regionalne vrednosti NO₂.',
    regionLabel: 'Statistična regija',
    loadingRegions: 'Nalaganje regij...',
    chooseRegion: 'Izberite regijo',
    pickerTitle: 'Izberite statistično regijo',
    searchPlaceholder: 'Išči po imenu ali kodi',
    noRegionsFound: 'Ni najdenih regij. Poskusite z imenom regije ali kodo, npr. SI041.',
    noValidPixelsSuffix: 'ni veljavnih pikslov',
    regionsUnavailable:
      'Regijski podatki trenutno niso na voljo. Možno je, da regionalne meritve še niso bile naložene v bazo.',
    methodology: 'Metodologija',
    howToRead: 'Kako brati rezultat',
    methodologyText1:
      'Vrednost je satelitska regionalna ocena NO₂ iz produktov Sentinel-5P (TROPOMI), agregirana po statistični regiji. En piksel pokriva približno 3,5 x 5,5 km, zato podatkov ni smiselno brati kot ulične koncentracije. Prikaz ni v realnem času.',
    methodologyText2:
      'Uporabljen je kakovostni filter qa_value >= 0.75. Če regija nima dovolj veljavnih pikslov, jo prikažemo kot "ni podatkov" in vrednosti ne izračunamo.',
    methodologyText3:
      'Meje regij izvirajo iz generaliziranih Eurostat GISCO NUTS podatkov. Agregacija je poenostavljena: veljavni satelitski piksel se obravnava kot točka in dodeli statistični regiji, brez uteževanja po odtisu piksla ali talnih meritev.',
    exportPdf: 'Izvozi PDF',
    methAppTitle: 'Kaj prikazuje AirWatch SLO?',
    methAppText:
      'AirWatch SLO prikazuje, koliko dušikovega dioksida (NO₂) je v zraku nad 12 slovenskimi statističnimi regijami. Podatki prihajajo iz evropskega satelita Sentinel-5P, ki onesnaženost ozračja meri iz vesolja. Cilj je preprosto in pregledno pokazati, kje je zrak bolj obremenjen z NO₂ in kako se to spreminja skozi čas.',
    methNo2Title: 'Kaj je NO₂ in zakaj je pomemben?',
    methNo2Text:
      'Dušikov dioksid (NO₂) je plin, ki nastaja predvsem pri zgorevanju goriv – v prometu (dizelski in bencinski motorji), pri ogrevanju stavb, v industriji in termoelektrarnah. Je eden glavnih kazalnikov onesnaženosti zraka, zlasti v mestih in ob prometnicah.',
    methNo2Effects:
      'Povišane vrednosti NO₂ dražijo dihala, poslabšajo astmo in pljučne bolezni ter prispevajo k nastanku smoga in kislega dežja. Spremljanje NO₂ zato pomaga razumeti kakovost zraka ter vpliv prometa in industrije na zdravje in okolje.',
    methHowTitle: 'Kako nastane prikazana vrednost?',
    methStep1:
      'Satelit Sentinel-5P z instrumentom TROPOMI izmeri, koliko sončne svetlobe ozračje absorbira pri valovnih dolžinah, značilnih za NO₂.',
    methStep2:
      'Iz tega izračuna stolpčno gostoto NO₂ – količino NO₂ v navpičnem stolpcu zraka nad določeno točko.',
    methStep3:
      'Posnetke omejimo na Slovenijo in obdržimo le piksle dovolj dobre kakovosti (kakovostni filter qa_value ≥ 0,75; oblačne in nezanesljive meritve izločimo).',
    methStep4:
      'Vsak veljaven piksel pripišemo statistični regiji (meje regij so iz podatkov Eurostat GISCO NUTS) in izračunamo povprečje na regijo.',
    methStep5:
      'Za vsako regijo prikažemo zadnjo razpoložljivo obdelano vrednost; postopek se ponovi, ko so na voljo novi satelitski produkti.',
    methValueText:
      'Vrednost je podana v mol/m² in je običajno zelo majhna, npr. 2,7 × 10⁻⁵ mol/m². Pove, koliko molov NO₂ je v navpičnem stolpcu zraka nad enim kvadratnim metrom tal – torej skupno količino plina od tal do vrha ozračja, ne koncentracije tik pri tleh. Zaradi berljivosti jo ponekod prikažemo v µmol/m² (1 µmol = 10⁻⁶ mol). Višja kot je vrednost, več NO₂ je v zraku nad regijo.',
    methColorsText:
      'Barve na zemljevidu in v primerjavi regij prikazujejo relativno raven: zelena pomeni nižje, rumena in oranžna pa višje vrednosti glede na druge regije. Oznake »nizka/srednja/visoka koncentracija« so torej primerjalne med slovenskimi regijami in niso zdravstvene mejne vrednosti.',
    methLimitsTitle: 'Omejitve',
    methLimitsText:
      'Prikaz ni v realnem času – satelitski produkti so na voljo z nekajdnevnim zamikom. Prav tako ni meritev na ravni ulice: en piksel pokriva približno 3,5 × 5,5 km, vrednost pa je satelitska ocena za celotno regijo in ne nadomešča talnih merilnih postaj. Če regija nima dovolj veljavnih pikslov (npr. zaradi oblakov), je prikazana kot »ni podatkov«.',
    spatialOverview: 'Prostorski pregled',
    mapTitle: 'Zemljevid statističnih regij',
    mapAria: 'Zemljevid slovenskih statističnih regij',
    loadingMap: 'Nalaganje prostorskega pregleda regij...',
    mapErrorTitle: 'Regij ni mogoče prikazati',
    noGeometriesTitle: 'Geometrije regij trenutno niso na voljo',
    noGeometriesText: 'Regionalne meje morda še niso bile naložene v bazo.',
    interactiveMapAria: 'Interaktivni Leaflet zemljevid slovenskih statističnih regij',
    mapControlsAria: 'Izbira regije na zemljevidu',
    selectMapRegion: 'Izberi regijo na zemljevidu {region}',
    mapLegendAria: 'Pomen barv na zemljevidu',
    validMeasurement: 'Veljavna meritev',
    processingErrorLegend: 'Napaka obdelave',
    deviationWellBelowAverage: 'Precej pod povprečjem',
    deviationBelowAverage: 'Pod povprečjem',
    deviationNearAverage: 'Okrog povprečja',
    deviationAboveAverage: 'Nad povprečjem',
    deviationWellAboveAverage: 'Precej nad povprečjem',
    mapAverageDeviation: 'Odstopanje od povprečja',
    mapMeanDeviation: 'Odstopanje od srednje vrednosti',
    showDeviations: 'Prikaži odstopanja',
    showValues: 'Prikaži vrednosti',
    mapLegendAbsoluteMetric: 'NO₂ vrednost',
    mapLegendDynamicScale: 'dinamični pragovi',
    mapLegendDeviationMetric: 'Δ NO₂ od srednje vrednosti',
    mapLegendDeviationScale: 'srednja vrednost: {mean} µmol/m²',
    mapModeLabel: 'Način prikaza zemljevida',
    mapModeValue: 'NO₂ vrednost',
    mapModeQuality: 'Kakovost podatkov',
    mapLegendRelativeScale: 'relativna lestvica',
    mapLegendValueHint: 'Temnejša barva pomeni višjo vrednost NO₂ med prikazanimi regijami.',
    mapLegendDeviationHint: 'Modra barva pomeni pod povprečjem, rdeča nad povprečjem prikazanih regij.',
    mapLegendQualityHint: 'Barva prikazuje stanje kakovosti meritve za posamezno regijo.',
    mapResetView: 'Ponastavi pogled na celotno Slovenijo',
    mapZoomLabel: 'Povečava zemljevida',
    activeOnMap: 'Izbrano na zemljevidu',
    mapHint:
      'Klik izbere regijo. Barve prikazujejo zadnje vrednosti NO₂; odstopanja od srednje vrednosti so na voljo z gumbom. Pika v oznaki prikazuje status kakovosti.',
    selected: 'Izbrano',
    comparisonTitle: 'NO₂ po statističnih regijah',
    noRegions: 'Ni regij',
    withValue: '{valid}/{total} z vrednostjo',
    comparisonUnavailable:
      'Regijski podatki trenutno niso na voljo. Primerjava bo prikazana, ko bodo meritve naložene iz API-ja.',
    comparisonSummaryAria: 'Povzetek primerjave regij',
    highestValue: 'Najvišja vrednost',
    lowestValue: 'Najnižja vrednost',
    withoutValidPixels: 'Brez veljavnih pikslov',
    comparisonListAria: 'Primerjava zadnjih meritev',
    selectRegion: 'Izberi regijo {region}',
    loadingComparison: 'Nalaganje primerjave regij...',
    noValidValue: 'Ni veljavne vrednosti',
    detailsKicker: 'Podatki in izvor regije',
    regionNotSelected: 'Regija ni izbrana',
    regionCode: 'Koda regije',
    exportRegionLatestCsv: 'Izvozi regijo (CSV)',
    exportRegionHistoryCsv: 'Izvozi zgodovino regije (CSV)',
    exportCsv: 'Izvozi vse regije (CSV)',
    selectRegionForDetails: 'Izberite statistično regijo za prikaz zadnje meritve NO₂.',
    loadingRegionData: 'Nalaganje podatkov za izbrano regijo...',
    detailsLoadErrorTitle: 'Podatkov ni mogoče naložiti',
    noRegionDataTitle: 'Ni podatkov za izbrano regijo',
    noRegionDataText: 'Za izbrano regijo trenutno ni shranjene zadnje meritve NO₂.',
    qualityStatus: 'Status kakovosti',
    measurementStart: 'Začetek meritve',
    measurementEnd: 'Konec meritve',
    processingRunId: 'ID obdelave',
    dataSource: 'Izvor podatkov',
    productId: 'ID produkta',
    latestNo2Value: 'Zadnja vrednost NO₂',
    minMaxNo2: 'Min / max NO₂',
    unit: 'Enota',
    provenanceNoPixels:
      'Sentinel-5P produkt je bil obdelan, vendar regionalna vrednost NO₂ ni bila izračunana, ker ni bilo dovolj veljavnih pikslov po kakovostnem filtru. Zgornji podatki ohranjajo sledljivost do izvornega produkta in zapisa obdelave.',
    provenanceProcessingError:
      'Obdelava izbrane meritve ni bila uspešna, zato zanesljiva regionalna vrednost NO₂ ni bila zapisana. Zgornji podatki ohranjajo sledljivost do izvornega produkta in zapisa obdelave.',
    provenanceDefault:
      'Podatek je sledljiv do izvornega Sentinel-5P produkta; čas meritve se nanaša na satelitski prelet.',
    historyKicker: 'Zgodovina meritev',
    trendTitle: 'Zgodovinski trend NO₂',
    historyLoadError:
      'Zgodovine meritev ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so podatki naloženi v bazo.',
    startDateUnavailable: 'Izbrani začetni datum nima razpoložljivih podatkov.',
    endDateUnavailable: 'Izbrani končni datum nima razpoložljivih podatkov.',
    startBeforeEnd: 'Začetni datum mora biti pred ali enak končnemu datumu.',
    from: 'Od',
    to: 'Do',
    allDates: 'Vsi datumi',
    noAvailableDates: 'Ni razpoložljivih datumov',
    show: 'Prikaži',
    clear: 'Počisti',
    trendLead:
      'Prikaz zgodovinskih vrednosti NO₂ za regijo {region}. Podatki temeljijo na obdelanih Sentinel-5P produktih.',
    date: 'Datum meritve',
    trendHint:
      'Graf prikazuje povprečne vrednosti NO₂ po času. Manjkajoče vrednosti pomenijo, da za določen časovni interval ni bilo veljavnih pikslov.',
    noDataForDateTitle: 'Ni podatkov za izbrani datum',
    noDataForDateText:
      'Za izbrani datumski interval ni zgodovinskih meritev NO₂. Izberite drug interval ali počistite izbor, da se vrnete na razpoložljive podatke.',
    noHistoryTitle: 'Ni zgodovinskih meritev',
    trendUnavailableTitle: 'Trend še ni na voljo',
    noHistoryText: 'Za izbrano regijo trenutno ni zgodovinskih meritev NO₂.',
    trendNeedsTwo:
      'Za prikaz trenda sta potrebni vsaj dve meritvi; trenutno je na voljo ena meritev{date}.',
    loadingErrorTitle: 'Napaka pri nalaganju',
    adminTitle: 'Status obdelave podatkov',
    adminSubtitle: 'Zadnji zapis obdelave za hitro preverjanje podatkovnega toka.',
    processingStatusLoadError: 'Statusa obdelave ni bilo mogoče naložiti iz API-ja.',
    processingHistoryLoadError: 'Zgodovine obdelav ni bilo mogoče naložiti iz API-ja.',
    latestProcessing: 'Zadnja obdelava',
    latestProcessingRun: 'Zadnji processing run',
    latestProduct: 'Zadnji Sentinel-5P produkt',
    latestSuccessfulUpdate: 'Zadnja uspešna posodobitev',
    product: 'Produkt',
    script: 'Skripta',
    scriptVersion: 'Verzija skripte',
    startedAt: 'Začetek',
    finishedAt: 'Konec',
    error: 'Napaka',
    processingHistory: 'Zgodovina obdelav',
    previousRuns: 'Pretekli processing runi',
    latestCount: 'Zadnjih {count}',
    loadingProcessingStatus: 'Nalagam status obdelave...',
    loadingProcessingHistory: 'Nalagam zgodovino obdelav...',
    processingStatusErrorTitle: 'Napaka pri nalaganju statusa',
    processingHistoryErrorTitle: 'Napaka pri nalaganju zgodovine',
    noProcessingRecordsTitle: 'Ni zapisov obdelave',
    noProcessingRecordsText: 'V bazi trenutno ni nobenega zapisa obdelave.',
    noProcessingHistoryTitle: 'Ni zgodovine obdelav',
    noProcessingHistoryText: 'V bazi trenutno ni nobenega processing run zapisa.',
    validRegions: 'Veljavne regije',
    success: 'Uspešno',
    running: 'V teku',
    failed: 'Napaka',
    latestRunSuccess: 'Zadnja obdelava je bila uspešna',
    latestRunRunning: 'Obdelava je trenutno v teku',
    latestRunFailed: 'Zadnja obdelava ni bila uspešna',
    latestRunUnknown: 'Status zadnje obdelave ni znan',
  },
  en: {
    languageName: 'English',
    languageToggleLabel: 'Interface language',
    switchToEnglish: 'Switch to Slovenian',
    accessibilityTitle: 'Accessibility',
    accessibilityLargeText: 'Larger text',
    accessibilityHighContrast: 'High contrast',
    accessibilityReduceMotion: 'Reduce motion',
    brandSubtitle: 'Satellite air-quality monitoring over Slovenia',
    navMain: 'Main navigation',
    navOverview: 'Overview',
    navTrend: 'Historical trend',
    navComparison: 'Region comparison',
    navDataExport: 'Data & export',
    navMap: 'Region map',
    navMethodology: 'Methodology',
    navSuggestions: 'Suggestions',
    navAbout: 'About',
    collapseSidebar: 'Collapse',
    expandSidebar: 'Expand sidebar',
    aboutLead: 'About the application and its data source.',
    aboutText1:
      'AirWatch SLO shows the latest available processed NO₂ measurement for the 12 Slovenian statistical regions, based on Copernicus Sentinel-5P (TROPOMI) satellite data.',
    aboutText2:
      'Values are regional satellite estimates — not real-time and not street-level. Missing values mean a region did not have enough valid pixels.',
    aboutVisionText:
      'The core of the solution is not just a map, but turning complex satellite (EO) data into understandable, comparable and useful information. For a chosen region you can quickly check the state, follow trends, compare regions and export results for further analysis or reporting.',
    aboutUsersTitle: 'Who it is for',
    aboutUsersResearchers:
      'Researchers, students and environmental analysts — quick insight into regional differences, historical trends and data export.',
    aboutUsersPublic:
      'Public institutions, municipalities and environmental organisations — a clear regional overview for reports and awareness.',
    aboutUsersEducation: 'Secondary schools, universities and teachers — a simplified view for educational use.',
    aboutFeaturesTitle: 'What you can do',
    aboutFeature1: 'Pick a region on the map and see its latest available NO₂ state.',
    aboutFeature2: 'Open a detailed region view with the last measurement date and the source satellite product.',
    aboutFeature3: 'Follow the historical trend per region and compare regions with each other.',
    aboutFeature4: 'Export the data for all regions to CSV for further analysis or reporting.',
    aboutLimitsTitle: 'Limitations',
    aboutLimitsText:
      'Sentinel-5P spatial resolution does not allow street- or single-city-level interpretation, so the solution is intentionally limited to the regional level. The display is not real-time; when there is not enough good-quality data for a given day, the system shows the last valid layer and clearly marks its date.',
    aboutScopeTitle: 'Intentionally out of scope',
    aboutScopeText:
      'The solution does not include air-quality forecasting or machine-learning predictions, a mobile app, an alerting system, or display at the municipality, street or individual measuring-point level.',
    aboutDataTitle: 'Data source and technology',
    aboutDataText:
      'Data comes from Copernicus Sentinel-5P (the TROPOMI instrument). Aggregated regional time series and metadata are stored in a PostgreSQL/PostGIS database, and every value is traceable to its source product and satellite overpass time.',
    aboutTeamTitle: 'Team',
    aboutTeamText: 'AirWatch SLO — team: Maida Ćivić, Matija Čoh and Aleš Fon Cafnik (Projekt IPT).',
    mapViewLead: 'Click a region to select it. Color shows NO2 deviation from the regional average.',
    trendViewLead: 'Historical NO2 over time for the selected region. Narrow the period if needed.',
    comparisonViewLead: 'Comparison of the latest available NO2 values across regions.',
    methodologyViewLead: 'What the Sentinel-5P data means, the quality filter, and limitations.',
    navSatellite: 'Satellite',
    satLiveTitle: 'Where is Sentinel-5P right now?',
    satLiveText:
      'The display below continuously estimates Sentinel-5P’s current sub-satellite point from public TLE orbital elements. It shows the satellite location, not real-time NO₂ pollution.',
    satLiveHowText:
      'It works by reading two TLE orbit lines, calculating the satellite position for the current UTC time, and projecting that position onto the map as the point directly beneath the satellite. The latitude, longitude, altitude, and velocity are therefore orbital estimates, and the display refreshes automatically about every 15 seconds.',
    satLatitude: 'Latitude',
    satLongitude: 'Longitude',
    satAltitude: 'Altitude',
    satVelocity: 'Velocity',
    satLiveSource:
      'Calculated at {time} local time from TLE elements with epoch {epoch} UTC. This is an informative display and updates about every 15 seconds.',
    satMapAria: 'Leaflet map showing the estimated current Sentinel-5P satellite location',
    satOtherSats:
      'A few other Copernicus satellites and the ISS are shown for orientation. Our satellite (Sentinel-5P) is highlighted. You can zoom and pan the map; all locations are approximate.',
    satWhatTitle: 'What is our satellite?',
    satIntro:
      'AirWatch SLO draws its data from the European Sentinel-5P satellite (the Copernicus programme, ESA/EU). Using the TROPOMI instrument, it measures pollutants in the atmosphere from space, including nitrogen dioxide (NO₂), which we display across Slovenia’s statistical regions.',
    satFactInstrumentLabel: 'Instrument',
    satFactInstrumentValue: 'TROPOMI',
    satFactLaunchLabel: 'Launch',
    satFactLaunchValue: 'October 2017',
    satFactOrbitLabel: 'Orbit altitude',
    satFactOrbitValue: '≈ 824 km',
    satFactResolutionLabel: 'Spatial resolution',
    satFactResolutionValue: '≈ 3.5 × 5.5 km',
    satWhereTitle: 'Where it is and how it orbits',
    satWhereText:
      'Sentinel-5P circles the Earth in a sun-synchronous orbit at an altitude of about 824 km. It passes over the same area once a day at roughly the same local time (around 13:30), which keeps daily snapshots comparable. In a single day it crosses the whole planet and so also covers all of Slovenia.',
    satTropomiTitle: 'The TROPOMI instrument',
    satTropomiText:
      'TROPOMI (TROPOspheric Monitoring Instrument) is the spectrometer carried by Sentinel-5P. It detects how the atmosphere absorbs and scatters sunlight, and those spectral fingerprints are used to derive atmospheric gas columns.',
    satTropomiNo2:
      'For AirWatch SLO, the key product is NO₂: we take satellite pixels over Slovenia, remove lower-quality retrievals and calculate regional averages. The app therefore shows traceable regional estimates, not direct ground-sensor readings.',
    satDataTitle: 'What data it captures',
    satDataText:
      'The TROPOMI instrument measures sunlight reflected through the atmosphere and derives the amounts of several gases and air pollutants:',
    satDataFocus:
      'In this app we show only nitrogen dioxide (NO₂) – a gas produced mainly by road traffic and fuel combustion.',
    satAerosolsClouds: 'aerosols and clouds',
    satProcessTitle: 'How the data reaches the display',
    satProcessText:
      'We ingest the raw satellite products (Sentinel-5P L2), filter them by quality and average them per statistical region. For each region we show the latest available processed measurement.',
    satNotRealTime:
      'The display is not real-time and not street-level. A single pixel covers several kilometres, and the values shown are regional satellite estimates.',
    dashboardTitle: 'NO2 overview by Slovenian statistical regions',
    dashboardSubtitle:
      'Latest available processed NO2 measurement from Sentinel-5P satellite products. This is not a real-time view.',
    heroAria: 'Selected region and latest measurement',
    analysis: 'Analysis',
    analysisLead: 'Historical trend for the selected region and a comparison by the latest available NO2 value.',
    dataMethodology: 'Data and methodology',
    dataMethodologyLead: 'Measurement details, data provenance, traceability, and how to read the result.',
    latestMeasurement: 'Latest measurement',
    notRealTimeNote: 'Not real-time',
    concentrationLow: 'Low concentration',
    concentrationModerate: 'Moderate concentration',
    concentrationHigh: 'High concentration',
    lastMeasurement: 'Last measurement',
    loading: 'Loading...',
    noData: 'No data',
    today: 'today',
    yesterday: 'yesterday',
    daysAgo: '{count} days ago',
    regionLoadError:
      'Statistical regions could not be loaded from the API. Check that the backend is running and that data is loaded into the database.',
    geometryLoadError:
      'Statistical region geometries could not be loaded from the API. Check that the backend is running and regional boundaries are loaded.',
    comparisonLoadError:
      'Region comparison could not be loaded from the API. Check that the backend is running and data is loaded.',
    detailLoadError:
      'Selected region details could not be loaded from the API. Check that the backend is running and data is loaded.',
    selectedRegion: 'Selected region',
    noRegionSelected: 'No region selected',
    selectRegionForMeasurement: 'Select a statistical region to show the latest available valid measurement.',
    loadingLatestMeasurement: 'Loading the latest available valid NO2 measurement...',
    measurementLoadErrorTitle: 'Measurement loading error',
    noStoredMeasurementTitle: 'No stored measurement for the selected region',
    noStoredMeasurementText:
      'There is no stored latest available valid NO2 measurement for the selected region. Try another region or check processing status.',
    latestValidMeasurement: 'Latest available valid measurement',
    validPixels: 'Valid pixels',
    qaThreshold: 'QA threshold',
    rankLabel: 'Rank',
    measurementTime: 'Measurement time',
    productSource: 'Product source',
    status: 'Status',
    valid: 'Valid',
    noValidPixels: 'No valid pixels',
    noDataStatus: 'No data',
    processingError: 'Processing error',
    unknown: 'Unknown',
    noValidDataTitle: 'No valid data for the selected region',
    noValidDataText:
      'For the selected Sentinel-5P product, this region did not have enough valid NO2 pixels after the quality filter (qa_value >= 0.75). Common causes are clouds, snow, or low retrieval quality.',
    measurementProcessingErrorTitle: 'Measurement processing error',
    measurementProcessingErrorText:
      'The selected measurement cannot currently be shown as a reliable value because processing did not finish successfully. Values are therefore hidden.',
    no2UnavailableTitle: 'NO2 value is unavailable',
    no2UnavailableText: 'The selected region does not have enough valid data to calculate a regional NO2 value.',
    regionLabel: 'Statistical region',
    loadingRegions: 'Loading regions...',
    chooseRegion: 'Choose a region',
    pickerTitle: 'Choose a statistical region',
    searchPlaceholder: 'Search by name or code',
    noRegionsFound: 'No regions found. Try a region name or code, e.g. SI041.',
    noValidPixelsSuffix: 'no valid pixels',
    regionsUnavailable:
      'Regional data is currently unavailable. Regional measurements may not yet have been loaded into the database.',
    methodology: 'Methodology',
    howToRead: 'How to read the result',
    methodologyText1:
      'The value is a satellite-based regional NO2 estimate from Sentinel-5P (TROPOMI) products, aggregated by statistical region. One pixel covers roughly 3.5 x 5.5 km, so the data should not be read as street-level concentrations. This is not real-time.',
    methodologyText2:
      'A quality filter of qa_value >= 0.75 is used. If a region does not have enough valid pixels, it is shown as "no data" and no value is calculated.',
    methodologyText3:
      'Regional boundaries come from generalized Eurostat GISCO NUTS data. Aggregation is simplified: each valid satellite pixel is treated as a point and assigned to a statistical region, without footprint weighting or ground-station fusion.',
    exportPdf: 'Export PDF',
    methAppTitle: 'What does AirWatch SLO show?',
    methAppText:
      'AirWatch SLO shows how much nitrogen dioxide (NO₂) is in the air over Slovenia’s 12 statistical regions. The data comes from the European Sentinel-5P satellite, which measures air pollution from space. The goal is to show, simply and clearly, where the air is more burdened with NO₂ and how that changes over time.',
    methNo2Title: 'What is NO₂ and why does it matter?',
    methNo2Text:
      'Nitrogen dioxide (NO₂) is a gas produced mainly by burning fuel – in road traffic (diesel and petrol engines), building heating, industry and power plants. It is one of the main indicators of air pollution, especially in cities and along roads.',
    methNo2Effects:
      'Elevated NO₂ irritates the airways, worsens asthma and lung disease, and contributes to smog and acid rain. Monitoring NO₂ therefore helps us understand air quality and the impact of traffic and industry on health and the environment.',
    methHowTitle: 'How is the displayed value produced?',
    methStep1:
      'The Sentinel-5P satellite, with its TROPOMI instrument, measures how much sunlight the atmosphere absorbs at wavelengths characteristic of NO₂.',
    methStep2:
      'From this it computes the NO₂ column density – the amount of NO₂ in a vertical column of air above a given point.',
    methStep3:
      'We crop the scenes to Slovenia and keep only good-quality pixels (quality filter qa_value ≥ 0.75; cloudy and unreliable measurements are discarded).',
    methStep4:
      'Each valid pixel is assigned to a statistical region (boundaries from Eurostat GISCO NUTS) and we compute a per-region average.',
    methStep5:
      'For each region we show the latest available processed value; the process repeats as new satellite products become available.',
    methValueText:
      'The value is given in mol/m² and is usually very small, e.g. 2.7 × 10⁻⁵ mol/m². It tells you how many moles of NO₂ are in a vertical column of air above one square metre of ground – the total amount of gas from the surface to the top of the atmosphere, not the concentration right at ground level. For readability we sometimes show it in µmol/m² (1 µmol = 10⁻⁶ mol). The higher the value, the more NO₂ is in the air over the region.',
    methColorsText:
      'Colours on the map and in the region comparison show the relative level: green means lower, yellow and orange higher values compared with the other regions. The "low/moderate/high concentration" labels are therefore comparative across Slovenian regions, not health limit values.',
    methLimitsTitle: 'Limitations',
    methLimitsText:
      'The display is not real-time – satellite products arrive with a delay of a few days. It is also not a street-level measurement: one pixel covers roughly 3.5 × 5.5 km, and the value is a satellite estimate for the whole region, not a replacement for ground monitoring stations. If a region lacks enough valid pixels (e.g. due to clouds), it is shown as "no data".',
    spatialOverview: 'Spatial overview',
    mapTitle: 'Statistical regions map',
    mapAria: 'Map of Slovenian statistical regions',
    loadingMap: 'Loading spatial region overview...',
    mapErrorTitle: 'Regions cannot be displayed',
    noGeometriesTitle: 'Region geometries are currently unavailable',
    noGeometriesText: 'Regional boundaries may not yet have been loaded into the database.',
    interactiveMapAria: 'Interactive Leaflet map of Slovenian statistical regions',
    mapControlsAria: 'Select a region on the map',
    selectMapRegion: 'Select region on map {region}',
    mapLegendAria: 'Meaning of map colors',
    validMeasurement: 'Valid measurement',
    processingErrorLegend: 'Processing error',
    deviationWellBelowAverage: 'Well below average',
    deviationBelowAverage: 'Below average',
    deviationNearAverage: 'Near average',
    deviationAboveAverage: 'Above average',
    deviationWellAboveAverage: 'Well above average',
    mapAverageDeviation: 'Deviation from average',
    mapMeanDeviation: 'Deviation from mean',
    showDeviations: 'Show deviations',
    showValues: 'Show values',
    mapLegendAbsoluteMetric: 'NO2 value',
    mapLegendDynamicScale: 'dynamic thresholds',
    mapLegendDeviationMetric: 'Δ NO2 from mean',
    mapLegendDeviationScale: 'mean: {mean} µmol/m2',
    mapModeLabel: 'Map display mode',
    mapModeValue: 'NO₂ value',
    mapModeQuality: 'Data quality',
    mapLegendRelativeScale: 'relative scale',
    mapLegendValueHint: 'A darker color means a higher NO₂ value among the regions shown.',
    mapLegendDeviationHint: 'Blue is below, red is above the average of the regions shown.',
    mapLegendQualityHint: 'Color shows the measurement quality status for each region.',
    mapResetView: 'Reset view to all of Slovenia',
    mapZoomLabel: 'Map zoom',
    activeOnMap: 'Selected on the map',
    mapHint:
      'Click a region to select it. Colors show latest NO2 values; mean deviations are available from the button. The dot in the label shows quality status.',
    selected: 'Selected',
    comparisonTitle: 'NO2 by statistical region',
    noRegions: 'No regions',
    withValue: '{valid}/{total} with value',
    comparisonUnavailable:
      'Regional data is currently unavailable. The comparison will appear when measurements are loaded from the API.',
    comparisonSummaryAria: 'Region comparison summary',
    highestValue: 'Highest value',
    lowestValue: 'Lowest value',
    withoutValidPixels: 'Without valid pixels',
    comparisonListAria: 'Latest measurement comparison',
    selectRegion: 'Select region {region}',
    loadingComparison: 'Loading region comparison...',
    noValidValue: 'No valid value',
    detailsKicker: 'Region data and source',
    regionNotSelected: 'Region not selected',
    regionCode: 'Region code',
    exportRegionLatestCsv: 'Export region (CSV)',
    exportRegionHistoryCsv: 'Export region history (CSV)',
    exportCsv: 'Export all regions (CSV)',
    selectRegionForDetails: 'Select a statistical region to show the latest NO2 measurement.',
    loadingRegionData: 'Loading data for the selected region...',
    detailsLoadErrorTitle: 'Data cannot be loaded',
    noRegionDataTitle: 'No data for the selected region',
    noRegionDataText: 'There is currently no stored latest NO2 measurement for the selected region.',
    qualityStatus: 'Quality status',
    measurementStart: 'Measurement start',
    measurementEnd: 'Measurement end',
    processingRunId: 'Processing run ID',
    dataSource: 'Data source',
    productId: 'Product ID',
    latestNo2Value: 'Latest NO2 value',
    minMaxNo2: 'Min / max NO2',
    unit: 'Unit',
    provenanceNoPixels:
      'The Sentinel-5P product was processed, but a regional NO2 value was not calculated because there were not enough valid pixels after the quality filter. The fields above keep traceability to the source product and processing record.',
    provenanceProcessingError:
      'Processing for the selected measurement was not successful, so no reliable regional NO2 value was stored. The fields above keep traceability to the source product and processing record.',
    provenanceDefault:
      'The value is traceable to the source Sentinel-5P product; measurement time refers to the satellite overpass.',
    historyKicker: 'Measurement history',
    trendTitle: 'Historical NO2 trend',
    historyLoadError:
      'Measurement history could not be loaded from the API. Check that the backend is running and data is loaded.',
    startDateUnavailable: 'The selected start date has no available data.',
    endDateUnavailable: 'The selected end date has no available data.',
    startBeforeEnd: 'Start date must be before or equal to end date.',
    from: 'From',
    to: 'To',
    allDates: 'All dates',
    noAvailableDates: 'No available dates',
    show: 'Show',
    clear: 'Clear',
    trendLead:
      'Historical NO2 values for region {region}. Data is based on processed Sentinel-5P products.',
    date: 'Date',
    trendHint:
      'The chart shows average NO2 values over time. Missing values mean there were no valid pixels for that time interval.',
    noDataForDateTitle: 'No data for the selected date',
    noDataForDateText:
      'There are no historical NO2 measurements for the selected date interval. Choose another interval or clear the selection to return to available data.',
    noHistoryTitle: 'No historical measurements',
    trendUnavailableTitle: 'Trend is not available yet',
    noHistoryText: 'There are currently no historical NO2 measurements for the selected region.',
    trendNeedsTwo:
      'At least two measurements are required to show a trend; currently one measurement is available{date}.',
    loadingErrorTitle: 'Loading error',
    adminTitle: 'Data processing status',
    adminSubtitle: 'Latest processing record for a quick data pipeline check.',
    processingStatusLoadError: 'Processing status could not be loaded from the API.',
    processingHistoryLoadError: 'Processing history could not be loaded from the API.',
    latestProcessing: 'Latest processing run',
    latestProcessingRun: 'Latest processing run',
    latestProduct: 'Latest Sentinel-5P product',
    latestSuccessfulUpdate: 'Latest successful update',
    product: 'Product',
    script: 'Script',
    scriptVersion: 'Script version',
    startedAt: 'Started',
    finishedAt: 'Finished',
    error: 'Error',
    processingHistory: 'Processing history',
    previousRuns: 'Previous processing runs',
    latestCount: 'Latest {count}',
    loadingProcessingStatus: 'Loading processing status...',
    loadingProcessingHistory: 'Loading processing history...',
    processingStatusErrorTitle: 'Processing status loading error',
    processingHistoryErrorTitle: 'Processing history loading error',
    noProcessingRecordsTitle: 'No processing records',
    noProcessingRecordsText: 'There are currently no processing records in the database.',
    noProcessingHistoryTitle: 'No processing history',
    noProcessingHistoryText: 'There are currently no processing run records in the database.',
    validRegions: 'Valid regions',
    success: 'Successful',
    running: 'Running',
    failed: 'Error',
    latestRunSuccess: 'Latest processing run was successful',
    latestRunRunning: 'Processing is currently running',
    latestRunFailed: 'Latest processing run was not successful',
    latestRunUnknown: 'Latest processing status is unknown',
  },
  de: {
    languageName: 'Deutsch',
    languageToggleLabel: 'Sprache der Oberfläche',
    switchToEnglish: 'Zu Englisch wechseln',
    accessibilityTitle: 'Barrierefreiheit',
    accessibilityLargeText: 'Größerer Text',
    accessibilityHighContrast: 'Hoher Kontrast',
    accessibilityReduceMotion: 'Weniger Bewegung',
    brandSubtitle: 'Luftqualität über Slowenien per Satellit',
    navMain: 'Hauptnavigation',
    navOverview: 'Übersicht',
    navTrend: 'Historischer Trend',
    navComparison: 'Regionenvergleich',
    navDataExport: 'Daten & Export',
    navMap: 'Regionenkarte',
    navMethodology: 'Methodik',
    navSuggestions: 'Vorschläge',
    navAbout: 'Über die App',
    collapseSidebar: 'Einklappen',
    expandSidebar: 'Seitenleiste ausklappen',
    aboutLead: 'Über die Anwendung und ihre Datenquelle.',
    aboutText1:
      'AirWatch SLO zeigt die neueste verfügbare verarbeitete NO₂-Messung für die 12 slowenischen statistischen Regionen auf Basis von Copernicus Sentinel-5P (TROPOMI) Satellitendaten.',
    aboutText2:
      'Die Werte sind regionale Satellitenschätzungen – nicht in Echtzeit und nicht auf Straßenebene. Fehlende Werte bedeuten, dass eine Region nicht genug gültige Pixel hatte.',
    aboutVisionText:
      'Der Kern der Lösung ist nicht nur eine Karte, sondern die Umwandlung komplexer Satelliten-(EO-)Daten in verständliche, vergleichbare und nützliche Informationen. Für eine gewählte Region können Sie schnell den Zustand prüfen, Trends verfolgen, Regionen vergleichen und Ergebnisse für weitere Analysen oder Berichte exportieren.',
    aboutUsersTitle: 'Für wen es ist',
    aboutUsersResearchers:
      'Forschende, Studierende und Umweltanalysten – schneller Einblick in regionale Unterschiede, historische Trends und Datenexport.',
    aboutUsersPublic:
      'Öffentliche Einrichtungen, Gemeinden und Umweltorganisationen – ein verständlicher regionaler Überblick für Berichte und Aufklärung.',
    aboutUsersEducation: 'Schulen, Universitäten und Lehrkräfte – eine vereinfachte Ansicht für den Unterricht.',
    aboutFeaturesTitle: 'Was möglich ist',
    aboutFeature1: 'Eine Region auf der Karte wählen und ihren neuesten verfügbaren NO₂-Zustand sehen.',
    aboutFeature2: 'Eine Detailansicht der Region mit dem letzten Messdatum und dem Quell-Satellitenprodukt öffnen.',
    aboutFeature3: 'Den historischen Trend pro Region verfolgen und Regionen miteinander vergleichen.',
    aboutFeature4: 'Die Daten aller Regionen als CSV für weitere Analysen oder Berichte exportieren.',
    aboutLimitsTitle: 'Einschränkungen',
    aboutLimitsText:
      'Die räumliche Auflösung von Sentinel-5P erlaubt keine Interpretation auf Straßen- oder Einzelstadtebene, daher ist die Lösung bewusst auf die regionale Ebene beschränkt. Die Anzeige ist nicht in Echtzeit; wenn für einen Tag nicht genug qualitativ gute Daten vorliegen, zeigt das System die letzte gültige Ebene und kennzeichnet ihr Datum klar.',
    aboutScopeTitle: 'Bewusst nicht enthalten',
    aboutScopeText:
      'Die Lösung umfasst keine Luftqualitätsprognosen oder ML-Vorhersagen, keine mobile App, kein Alarmsystem und keine Anzeige auf Gemeinde-, Straßen- oder einzelner Messpunktebene.',
    aboutDataTitle: 'Datenquelle und Technologie',
    aboutDataText:
      'Die Daten stammen von Copernicus Sentinel-5P (Instrument TROPOMI). Aggregierte regionale Zeitreihen und Metadaten werden in einer PostgreSQL/PostGIS-Datenbank gespeichert, und jeder Wert ist bis zum Quellprodukt und zur Satellitenüberflugzeit nachvollziehbar.',
    aboutTeamTitle: 'Team',
    aboutTeamText: 'AirWatch SLO – Team: Maida Ćivić, Matija Čoh und Aleš Fon Cafnik (Projekt IPT).',
    mapViewLead: 'Klicken Sie auf eine Region, um sie auszuwählen. Die Farbe zeigt die NO2-Abweichung vom Regionsdurchschnitt.',
    trendViewLead: 'Historischer NO2-Verlauf für die ausgewählte Region. Schränken Sie bei Bedarf den Zeitraum ein.',
    comparisonViewLead: 'Vergleich der neuesten verfügbaren NO2-Werte zwischen Regionen.',
    methodologyViewLead: 'Was die Sentinel-5P-Daten bedeuten, der Qualitätsfilter und Einschränkungen.',
    navSatellite: 'Satellit',
    satLiveTitle: 'Wo ist Sentinel-5P gerade?',
    satLiveText:
      'Die Anzeige unten schätzt den aktuellen Subsatellitenpunkt von Sentinel-5P fortlaufend aus öffentlichen TLE-Orbitalelementen. Sie zeigt die Satellitenposition, nicht NO₂-Verschmutzung in Echtzeit.',
    satLiveHowText:
      'Die Berechnung liest zwei TLE-Bahnzeilen, bestimmt daraus die Satellitenposition für die aktuelle UTC-Zeit und projiziert sie als Punkt direkt unter dem Satelliten auf die Karte. Breitengrad, Längengrad, Höhe und Geschwindigkeit sind daher Bahnschätzungen; die Anzeige aktualisiert sich automatisch etwa alle 15 Sekunden.',
    satLatitude: 'Breitengrad',
    satLongitude: 'Längengrad',
    satAltitude: 'Höhe',
    satVelocity: 'Geschwindigkeit',
    satLiveSource:
      'Berechnet um {time} Ortszeit aus TLE-Elementen mit Epoche {epoch} UTC. Die Anzeige ist informativ und aktualisiert sich etwa alle 15 Sekunden.',
    satMapAria: 'Leaflet-Karte mit der geschätzten aktuellen Position des Satelliten Sentinel-5P',
    satOtherSats:
      'Zur Orientierung werden auch einige andere Copernicus-Satelliten und die ISS angezeigt. Unser Satellit (Sentinel-5P) ist hervorgehoben. Die Karte lässt sich zoomen und verschieben; alle Positionen sind ungefähr.',
    satWhatTitle: 'Was ist unser Satellit?',
    satIntro:
      'AirWatch SLO Daten stammen vom europäischen Satelliten Sentinel-5P (Programm Copernicus, ESA/EU). Mit dem Instrument TROPOMI misst er aus dem Weltraum Schadstoffe in der Atmosphäre, darunter Stickstoffdioxid (NO₂), das wir für die statistischen Regionen Sloweniens darstellen.',
    satFactInstrumentLabel: 'Instrument',
    satFactInstrumentValue: 'TROPOMI',
    satFactLaunchLabel: 'Start',
    satFactLaunchValue: 'Oktober 2017',
    satFactOrbitLabel: 'Bahnhöhe',
    satFactOrbitValue: '≈ 824 km',
    satFactResolutionLabel: 'Räumliche Auflösung',
    satFactResolutionValue: '≈ 3,5 × 5,5 km',
    satWhereTitle: 'Wo er sich befindet und wie er kreist',
    satWhereText:
      'Sentinel-5P umkreist die Erde in einer sonnensynchronen Umlaufbahn in etwa 824 km Höhe. Er überfliegt dasselbe Gebiet einmal täglich zur ungefähr gleichen Ortszeit (gegen 13:30 Uhr), wodurch tägliche Aufnahmen vergleichbar bleiben. An einem Tag überquert er den gesamten Planeten und erfasst so auch ganz Slowenien.',
    satTropomiTitle: 'Das Instrument TROPOMI',
    satTropomiText:
      'TROPOMI (TROPOspheric Monitoring Instrument) ist das Spektrometer an Bord von Sentinel-5P. Es erkennt, wie die Atmosphäre Sonnenlicht absorbiert und streut; aus diesen spektralen Fingerabdrücken werden atmosphärische Gassäulen abgeleitet.',
    satTropomiNo2:
      'Für AirWatch SLO ist das NO₂-Produkt entscheidend: Wir nehmen Satellitenpixel über Slowenien, entfernen Messungen geringerer Qualität und berechnen regionale Mittelwerte. Die App zeigt daher nachvollziehbare regionale Schätzungen, keine direkten Bodensensorwerte.',
    satDataTitle: 'Welche Daten er erfasst',
    satDataText:
      'Das Instrument TROPOMI misst das durch die Atmosphäre reflektierte Sonnenlicht und leitet daraus die Mengen mehrerer Gase und Luftschadstoffe ab:',
    satDataFocus:
      'In dieser App zeigen wir nur Stickstoffdioxid (NO₂) – ein Gas, das vor allem durch Verkehr und Brennstoffverbrennung entsteht.',
    satAerosolsClouds: 'Aerosole und Wolken',
    satProcessTitle: 'Wie die Daten zur Anzeige gelangen',
    satProcessText:
      'Wir übernehmen die rohen Satellitenprodukte (Sentinel-5P L2), filtern sie nach Qualität und mitteln sie pro statistischer Region. Für jede Region zeigen wir die letzte verfügbare aufbereitete Messung.',
    satNotRealTime:
      'Die Anzeige erfolgt nicht in Echtzeit und nicht auf Straßenebene. Ein einzelner Pixel deckt mehrere Kilometer ab, und die angezeigten Werte sind regionale Satellitenschätzungen.',
    dashboardTitle: 'NO2-Übersicht nach slowenischen statistischen Regionen',
    dashboardSubtitle:
      'Neueste verfügbare verarbeitete NO2-Messung aus Sentinel-5P-Satellitenprodukten. Dies ist keine Echtzeitansicht.',
    heroAria: 'Ausgewählte Region und neueste Messung',
    analysis: 'Analyse',
    analysisLead: 'Historischer Trend für die ausgewählte Region und Vergleich nach dem neuesten verfügbaren NO2-Wert.',
    dataMethodology: 'Daten und Methodik',
    dataMethodologyLead: 'Messdetails, Datenherkunft, Nachvollziehbarkeit und Hinweise zum Lesen des Ergebnisses.',
    latestMeasurement: 'Neueste Messung',
    notRealTimeNote: 'Keine Echtzeit',
    concentrationLow: 'Niedrige Konzentration',
    concentrationModerate: 'Mittlere Konzentration',
    concentrationHigh: 'Hohe Konzentration',
    lastMeasurement: 'Letzte Messung',
    loading: 'Wird geladen...',
    noData: 'Keine Daten',
    today: 'heute',
    yesterday: 'gestern',
    daysAgo: 'vor {count} Tagen',
    regionLoadError:
      'Statistische Regionen konnten nicht aus der API geladen werden. Prüfen Sie, ob das Backend läuft und die Daten in der Datenbank geladen sind.',
    geometryLoadError:
      'Geometrien der statistischen Regionen konnten nicht aus der API geladen werden. Prüfen Sie, ob das Backend läuft und die Regionsgrenzen geladen sind.',
    comparisonLoadError:
      'Der Regionenvergleich konnte nicht aus der API geladen werden. Prüfen Sie, ob das Backend läuft und die Daten geladen sind.',
    detailLoadError:
      'Details der ausgewählten Region konnten nicht aus der API geladen werden. Prüfen Sie, ob das Backend läuft und die Daten geladen sind.',
    selectedRegion: 'Ausgewählte Region',
    noRegionSelected: 'Keine Region ausgewählt',
    selectRegionForMeasurement: 'Wählen Sie eine statistische Region, um die neueste verfügbare gültige Messung anzuzeigen.',
    loadingLatestMeasurement: 'Neueste verfügbare gültige NO2-Messung wird geladen...',
    measurementLoadErrorTitle: 'Fehler beim Laden der Messung',
    noStoredMeasurementTitle: 'Keine gespeicherte Messung für die ausgewählte Region',
    noStoredMeasurementText:
      'Für die ausgewählte Region ist keine neueste verfügbare gültige NO2-Messung gespeichert. Versuchen Sie eine andere Region oder prüfen Sie den Verarbeitungsstatus.',
    latestValidMeasurement: 'Neueste verfügbare gültige Messung',
    validPixels: 'Gültige Pixel',
    qaThreshold: 'QA-Schwelle',
    rankLabel: 'Rang',
    measurementTime: 'Messzeit',
    productSource: 'Produktquelle',
    status: 'Status',
    valid: 'Gültig',
    noValidPixels: 'Keine gültigen Pixel',
    noDataStatus: 'Keine Daten',
    processingError: 'Verarbeitungsfehler',
    unknown: 'Unbekannt',
    noValidDataTitle: 'Keine gültigen Daten für die ausgewählte Region',
    noValidDataText:
      'Für das ausgewählte Sentinel-5P-Produkt gab es in dieser Region nach dem Qualitätsfilter (qa_value >= 0.75) nicht genug gültige NO2-Pixel. Häufige Ursachen sind Wolken, Schnee oder geringe Retrieval-Qualität.',
    measurementProcessingErrorTitle: 'Fehler bei der Messverarbeitung',
    measurementProcessingErrorText:
      'Die ausgewählte Messung kann derzeit nicht als verlässlicher Wert angezeigt werden, weil die Verarbeitung nicht erfolgreich abgeschlossen wurde. Werte werden daher ausgeblendet.',
    no2UnavailableTitle: 'NO2-Wert nicht verfügbar',
    no2UnavailableText: 'Die ausgewählte Region hat nicht genug gültige Daten, um einen regionalen NO2-Wert zu berechnen.',
    regionLabel: 'Statistische Region',
    loadingRegions: 'Regionen werden geladen...',
    chooseRegion: 'Region wählen',
    pickerTitle: 'Statistische Region wählen',
    searchPlaceholder: 'Nach Name oder Code suchen',
    noRegionsFound: 'Keine Regionen gefunden. Versuchen Sie einen Regionsnamen oder Code, z. B. SI041.',
    noValidPixelsSuffix: 'keine gültigen Pixel',
    regionsUnavailable:
      'Regionale Daten sind derzeit nicht verfügbar. Regionale Messungen wurden möglicherweise noch nicht in die Datenbank geladen.',
    methodology: 'Methodik',
    howToRead: 'Ergebnis lesen',
    methodologyText1:
      'Der Wert ist eine satellitenbasierte regionale NO2-Schätzung aus Sentinel-5P-Produkten (TROPOMI), aggregiert nach statistischer Region. Ein Pixel deckt ungefähr 3,5 x 5,5 km ab, daher sollten die Daten nicht als Konzentrationen auf Straßenebene gelesen werden. Dies ist keine Echtzeitansicht.',
    methodologyText2:
      'Es wird ein Qualitätsfilter qa_value >= 0.75 verwendet. Wenn eine Region nicht genug gültige Pixel hat, wird sie als "keine Daten" angezeigt und kein Wert berechnet.',
    methodologyText3:
      'Die Regionsgrenzen stammen aus generalisierten Eurostat-GISCO-NUTS-Daten. Die Aggregation ist vereinfacht: jedes gültige Satellitenpixel wird als Punkt behandelt und einer statistischen Region zugewiesen, ohne Footprint-Gewichtung oder Einbindung von Bodenstationen.',
    exportPdf: 'PDF exportieren',
    methAppTitle: 'Was zeigt AirWatch SLO?',
    methAppText:
      'AirWatch SLO zeigt, wie viel Stickstoffdioxid (NO₂) in der Luft über den 12 statistischen Regionen Sloweniens ist. Die Daten stammen vom europäischen Satelliten Sentinel-5P, der die Luftverschmutzung aus dem Weltraum misst. Ziel ist es, einfach und übersichtlich zu zeigen, wo die Luft stärker mit NO₂ belastet ist und wie sich das im Laufe der Zeit ändert.',
    methNo2Title: 'Was ist NO₂ und warum ist es wichtig?',
    methNo2Text:
      'Stickstoffdioxid (NO₂) ist ein Gas, das vor allem bei der Verbrennung von Kraftstoffen entsteht – im Verkehr (Diesel- und Benzinmotoren), beim Heizen von Gebäuden, in der Industrie und in Kraftwerken. Es ist einer der wichtigsten Indikatoren für Luftverschmutzung, besonders in Städten und an Straßen.',
    methNo2Effects:
      'Erhöhte NO₂-Werte reizen die Atemwege, verschlimmern Asthma und Lungenerkrankungen und tragen zu Smog und saurem Regen bei. Die Beobachtung von NO₂ hilft daher, die Luftqualität und den Einfluss von Verkehr und Industrie auf Gesundheit und Umwelt zu verstehen.',
    methHowTitle: 'Wie entsteht der angezeigte Wert?',
    methStep1:
      'Der Satellit Sentinel-5P misst mit dem Instrument TROPOMI, wie viel Sonnenlicht die Atmosphäre bei für NO₂ typischen Wellenlängen absorbiert.',
    methStep2:
      'Daraus wird die NO₂-Säulendichte berechnet – die Menge an NO₂ in einer senkrechten Luftsäule über einem bestimmten Punkt.',
    methStep3:
      'Die Aufnahmen werden auf Slowenien beschnitten und nur Pixel ausreichender Qualität behalten (Qualitätsfilter qa_value ≥ 0,75; bewölkte und unzuverlässige Messungen werden verworfen).',
    methStep4:
      'Jedes gültige Pixel wird einer statistischen Region zugeordnet (Grenzen aus Eurostat GISCO NUTS) und je Region wird ein Durchschnitt berechnet.',
    methStep5:
      'Für jede Region zeigen wir den letzten verfügbaren aufbereiteten Wert; der Vorgang wiederholt sich, sobald neue Satellitenprodukte verfügbar sind.',
    methValueText:
      'Der Wert wird in mol/m² angegeben und ist meist sehr klein, z. B. 2,7 × 10⁻⁵ mol/m². Er gibt an, wie viele Mol NO₂ sich in einer senkrechten Luftsäule über einem Quadratmeter Boden befinden – also die Gesamtmenge des Gases vom Boden bis zur oberen Atmosphäre, nicht die Konzentration direkt am Boden. Zur besseren Lesbarkeit zeigen wir ihn teils in µmol/m² (1 µmol = 10⁻⁶ mol). Je höher der Wert, desto mehr NO₂ ist in der Luft über der Region.',
    methColorsText:
      'Die Farben auf der Karte und im Regionenvergleich zeigen das relative Niveau: Grün bedeutet niedrigere, Gelb und Orange höhere Werte im Vergleich zu den anderen Regionen. Die Bezeichnungen „niedrige/mittlere/hohe Konzentration“ sind also ein Vergleich zwischen den slowenischen Regionen und keine gesundheitlichen Grenzwerte.',
    methLimitsTitle: 'Einschränkungen',
    methLimitsText:
      'Die Anzeige erfolgt nicht in Echtzeit – Satellitenprodukte stehen mit einigen Tagen Verzögerung zur Verfügung. Es ist auch keine Messung auf Straßenebene: ein Pixel deckt etwa 3,5 × 5,5 km ab, und der Wert ist eine Satellitenschätzung für die gesamte Region und ersetzt keine Bodenmessstationen. Hat eine Region nicht genug gültige Pixel (z. B. wegen Wolken), wird sie als „keine Daten“ angezeigt.',
    spatialOverview: 'Räumliche Übersicht',
    mapTitle: 'Karte der statistischen Regionen',
    mapAria: 'Karte der slowenischen statistischen Regionen',
    loadingMap: 'Räumliche Regionsübersicht wird geladen...',
    mapErrorTitle: 'Regionen können nicht angezeigt werden',
    noGeometriesTitle: 'Regionsgeometrien sind derzeit nicht verfügbar',
    noGeometriesText: 'Regionale Grenzen wurden möglicherweise noch nicht in die Datenbank geladen.',
    interactiveMapAria: 'Interaktive Leaflet-Karte der slowenischen statistischen Regionen',
    mapControlsAria: 'Region auf der Karte auswählen',
    selectMapRegion: 'Region auf Karte auswählen {region}',
    mapLegendAria: 'Bedeutung der Kartenfarben',
    validMeasurement: 'Gültige Messung',
    processingErrorLegend: 'Verarbeitungsfehler',
    deviationWellBelowAverage: 'Deutlich unter Durchschnitt',
    deviationBelowAverage: 'Unter Durchschnitt',
    deviationNearAverage: 'Nahe Durchschnitt',
    deviationAboveAverage: 'Über Durchschnitt',
    deviationWellAboveAverage: 'Deutlich über Durchschnitt',
    mapAverageDeviation: 'Abweichung vom Durchschnitt',
    mapMeanDeviation: 'Abweichung vom Mittelwert',
    showDeviations: 'Abweichungen anzeigen',
    showValues: 'Werte anzeigen',
    mapLegendAbsoluteMetric: 'NO2-Wert',
    mapLegendDynamicScale: 'dynamische Schwellen',
    mapLegendDeviationMetric: 'Δ NO2 vom Mittelwert',
    mapLegendDeviationScale: 'Mittelwert: {mean} µmol/m2',
    mapModeLabel: 'Kartenanzeigemodus',
    mapModeValue: 'NO₂-Wert',
    mapModeQuality: 'Datenqualität',
    mapLegendRelativeScale: 'relative Skala',
    mapLegendValueHint: 'Eine dunklere Farbe bedeutet einen höheren NO₂-Wert unter den gezeigten Regionen.',
    mapLegendDeviationHint: 'Blau bedeutet unter, Rot über dem Durchschnitt der gezeigten Regionen.',
    mapLegendQualityHint: 'Die Farbe zeigt den Qualitätsstatus der Messung je Region.',
    mapResetView: 'Ansicht auf ganz Slowenien zurücksetzen',
    mapZoomLabel: 'Kartenzoom',
    activeOnMap: 'Auf der Karte ausgewählt',
    mapHint:
      'Klicken Sie auf eine Region, um sie auszuwählen. Farben zeigen die neuesten NO2-Werte; Abweichungen vom Mittelwert sind über die Schaltfläche verfügbar. Der Punkt zeigt den Qualitätsstatus.',
    selected: 'Ausgewählt',
    comparisonTitle: 'NO2 nach statistischer Region',
    noRegions: 'Keine Regionen',
    withValue: '{valid}/{total} mit Wert',
    comparisonUnavailable:
      'Regionale Daten sind derzeit nicht verfügbar. Der Vergleich erscheint, sobald Messungen aus der API geladen sind.',
    comparisonSummaryAria: 'Zusammenfassung des Regionenvergleichs',
    highestValue: 'Höchster Wert',
    lowestValue: 'Niedrigster Wert',
    withoutValidPixels: 'Ohne gültige Pixel',
    comparisonListAria: 'Vergleich der neuesten Messungen',
    selectRegion: 'Region {region} auswählen',
    loadingComparison: 'Regionenvergleich wird geladen...',
    noValidValue: 'Kein gültiger Wert',
    detailsKicker: 'Regionsdaten und Quelle',
    regionNotSelected: 'Region nicht ausgewählt',
    regionCode: 'Regionscode',
    exportRegionLatestCsv: 'Region exportieren (CSV)',
    exportRegionHistoryCsv: 'Regionsverlauf exportieren (CSV)',
    exportCsv: 'Alle Regionen exportieren (CSV)',
    selectRegionForDetails: 'Wählen Sie eine statistische Region, um die neueste NO2-Messung anzuzeigen.',
    loadingRegionData: 'Daten für die ausgewählte Region werden geladen...',
    detailsLoadErrorTitle: 'Daten können nicht geladen werden',
    noRegionDataTitle: 'Keine Daten für die ausgewählte Region',
    noRegionDataText: 'Für die ausgewählte Region ist derzeit keine neueste NO2-Messung gespeichert.',
    qualityStatus: 'Qualitätsstatus',
    measurementStart: 'Messbeginn',
    measurementEnd: 'Messende',
    processingRunId: 'Verarbeitungs-ID',
    dataSource: 'Datenquelle',
    productId: 'Produkt-ID',
    latestNo2Value: 'Neuester NO2-Wert',
    minMaxNo2: 'Min. / max. NO2',
    unit: 'Einheit',
    provenanceNoPixels:
      'Das Sentinel-5P-Produkt wurde verarbeitet, aber ein regionaler NO2-Wert wurde nicht berechnet, weil nach dem Qualitätsfilter nicht genug gültige Pixel vorhanden waren. Die Felder oben erhalten die Nachvollziehbarkeit zur Quelle und zum Verarbeitungsdatensatz.',
    provenanceProcessingError:
      'Die Verarbeitung der ausgewählten Messung war nicht erfolgreich, daher wurde kein verlässlicher regionaler NO2-Wert gespeichert. Die Felder oben erhalten die Nachvollziehbarkeit zur Quelle und zum Verarbeitungsdatensatz.',
    provenanceDefault:
      'Der Wert ist bis zum Sentinel-5P-Quellprodukt nachvollziehbar; die Messzeit bezieht sich auf den Satellitenüberflug.',
    historyKicker: 'Messhistorie',
    trendTitle: 'Historischer NO2-Trend',
    historyLoadError:
      'Die Messhistorie konnte nicht aus der API geladen werden. Prüfen Sie, ob das Backend läuft und die Daten geladen sind.',
    startDateUnavailable: 'Das ausgewählte Startdatum hat keine verfügbaren Daten.',
    endDateUnavailable: 'Das ausgewählte Enddatum hat keine verfügbaren Daten.',
    startBeforeEnd: 'Das Startdatum muss vor oder gleich dem Enddatum liegen.',
    from: 'Von',
    to: 'Bis',
    allDates: 'Alle Daten',
    noAvailableDates: 'Keine verfügbaren Daten',
    show: 'Anzeigen',
    clear: 'Zurücksetzen',
    trendLead:
      'Historische NO2-Werte für Region {region}. Die Daten basieren auf verarbeiteten Sentinel-5P-Produkten.',
    date: 'Messdatum',
    trendHint:
      'Das Diagramm zeigt durchschnittliche NO2-Werte im Zeitverlauf. Fehlende Werte bedeuten, dass für dieses Zeitintervall keine gültigen Pixel vorhanden waren.',
    noDataForDateTitle: 'Keine Daten für das ausgewählte Datum',
    noDataForDateText:
      'Für das ausgewählte Datumsintervall gibt es keine historischen NO2-Messungen. Wählen Sie ein anderes Intervall oder setzen Sie die Auswahl zurück, um zu verfügbaren Daten zurückzukehren.',
    noHistoryTitle: 'Keine historischen Messungen',
    trendUnavailableTitle: 'Trend ist noch nicht verfügbar',
    noHistoryText: 'Für die ausgewählte Region gibt es derzeit keine historischen NO2-Messungen.',
    trendNeedsTwo:
      'Für die Trendanzeige sind mindestens zwei Messungen erforderlich; derzeit ist eine Messung verfügbar{date}.',
    loadingErrorTitle: 'Fehler beim Laden',
    adminTitle: 'Status der Datenverarbeitung',
    adminSubtitle: 'Neuester Verarbeitungsdatensatz für eine schnelle Prüfung des Datenflusses.',
    processingStatusLoadError: 'Der Verarbeitungsstatus konnte nicht aus der API geladen werden.',
    processingHistoryLoadError: 'Die Verarbeitungshistorie konnte nicht aus der API geladen werden.',
    latestProcessing: 'Neueste Verarbeitung',
    latestProcessingRun: 'Neuester Processing Run',
    latestProduct: 'Neuestes Sentinel-5P-Produkt',
    latestSuccessfulUpdate: 'Neueste erfolgreiche Aktualisierung',
    product: 'Produkt',
    script: 'Skript',
    scriptVersion: 'Skriptversion',
    startedAt: 'Beginn',
    finishedAt: 'Ende',
    error: 'Fehler',
    processingHistory: 'Verarbeitungshistorie',
    previousRuns: 'Frühere Processing Runs',
    latestCount: 'Neueste {count}',
    loadingProcessingStatus: 'Verarbeitungsstatus wird geladen...',
    loadingProcessingHistory: 'Verarbeitungshistorie wird geladen...',
    processingStatusErrorTitle: 'Fehler beim Laden des Verarbeitungsstatus',
    processingHistoryErrorTitle: 'Fehler beim Laden der Verarbeitungshistorie',
    noProcessingRecordsTitle: 'Keine Verarbeitungsdatensätze',
    noProcessingRecordsText: 'In der Datenbank gibt es derzeit keine Verarbeitungsdatensätze.',
    noProcessingHistoryTitle: 'Keine Verarbeitungshistorie',
    noProcessingHistoryText: 'In der Datenbank gibt es derzeit keine Processing-Run-Datensätze.',
    validRegions: 'Gültige Regionen',
    success: 'Erfolgreich',
    running: 'Läuft',
    failed: 'Fehler',
    latestRunSuccess: 'Die neueste Verarbeitung war erfolgreich',
    latestRunRunning: 'Die Verarbeitung läuft derzeit',
    latestRunFailed: 'Die neueste Verarbeitung war nicht erfolgreich',
    latestRunUnknown: 'Der Status der neuesten Verarbeitung ist unbekannt',
  },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY)
    return translations[storedLanguage] ? storedLanguage : DEFAULT_LANGUAGE
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const safeLanguage = translations[language] ? language : DEFAULT_LANGUAGE
      window.localStorage.setItem(STORAGE_KEY, safeLanguage)
      document.documentElement.lang = safeLanguage
    }
  }, [language])

  const value = useMemo(() => {
    const safeLanguage = translations[language] ? language : DEFAULT_LANGUAGE
    const dictionary = translations[safeLanguage]

    function t(key, params = {}) {
      const template = dictionary[key] || translations[DEFAULT_LANGUAGE][key] || key
      return Object.entries(params).reduce(
        (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
        template,
      )
    }

    return { language: safeLanguage, setLanguage, t, locale: locales[safeLanguage] }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }
  return context
}
