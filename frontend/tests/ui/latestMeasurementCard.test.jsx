import { render, screen } from '@testing-library/react'

import LatestMeasurementCard from '../../src/components/LatestMeasurementCard'
import { LanguageProvider } from '../../src/i18n'

const validMeasurement = {
  region_code: 'SI032',
  region_name: 'Podravska',
  value_mean: 0.000031,
  pixel_count_valid: 41,
  quality_status: 'valid',
  unit: 'mol/m²',
  measurement_end_time: '2025-03-11T13:18:05+00:00',
}

function renderCard(props = {}) {
  render(
    <LanguageProvider>
      <LatestMeasurementCard
        measurement={validMeasurement}
        isLoading={false}
        error=""
        hasRegion
        {...props}
      />
    </LanguageProvider>,
  )
}

describe('LatestMeasurementCard', () => {
  it('renders the value, concentration badge and last-measurement time', () => {
    renderCard({ concentrationLevel: 'high' })
    expect(screen.getByText('Visoka koncentracija')).toBeInTheDocument()
    expect(screen.getByText(/Zadnja meritev/)).toBeInTheDocument()
    // scientific value (mantissa × 10^exponent)
    expect(screen.getByText(/×\s*10/)).toBeInTheDocument()
  })

  it('shows the no-valid-data message for a no_valid_pixels region', () => {
    renderCard({
      measurement: { ...validMeasurement, quality_status: 'no_valid_pixels', value_mean: null, pixel_count_valid: 0 },
    })
    expect(screen.getByText('Ni veljavnih podatkov za izbrano regijo')).toBeInTheDocument()
  })

  it('prompts to choose a region when none is selected', () => {
    renderCard({ hasRegion: false, measurement: null })
    expect(screen.getByText('Ni izbrane regije')).toBeInTheDocument()
  })
})
