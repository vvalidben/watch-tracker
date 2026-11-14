import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { AuthProvider, useAuth } from './AuthContext'
import { AccountCard } from '../components/settings/AccountCard'
import { useDatabaseStatus } from '../hooks/useDatabaseStatus'
import { setVisualStyle } from '../lib/visualStyle'

vi.mock('../hooks/useDatabaseStatus', () => ({ useDatabaseStatus: vi.fn(() => ({ loading: true, status: null })) }))

const locked = { configured: true, authenticated: false, username: 'Cinema Fan' }
const unlocked = { ...locked, authenticated: true }
const password = 'a quiet evening at the cinema'
const recoveryKey = '12345678-12345678-12345678-12345678-12345678-12345678'
let api: Record<string, ReturnType<typeof vi.fn>>
beforeEach(() => {
  vi.clearAllMocks()
  setVisualStyle('neon')
  window.location.hash = '#/library'
  api = {
    getAuthStatus: vi.fn().mockResolvedValue({ ok: true, data: locked }),
    setupAccount: vi.fn().mockResolvedValue({ ok: true, data: { state: unlocked, recoveryKey } }),
    signIn: vi.fn().mockResolvedValue({ ok: true, data: { state: unlocked } }),
    recoverAccount: vi.fn().mockResolvedValue({ ok: true, data: { state: unlocked, recoveryKey } }),
    changePassword: vi.fn().mockResolvedValue({ ok: true, data: { state: unlocked, recoveryKey } }),
    signOut: vi.fn().mockResolvedValue({ ok: true, data: locked })
  }
  Object.assign(window, { api })
})

function fill(label: string, value: string): void { fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } }) }

describe('local login screen and library gate', () => {
  it('lets a signed-out client change appearance without signing in or clearing their form', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome back.' })
    fill('Password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Choose appearance' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Old School' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close appearance' }))
    expect(document.documentElement.dataset.style).toBe('old-school')
    expect(screen.getByRole('heading', { name: /A good story\.\s*A quiet evening\.\s*Well remembered\./ })).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveValue(password)
    expect(api.signIn).not.toHaveBeenCalled()
    expect(useDatabaseStatus).not.toHaveBeenCalled()
  })
  it('keeps saved library routes and data hooks behind sign-in', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome back.' })
    expect(useDatabaseStatus).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Username')).toHaveValue('Cinema Fan')
    fill('Password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Let me in' }))
    await waitFor(() => expect(useDatabaseStatus).toHaveBeenCalled())
    expect(api.signIn).toHaveBeenCalledWith({ username: 'Cinema Fan', password })
    expect(screen.queryByRole('heading', { name: 'Welcome back.' })).not.toBeInTheDocument()
  })

  it('shows a failed sign-in without mounting personal data or retaining the password', async () => {
    api.signIn.mockResolvedValue({ ok: false, error: 'Invalid username or password.' })
    render(<App />)
    await screen.findByLabelText('Password')
    fill('Password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Let me in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(useDatabaseStatus).not.toHaveBeenCalled()
  })

  it('requires matching setup passwords and acknowledgement of the one-time recovery key', async () => {
    api.getAuthStatus.mockResolvedValue({ ok: true, data: { configured: false, authenticated: false, username: null } })
    render(<App />)
    await screen.findByRole('heading', { name: 'Make it yours.' })
    fill('Username', 'Cinema Fan'); fill('New password', password); fill('Confirm password', 'different password')
    fireEvent.click(screen.getByRole('button', { name: 'Create my local login' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match')
    expect(api.setupAccount).not.toHaveBeenCalled()
    fill('Confirm password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Create my local login' }))
    expect(await screen.findByLabelText('Your recovery key')).toHaveValue(recoveryKey)
    expect(useDatabaseStatus).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Open my library' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'I saved my recovery key.' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open my library' }))
    await waitFor(() => expect(useDatabaseStatus).toHaveBeenCalled())
    expect(screen.queryByLabelText('Your recovery key')).not.toBeInTheDocument()
  })

  it('resets a forgotten password using the saved key and displays its replacement', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Forgot your password?' }))
    fill('Recovery key', recoveryKey); fill('New password', password); fill('Confirm password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(await screen.findByLabelText('Your recovery key')).toHaveValue(recoveryKey)
    expect(api.recoverAccount).toHaveBeenCalledWith({ username: 'Cinema Fan', recoveryKey, newPassword: password, confirmPassword: password })
    expect(useDatabaseStatus).not.toHaveBeenCalled()
  })

  it('fails closed if sign-in settings cannot be read and permits retry', async () => {
    api.getAuthStatus.mockResolvedValueOnce({ ok: false, error: 'Sign-in settings could not be read.' })
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be read')
    expect(screen.queryByRole('button', { name: 'Create my local login' })).not.toBeInTheDocument()
    expect(useDatabaseStatus).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByRole('heading', { name: 'Welcome back.' })
  })
})

function AccountHarness(): JSX.Element {
  const auth = useAuth()
  if (auth.loading) return <div>Checking</div>
  return <><AccountCard /><button onClick={() => void auth.signOut()}>Lock now</button><output>{auth.state?.authenticated ? 'Library unlocked' : 'Library locked'}</output><output>{auth.recoveryKey}</output></>
}

describe('account controls', () => {
  it('clears the signed-in state after logout', async () => {
    api.getAuthStatus.mockResolvedValue({ ok: true, data: unlocked })
    render(<AuthProvider><AccountHarness /></AuthProvider>)
    await screen.findByText('Library unlocked')
    fireEvent.click(screen.getByRole('button', { name: 'Lock now' }))
    expect(await screen.findByText('Library locked')).toBeInTheDocument()
    expect(api.signOut).toHaveBeenCalledOnce()
  })

  it('changes a password using current credentials and surfaces the replacement key', async () => {
    api.getAuthStatus.mockResolvedValue({ ok: true, data: unlocked })
    render(<AuthProvider><AccountHarness /></AuthProvider>)
    await screen.findByText('Library unlocked')
    fireEvent.click(screen.getByText('Change password'))
    fill('Current password', 'the previous password'); fill('New password', password); fill('Confirm new password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))
    await screen.findByText(recoveryKey)
    expect(api.changePassword).toHaveBeenCalledWith({ currentPassword: 'the previous password', newPassword: password, confirmPassword: password })
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })
})
