import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  minLength?: number
  disabled?: boolean
}

export function PasswordField({ label, value, onChange, autoComplete = 'current-password', minLength, disabled }: PasswordFieldProps): JSX.Element {
  const [visible, setVisible] = useState(false)
  return <label className="wt-auth-field">
    <span>{label}</span>
    <span className="wt-auth-input-wrap">
      <LockKeyhole className="wt-auth-input-icon" aria-hidden="true" />
      <input className="wt-input" aria-label={label} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required minLength={minLength} maxLength={256}
        value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={autoComplete === 'new-password' ? 'Make it a memorable passphrase' : 'Enter your password'} />
      <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} disabled={disabled} onClick={() => setVisible(!visible)} className="wt-auth-eye">
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  </label>
}
