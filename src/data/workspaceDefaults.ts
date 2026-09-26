import type { DashboardWidget, WorkspaceSettings } from '../domain/types'

export const defaultDashboardWidgets = (): DashboardWidget[] => [
  { id: 'calendar', enabled: true, order: 0, width: 'wide', height: 'tall', calendarView: 'week' },
  { id: 'upcoming-plans', enabled: true, order: 1, width: 'half', height: 'standard', limit: 5 },
  { id: 'upcoming-todos', enabled: true, order: 2, width: 'half', height: 'standard', limit: 5 },
  { id: 'next-day-materials', enabled: true, order: 3, width: 'wide', height: 'standard' },
]

export const createWorkspaceSettings = (): WorkspaceSettings => ({ schemaVersion: 1, buildings: [], rooms: [], inventoryMaterials: [], todos: [], dashboard: defaultDashboardWidgets() })

/** Adds future dashboard widgets without dropping the user's established order. */
export const normaliseWorkspaceSettings = (input: Partial<WorkspaceSettings> | undefined): WorkspaceSettings => {
  const defaults = defaultDashboardWidgets()
  const existing = input?.dashboard ?? []
  const dashboard = defaults.map((fallback) => ({ ...fallback, ...existing.find((widget) => widget.id === fallback.id) })).sort((left, right) => left.order - right.order)
  return { schemaVersion: 1, buildings: input?.buildings ?? [], rooms: input?.rooms ?? [], inventoryMaterials: input?.inventoryMaterials ?? [], todos: input?.todos ?? [], dashboard }
}
