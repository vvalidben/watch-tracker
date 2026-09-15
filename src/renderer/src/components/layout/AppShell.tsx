import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { RecoveryBanner } from './RecoveryBanner'
import { useGlobalKeyboardShortcuts } from '@renderer/hooks/useGlobalKeyboardShortcuts'
import { TooltipProvider } from '@renderer/components/ui/tooltip'

export function AppShell(): JSX.Element {
  useGlobalKeyboardShortcuts()
  const location = useLocation()
  const navigationType = useNavigationType()
  const mainRef = useRef<HTMLElement>(null)
  // Keyed by pathname rather than the full history-entry key: pages like
  // Search update their own URL query params via history *replace* while
  // the user types (see useMediaSearch), which mints a new location.key on
  // every keystroke without actually changing page — keying on that would
  // scroll the page to the top on every keystroke instead of only on real
  // page-to-page navigation.
  const scrollPositions = useRef(new Map<string, number>())

  // Restore (on POP) or reset (on PUSH/REPLACE-to-a-new-page) scroll when
  // the page itself changes.
  useEffect(() => {
    const node = mainRef.current
    if (!node) return
    const restored = navigationType === 'POP' ? scrollPositions.current.get(location.pathname) : undefined
    node.scrollTo(0, restored ?? 0)
  }, [location.pathname, navigationType])

  // Continuously record the current page's scroll offset as the user
  // scrolls, rather than trying to read it once when leaving: the outgoing
  // page's content unmounts (see the `key={location.pathname}` below) as
  // part of the very same commit that swaps in the new route, which resets
  // scrollTop to 0 *before* any effect cleanup gets a chance to read it —
  // so by then it's already too late to capture. Recording it live sidesteps
  // that race entirely.
  useEffect(() => {
    const node = mainRef.current
    if (!node) return
    const positions = scrollPositions.current
    const pathname = location.pathname

    function handleScroll(): void {
      positions.set(pathname, node!.scrollTop)
    }
    node.addEventListener('scroll', handleScroll, { passive: true })
    return () => node.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <RecoveryBanner />
          <main ref={mainRef} className="flex-1 overflow-y-auto p-6 lg:p-8">
            {/* Keyed by route so each page gets a fresh, brief fade-in — skipped entirely under prefers-reduced-motion. */}
            <div
              key={location.pathname}
              className="mx-auto max-w-[1600px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
            >
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
