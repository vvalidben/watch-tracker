import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { focusSearchInput } from '@renderer/lib/searchFocus'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

/**
 * App-wide shortcuts, active everywhere except while the user is actually
 * typing somewhere (so "/" in a note or search box types a slash, not a
 * navigation). Kept to a small, documented set (see the Settings page) —
 * this is a personal desktop app, not a command palette.
 */
export function useGlobalKeyboardShortcuts(): void {
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isTypingTarget(event.target)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === '/') {
        event.preventDefault()
        navigate('/search')
        // Focus after the route change commits (Search may not be mounted yet).
        setTimeout(() => focusSearchInput(), 0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])
}
