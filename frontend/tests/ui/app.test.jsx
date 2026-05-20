import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../../src/App'
import {
  getProcessingStatus,
  getRegionCsvExportUrl,
  getRegionComparison,
  getRegionDetails,
  getRegionGeometries,
  getRegionalLatestMeasurements,
} from '../../src/api/airwatchApi'

vi.mock('../../src/api/airwatchApi', () => ({
  getProcessingStatus: vi.fn(),
  getRegionCsvExportUrl: vi.fn(),
  getRegionComparison: vi.fn(),
  getRegionDetails: vi.fn(),
  getRegionGeometries: vi.fn(),
  getRegionalLatestMeasurements: vi.fn(),
}))

describe('App navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getRegionalLatestMeasurements.mockResolvedValue([
      {
        region_code: 'SI032',
        region_name: 'Podravska',
        region_type: 'statistical_region',
        quality_status: 'valid',
      },
    ])
    getRegionComparison.mockResolvedValue([])
    getRegionGeometries.mockResolvedValue([
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
    ])
    getRegionDetails.mockResolvedValue({
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
    })
    getRegionCsvExportUrl.mockReturnValue('/api/api/v1/regions/SI032/export.csv')
    getProcessingStatus.mockResolvedValue({
      id_processing_run: 22,
      run_status: 'success',
      script_name: 'run_latest_no2_pipeline.py',
      script_version: '0.1.0',
      qa_threshold: 0.75,
      started_at: '2025-03-11T13:20:00+00:00',
      finished_at: '2025-03-11T13:23:00+00:00',
      source_product_name: 'S5P_OFFL_L2__NO2____20250311T115807_20250311T133937.nc',
      error_message: null,
    })
  })

  it('switches from dashboard to the admin view', async () => {
    const user = userEvent.setup()

    render(<App />)

    await screen.findByRole('heading', { name: /pregled no/i })

    await user.click(screen.getByRole('button', { name: 'Admin/debug' }))

    expect(await screen.findByRole('heading', { name: 'Status obdelave podatkov' })).toBeVisible()
    expect(screen.getByText('run_latest_no2_pipeline.py')).toBeInTheDocument()
  })
})
