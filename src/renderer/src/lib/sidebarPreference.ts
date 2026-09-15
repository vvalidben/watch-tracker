import { useEffect, useState } from 'react'
import { createPersistedPreference } from './persistedPreference'

const store = createPersistedPreference<'true' | 'false'>(
  'watch-tracker-sidebar-collapsed',
  'false',
  (value): value is 'true' | 'false' => value === 'true' || value === 'false'
)

export function setSidebarCollapsed(collapsed: boolean): void {
  store.set(collapsed ? 'true' : 'false')
}

/** Whether the sidebar is collapsed to icon-only mode, reactive and persisted across launches. */
export function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useState(store.get() === 'true')
  useEffect(() => store.subscribe((value) => setCollapsed(value === 'true')), [])
  return [collapsed, setSidebarCollapsed]
}
