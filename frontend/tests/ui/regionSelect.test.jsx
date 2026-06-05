import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import RegionSelect from '../../src/components/RegionSelect'
import { LanguageProvider } from '../../src/i18n'

const regions = [
  { region_code: 'SI031', region_name: 'Pomurska', quality_status: 'no_valid_pixels', value_mean: null },
  { region_code: 'SI032', region_name: 'Podravska', quality_status: 'valid', value_mean: 0.000031 },
]

function renderSelect(extra = {}) {
  const onRegionChange = vi.fn()
  render(
    <LanguageProvider>
      <RegionSelect
        regions={regions}
        selectedRegionCode="SI032"
        onRegionChange={onRegionChange}
        isLoading={false}
        error=""
        {...extra}
      />
    </LanguageProvider>,
  )
  return { onRegionChange }
}

describe('RegionSelect', () => {
  it('opens, filters by search and selects a region', async () => {
    const user = userEvent.setup()
    const { onRegionChange } = renderSelect()

    await user.click(screen.getByRole('button', { name: /Statisti.*na regija/i }))
    await user.type(screen.getByPlaceholderText('Išči po imenu ali kodi'), 'Pomur')

    expect(screen.getByRole('option', { name: /Pomurska/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Podravska/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: /Pomurska/i }))
    expect(onRegionChange).toHaveBeenCalledWith('SI031')
  })

  it('shows a no-results message when the search matches nothing', async () => {
    const user = userEvent.setup()
    renderSelect()

    await user.click(screen.getByRole('button', { name: /Statisti.*na regija/i }))
    await user.type(screen.getByPlaceholderText('Išči po imenu ali kodi'), 'zzz')

    expect(screen.getByText(/Ni najdenih regij/i)).toBeInTheDocument()
  })

  it('disables the trigger while regions are loading', () => {
    renderSelect({ regions: [], isLoading: true })
    expect(screen.getByRole('button', { name: /Statisti.*na regija/i })).toBeDisabled()
  })
})
