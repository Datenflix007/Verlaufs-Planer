import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SqliteDigitalLearningMaterials, SqliteSchedulePatterns, SqliteWorkspaceSettings } from './sqlitePlans'

describe('SqliteDigitalLearningMaterials', () => {
  it('speichert, lädt, aktualisiert und entfernt wiederverwendbare Lernmaterialien', () => {
    const repository = new SqliteDigitalLearningMaterials(join(mkdtempSync(join(tmpdir(), 'verlaufsplaner-materials-')), 'materials.sqlite'))
    const material = {
      id: 'material-1', title: 'Fotosynthese Mindmap', description: 'Gemeinsam ergänzen', kind: 'mindmap' as const,
      blocks: [{ id: 'block-1', type: 'mindmap' as const, title: 'Begriffe', content: 'Chlorophyll', x: 80, y: 100, width: 250, height: 160 }],
      connections: [], createdAt: '2026-09-27T10:00:00.000Z', updatedAt: '2026-09-27T10:00:00.000Z',
    }
    repository.save(material)
    expect(repository.get(material.id)?.blocks[0]?.content).toBe('Chlorophyll')
    expect(repository.list().map((item) => item.title)).toEqual(['Fotosynthese Mindmap'])
    repository.save({ ...material, title: 'Fotosynthese Mindmap 2' })
    expect(repository.get(material.id)?.title).toBe('Fotosynthese Mindmap 2')
    expect(repository.remove(material.id)).toBe(true)
    expect(repository.get(material.id)).toBeUndefined()
  })
})

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
    expect(initial.dashboard.map((widget) => widget.id)).toEqual(['calendar', 'upcoming-plans', 'upcoming-todos', 'next-day-materials', 'today-schedule', 'material-library'])
    expect(initial.dashboard.find((widget) => widget.id === 'calendar')).toMatchObject({ x: 0, y: 0, w: 12, h: 5 })
    const buildingId = '5b03b80b-7919-471d-9d7f-73ba08425017'
    const saved = repository.save({ ...initial, buildings: [{ id: buildingId, name: 'Hauptgebäude' }], todos: [{ id: 'f14f9d0f-4766-4320-8f28-6130848e5462', title: 'Material vorbereiten', dueDate: '2026-09-27', completed: false }], inventoryMaterials: [{ id: '072f47f6-2434-4381-8ca0-7a06102179e7', name: 'Beamer', resourceType: 'physical', scope: 'building', buildingId }] })
    expect(saved.buildings[0]?.name).toBe('Hauptgebäude')
    expect(repository.get().inventoryMaterials[0]?.scope).toBe('building')
    expect(repository.get().todos[0]?.title).toBe('Material vorbereiten')
  })
})
