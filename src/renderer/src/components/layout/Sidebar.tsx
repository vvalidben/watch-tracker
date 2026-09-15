import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Clapperboard, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { navItems } from '@renderer/lib/navigation'
import { cn } from '@renderer/lib/utils'
import { useSidebarCollapsed } from '@renderer/lib/sidebarPreference'
import { Separator } from '@renderer/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'

function AppVersion({ collapsed }: { collapsed: boolean }): JSX.Element {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    window.api
      .getAppVersion()
      .then(setVersion)
      .catch(() => setVersion('unknown'))
  }, [])

  if (collapsed) return <div className="py-3 text-center text-[10px] text-muted-foreground">v{version || '…'}</div>

  return <div className="px-4 py-3 text-xs text-muted-foreground">Watch Tracker v{version || '...'}</div>
}

export function Sidebar(): JSX.Element {
  const [collapsed, setCollapsed] = useSidebarCollapsed()

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-premium',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      <div className={cn('flex items-center gap-2 px-4 py-4', collapsed && 'justify-center px-0')}>
        <Clapperboard className="h-6 w-6 shrink-0 text-primary" />
        {!collapsed && <span className="truncate text-lg font-semibold tracking-tight">Watch Tracker</span>}
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const link = (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-0 py-2.5',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          )

          if (!collapsed) return link

          return (
            <Tooltip key={item.path} delayDuration={200}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
      <Separator className="bg-sidebar-border" />
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          collapsed && 'justify-center px-0'
        )}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        {!collapsed && 'Collapse'}
      </button>
      <Separator className="bg-sidebar-border" />
      <AppVersion collapsed={collapsed} />
    </aside>
  )
}
