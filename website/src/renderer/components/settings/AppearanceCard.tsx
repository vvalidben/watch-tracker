import { useId } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, ChevronRight, Palette, Sparkles, X } from 'lucide-react'
import { useTheme, type ThemePreference } from '@renderer/lib/theme'
import { VISUAL_STYLES, setVisualStyle, useVisualStyle, setMotionPreference, useMotionPreference, type MotionPreference } from '@renderer/lib/visualStyle'
import { AtmosphereArtwork } from '@renderer/components/layout/AtmosphereArtwork'

function StylePreview({ choice, expanded = false }: { choice: typeof VISUAL_STYLES[number]; expanded?: boolean }): JSX.Element {
  if (expanded) return <span className="wt-artwork-preview" data-preview={choice.id}><AtmosphereArtwork style={choice.id} /></span>
  return <span className="wt-style-sample wt-style-artwork" data-preview={choice.id} aria-hidden="true"><AtmosphereArtwork style={choice.id} /></span>
}

export function AppearanceControls(): JSX.Element {
  const style = useVisualStyle()
  const motion = useMotionPreference()
  const { theme, setTheme } = useTheme()
  const name = useId()
  const selected = VISUAL_STYLES.find((choice) => choice.id === style) ?? VISUAL_STYLES[0]
  return <div className="wt-appearance-controls">
    <div className="wt-appearance-spotlight" data-spotlight={style}>
      <div className="wt-spotlight-copy"><span className="wt-label"><Sparkles size={12} /> YOUR CURRENT ATMOSPHERE</span><h3>{selected.name}</h3><p>{selected.description}</p><span className="wt-spotlight-mood"><i />{selected.mood}</span><span className="wt-spotlight-motion">{motion === 'full' ? selected.motion : motion === 'reduced' ? 'Reduced motion · gentle transitions only' : 'Animations off · a still atmosphere'}</span></div>
      <div className="wt-spotlight-preview" key={style}><StylePreview choice={selected} expanded /></div>
    </div>
    <div className="wt-style-grid-heading"><span>Find your feeling</span><span>{VISUAL_STYLES.length} atmospheres to explore</span></div>
    <div className="wt-style-grid" role="radiogroup" aria-label="Visual style">
      {VISUAL_STYLES.map((choice, index) => <label key={choice.id} data-choice={choice.id} className={`wt-style-choice${style === choice.id ? ' is-selected' : ''}`}>
        <input className="sr-only" type="radio" name={name} aria-label={choice.name} aria-describedby={`${name}-${choice.id}`} checked={style === choice.id} onChange={() => setVisualStyle(choice.id)} />
        <StylePreview choice={choice} />
        <span className="wt-style-edition" aria-hidden="true"><span>ATMOSPHERE / {String(index + 1).padStart(2, '0')}</span><span className="wt-style-palette"><i /><i /><i /></span></span>
        <span className="wt-style-choice-title">{choice.name}<span className="wt-style-check" aria-hidden="true">{style === choice.id && <Check size={12} />}</span></span>
        <span className="wt-style-description" id={`${name}-${choice.id}`}>{choice.mood}</span>
        <span className="wt-style-motion-hint" aria-hidden="true">{choice.motion}</span>
      </label>)}
    </div>
    <div className="wt-appearance-options">
      <label><span>Colour mode</span><select className="wt-select" value={theme} onChange={(event) => setTheme(event.target.value as ThemePreference)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">Follow system</option></select></label>
      <label><span>Animations</span><select className="wt-select" value={motion} onChange={(event) => setMotionPreference(event.target.value as MotionPreference)}><option value="full">Full motion</option><option value="reduced">Reduced motion</option><option value="off">Off</option></select></label>
    </div>
    <p className="wt-appearance-note">Changes apply instantly and stay saved in this browser. Your system&apos;s reduced-motion setting is always respected.</p>
  </div>
}

export function AppearanceCard(): JSX.Element {
  return <section className="wt-panel wt-appearance-card wt-rise" aria-labelledby="appearance-heading">
    <div className="wt-appearance-heading"><span className="wt-appearance-icon"><Palette size={21} /></span><div><span className="wt-label">APPEARANCE / SET THE SCENE</span><h2 id="appearance-heading" className="wt-h3">A look that feels like you.</h2></div></div>
    <p className="wt-sub">Choose your atmosphere. Same collection, a different kind of evening.</p>
    <AppearanceControls />
  </section>
}

export function AppearanceMenu({ iconOnly = false, showcase = false }: { iconOnly?: boolean; showcase?: boolean }): JSX.Element {
  const style = useVisualStyle()
  const selected = VISUAL_STYLES.find((choice) => choice.id === style) ?? VISUAL_STYLES[0]
  return <Dialog.Root>
    <Dialog.Trigger asChild><button type="button" className={`wt-ghost wt-appearance-trigger${showcase ? ' wt-atmosphere-switch' : ''}`} aria-label="Choose appearance" title="Choose appearance">{showcase ? <><span className="wt-switch-icon"><Palette size={17} /></span><span className="wt-switch-copy"><small>SET THE SCENE</small><strong>{selected.name}</strong><span className="wt-switch-dots"><i /><i /><i /></span></span><ChevronRight size={14} /></> : <><Palette size={17} />{!iconOnly && <span>Appearance</span>}</>}</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="wt-appearance-overlay" />
      <Dialog.Content className="wt-appearance-dialog">
        <div className="wt-appearance-dialog-head"><div><span className="wt-appearance-eyebrow"><Palette size={13} /> MAKE IT YOURS</span><Dialog.Title className="wt-h2">Choose your atmosphere.</Dialog.Title><Dialog.Description className="wt-sub">A new mood for your next “one more episode”.</Dialog.Description></div><Dialog.Close asChild><button className="wt-quiet" aria-label="Close appearance"><X size={20} /></button></Dialog.Close></div>
        <AppearanceControls />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
