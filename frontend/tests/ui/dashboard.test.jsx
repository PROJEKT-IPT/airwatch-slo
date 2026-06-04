import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LanguageProvider } from '../../src/i18n'
import Dashboard from '../../src/pages/Dashboard'
import {
  getAllRegionsCsvExportUrl,
  getRegionCsvExportUrl,
  getRegionComparison,
  getRegionDetails,
  getRegionGeometries,
  getRegionHistoryCsvExportUrl,
  getRegionHistory,
  getRegionalLatestMeasurements,
} from '../../src/api/airwatchApi'

vi.mock('../../src/api/airwatchApi', () => ({
  getAllRegionsCsvExportUrl: vi.fn(),
  getRegionCsvExportUrl: vi.fn(),
  getRegionComparison: vi.fn(),
  getRegionDetails: vi.fn(),
  getRegionGeometries: vi.fn(),
  getRegionHistoryCsvExportUrl: vi.fn(),
  getRegionHistory: vi.fn(),
  getRegionalLatestMeasurements: vi.fn(),
}))

const regionSummaries = [
  {
    region_code: 'SI031',
    region_name: 'Pomurska',
    region_type: 'statistical_region',
    value_mean: null,
    pixel_count_valid: 0,
    quality_status: 'no_valid_pixels',
    unit: 'mol/m²',
    measurement_end_time: '2025-03-11T13:18:05+00:00',
  },
  {
    region_code: 'SI032',
    region_name: 'Podravska',
    region_type: 'statistical_region',
    value_mean: 0.000031,
    pixel_count_valid: 41,
    quality_status: 'valid',
    unit: 'mol/m²',
    measurement_end_time: '2025-03-11T13:18:05+00:00',
  },
]

const regionComparison = [
  {
    region_code: 'SI032',
    region_name: 'Podravska',
    region_type: 'statistical_region',
    value_mean: 0.000031,
    value_min: 0.000012,
    value_max: 0.000052,
    pixel_count_valid: 41,
    qa_threshold: 0.75,
    quality_status: 'valid',
    unit: 'mol/mÂ²',
    measurement_start_time: '2025-03-11T12:19:40+00:00',
    measurement_end_time: '2025-03-11T13:18:05+00:00',
    processing_run_id: 14,
    source_product_name: 'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937.nc',
  },
  {
    region_code: 'SI031',
    region_name: 'Pomurska',
    region_type: 'statistical_region',
    value_mean: null,
    value_min: null,
    value_max: null,
    pixel_count_valid: 0,
    qa_threshold: 0.75,
    quality_status: 'no_valid_pixels',
    unit: 'mol/mÂ²',
    measurement_start_time: '2025-03-11T12:19:40+00:00',
    measurement_end_time: '2025-03-11T13:18:05+00:00',
    processing_run_id: 13,
    source_product_name: 'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937.nc',
  },
]

const regionDetails = {
  SI031: {
    region_code: 'SI031',
    region_name: 'Pomurska',
    region_type: 'statistical_region',
    latest_measurement: {
      value_mean: null,
      value_min: null,
      value_max: null,
      pixel_count_valid: 0,
      qa_threshold: 0.75,
      quality_status: 'no_valid_pixels',
      unit: 'mol/m²',
      measurement_start_time: '2025-03-11T12:19:40+00:00',
      measurement_end_time: '2025-03-11T13:18:05+00:00',
      processing_run_id: 13,
      source_product_id: 'product-si031',
      source_product_name: 'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937.nc',
    },
  },
  SI032: {
    region_code: 'SI032',
    region_name: 'Podravska',
    region_type: 'statistical_region',
    latest_measurement: {
      value_mean: 0.000031,
      value_min: 0.000012,
      value_max: 0.000052,
      pixel_count_valid: 41,
      qa_threshold: 0.75,
      quality_status: 'valid',
      unit: 'mol/m²',
      measurement_start_time: '2025-03-11T12:19:40+00:00',
      measurement_end_time: '2025-03-11T13:18:05+00:00',
      processing_run_id: 14,
      source_product_id: 'product-si032',
      source_product_name: 'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937.nc',
    },
  },
}

const regionGeometries = [
  {
    region_code: 'SI031',
    region_name: 'Pomurska',
    region_type: 'statistical_region',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [16.0, 46.5],
          [16.8, 46.5],
          [16.8, 47.0],
          [16.0, 47.0],
          [16.0, 46.5],
        ],
      ],
    },
  },
  {
    region_code: 'SI032',
    region_name: 'Podravska',
    region_type: 'statistical_region',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [15.1, 46.0],
          [16.0, 46.0],
          [16.0, 46.5],
          [15.1, 46.5],
          [15.1, 46.0],
        ],
      ],
    },
  },
]

