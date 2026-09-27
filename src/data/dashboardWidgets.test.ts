import { describe, expect, it } from 'vitest'
import { defaultDashboardWidgets, findNextFreePosition, normaliseWidget, overlaps, resolveWidgetCollisions } from './dashboardWidgets'
import { normaliseWorkspaceSettings } from './workspaceDefaults'

describe('Dashboard grid layout', () => {
  it('keeps the calendar inside the grid and honors its minimum size when resized smaller', () => {
    const calendar = defaultDashboardWidgets().find((widget) => widget.id === 'calendar')!
    expect(normaliseWidget({ ...calendar, x: 11, w: 1, h: 1 }, calendar)).toMatchObject({ x: 7, w: 5, h: 4 })
  })

  it('moves colliding widgets to separate grid rows', () => {
    const [calendar, plans] = defaultDashboardWidgets()
    const resolved = resolveWidgetCollisions([{ ...calendar, w: 6, h: 4 }, { ...plans, x: 2, y: 1, w: 6, h: 3 }])
    expect(overlaps(resolved[0], resolved[1])).toBe(false)
    expect(resolved[1].y).toBeGreaterThan(1)
  })

  it('finds a free placement for a hidden widget before adding it back', () => {
    const widgets = defaultDashboardWidgets().map((widget) => widget.id === 'upcoming-todos' ? { ...widget, enabled: false } : widget)
    const position = findNextFreePosition(widgets, 'upcoming-todos')
    expect(widgets.filter((widget) => widget.enabled).some((widget) => overlaps(position, widget))).toBe(false)
  })

  it('migrates former order, width and height settings into the grid model', () => {
    const migrated = normaliseWorkspaceSettings({ dashboard: [{ id: 'calendar', enabled: true, order: 0, width: 'full', height: 'tall', calendarView: 'month' }] as never })
    const calendar = migrated.dashboard.find((widget) => widget.id === 'calendar')!
    expect(calendar).toMatchObject({ x: 0, y: 0, w: 12, h: 5, calendarView: 'month' })
    expect(calendar.width).toBeUndefined()
    expect(calendar.height).toBeUndefined()
  })

  it('restores the stable standard layout', () => {
    expect(defaultDashboardWidgets().map((widget) => [widget.id, widget.x, widget.y, widget.w, widget.h])).toEqual([
      ['calendar', 0, 0, 12, 5], ['upcoming-plans', 0, 5, 6, 3], ['upcoming-todos', 6, 5, 6, 3], ['next-day-materials', 0, 8, 12, 3],
    ])
  })
})
