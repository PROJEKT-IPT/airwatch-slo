import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import Dashboard from '../../src/pages/Dashboard'
import {
  getRegionCsvExportUrl,
  getRegionDetails,
  getRegionalLatestMeasurements,
} from '../../src/api/airwatchApi'

vi.mock('../../src/api/airwatchApi', () => ({
  getRegionCsvExportUrl: vi.fn(),
  getRegionDetails: vi.fn(),
  getRegionalLatestMeasurements: vi.fn(),
}))

const regionSummaries = [
  {
    region_code: 'SI031',
    region_name: 'Pomurska',
    region_type: 'statistical_region',
    quality_status: 'no_valid_pixels',
  },
  {
    region_code: 'SI032',
    region_name: 'Podravska',
    region_type: 'statistical_region',
    quality_status: 'valid',
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

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getRegionalLatestMeasurements.mockResolvedValue(regionSummaries)
    getRegionDetails.mockImplementation(regionCode => Promise.resolve(regionDetails[regionCode]))
    getRegionCsvExportUrl.mockImplementation(
      regionCode => `/api/api/v1/regions/${regionCode}/export.csv`,
    )
  })

  it('defaults to the first valid region and renders its measurement details', async () => {
    const { container } = render(<Dashboard />)

    await waitFor(() => {
      expect(container.querySelector('.metric-card h2')).toHaveTextContent('Podravska')
    })
    expect(getRegionDetails).toHaveBeenCalledWith('SI032')

    const exportLink = screen.getByRole('link', { name: 'Izvozi CSV' })
    expect(exportLink).toHaveAttribute('href', '/api/api/v1/regions/SI032/export.csv')

    const metricCard = container.querySelector('.metric-card')
    expect(within(metricCard).getByText('41')).toBeInTheDocument()
  })

  it('updates the cards when the selected region changes', async () => {
    const user = userEvent.setup()
    const { container } = render(<Dashboard />)

    await waitFor(() => {
      expect(container.querySelector('.metric-card h2')).toHaveTextContent('Podravska')
    })

    await user.selectOptions(screen.getByRole('combobox'), 'SI031')

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
      '/api/api/v1/regions/SI031/export.csv',
    )
  })
})
