import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import AdminLoginGate from '../../src/components/AdminLoginGate'
import { LanguageProvider } from '../../src/i18n'
import {
  AdminDisabledError,
  hasAdminAuth,
  setAdminPassword,
  verifyAdminPassword,
} from '../../src/api/airwatchApi'

vi.mock('../../src/api/airwatchApi', () => {
  class AdminDisabledError extends Error {}
  return {
    AdminDisabledError,
    hasAdminAuth: vi.fn(() => false),
    setAdminPassword: vi.fn(),
    verifyAdminPassword: vi.fn(),
  }
})

function renderGate() {
  return render(
    <LanguageProvider>
      <AdminLoginGate>
        <div>Protected admin content</div>
      </AdminLoginGate>
    </LanguageProvider>,
  )
}

describe('AdminLoginGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hasAdminAuth.mockReturnValue(false)
  })

  it('shows the protected content immediately when already authenticated', () => {
    hasAdminAuth.mockReturnValue(true)
    renderGate()
    expect(screen.getByText('Protected admin content')).toBeInTheDocument()
  })

  it('unlocks the content when the password is accepted', async () => {
    const user = userEvent.setup()
    verifyAdminPassword.mockResolvedValue(true)
    renderGate()

    await user.type(screen.getByLabelText('Geslo'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Prijava' }))

    await waitFor(() => {
      expect(screen.getByText('Protected admin content')).toBeInTheDocument()
    })
    expect(setAdminPassword).toHaveBeenCalledWith('secret')
  })

  it('shows an error for a wrong password', async () => {
    const user = userEvent.setup()
    verifyAdminPassword.mockResolvedValue(false)
    renderGate()

    await user.type(screen.getByLabelText('Geslo'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Prijava' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Napačno geslo')
    expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument()
  })

  it('reports when admin access is disabled on the server', async () => {
    const user = userEvent.setup()
    verifyAdminPassword.mockRejectedValue(new AdminDisabledError())
    renderGate()

    await user.type(screen.getByLabelText('Geslo'), 'x')
    await user.click(screen.getByRole('button', { name: 'Prijava' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/ADMIN_PASSWORD ni nastavljen/)
  })

  it('reports a network error when verification throws', async () => {
    const user = userEvent.setup()
    verifyAdminPassword.mockRejectedValue(new Error('boom'))
    renderGate()

    await user.type(screen.getByLabelText('Geslo'), 'x')
    await user.click(screen.getByRole('button', { name: 'Prijava' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Strežnik ni dosegljiv/)
  })
})
