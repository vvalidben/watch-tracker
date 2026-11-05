const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: '/', description: 'Jump to Add a title' },
  { keys: 'Esc', description: 'Go back from a title’s details' }
]

export function AboutCard(): JSX.Element {
  return (
    <div className="wt-panel wt-stack wt-rise" style={{ padding: 24, gap: 10, animationDelay: '300ms' }}>
      <h2 className="wt-h3" style={{ marginBottom: 6 }}>
        Keyboard shortcuts
      </h2>
      {SHORTCUTS.map((shortcut) => (
        <div key={shortcut.keys} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--wt-muted)' }}>{shortcut.description}</span>
          <kbd className="wt-display" style={{ padding: '2px 8px', borderRadius: 8, background: 'var(--wt-sunken)', border: '1.5px solid var(--wt-line-strong)', fontSize: 12 }}>
            {shortcut.keys}
          </kbd>
        </div>
      ))}
    </div>
  )
}
