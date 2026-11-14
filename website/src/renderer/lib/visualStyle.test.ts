import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => { localStorage.clear(); vi.resetModules() })
afterEach(() => { delete (document as Partial<Document>).startViewTransition; vi.unstubAllGlobals() })
describe('appearance preferences at startup', () => {
  it.each(['aurora', 'sunset', 'ocean', 'carbon'])('restores the %s atmosphere after a restart', async (style) => {
    localStorage.setItem('watch-tracker-visual-style', style)
    localStorage.setItem('watch-tracker-motion', 'off')
    await import('./visualStyle')
    expect(document.documentElement.dataset.style).toBe(style)
    expect(document.documentElement.dataset.motion).toBe('off')
  })
  it('restores style and motion before the UI renders', async () => {
    localStorage.setItem('watch-tracker-visual-style', 'old-school')
    localStorage.setItem('watch-tracker-motion', 'reduced')
    await import('./visualStyle')
    expect(document.documentElement.dataset.style).toBe('old-school')
    expect(document.documentElement.dataset.motion).toBe('reduced')
  })
  it('falls back to the existing design for invalid stored preferences', async () => {
    localStorage.setItem('watch-tracker-visual-style', 'missing-theme')
    localStorage.setItem('watch-tracker-motion', 'missing-motion')
    await import('./visualStyle')
    expect(document.documentElement.dataset.style).toBe('neon')
    expect(document.documentElement.dataset.motion).toBe('full')
  })
})

describe('animated style changes', () => {
  it('keeps the newest choice when a previous reveal is still pending', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    const updates: (() => void)[] = []
    const skipTransition = vi.fn()
    document.startViewTransition = vi.fn((update: unknown) => {
      updates.push(update as () => void)
      return { skipTransition, finished: Promise.resolve() } as unknown as ViewTransition
    })
    const { setVisualStyle } = await import('./visualStyle')
    setVisualStyle('aurora')
    setVisualStyle('ocean')
    updates[1]()
    updates[0]()
    expect(skipTransition).toHaveBeenCalledOnce()
    expect(document.documentElement.dataset.style).toBe('ocean')
    expect(localStorage.getItem('watch-tracker-visual-style')).toBe('ocean')
  })

  it.each(['reduced', 'off'])('applies choices immediately with %s motion', async (motion) => {
    localStorage.setItem('watch-tracker-motion', motion)
    document.startViewTransition = vi.fn()
    const { setVisualStyle } = await import('./visualStyle')
    setVisualStyle('cinema')
    expect(document.startViewTransition).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.style).toBe('cinema')
  })

  it('respects the system preference even with full motion selected', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    document.startViewTransition = vi.fn()
    const { setVisualStyle } = await import('./visualStyle')
    setVisualStyle('sunset')
    expect(document.startViewTransition).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.style).toBe('sunset')
  })
})
