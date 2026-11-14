import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AuthResult, AuthState, ChangePasswordRequest, RecoverAccountRequest, SetupAccountRequest, SignInRequest } from '@shared/auth'
import type { IpcResult } from '@shared/ipcResult'

interface AuthContextValue {
  state: AuthState | null
  loading: boolean
  pending: boolean
  error: string | null
  recoveryKey: string | null
  dismissRecovery: () => void
  setup: (request: SetupAccountRequest) => Promise<void>
  signIn: (request: SignInRequest) => Promise<void>
  recover: (request: RecoverAccountRequest) => Promise<void>
  changePassword: (request: ChangePasswordRequest) => Promise<void>
  signOut: () => Promise<void>
  reload: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AuthState | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)
  const busy = useRef(false)

  async function reload(): Promise<void> {
    setError(null)
    try {
      const result = await window.api.getAuthStatus()
      if (result.ok) setState(result.data)
      else setError(result.error)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload() }, [])

  async function run(action: () => Promise<IpcResult<AuthResult>>): Promise<void> {
    if (busy.current) return
    busy.current = true; setPending(true); setError(null)
    try {
      const result = await action()
      if (!result.ok) { setError(result.error); return }
      setState(result.data.state)
      setRecoveryKey(result.data.recoveryKey ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { busy.current = false; setPending(false) }
  }

  async function signOut(): Promise<void> {
    if (busy.current) return
    busy.current = true; setPending(true); setError(null)
    try {
      const result = await window.api.signOut()
      if (result.ok) { setState(result.data); setRecoveryKey(null) }
      else setError(result.error)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { busy.current = false; setPending(false) }
  }

  return <AuthContext.Provider value={{ state, loading, pending, error, recoveryKey,
    dismissRecovery: () => setRecoveryKey(null), clearError: () => setError(null), reload,
    setup: (request) => run(() => window.api.setupAccount(request)),
    signIn: (request) => run(() => window.api.signIn(request)),
    recover: (request) => run(() => window.api.recoverAccount(request)),
    changePassword: (request) => run(() => window.api.changePassword(request)), signOut
  }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}