const regionHistoryWithMeasurements = {
  measurements: [
    {
      value_mean: 0.000018,
      measurement_end_time: '2025-02-10T13:18:05+00:00',
    },
    {
      value_mean: 0.000031,
      measurement_end_time: '2025-03-11T13:18:05+00:00',
    },
  ],
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getRegionalLatestMeasurements.mockResolvedValue(regionSummaries)
    getRegionComparison.mockResolvedValue(regionComparison)
    getRegionDetails.mockImplementation(regionCode => Promise.resolve(regionDetails[regionCode]))
    getRegionGeometries.mockResolvedValue(regionGeometries)
    getRegionHistory.mockResolvedValue({ measurements: [] })
    getRegionCsvExportUrl.mockImplementation(
      regionCode =>
        `https://airwatch-slo-production.up.railway.app/api/v1/regions/${regionCode}/export.csv`,
    )
    getRegionHistoryCsvExportUrl.mockImplementation(
      regionCode =>
        `https://airwatch-slo-production.up.railway.app/api/v1/regions/${regionCode}/history/export.csv`,
    )
    getAllRegionsCsvExportUrl.mockReturnValue(
      'https://airwatch-slo-production.up.railway.app/api/v1/regions/export.csv',
    )
  })

  function renderDashboard(activeView = 'overview') {
    return render(
      <LanguageProvider>
        <Dashboard activeView={activeView} />
      </LanguageProvider>,
    )
  }

  it('overview: defaults to the first valid region and renders its measurement + map', async () => {
    const { container } = renderDashboard('overview')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Statisti.*na regija/i })).toHaveTextContent('Podravska')
    })
    await waitFor(() => {
      expect(getRegionDetails).toHaveBeenCalledWith('SI032')
    })

    // The headline value only renders once the per-region detail has loaded,
    // which resolves after the summaries (so wait for it rather than assume).
    await waitFor(() => {
      expect(container.querySelector('.metric-card .metric-value')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Interaktivni Leaflet zemljevid slovenskih statističnih regij'))
      .toBeInTheDocument()
  })

  it('overview: updates the cards when the selected region changes', async () => {
    const user = userEvent.setup()
    const { container } = renderDashboard('overview')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Statisti.*na regija/i })).toHaveTextContent('Podravska')
    })

    await user.click(screen.getByRole('button', { name: /Statistična regija/i }))
    await user.click(await screen.findByRole('option', { name: /Pomurska/i }))

    await waitFor(() => {
      expect(getRegionDetails).toHaveBeenLastCalledWith('SI031')
    })

    await waitFor(() => {
      expect(container.querySelector('.metric-card h3')).toHaveTextContent(
        'Ni veljavnih podatkov za izbrano regijo',
      )
    })
    expect(screen.getByRole('button', { name: /Statisti.*na regija/i })).toHaveTextContent('SI031')
  })

  it('overview: selects a region from the regional map', async () => {
    const user = userEvent.setup()
    renderDashboard('overview')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Statisti.*na regija/i })).toHaveTextContent('Podravska')
    })

    await user.click(screen.getByRole('button', { name: 'Izberi regijo na zemljevidu Pomurska' }))

    await waitFor(() => {
      expect(getRegionDetails).toHaveBeenLastCalledWith('SI031')
    })
    expect(screen.getByRole('button', { name: /Statistična regija/i })).toHaveTextContent('SI031')
  })

  it('overview: shows the NO₂ value gradient legend', async () => {
    const { container } = renderDashboard('overview')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Statisti.*na regija/i })).toHaveTextContent('Podravska')
    })

    const legend = container.querySelector('.map-legend')
    expect(legend).toBeInTheDocument()
    expect(within(legend).getByText('NO₂ vrednost')).toBeInTheDocument()
    expect(within(legend).getByText('relativna lestvica')).toBeInTheDocument()
    expect(within(legend).getByText('µmol/m²')).toBeInTheDocument()
    expect(within(legend).getByText('Ni veljavne vrednosti')).toBeInTheDocument()
    expect(within(legend).getByText(/Temnejša barva pomeni višjo vrednost/)).toBeInTheDocument()
  })

  it('comparison view: renders rows and selects a region from the comparison', async () => {
    const user = userEvent.setup()
    renderDashboard('comparison')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'NO₂ po statističnih regijah' })).toBeInTheDocument()
    })
    expect(getRegionComparison).toHaveBeenCalledWith(['SI031', 'SI032'])
    expect(screen.getByText('1/2 z vrednostjo')).toBeInTheDocument()
    expect(screen.getByText('Najvišja vrednost')).toBeInTheDocument()
    expect(screen.getByText('Najnižja vrednost')).toBeInTheDocument()
    expect(screen.getByText('Brez veljavnih pikslov')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Izberi regijo Pomurska' }))

    await waitFor(() => {
      expect(getRegionDetails).toHaveBeenLastCalledWith('SI031')
    })
  })

  it('trend view: renders chart content when history is available', async () => {
    getRegionHistory.mockResolvedValue(regionHistoryWithMeasurements)

    const { container } = renderDashboard('trend')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Zgodovinski trend NO₂' })).toBeInTheDocument()
    })

    expect(container.querySelector('.trend-chart-plot')).toBeInTheDocument()
    expect(
      screen.getByText(/Graf prikazuje povprečne vrednosti NO₂ po času/i),
    ).toBeInTheDocument()
  })

  it('trend view: shows the no-data message when history is empty', async () => {
    getRegionHistory.mockResolvedValue({ measurements: [] })

    renderDashboard('trend')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Zgodovinski trend NO₂' })).toBeInTheDocument()
    })

    expect(screen.getByText('Za izbrano regijo trenutno ni zgodovinskih meritev NO₂.')).toBeInTheDocument()
  })

  it('data view: renders details, CSV exports and provenance; handles no-data region', async () => {
    const user = userEvent.setup()
    renderDashboard('data')

    await waitFor(() => {
      expect(screen.getByText('product-si032')).toBeInTheDocument()
    })
    expect(screen.getByText('Podatki in izvor regije')).toBeInTheDocument()
    expect(screen.getByText('Sentinel-5P / Copernicus')).toBeInTheDocument()
    expect(screen.getByText('ID produkta')).toBeInTheDocument()
    expect(screen.getByText('ID obdelave')).toBeInTheDocument()
    expect(screen.getByText('Status kakovosti')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Izvozi regijo (CSV)' })).toHaveAttribute(
      'href',
      'https://airwatch-slo-production.up.railway.app/api/v1/regions/SI032/export.csv',
    )
    expect(screen.getByRole('link', { name: 'Izvozi zgodovino regije (CSV)' })).toHaveAttribute(
      'href',
      'https://airwatch-slo-production.up.railway.app/api/v1/regions/SI032/history/export.csv',
    )
    expect(screen.getByRole('link', { name: 'Izvozi vse regije (CSV)' })).toHaveAttribute(
      'href',
      'https://airwatch-slo-production.up.railway.app/api/v1/regions/export.csv',
    )

    await user.click(screen.getByRole('button', { name: /Statistična regija/i }))
    await user.click(await screen.findByRole('option', { name: /Pomurska/i }))

    await waitFor(() => {
      expect(getRegionDetails).toHaveBeenLastCalledWith('SI031')
    })
    expect(await screen.findByText(/ni bilo dovolj veljavnih pikslov/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Izvozi regijo (CSV)' })).toHaveAttribute(
      'href',
      'https://airwatch-slo-production.up.railway.app/api/v1/regions/SI031/export.csv',
    )
    expect(screen.getByRole('link', { name: 'Izvozi zgodovino regije (CSV)' })).toHaveAttribute(
      'href',
      'https://airwatch-slo-production.up.railway.app/api/v1/regions/SI031/history/export.csv',
    )
  })

  it('satellite view: includes the methodology explanation', async () => {
    renderDashboard('satellite')

    expect(await screen.findByRole('heading', { name: 'Kako brati rezultat' })).toBeInTheDocument()
  })

  it('satellite view: explains how the live orbit display works', async () => {
    renderDashboard('satellite')

    await waitFor(() => {
      expect(getRegionDetails).toHaveBeenCalledWith('SI032')
    })
    expect(screen.getByRole('heading', { name: 'Kje je Sentinel-5P trenutno?' })).toBeInTheDocument()
    expect(screen.getByText(/Deluje tako, da aplikacija prebere dva TLE zapisa/i)).toBeInTheDocument()
  })
})
