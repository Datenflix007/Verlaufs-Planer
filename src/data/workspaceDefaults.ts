import type { AppearanceSettings, DashboardBreakpoint, DashboardWidget, WorkspaceSettings } from '../domain/types'
import { clampDashboardGridColumns, dashboardBreakpoints, defaultDashboardGridColumns, defaultDashboardWidgets, getWidgetLayout, normaliseResponsiveLayout, normaliseWidget, resolveWidgetCollisions } from './dashboardWidgets'
import { defaultPriorities, normalisePriorities } from '../domain/priorities'

export const defaultAppearanceSettings: AppearanceSettings = { mode: 'light', palette: 'lagoon', background: 'mist', gradientStart: '#e5eff0', gradientEnd: '#e8edef' }

export const createWorkspaceSettings = (): WorkspaceSettings => ({ schemaVersion: 1, buildings: [], rooms: [], inventoryMaterials: [], todos: [], priorities: defaultPriorities(), dashboard: defaultDashboardWidgets(), dashboardGridColumns: { ...defaultDashboardGridColumns }, appearance: { ...defaultAppearanceSettings } })

/** Adds future dashboard widgets without dropping the user's established order. */
export const normaliseWorkspaceSettings = (input: Partial<WorkspaceSettings> | undefined): WorkspaceSettings => {
  const defaults = defaultDashboardWidgets()
  const existing = input?.dashboard ?? []
  const legacyOrder = [...existing].sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
  const dashboard = resolveWidgetCollisions(defaults.map((fallback, index) => {
    const current = existing.find((widget) => widget.id === fallback.id)
    const legacy = current && current.x === undefined ? { ...current, y: legacyOrder.findIndex((widget) => widget.id === current.id) * 3 } : current
    const normalised = normaliseWidget(legacy ?? {}, fallback)
    const responsiveLayouts = Object.fromEntries(dashboardBreakpoints.map((breakpoint) => {
      const defaultLayout = getWidgetLayout(fallback, breakpoint)
      const oldLayout = legacy ? getWidgetLayout(legacy as DashboardWidget, breakpoint) : undefined
      const source = legacy?.responsiveLayouts?.[breakpoint] ?? (breakpoint === 'laptop' ? legacy : oldLayout ?? defaultLayout)
      const columns = clampDashboardGridColumns(input?.dashboardGridColumns?.[breakpoint] ?? defaultDashboardGridColumns[breakpoint])
      return [breakpoint, normaliseResponsiveLayout(source ?? defaultLayout, defaultLayout, fallback.id, columns)]
    })) as DashboardWidget['responsiveLayouts']
    return { ...normalised, responsiveLayouts }
  }))
  const dashboardGridColumns = Object.fromEntries(dashboardBreakpoints.map((breakpoint) => [
    breakpoint,
    clampDashboardGridColumns(input?.dashboardGridColumns?.[breakpoint] ?? defaultDashboardGridColumns[breakpoint]),
  ])) as Record<DashboardBreakpoint, number>
  return { schemaVersion: 1, buildings: input?.buildings ?? [], rooms: input?.rooms ?? [], inventoryMaterials: input?.inventoryMaterials ?? [], todos: input?.todos ?? [], priorities: normalisePriorities(input?.priorities), dashboard, dashboardGridColumns, appearance: { ...defaultAppearanceSettings, ...input?.appearance } }
}
