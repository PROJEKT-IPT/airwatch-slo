import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import Dashboard from '../../src/pages/Dashboard'
import {
  getRegionCsvExportUrl,
  getRegionComparison,
  getRegionDetails,
  getRegionGeometries,
  getRegionHistory,
  getRegionalLatestMeasurements,
} from '../../src/api/airwatchApi'

vi.mock('../../src/api/airwatchApi', () => ({
  getRegionCsvExportUrl: vi.fn(),
  getRegionComparison: vi.fn(),
  getRegionDetails: vi.fn(),
  getRegionGeometries: vi.fn(),
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
  })

  it('defaults to the first valid region and renders its measurement details', async () => {
    const { container } = render(<Dashboard />)

    await waitFor(() => {
      expect(container.querySelector('.metric-card h2')).toHaveTextContent('Podravska')
    })
    expect(getRegionDetails).toHaveBeenCalledWith('SI032')

    const exportLink = screen.getByRole('link', { name: 'Izvozi CSV' })
    expect(exportLink).toHaveAttribute(
      'href',
      'https://airwatch-slo-production.up.railway.app/api/v1/regions/SI032/export.csv',
    )

    const metricCard = container.querySelector('.metric-card')
    expect(within(metricCard).getByText('41')).toBeInTheDocument()
    expect(screen.getByLabelText('Interaktivni Leaflet zemljevid slovenskih statističnih regij'))
      .toBeInTheDocument()
    expect(screen.getByText('Izbrano')).toBeInTheDocument()
  })

  it('updates the cards when the selected region changes', async () => {
    const user = userEvent.setup()
    const { container } = render(<Dashboard />)

    await waitFor(() => {
      expect(container.querySelector('.metric-card h2')).toHaveTextContent('Podravska')
    })

    await user.selectOptions(screen.getByLabelText('Statistična regija'), 'SI031')

    await waitFor(() => {
      expect(getRegionDetails).toHaveBeenLastCalledWith('SI031')
    })

    await waitFor(() => {
      expect(container.querySelector('.metric-card h3')).toHaveTextContent(
        'Ni veljavnih podatkov za izbrano regijo',
      )
    })
    expect(screen.getByRole('link', { name: 'Izvozi CSV' })).toHaveAttribute(
      'href',
      'https://airwatch-slo-production.up.railway.app/api/v1/regions/SI031/export.csv',
    )
    expect(container.querySelector('.map-selected-region')).toHaveTextContent('SI031')
  })

  it('selects a region from the regional map', async () => {
    const user = userEvent.setup()
    const { container } = render(<Dashboard />)

    await waitFor(() => {
      expect(container.querySelector('.metric-card h2')).toHaveTextContent('Podravska')
    })

    await user.click(screen.getByRole('button', { name: 'Izberi regijo na zemljevidu Pomurska' }))

    await waitFor(() => {
      expect(getRegionDetails).toHaveBeenLastCalledWith('SI031')
    })
    expect(screen.getByLabelText('Statistična regija')).toHaveValue('SI031')
  })

  it('renders region comparison rows and selects a region from the comparison', async () => {
    const user = userEvent.setup()
    const { container } = render(<Dashboard />)

    await waitFor(() => {
      expect(container.querySelector('.metric-card h2')).toHaveTextContent('Podravska')
    })

    expect(screen.getByRole('heading', { name: 'NO₂ po statističnih regijah' })).toBeInTheDocument()
    expect(getRegionComparison).toHaveBeenCalledWith(['SI031', 'SI032'])
    expect(screen.getByText('1/2 z vrednostjo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Izberi regijo Pomurska' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Izberi regijo Pomurska' }))

    await waitFor(() => {
      expect(getRegionDetails).toHaveBeenLastCalledWith('SI031')
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Statistična regija')).toHaveValue('SI031')
    })
  })

  it('renders comparison summary tiles with counts', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'NO₂ po statističnih regijah' })).toBeInTheDocument()
    })

    expect(screen.getByText('Najvišja vrednost')).toBeInTheDocument()
    expect(screen.getByText('Najnižja vrednost')).toBeInTheDocument()
    expect(screen.getByText('Brez veljavnih pikslov')).toBeInTheDocument()
    expect(screen.getByText('1/2 z vrednostjo')).toBeInTheDocument()
  })

  it('renders trend chart content when history is available', async () => {
    getRegionHistory.mockResolvedValue(regionHistoryWithMeasurements)

    const { container } = render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Zgodovinski trend NO₂' })).toBeInTheDocument()
    })

    expect(container.querySelector('.trend-chart-plot')).toBeInTheDocument()
    expect(
      screen.getByText(/Graf prikazuje povprečne vrednosti NO₂ po času/i),
    ).toBeInTheDocument()
  })

  it('shows the no-data message when trend history is empty', async () => {
    getRegionHistory.mockResolvedValue({ measurements: [] })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Zgodovinski trend NO₂' })).toBeInTheDocument()
    })

    expect(screen.getByText('Ni podatkov za izbrani datum')).toBeInTheDocument()
  })

  it('renders the map quality legend so colour is not the only status indicator', async () => {
    const { container } = render(<Dashboard />)

    await waitFor(() => {
      expect(container.querySelector('.metric-card h2')).toHaveTextContent('Podravska')
    })

    const legend = container.querySelector('.map-legend')
    expect(legend).toBeInTheDocument()
    expect(within(legend).getByText('Veljavna meritev')).toBeInTheDocument()
    expect(within(legend).getByText('Ni veljavnih pikslov')).toBeInTheDocument()
    expect(within(legend).getByText('Napaka obdelave')).toBeInTheDocument()
  })

  it('renders provenance details and no-data note for a no-valid-pixels region', async () => {
    const user = userEvent.setup()
    const { container } = render(<Dashboard />)

    await waitFor(() => {
      expect(container.querySelector('.metric-card h2')).toHaveTextContent('Podravska')
    })

    expect(screen.getByText('Podatki in izvor regije')).toBeInTheDocument()
    expect(screen.getByText('Sentinel-5P / Copernicus')).toBeInTheDocument()
    expect(screen.getByText('ID produkta')).toBeInTheDocument()
    expect(screen.getByText('product-si032')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Statistična regija'), 'SI031')

    await waitFor(() => {
      expect(container.querySelector('.metric-card h2')).toHaveTextContent('Pomurska')
    })

    expect(
      screen.getByText(/ni bilo dovolj veljavnih pikslov/i),
    ).toBeInTheDocument()
  })
})
