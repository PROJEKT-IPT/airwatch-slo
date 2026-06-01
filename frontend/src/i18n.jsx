/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'airwatch-language'
const DEFAULT_LANGUAGE = 'sl'

const translations = {
  sl: {
    languageName: 'Slovenscina',
    languageToggleLabel: 'Jezik vmesnika',
    switchToEnglish: 'Preklopi na anglescino',
    brandSubtitle: 'Satelitsko spremljanje kakovosti zraka nad Slovenijo',
    navMain: 'Glavna navigacija',
    navOverview: 'Pregled',
    navTrend: 'Zgodovinski trend',
    navComparison: 'Primerjava regij',
    navDataExport: 'Podatki & izvoz',
    dashboardTitle: 'Pregled NO2 po slovenskih statisticnih regijah',
    dashboardSubtitle:
      'Zadnja razpolozljiva obdelana meritev NO2 iz satelitskih produktov Sentinel-5P. Prikaz ni v realnem casu.',
    heroAria: 'Izbrana regija in zadnja meritev',
    analysis: 'Analiza',
    analysisLead:
      'Zgodovinski trend izbrane regije in primerjava regij po zadnji razpolozljivi vrednosti NO2.',
    dataMethodology: 'Podatki in metodologija',
    dataMethodologyLead: 'Podrobnosti meritve, izvor in sledljivost podatka ter kako brati rezultat.',
    latestMeasurement: 'Zadnja meritev',
    loading: 'Nalaganje...',
    noData: 'Ni podatka',
    today: 'danes',
    yesterday: 'vceraj',
    daysAgo: 'pred {count} dnevi',
    regionLoadError:
      'Statisticnih regij ni bilo mogoce naloziti iz API-ja. Preverite, ali backend deluje in ali so podatki nalozeni v bazo.',
    geometryLoadError:
      'Geometrij statisticnih regij ni bilo mogoce naloziti iz API-ja. Preverite, ali backend deluje in ali so regionalne meje nalozene v bazo.',
    comparisonLoadError:
      'Primerjave regij ni bilo mogoce naloziti iz API-ja. Preverite, ali backend deluje in ali so podatki nalozeni v bazo.',
    detailLoadError:
      'Podrobnosti izbrane regije ni bilo mogoce naloziti iz API-ja. Preverite, ali backend deluje in ali so podatki nalozeni v bazo.',
    selectedRegion: 'Izbrana regija',
    noRegionSelected: 'Ni izbrane regije',
    selectRegionForMeasurement:
      'Izberite statisticno regijo za prikaz zadnje razpolozljive veljavne meritve.',
    loadingLatestMeasurement: 'Nalaganje zadnje razpolozljive veljavne meritve NO2...',
    measurementLoadErrorTitle: 'Napaka pri nalaganju meritve',
    noStoredMeasurementTitle: 'Za izbrano regijo ni shranjene meritve',
    noStoredMeasurementText:
      'Za izbrano regijo trenutno ni shranjene zadnje razpolozljive veljavne meritve NO2. Poskusite drugo regijo ali preverite status obdelave podatkov.',
    latestValidMeasurement: 'Zadnja razpolozljiva veljavna meritev',
    validPixels: 'Veljavnih pikslov',
    qaThreshold: 'QA prag',
    measurementTime: 'Cas meritve',
    productSource: 'Vir produkta',
    status: 'Status',
    valid: 'Veljavno',
    noValidPixels: 'Ni veljavnih pikslov',
    noDataStatus: 'Ni podatkov',
    processingError: 'Napaka obdelave',
    unknown: 'Neznano',
    noValidDataTitle: 'Ni veljavnih podatkov za izbrano regijo',
    noValidDataText:
      'Za izbrani Sentinel-5P produkt v tej regiji ni bilo dovolj veljavnih NO2 pikslov po kakovostnem filtru (qa_value >= 0.75). Pogost vzrok so oblaki, sneg ali nizka kakovost retrieval-a.',
    measurementProcessingErrorTitle: 'Napaka pri obdelavi meritve',
    measurementProcessingErrorText:
      'Izbrane meritve trenutno ni mogoce prikazati kot zanesljive vrednosti, ker se obdelava ni uspesno zakljucila. Vrednosti zato niso prikazane.',
    no2UnavailableTitle: 'Vrednost NO2 ni na voljo',
    no2UnavailableText: 'Za izbrano regijo ni dovolj veljavnih podatkov za izracun regionalne NO2 vrednosti.',
    regionLabel: 'Statisticna regija',
    loadingRegions: 'Nalaganje regij...',
    chooseRegion: 'Izberite regijo',
    noValidPixelsSuffix: 'ni veljavnih pikslov',
    regionsUnavailable:
      'Regijski podatki trenutno niso na voljo. Mozno je, da regionalne meritve se niso bile nalozene v bazo.',
    methodology: 'Metodologija',
    howToRead: 'Kako brati rezultat',
    methodologyText1:
      'Vrednost je satelitska regionalna ocena NO2 iz produktov Sentinel-5P (TROPOMI), agregirana po statisticni regiji. En piksel pokriva priblizno 3,5 x 5,5 km, zato podatkov ni smiselno brati kot ulicne koncentracije. Prikaz ni v realnem casu.',
    methodologyText2:
      'Uporabljen je kakovostni filter qa_value >= 0.75. Ce regija nima dovolj veljavnih pikslov, jo prikazemo kot "ni podatkov" in vrednosti ne izracunamo.',
    spatialOverview: 'Prostorski pregled',
    mapTitle: 'Zemljevid statisticnih regij',
    mapAria: 'Zemljevid slovenskih statisticnih regij',
    loadingMap: 'Nalaganje prostorskega pregleda regij...',
    mapErrorTitle: 'Regij ni mogoce prikazati',
    noGeometriesTitle: 'Geometrije regij trenutno niso na voljo',
    noGeometriesText: 'Regionalne meje morda se niso bile nalozene v bazo.',
    interactiveMapAria: 'Interaktivni Leaflet zemljevid slovenskih statisticnih regij',
    mapControlsAria: 'Izbira regije na zemljevidu',
    selectMapRegion: 'Izberi regijo na zemljevidu {region}',
    mapLegendAria: 'Pomen barv na zemljevidu',
    validMeasurement: 'Veljavna meritev',
    processingErrorLegend: 'Napaka obdelave',
    mapHint:
      'Klik na regijo izbere isto regijo kot spustni seznam. Barva prikazuje status kakovosti zadnje razpolozljive meritve.',
    selected: 'Izbrano',
    comparisonTitle: 'NO2 po statisticnih regijah',
    noRegions: 'Ni regij',
    withValue: '{valid}/{total} z vrednostjo',
    comparisonUnavailable:
      'Regijski podatki trenutno niso na voljo. Primerjava bo prikazana, ko bodo meritve nalozene iz API-ja.',
    comparisonSummaryAria: 'Povzetek primerjave regij',
    highestValue: 'Najvisja vrednost',
    lowestValue: 'Najnizja vrednost',
    withoutValidPixels: 'Brez veljavnih pikslov',
    comparisonListAria: 'Primerjava zadnjih meritev',
    selectRegion: 'Izberi regijo {region}',
    loadingComparison: 'Nalaganje primerjave regij...',
    noValidValue: 'Ni veljavne vrednosti',
    detailsKicker: 'Podatki in izvor regije',
    regionNotSelected: 'Regija ni izbrana',
    regionCode: 'Koda regije',
    exportCsv: 'Izvozi CSV',
    selectRegionForDetails: 'Izberite statisticno regijo za prikaz zadnje meritve NO2.',
    loadingRegionData: 'Nalaganje podatkov za izbrano regijo...',
    detailsLoadErrorTitle: 'Podatkov ni mogoce naloziti',
    noRegionDataTitle: 'Ni podatkov za izbrano regijo',
    noRegionDataText: 'Za izbrano regijo trenutno ni shranjene zadnje meritve NO2.',
    qualityStatus: 'Status kakovosti',
    measurementStart: 'Zacetek meritve',
    measurementEnd: 'Konec meritve',
    processingRunId: 'ID obdelave',
    dataSource: 'Izvor podatkov',
    productId: 'ID produkta',
    latestNo2Value: 'Zadnja NO2 vrednost',
    minMaxNo2: 'Min / max NO2',
    unit: 'Enota',
    provenanceNoPixels:
      'Sentinel-5P produkt je bil obdelan, vendar regionalna NO2 vrednost ni bila izracunana, ker ni bilo dovolj veljavnih pikslov po kakovostnem filtru. Zgornji podatki ohranjajo sledljivost do izvornega produkta in zapisa obdelave.',
    provenanceProcessingError:
      'Obdelava izbrane meritve ni bila uspesna, zato zanesljiva regionalna NO2 vrednost ni bila zapisana. Zgornji podatki ohranjajo sledljivost do izvornega produkta in zapisa obdelave.',
    provenanceDefault:
      'Podatek je sledljiv do izvornega Sentinel-5P produkta; cas meritve se nanasa na satelitski prelet, ID obdelave pa na interni processing run zapis.',
    historyKicker: 'Zgodovina meritev',
    trendTitle: 'Zgodovinski trend NO2',
    historyLoadError:
      'Zgodovine meritev ni bilo mogoce naloziti iz API-ja. Preverite, ali backend deluje in ali so podatki nalozeni v bazo.',
    startDateUnavailable: 'Izbran zacetni datum nima razpolozljivih podatkov.',
    endDateUnavailable: 'Izbran koncni datum nima razpolozljivih podatkov.',
    startBeforeEnd: 'Zacetni datum mora biti pred ali enak koncnemu datumu.',
    from: 'Od',
    to: 'Do',
    allDates: 'Vsi datumi',
    noAvailableDates: 'Ni razpolozljivih datumov',
    show: 'Prikazi',
    clear: 'Pocisti',
    trendLead:
      'Prikaz zgodovinskih vrednosti NO2 za regijo {region}. Podatki temeljijo na obdelanih Sentinel-5P produktih.',
    date: 'Datum',
    trendHint:
      'Graf prikazuje povprecne vrednosti NO2 po casu. Manjkajoce vrednosti pomenijo, da za dolocen casovni interval ni bilo veljavnih pikslov.',
    noDataForDateTitle: 'Ni podatkov za izbrani datum',
    noDataForDateText:
      'Za izbrani datumski interval ni zgodovinskih meritev NO2. Izberite drug interval ali pocistite izbor, da se vrnete na razpolozljive podatke.',
    noHistoryTitle: 'Ni zgodovinskih meritev',
    trendUnavailableTitle: 'Trend se ni na voljo',
    noHistoryText: 'Za izbrano regijo trenutno ni zgodovinskih meritev NO2.',
    trendNeedsTwo:
      'Za prikaz trenda sta potrebni vsaj dve meritvi; trenutno je na voljo ena meritev{date}.',
    loadingErrorTitle: 'Napaka pri nalaganju',
    adminTitle: 'Status obdelave podatkov',
    adminSubtitle: 'Zadnji zapis obdelave za hitro preverjanje podatkovnega toka.',
    processingStatusLoadError: 'Statusa obdelave ni bilo mogoce naloziti iz API-ja.',
    processingHistoryLoadError: 'Zgodovine obdelav ni bilo mogoce naloziti iz API-ja.',
    latestProcessing: 'Zadnja obdelava',
    latestProcessingRun: 'Zadnji processing run',
    latestProduct: 'Zadnji Sentinel-5P produkt',
    latestSuccessfulUpdate: 'Zadnja uspesna posodobitev',
    product: 'Produkt',
    script: 'Skripta',
    scriptVersion: 'Verzija skripte',
    startedAt: 'Zacetek',
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
    success: 'Uspesno',
    running: 'V teku',
    failed: 'Napaka',
    latestRunSuccess: 'Zadnja obdelava je bila uspesna',
    latestRunRunning: 'Obdelava je trenutno v teku',
    latestRunFailed: 'Zadnja obdelava ni bila uspesna',
    latestRunUnknown: 'Status zadnje obdelave ni znan',
  },
  en: {
    languageName: 'English',
    languageToggleLabel: 'Interface language',
    switchToEnglish: 'Switch to Slovenian',
    brandSubtitle: 'Satellite air-quality monitoring over Slovenia',
    navMain: 'Main navigation',
    navOverview: 'Overview',
    navTrend: 'Historical trend',
    navComparison: 'Region comparison',
    navDataExport: 'Data & export',
    dashboardTitle: 'NO2 overview by Slovenian statistical regions',
    dashboardSubtitle:
      'Latest available processed NO2 measurement from Sentinel-5P satellite products. This is not a real-time view.',
    heroAria: 'Selected region and latest measurement',
    analysis: 'Analysis',
    analysisLead: 'Historical trend for the selected region and a comparison by the latest available NO2 value.',
    dataMethodology: 'Data and methodology',
    dataMethodologyLead: 'Measurement details, data provenance, traceability, and how to read the result.',
    latestMeasurement: 'Latest measurement',
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
    noValidPixelsSuffix: 'no valid pixels',
    regionsUnavailable:
      'Regional data is currently unavailable. Regional measurements may not yet have been loaded into the database.',
    methodology: 'Methodology',
    howToRead: 'How to read the result',
    methodologyText1:
      'The value is a satellite-based regional NO2 estimate from Sentinel-5P (TROPOMI) products, aggregated by statistical region. One pixel covers roughly 3.5 x 5.5 km, so the data should not be read as street-level concentrations. This is not real-time.',
    methodologyText2:
      'A quality filter of qa_value >= 0.75 is used. If a region does not have enough valid pixels, it is shown as "no data" and no value is calculated.',
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
    mapHint:
      'Clicking a region selects the same region as the dropdown. Color shows the quality status of the latest available measurement.',
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
    exportCsv: 'Export CSV',
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
      'The value is traceable to the source Sentinel-5P product; measurement time refers to the satellite overpass, and processing ID refers to the internal processing run record.',
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
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language)
      document.documentElement.lang = language
    }
  }, [language])

  const value = useMemo(() => {
    const dictionary = translations[language] || translations[DEFAULT_LANGUAGE]

    function t(key, params = {}) {
      const template = dictionary[key] || translations[DEFAULT_LANGUAGE][key] || key
      return Object.entries(params).reduce(
        (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
        template,
      )
    }

    return { language, setLanguage, t, locale: language === 'en' ? 'en-US' : 'sl-SI' }
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
