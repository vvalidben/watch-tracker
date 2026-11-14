import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppearanceControls, AppearanceMenu } from './AppearanceCard'
import { setVisualStyle, setMotionPreference } from '@renderer/lib/visualStyle'
import { setTheme } from '@renderer/lib/theme'

beforeEach(() => { setVisualStyle('neon'); setMotionPreference('full'); setTheme('dark') })
afterEach(() => { setVisualStyle('neon'); setMotionPreference('full'); setTheme('dark') })

describe('client appearance choices', () => {
  it.each([
    ['Aurora', 'aurora', 'Dreamy & luminous'],
    ['Sunset Club', 'sunset', 'Golden & easygoing'],
    ['Ocean', 'ocean', 'Cool & immersive'],
    ['Carbon', 'carbon', 'Sharp & electric']
  ])('previews and saves %s without changing motion or colour mode', (name, id, mood) => {
    setMotionPreference('reduced')
    render(<AppearanceControls />)
    fireEvent.click(screen.getByRole('radio', { name }))
    expect(screen.getByRole('radio', { name })).toBeChecked()
    expect(screen.getByRole('radio', { name })).toHaveAccessibleDescription(mood)
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    expect(document.documentElement.dataset.style).toBe(id)
    expect(localStorage.getItem('watch-tracker-visual-style')).toBe(id)
    expect(document.documentElement.dataset.motion).toBe('reduced')
    expect(document.documentElement).toHaveClass('dark')
  })
  it('applies a style immediately, synchronizes multiple selectors and preserves the colour mode', () => {
    render(<><AppearanceControls /><AppearanceControls /></>)
    const groups = screen.getAllByRole('radiogroup', { name: 'Visual style' })
    fireEvent.click(within(groups[0]).getByRole('radio', { name: 'Old School' }))
    expect(document.documentElement.dataset.style).toBe('old-school')
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('watch-tracker-visual-style')).toBe('old-school')
    expect(within(groups[1]).getByRole('radio', { name: 'Old School' })).toBeChecked()
    fireEvent.click(within(groups[1]).getByRole('radio', { name: 'Cinema' }))
    expect(within(groups[0]).getByRole('radio', { name: 'Cinema' })).toBeChecked()
    expect(document.documentElement.dataset.style).toBe('cinema')
  })

  it('keeps style, light/dark mode and motion independent and saved', () => {
    render(<AppearanceControls />)
    fireEvent.click(screen.getByRole('radio', { name: 'Minimal' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Colour mode' }), { target: { value: 'light' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Animations' }), { target: { value: 'off' } })
    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.documentElement.dataset.style).toBe('minimal')
    expect(document.documentElement.dataset.motion).toBe('off')
    expect(localStorage.getItem('watch-tracker-theme')).toBe('light')
    expect(localStorage.getItem('watch-tracker-motion')).toBe('off')
    fireEvent.change(screen.getByRole('combobox', { name: 'Animations' }), { target: { value: 'reduced' } })
    expect(document.documentElement.dataset.motion).toBe('reduced')
    expect(screen.getByRole('radio', { name: 'Minimal' })).toBeChecked()
  })

  it('supports arrow-key selection within the native radio group', async () => {
    const user = userEvent.setup()
    render(<AppearanceControls />)
    screen.getByRole('radio', { name: 'Neon Pop' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Old School' })).toHaveFocus()
    expect(document.documentElement.dataset.style).toBe('old-school')
  })

  it('opens an accessible chooser, keeps the chosen style and closes with Escape', async () => {
    const user = userEvent.setup()
    render(<AppearanceMenu />)
    await user.click(screen.getByRole('button', { name: 'Choose appearance' }))
    const dialog = screen.getByRole('dialog', { name: 'Choose your atmosphere.' })
    await user.click(within(dialog).getByRole('radio', { name: 'Old School' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.documentElement.dataset.style).toBe('old-school')
    expect(screen.getByRole('button', { name: 'Choose appearance' })).toHaveFocus()
  })

  it('can follow the system colour mode without replacing the selected visual style', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    render(<AppearanceControls />)
    fireEvent.click(screen.getByRole('radio', { name: 'Cinema' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Colour mode' }), { target: { value: 'system' } })
    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.documentElement.dataset.style).toBe('cinema')
    vi.unstubAllGlobals()
  })
})
