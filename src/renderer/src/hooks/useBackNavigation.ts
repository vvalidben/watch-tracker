import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * A "go back" action that behaves like a real back button rather than a
 * fixed destination:
 *
 * - Normally it's exactly `navigate(-1)`, returning to whatever the user
 *   actually came from (with its full state intact — e.g. the Search page's
 *   query/filter, which live in its URL, come back automatically).
 * - If this page was itself the first thing loaded this session (no in-app
 *   history to go back to — react-router gives the very first location the
 *   key `'default'`, e.g. after a hard refresh while already on this page),
 *   `navigate(-1)` would have nothing to return to. In that case it falls
 *   back to `fallbackPath` instead of doing nothing.
 * - Guards against firing more than once per page visit, so a fast
 *   double-click (or a click right after the Escape-key shortcut) can't
 *   silently pop two history entries instead of one.
 */
export function useBackNavigation(fallbackPath: string): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  const firedRef = useRef(false)

  return function goBack(): void {
    if (firedRef.current) return
    firedRef.current = true

    if (location.key === 'default') {
      navigate(fallbackPath)
    } else {
      navigate(-1)
    }
  }
}
