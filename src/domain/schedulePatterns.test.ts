import { describe, expect, it } from 'vitest'
import { columnsFromMarkdownHeader } from './schedulePatterns'

describe('Markdown-Verlaufsplan-Muster', () => {
  it('ordnet den lernstandsorientierten Tabellenkopf den Eingabefeldern zu', () => {
    expect(columnsFromMarkdownHeader('|Zeit|Abschnitt|Lerngegenstand|Materialien|Anmerkung|').map((column) => column.field)).toEqual(['time', 'phase', 'content', 'materials', 'notes'])
  })
  it('ordnet den kommunikationsorientierten Tabellenkopf zu', () => {
    expect(columnsFromMarkdownHeader('|Zeit|Abschnitt|Lehrerhandeln|Schülerhandeln|Materialien|Gegenstand|').map((column) => column.field)).toEqual(['time', 'phase', 'teacherActivity', 'participantActivity', 'materials', 'content'])
  })
  it('akzeptiert die im Auftrag enthaltene Schreibweise Abschitt', () => {
    expect(columnsFromMarkdownHeader('Zeit|Abschitt|Lehrerhandeln|Schülerhandeln|Materialien|Gegenstand').at(1)?.field).toBe('phase')
  })
})
