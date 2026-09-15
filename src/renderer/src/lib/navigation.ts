import {
  LayoutDashboard,
  Library,
  Search,
  PlayCircle,
  CheckCircle2,
  Bookmark,
  BarChart3,
  Settings,
  type LucideIcon
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Library', path: '/library', icon: Library },
  { label: 'Search', path: '/search', icon: Search },
  { label: 'Watching', path: '/watching', icon: PlayCircle },
  { label: 'Completed', path: '/completed', icon: CheckCircle2 },
  { label: 'Watchlist', path: '/watchlist', icon: Bookmark },
  { label: 'Statistics', path: '/statistics', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings }
]
