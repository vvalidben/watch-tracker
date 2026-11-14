import { useState } from 'react'
import { KeyRound, ArrowRight } from 'lucide-react'

export function RecoveryKey({ value, onContinue }: { value: string; onContinue: () => void }): JSX.Element {
  const [saved, setSaved] = useState(false)
  return <div className="wt-auth wt-auth-recovery-screen">
    <span className="wt-brand">WATCH TRACKER</span>
    <section className="wt-auth-card wt-auth-recovery-card">
      <span className="wt-auth-card-icon"><KeyRound size={25} /></span>
      <span className="wt-auth-eyebrow">ONE LAST THING</span><h1>Keep your way in.</h1>
      <p className="wt-auth-intro">Save this recovery key somewhere safe. It can reset your local password if you forget it. A newly generated key replaces the previous one.</p>
      <label className="wt-auth-field"><span>Your recovery key</span><textarea className="wt-textarea wt-auth-recovery-code" aria-label="Your recovery key" readOnly value={value} rows={3} onFocus={(event) => event.target.select()} /></label>
      <p className="wt-auth-hint">This key is shown once. Keep it separate from the app and don&apos;t share it.</p>
      <label className="wt-auth-check"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />I saved my recovery key.</label>
      <button className="wt-btn wt-btn-pink wt-auth-submit" disabled={!saved} onClick={onContinue}>Open my library<ArrowRight size={18} /></button>
    </section>
  </div>
}
