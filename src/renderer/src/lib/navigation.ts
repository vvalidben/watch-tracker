import {
  Bookmark,
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  Library,
  Search,
  SlidersHorizontal,
  type LucideIcon
} from 'lucide-react'

export interface NavItem {
  label: string
  /** Japanese label shown beside it, unless turned off in Settings. */
  jp: string
  path: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', jp: 'ホーム', path: '/', icon: LayoutDashboard },
  { label: 'Library', jp: '書庫', path: '/library', icon: Library },
  { label: 'Watchlist', jp: '予定', path: '/watchlist', icon: Bookmark },
  { label: 'Watch log', jp: '記録', path: '/log', icon: CalendarDays },
  { label: 'Statistics', jp: '統計', path: '/statistics', icon: ChartColumn },
  { label: 'Add a title', jp: '追加', path: '/search', icon: Search },
  { label: 'Settings', jp: '設定', path: '/settings', icon: SlidersHorizontal }
]
