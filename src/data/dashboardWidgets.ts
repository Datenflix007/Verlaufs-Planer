import type { DashboardBreakpoint, DashboardWidget, DashboardWidgetId, DashboardWidgetLayout, DashboardWidgetWidth, DashboardWidgetHeight } from '../domain/types'

export const DASHBOARD_COLUMNS = 12
export const dashboardBreakpoints: DashboardBreakpoint[] = ['phone', 'tablet', 'laptop']
export const defaultDashboardGridColumns: Record<DashboardBreakpoint, number> = { phone: 4, tablet: 8, laptop: DASHBOARD_COLUMNS }

const responsiveDefaults: Record<DashboardBreakpoint, Record<DashboardWidgetId, DashboardWidgetLayout>> = {
  phone: {
    calendar: { x: 0, y: 0, w: 4, h: 5 },
    'upcoming-plans': { x: 0, y: 5, w: 4, h: 3 },
    'upcoming-todos': { x: 0, y: 8, w: 4, h: 3 },
    'next-day-materials': { x: 0, y: 11, w: 4, h: 3 },
  },
  tablet: {
    calendar: { x: 0, y: 0, w: 8, h: 5 },
    'upcoming-plans': { x: 0, y: 5, w: 4, h: 3 },
    'upcoming-todos': { x: 4, y: 5, w: 4, h: 3 },
    'next-day-materials': { x: 0, y: 8, w: 8, h: 3 },
  },
  laptop: {
    calendar: { x: 0, y: 0, w: 12, h: 5 },
    'upcoming-plans': { x: 0, y: 5, w: 6, h: 3 },
    'upcoming-todos': { x: 6, y: 5, w: 6, h: 3 },
    'next-day-materials': { x: 0, y: 8, w: 12, h: 3 },
  },
}

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId; title: string; icon: string; minW: number; minH: number
  defaultLayout: Pick<DashboardWidget, 'x' | 'y' | 'w' | 'h'>
}

export const dashboardWidgetRegistry: Record<DashboardWidgetId, DashboardWidgetDefinition> = {
  calendar: { id: 'calendar', title: 'Kalender', icon: '▣', minW: 5, minH: 4, defaultLayout: { x: 0, y: 0, w: 12, h: 5 } },
  'upcoming-plans': { id: 'upcoming-plans', title: 'Verlaufspläne', icon: '☷', minW: 3, minH: 2, defaultLayout: { x: 0, y: 5, w: 6, h: 3 } },
  'upcoming-todos': { id: 'upcoming-todos', title: 'Aufgaben', icon: '☑', minW: 3, minH: 2, defaultLayout: { x: 6, y: 5, w: 6, h: 3 } },
  'next-day-materials': { id: 'next-day-materials', title: 'Materialien', icon: '◇', minW: 4, minH: 2, defaultLayout: { x: 0, y: 8, w: 12, h: 3 } },
}

const widthToColumns: Record<DashboardWidgetWidth, number> = { half: 6, wide: 9, full: 12 }
const heightToRows: Record<DashboardWidgetHeight, number> = { compact: 2, standard: 3, tall: 5 }

export const defaultDashboardWidgets = (): DashboardWidget[] => Object.values(dashboardWidgetRegistry).map((definition) => ({
  id: definition.id, enabled: true, ...definition.defaultLayout,
  responsiveLayouts: Object.fromEntries(dashboardBreakpoints.map((breakpoint) => [breakpoint, responsiveDefaults[breakpoint][definition.id]])) as Record<DashboardBreakpoint, DashboardWidgetLayout>,
  ...(definition.id === 'calendar' ? { calendarView: 'week' as const } : definition.id === 'next-day-materials' ? {} : { limit: 5 }),
}))

export const getWidgetLayout = (widget: DashboardWidget, breakpoint: DashboardBreakpoint): DashboardWidgetLayout =>
  widget.responsiveLayouts?.[breakpoint] ?? (breakpoint === 'laptop' ? { x: widget.x, y: widget.y, w: widget.w, h: widget.h } : responsiveDefaults[breakpoint][widget.id])

export const normaliseResponsiveLayout = (input: Partial<DashboardWidgetLayout>, fallback: DashboardWidgetLayout, id: DashboardWidgetId, columns: number): DashboardWidgetLayout => {
  const minW = Math.min(dashboardWidgetRegistry[id].minW, columns)
  const w = Math.max(minW, Math.min(columns, input.w ?? fallback.w))
  return {
    x: Math.max(0, Math.min(columns - w, input.x ?? fallback.x)),
    y: Math.max(0, input.y ?? fallback.y),
    w,
    h: Math.max(dashboardWidgetRegistry[id].minH, input.h ?? fallback.h),
  }
}

export const clampDashboardGridColumns = (value: number): number => Math.max(2, Math.min(16, Math.round(value)))

export const resolveResponsiveWidgetLayouts = (widgets: DashboardWidget[], breakpoint: DashboardBreakpoint, columns: number): DashboardWidget[] => {
  const positioned = widgets.map((widget) => ({ ...widget, ...normaliseResponsiveLayout(getWidgetLayout(widget, breakpoint), getWidgetLayout(widget, breakpoint), widget.id, columns) }))
  return resolveWidgetCollisions(positioned).map((widget) => {
    const layout = { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
    return {
      ...widgets.find((item) => item.id === widget.id)!,
      ...(breakpoint === 'laptop' ? layout : {}),
      responsiveLayouts: { ...widgets.find((item) => item.id === widget.id)!.responsiveLayouts, [breakpoint]: layout },
    }
  })
}

export const overlaps = (left: Pick<DashboardWidget, 'x' | 'y' | 'w' | 'h'>, right: Pick<DashboardWidget, 'x' | 'y' | 'w' | 'h'>): boolean => left.x < right.x + right.w && left.x + left.w > right.x && left.y < right.y + right.h && left.y + left.h > right.y

export const normaliseWidget = (input: Partial<DashboardWidget>, fallback: DashboardWidget): DashboardWidget => {
  const definition = dashboardWidgetRegistry[fallback.id]
  const w = Math.max(definition.minW, Math.min(DASHBOARD_COLUMNS, input.w ?? widthToColumns[input.width ?? fallback.width ?? 'full']))
  const h = Math.max(definition.minH, input.h ?? heightToRows[input.height ?? fallback.height ?? 'standard'])
  return { ...fallback, ...input, x: Math.max(0, Math.min(DASHBOARD_COLUMNS - w, input.x ?? fallback.x)), y: Math.max(0, input.y ?? fallback.y), w, h, order: undefined, width: undefined, height: undefined }
}

/** Moves colliding widgets down to the next free grid row while retaining every widget. */
export const resolveWidgetCollisions = (widgets: DashboardWidget[]): DashboardWidget[] => {
  const result: DashboardWidget[] = []
  for (const widget of [...widgets].sort((left, right) => left.y - right.y || left.x - right.x)) {
    const next = { ...widget }
    while (result.some((placed) => overlaps(next, placed))) next.y += 1
    result.push(next)
  }
  return result
}

export const findNextFreePosition = (widgets: DashboardWidget[], id: DashboardWidgetId): Pick<DashboardWidget, 'x' | 'y' | 'w' | 'h'> => {
  const definition = dashboardWidgetRegistry[id]
  const { w, h } = definition.defaultLayout
  for (let y = 0; y < 100; y += 1) for (let x = 0; x <= DASHBOARD_COLUMNS - w; x += 1) if (!widgets.some((widget) => widget.enabled && overlaps({ x, y, w, h }, widget))) return { x, y, w, h }
  return { x: 0, y: 100, w, h }
}
