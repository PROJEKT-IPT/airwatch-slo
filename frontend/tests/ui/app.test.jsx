import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../../src/App'
import {
  getProcessingHistory,
  getProcessingStatus,
  getRegionCsvExportUrl,
  getRegionComparison,
  getRegionDetails,
  getRegionGeometries,
  getRegionHistory,
  getRegionalLatestMeasurements,
} from '../../src/api/airwatchApi'

vi.mock('../../src/api/airwatchApi', () => ({
  getProcessingHistory: vi.fn(),
  getProcessingStatus: vi.fn(),
  getRegionCsvExportUrl: vi.fn(),
  getRegionComparison: vi.fn(),
  getRegionDetails: vi.fn(),
  getRegionGeometries: vi.fn(),
  getRegionHistory: vi.fn(),
  getRegionalLatestMeasurements: vi.fn(),
}))

describe('App navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
    window.localStorage.clear()
    document.documentElement.classList.remove('a11y-large-text', 'a11y-high-contrast', 'a11y-reduce-motion')

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
    getRegionCsvExportUrl.mockReturnValue(
      'https://airwatch-slo-production.up.railway.app/api/v1/regions/SI032/export.csv',
    )
    getRegionHistory.mockResolvedValue({ measurements: [] })
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
    getProcessingHistory.mockResolvedValue([])
  })

  it('renders the admin/debug view at the #admin hash (not advertised in nav)', async () => {
    window.location.hash = '#admin'

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Status obdelave podatkov' })).toBeVisible()
    expect(screen.getByText('run_latest_no2_pipeline.py')).toBeInTheDocument()
    // Admin/debug is internal: no public nav button advertises it.
    expect(screen.queryByRole('button', { name: 'Admin/debug' })).not.toBeInTheDocument()
  })

  it('does not advertise already-shipped dashboard features as "coming soon"', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: /pregled no/i })

    // Trend, comparison and export ship on the dashboard, so they must not be
    // labelled "kmalu" (coming soon) in the sidebar.
    expect(screen.queryByText('kmalu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zgodovinski trend' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Primerjava regij' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Podatki & izvoz' })).toBeEnabled()
  })

  it('persists accessibility display settings', async () => {
    const user = userEvent.setup()

    render(<App />)

    await screen.findByRole('heading', { name: /pregled no/i })
    await user.click(screen.getByRole('button', { name: 'Dostopnost' }))
    await user.click(screen.getByRole('checkbox', { name: 'Večje besedilo' }))
    await user.click(screen.getByRole('checkbox', { name: 'Visok kontrast' }))
    await user.click(screen.getByRole('checkbox', { name: 'Manj gibanja' }))

    expect(document.documentElement).toHaveClass('a11y-large-text')
    expect(document.documentElement).toHaveClass('a11y-high-contrast')
    expect(document.documentElement).toHaveClass('a11y-reduce-motion')
    expect(JSON.parse(window.localStorage.getItem('airwatch-accessibility'))).toEqual({
      largeText: true,
      highContrast: true,
      reduceMotion: true,
    })
  })

  it.each([
    {
      button: 'EN',
      heading: /NO2 overview/i,
      trend: 'Historical trend',
      comparison: 'Region comparison',
      dataNav: 'Data & export',
      exportCsv: 'Export all regions (CSV)',
      htmlLang: 'en',
    },
    {
      button: 'DE',
      heading: /NO2-Übersicht/i,
      trend: 'Historischer Trend',
      comparison: 'Regionenvergleich',
      dataNav: 'Daten & Export',
      exportCsv: 'Alle Regionen exportieren (CSV)',
      htmlLang: 'de',
    },
  ])('switches the main UI to $button', async ({ button, heading, trend, comparison, dataNav, exportCsv, htmlLang }) => {
    const user = userEvent.setup()

    render(<App />)

    await screen.findByRole('heading', { name: /pregled no/i })
    await user.click(screen.getByRole('button', { name: button }))

    expect(await screen.findByRole('heading', { name: heading })).toBeVisible()
    expect(screen.getByRole('button', { name: trend })).toBeEnabled()
    expect(screen.getByRole('button', { name: comparison })).toBeEnabled()
    expect(document.documentElement).toHaveAttribute('lang', htmlLang)

    // CSV export lives on the data & export view
    await user.click(screen.getByRole('button', { name: dataNav }))
    expect(await screen.findByRole('link', { name: exportCsv })).toBeInTheDocument()
  })
})
