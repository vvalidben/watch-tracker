export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 256

export interface AuthState {
  configured: boolean
  authenticated: boolean
  username: string | null
}

export interface SignInRequest {
  username: string
  password: string
}

export interface SetupAccountRequest extends SignInRequest {
  confirmPassword: string
}

export interface RecoverAccountRequest {
  username: string
  recoveryKey: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface AuthResult {
  state: AuthState
  /** Returned only when generated. Never stored as plaintext on disk. */
  recoveryKey?: string
}

export function validateNewPassword(password: string, confirmation: string): void {
  if (typeof password !== 'string' || [...password].length < PASSWORD_MIN_LENGTH) throw new Error(`Use at least ${PASSWORD_MIN_LENGTH} characters. A few memorable words work well.`)
  if ([...password].length > PASSWORD_MAX_LENGTH) throw new Error(`Use no more than ${PASSWORD_MAX_LENGTH} characters.`)
  if (password !== confirmation) throw new Error('The passwords do not match.')
}
