import type { ScheduleColumn } from '../domain/types'

export interface SchedulePatternSeed { id: string; name: string; markdown: string; columns: ScheduleColumn[] }

/** These are inserted into SQLite on first use. Their Markdown is intentionally
 * kept as the compact table-header string entered in the settings UI. */
export const builtInSchedulePatternSeeds: SchedulePatternSeed[] = [
  {
    id: 'learning-status-oriented', name: 'Lernstandsorientierter Verlaufsplan',
    markdown: '|Zeit|Abschnitt|Lerngegenstand|Materialien|Anmerkung|',
    columns: [
      { id: 'time-1', label: 'Zeit', field: 'time' }, { id: 'phase-2', label: 'Abschnitt', field: 'phase' }, { id: 'content-3', label: 'Lerngegenstand', field: 'content' }, { id: 'materials-4', label: 'Materialien', field: 'materials' }, { id: 'notes-5', label: 'Anmerkung', field: 'notes' },
    ],
  },
  {
    id: 'communication-oriented', name: 'Kommunikationsorientierter Verlaufsplan',
    markdown: '|Zeit|Abschnitt|Lehrerhandeln|Schülerhandeln|Materialien|Gegenstand|',
    columns: [
      { id: 'time-1', label: 'Zeit', field: 'time' }, { id: 'phase-2', label: 'Abschnitt', field: 'phase' }, { id: 'teacherActivity-3', label: 'Lehrerhandeln', field: 'teacherActivity' }, { id: 'participantActivity-4', label: 'Schülerhandeln', field: 'participantActivity' }, { id: 'materials-5', label: 'Materialien', field: 'materials' }, { id: 'content-6', label: 'Gegenstand', field: 'content' },
    ],
  },
]
