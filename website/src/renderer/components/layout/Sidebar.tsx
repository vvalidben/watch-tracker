import { CloudSync } from './CloudSync'
import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '@renderer/auth/AuthContext'
import { AppearanceMenu } from '@renderer/components/settings/AppearanceCard'
import { navItems } from '@renderer/lib/navigation'
import { cn } from '@renderer/lib/utils'
import { useSidebarCollapsed } from '@renderer/lib/sidebarPreference'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'

function useAppVersion(): string {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.api
      .getAppVersion()
      .then(setVersion)
      .catch(() => setVersion('unknown'))
  }, [])

  return version || '…'
}

export function Sidebar(): JSX.Element {
  const auth = useAuth()
  const [savedCollapsed, setCollapsed] = useSidebarCollapsed()
  const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width: 700px)').matches)
  useEffect(()=>{
    const query=window.matchMedia('(max-width: 700px)')
    const update=()=>setMobile(query.matches)
    query.addEventListener('change',update)
    return ()=>query.removeEventListener('change',update)
  },[])
  const collapsed=savedCollapsed&&!mobile
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const version = useAppVersion()
  const onDetailPage = pathname.startsWith('/media/')

  return (
    <aside className={cn('wt-rail', collapsed && 'is-collapsed')}>
      <div className="wt-stack" style={{ gap: 6, padding: collapsed ? 0 : '0 6px' }}>
        <div className="wt-brand">{collapsed ? 'WT' : 'WATCH TRACKER'}</div>
        {!collapsed && (
          <span className="wt-page-jp wt-jp" style={{ fontSize: 11, letterSpacing: '0.32em', marginTop: 6 }}>
            ウォッチトラッカー
          </span>
        )}
      </div>

      <nav className="wt-stack" style={{ gap: 6, flex: 1 }}>
        {navItems.map((item) => {
          const link = (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn('wt-nav-link', (isActive || (onDetailPage && item.path === '/library')) && 'is-on')
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && (
                <>
                  <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{item.label}</span>
                  <span className="wt-jp" style={{ fontWeight: 700, fontSize: 12, color: 'var(--wt-muted)' }}>
                    {item.jp}
                  </span>
                </>
              )}
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

      {!collapsed && <AppearanceMenu showcase />}

      <button type="button" className="wt-add-cta" aria-label="Add a title" onClick={() => navigate('/search')}>
        {collapsed ? '＋' : '＋ Add a title'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? 0 : '0 6px' }}>
        {!collapsed && <span style={{ fontSize: 11, color: 'var(--wt-muted)' }}>v{version} · web</span>}
        <button
          type="button"
          className="wt-quiet"
          style={{ padding: 2, display: 'flex' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <div className="wt-sidebar-account" style={{ justifyContent: collapsed ? 'center' : undefined }}>
        {!collapsed && <span className="wt-sidebar-account-name">{auth.state?.username}<small><CloudSync /></small></span>}
        {collapsed && <AppearanceMenu iconOnly />}
        <button className="wt-quiet" type="button" disabled={auth.pending} aria-label="Sign out" title="Sign out and lock library" onClick={() => void auth.signOut()}><LogOut size={17} /></button>
      </div>
    </aside>
  )
}
