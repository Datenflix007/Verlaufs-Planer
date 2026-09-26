import type { ScheduleColumn, ScheduleField } from './types'

const fieldByHeader: Record<string, ScheduleField> = {
  zeit: 'time',
  abschnitt: 'phase',
  abschitt: 'phase',
  phase: 'phase',
  lerngegenstand: 'content',
  gegenstand: 'content',
  inhalt: 'content',
  lehrerhandeln: 'teacherActivity',
  lehrendenhandeln: 'teacherActivity',
  schülerhandeln: 'participantActivity',
  schuelerhandeln: 'participantActivity',
  sushandeln: 'participantActivity',
  materialien: 'materials',
  material: 'materials',
  anmerkung: 'notes',
  anmerkungen: 'notes',
  hinweis: 'notes',
  hinweise: 'notes',
}

const normaliseHeader = (header: string): string => header.trim().toLocaleLowerCase('de-DE').replace(/\s+/g, '')

/**
 * Converts a Markdown table header into the structured columns used by the
 * editor. The original Markdown string remains the persisted source of truth.
 */
export function columnsFromMarkdownHeader(markdown: string): ScheduleColumn[] {
  const line = markdown.split(/\r?\n/).map((candidate) => candidate.trim()).find(Boolean)
  if (!line) throw new Error('Bitte geben Sie einen Markdown-Tabellenkopf ein.')
  const headers = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((header) => header.trim()).filter(Boolean)
  if (!headers.length) throw new Error('Der Markdown-Tabellenkopf enthaelt keine Spalten.')
  const fields = headers.map((header) => fieldByHeader[normaliseHeader(header)])
  const unknown = headers.find((_, index) => !fields[index])
  if (unknown) throw new Error(`Die Spalte „${unknown}“ ist nicht bekannt. Erlaubt sind z. B. Zeit, Abschnitt, Lerngegenstand, Lehrerhandeln, Schülerhandeln, Materialien und Anmerkung.`)
  if (new Set(fields).size !== fields.length) throw new Error('Jede Spalte darf im Verlaufsplan nur einmal vorkommen.')
  return headers.map((label, index) => ({ id: `${fields[index]}-${index + 1}`, label, field: fields[index] }))
}
