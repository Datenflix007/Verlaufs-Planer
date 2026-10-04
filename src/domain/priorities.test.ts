import { describe, expect, it } from 'vitest'
import { normalisePriorities, prioritiseUpcoming, reorderPriorities } from './priorities'

describe('Arbeitsbereich-Prioritäten', () => {
  it('ergänzt Gewichte in bestehenden Arbeitsbereichen und hält ihre gespeicherte Reihenfolge ein', () => {
    const priorities = normalisePriorities([
      { id: 'medium', label: 'Mittel', order: 2, icon: '●' },
      { id: 'lightning', label: 'Blitz', order: 0, icon: '⚡' },
      { id: 'high', label: 'Hoch', order: 1, icon: '↑' },
    ] as never)

    expect(priorities).toEqual([
      { id: 'lightning', label: 'Blitz', order: 0, weight: 4, icon: '⚡' },
      { id: 'high', label: 'Hoch', order: 1, weight: 3, icon: '↑' },
      { id: 'medium', label: 'Mittel', order: 2, weight: 2, icon: '●' },
    ])
  })

  it('priorisiert Gewicht vor zeitlicher Dringlichkeit und Datum bei gleichem Gewicht', () => {
    const priorities = normalisePriorities([
      { id: 'high', label: 'Hoch', order: 0, weight: 9, icon: '↑' },
      { id: 'medium', label: 'Mittel', order: 1, weight: 2, icon: '●' },
    ])
    const ordered = prioritiseUpcoming([
      { id: 'later-high', date: '2026-11-01', priorityId: 'high' },
      { id: 'later-medium', date: '2026-10-07', priorityId: 'medium' },
      { id: 'sooner-high', date: '2026-10-06', priorityId: 'high' },
    ], priorities, '2026-10-04')

    expect(ordered.map((item) => item.id)).toEqual(['sooner-high', 'later-high', 'later-medium'])
  })

  it('übernimmt eine umsortierte Reihenfolge als stabile Gewichte', () => {
    const reordered = reorderPriorities(normalisePriorities(undefined), 'waiting', 'lightning')

    expect(reordered.map((priority) => [priority.id, priority.order, priority.weight])).toEqual([
      ['waiting', 0, 4],
      ['lightning', 1, 3],
      ['high', 2, 2],
      ['medium', 3, 1],
    ])
  })
})
