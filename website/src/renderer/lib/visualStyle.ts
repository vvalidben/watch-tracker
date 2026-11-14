import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { createPersistedPreference } from './persistedPreference'

export const VISUAL_STYLES = [
  { id: 'neon', name: 'Neon Pop', description: 'Candy colour, comic-book frames and after-hours energy.', mood: 'Loud & playful', sample: 'One more episode.', motion: 'Springy entrances · floating confetti' },
  { id: 'old-school', name: 'Old School', description: 'Textured paper, stamped tickets and stories worth keeping.', mood: 'Warm & nostalgic', sample: 'The viewing journal.', motion: 'Paper settles · dust drifts' },
  { id: 'cinema', name: 'Cinema', description: 'Art-deco gold, velvet shadows and your own private premiere.', mood: 'Rich & cinematic', sample: 'Now showing.', motion: 'Curtain reveals · sweeping spotlights' },
  { id: 'minimal', name: 'Minimal', description: 'Soft geometry, generous space and beautifully quiet details.', mood: 'Calm & focused', sample: 'Simply, your collection.', motion: 'Gentle fades · precise little lifts' },
  { id: 'aurora', name: 'Aurora', description: 'Luminous glass floating between violet skies and mint light.', mood: 'Dreamy & luminous', sample: 'Stay a little longer.', motion: 'Weightless cards · orbiting light' },
  { id: 'sunset', name: 'Sunset Club', description: 'Vinyl grooves, warm terracotta and a golden-hour glow.', mood: 'Golden & easygoing', sample: 'Chase the next story.', motion: 'Vinyl turns · sunlit shapes drift' },
  { id: 'ocean', name: 'Ocean', description: 'Deep-water blues, rippling reflections and sea-glass surfaces.', mood: 'Cool & immersive', sample: 'A little deeper.', motion: 'Layered tides · buoyant cards' },
  { id: 'carbon', name: 'Carbon', description: 'Machined frames, technical type and a sharp electric accent.', mood: 'Sharp & electric', sample: 'Press play. Stay curious.', motion: 'Crisp reveals · travelling grid signals' }
] as const
export type VisualStyle = typeof VISUAL_STYLES[number]['id']
export type MotionPreference = 'full' | 'reduced' | 'off'

const styleStore = createPersistedPreference<VisualStyle>('watch-tracker-visual-style', 'neon',
  (value): value is VisualStyle => VISUAL_STYLES.some((style) => style.id === value))
const motionStore = createPersistedPreference<MotionPreference>('watch-tracker-motion', 'full',
  (value): value is MotionPreference => value === 'full' || value === 'reduced' || value === 'off')

function applyStyle(style: VisualStyle): void { document.documentElement.dataset.style = style }
function applyMotion(motion: MotionPreference): void { document.documentElement.dataset.motion = motion }
applyStyle(styleStore.get())
applyMotion(motionStore.get())
styleStore.subscribe(applyStyle)
motionStore.subscribe(applyMotion)

let activeTransition: { finished: Promise<void>; skipTransition: () => void } | undefined
let selection = 0

export function setVisualStyle(style: VisualStyle): void {
  const request = ++selection
  activeTransition?.skipTransition()
  activeTransition = undefined
  const animate = motionStore.get() === 'full' &&
    typeof document.startViewTransition === 'function' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!animate) { styleStore.set(style); return }
  try {
    const transition = document.startViewTransition(() => {
      if (request === selection) flushSync(() => styleStore.set(style))
    })
    activeTransition = transition
    void transition.finished.catch(() => {}).finally(() => {
      if (activeTransition === transition) activeTransition = undefined
    })
  } catch {
    styleStore.set(style)
  }
}
export function setMotionPreference(motion: MotionPreference): void {
  activeTransition?.skipTransition()
  motionStore.set(motion)
}
export function useVisualStyle(): VisualStyle {
  const [style, setStyle] = useState(styleStore.get())
  useEffect(() => styleStore.subscribe(setStyle), [])
  return style
}
export function useMotionPreference(): MotionPreference {
  const [motion, setMotion] = useState(motionStore.get())
  useEffect(() => motionStore.subscribe(setMotion), [])
  return motion
}
