import type { DashboardShelves } from './dashboardShelves'
import type { DashboardStats } from './dashboardStats'

export interface GetDashboardResponse {
  stats: DashboardStats
  shelves: DashboardShelves
}
