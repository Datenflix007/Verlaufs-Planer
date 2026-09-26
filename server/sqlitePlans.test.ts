import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SqliteSchedulePatterns } from './sqlitePlans'

describe('SqliteSchedulePatterns', () => {
  it('legt die beiden Markdown-Standardmuster in einer neuen Datenbank an', () => {
    const repository = new SqliteSchedulePatterns(join(mkdtempSync(join(tmpdir(), 'verlaufsplaner-patterns-')), 'patterns.sqlite'))
    const patterns = repository.list()
    expect(patterns.map((pattern) => pattern.name)).toEqual(expect.arrayContaining(['Lernstandsorientierter Verlaufsplan', 'Kommunikationsorientierter Verlaufsplan']))
    expect(patterns.find((pattern) => pattern.id === 'learning-status-oriented')?.markdown).toBe('|Zeit|Abschnitt|Lerngegenstand|Materialien|Anmerkung|')
    expect(patterns.find((pattern) => pattern.id === 'communication-oriented')?.markdown).toBe('|Zeit|Abschnitt|Lehrerhandeln|Schülerhandeln|Materialien|Gegenstand|')
  })
})
