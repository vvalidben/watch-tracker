import { useEffect, useState } from 'react'
import { createPersistedPreference } from './persistedPreference'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const isThemePreference = (value: string): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

const store = createPersistedPreference<ThemePreference>('watch-tracker-theme', 'system', isThemePreference)

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return preference
}

function applyDomTheme(preference: ThemePreference): void {
  document.documentElement.classList.toggle('dark', resolveTheme(preference) === 'dark')
}

// Runs the moment this module is first imported — which main.tsx does before
// rendering — so the correct theme class is on <html> before first paint,
// avoiding a flash of the wrong theme. Also re-applies on every change.
applyDomTheme(store.get())
store.subscribe(applyDomTheme)

// Live-follow the OS theme while the preference is 'system'.
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (store.get() === 'system') applyDomTheme('system')
  })
}

export function setTheme(preference: ThemePreference): void {
  store.set(preference)
}

export interface UseThemeResult {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (preference: ThemePreference) => void
}

/** The current theme preference, reactive to changes made from anywhere (e.g. the Settings page). */
export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState(store.get())
  useEffect(() => store.subscribe(setThemeState), [])
  return { theme, resolvedTheme: resolveTheme(theme), setTheme }
}
