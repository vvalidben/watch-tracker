import { useEffect, useState } from 'react'
import { createPersistedPreference } from './persistedPreference'

export type LibraryView = 'grid' | 'gallery' | 'list'
const store = createPersistedPreference<LibraryView>('watch-tracker-library-view', 'grid',
  (value): value is LibraryView => value === 'grid' || value === 'gallery' || value === 'list')

export function useLibraryView(): [LibraryView, (view: LibraryView) => void] {
  const [view, setView] = useState(store.get())
  useEffect(() => store.subscribe(setView), [])
  return [view, store.set]
}
