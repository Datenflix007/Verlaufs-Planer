import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SqliteSchedulePatterns, SqliteWorkspaceSettings } from './sqlitePlans'

describe('SqliteSchedulePatterns', () => {
  it('legt die beiden Markdown-Standardmuster in einer neuen Datenbank an', () => {
    const repository = new SqliteSchedulePatterns(join(mkdtempSync(join(tmpdir(), 'verlaufsplaner-patterns-')), 'patterns.sqlite'))
    const patterns = repository.list()
    expect(patterns.map((pattern) => pattern.name)).toEqual(expect.arrayContaining(['Lernstandsorientierter Verlaufsplan', 'Kommunikationsorientierter Verlaufsplan']))
    expect(patterns.find((pattern) => pattern.id === 'learning-status-oriented')?.markdown).toBe('|Zeit|Abschnitt|Lerngegenstand|Materialien|Anmerkung|')
    expect(patterns.find((pattern) => pattern.id === 'communication-oriented')?.markdown).toBe('|Zeit|Abschnitt|Lehrerhandeln|Schülerhandeln|Materialien|Gegenstand|')
  })
})

describe('SqliteWorkspaceSettings', () => {
  it('legt ein konfigurierbares Dashboard an und bewahrt Gebäude, Aufgaben und Bestand', () => {
    const repository = new SqliteWorkspaceSettings(join(mkdtempSync(join(tmpdir(), 'verlaufsplaner-workspace-')), 'workspace.sqlite'))
    const initial = repository.get()
    expect(initial.dashboard.map((widget) => widget.id)).toEqual(['calendar', 'upcoming-plans', 'upcoming-todos', 'next-day-materials'])
    const buildingId = '5b03b80b-7919-471d-9d7f-73ba08425017'
    const saved = repository.save({ ...initial, buildings: [{ id: buildingId, name: 'Hauptgebäude' }], todos: [{ id: 'f14f9d0f-4766-4320-8f28-6130848e5462', title: 'Material vorbereiten', dueDate: '2026-09-27', completed: false }], inventoryMaterials: [{ id: '072f47f6-2434-4381-8ca0-7a06102179e7', name: 'Beamer', resourceType: 'physical', scope: 'building', buildingId }] })
    expect(saved.buildings[0]?.name).toBe('Hauptgebäude')
    expect(repository.get().inventoryMaterials[0]?.scope).toBe('building')
    expect(repository.get().todos[0]?.title).toBe('Material vorbereiten')
  })
})
