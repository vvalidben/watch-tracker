import { useLocation } from 'react-router-dom'
import { navItems } from '@renderer/lib/navigation'

export function Header(): JSX.Element {
  const location = useLocation()
  const current = navItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )
  const isDetails = location.pathname.startsWith('/media/')
  const title = isDetails ? 'Details' : (current?.label ?? 'Watch Tracker')
  const Icon = isDetails ? undefined : current?.icon

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
    </header>
  )
}
