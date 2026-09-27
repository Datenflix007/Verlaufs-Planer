import type { DashboardWidget, WorkspaceSettings } from '../domain/types'
import { defaultDashboardWidgets, normaliseWidget, resolveWidgetCollisions } from './dashboardWidgets'
import { defaultPriorities, normalisePriorities } from '../domain/priorities'

export const createWorkspaceSettings = (): WorkspaceSettings => ({ schemaVersion: 1, buildings: [], rooms: [], inventoryMaterials: [], todos: [], priorities: defaultPriorities(), dashboard: defaultDashboardWidgets() })

/** Adds future dashboard widgets without dropping the user's established order. */
export const normaliseWorkspaceSettings = (input: Partial<WorkspaceSettings> | undefined): WorkspaceSettings => {
  const defaults = defaultDashboardWidgets()
  const existing = input?.dashboard ?? []
  const legacyOrder = [...existing].sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
  const dashboard = resolveWidgetCollisions(defaults.map((fallback, index) => {
    const current = existing.find((widget) => widget.id === fallback.id)
    const legacy = current && current.x === undefined ? { ...current, y: legacyOrder.findIndex((widget) => widget.id === current.id) * 3 } : current
    return normaliseWidget(legacy ?? {}, fallback)
  }))
  return { schemaVersion: 1, buildings: input?.buildings ?? [], rooms: input?.rooms ?? [], inventoryMaterials: input?.inventoryMaterials ?? [], todos: input?.todos ?? [], priorities: normalisePriorities(input?.priorities), dashboard }
}
