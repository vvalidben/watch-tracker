/**
 * Lets the global "/" keyboard shortcut focus the Search page's input
 * without prop-drilling a ref through the router — the input registers
 * itself here on mount, and the shortcut handler just asks for it.
 */
let inputEl: HTMLInputElement | null = null

export function registerSearchInput(el: HTMLInputElement | null): void {
  inputEl = el
}

/** Returns true if an input was actually found and focused. */
export function focusSearchInput(): boolean {
  if (!inputEl) return false
  inputEl.focus()
  inputEl.select()
  return true
}
