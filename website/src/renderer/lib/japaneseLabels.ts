import { useEffect, useState } from 'react'
import { createPersistedPreference } from './persistedPreference'

export type JapaneseLabels = 'shown' | 'hidden'

const store = createPersistedPreference<JapaneseLabels>(
  'watch-tracker-japanese-labels',
  'shown',
  (value): value is JapaneseLabels => value === 'shown' || value === 'hidden'
)

// A data attribute (see .wt-jp in neon.css) rather than a prop on every label,
// applied at import time so hidden labels never flash on first paint.
function apply(value: JapaneseLabels): void {
  document.documentElement.dataset.jp = value
}
apply(store.get())
store.subscribe(apply)

export function setJapaneseLabels(value: JapaneseLabels): void {
  store.set(value)
}

export function useJapaneseLabels(): JapaneseLabels {
  const [value, setValue] = useState(store.get())
  useEffect(() => store.subscribe(setValue), [])
  return value
}
