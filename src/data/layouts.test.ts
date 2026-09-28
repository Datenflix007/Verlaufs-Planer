import { describe, expect, it } from 'vitest'
import { scheduleLayouts } from './layouts'
describe('Verlaufsplanlayouts', () => { it('liefert mehrere datengetriebene Layouts mit Zeitspalte', () => { expect(scheduleLayouts.map((layout) => layout.id)).toEqual(expect.arrayContaining(['compact', 'teaching', 'detailed', 'workshop'])); expect(scheduleLayouts.every((layout) => layout.columns.some((column) => column.field === 'time'))).toBe(true) }) })
