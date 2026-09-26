import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export interface StoredPlanSummary { id: string; title: string; updatedAt: string; dateRange: string }
type StoredPlan = { id: string; metadata: { title: string }; updatedAt: string; days: Array<{ date: string }> }
const databasePath = resolve(process.cwd(), 'data', 'verlaufsplaner.sqlite')

export class SqlitePlans {
  private readonly database: DatabaseSync
  constructor(path = databasePath) {
    mkdirSync(dirname(path), { recursive: true })
    this.database = new DatabaseSync(path)
    this.database.exec('CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, title TEXT NOT NULL, updated_at TEXT NOT NULL, date_range TEXT NOT NULL, payload TEXT NOT NULL) STRICT;')
  }
  list(): StoredPlanSummary[] { return this.database.prepare('SELECT id, title, updated_at AS updatedAt, date_range AS dateRange FROM plans ORDER BY updated_at DESC').all() as unknown as StoredPlanSummary[] }
  get(id: string): unknown | undefined { const row = this.database.prepare('SELECT payload FROM plans WHERE id = ?').get(id) as { payload: string } | undefined; return row ? JSON.parse(row.payload) : undefined }
  save(input: unknown): void {
    const plan = input as StoredPlan
    const dateRange = plan.days.map((day) => day.date).sort().join(' – ')
    this.database.prepare('INSERT INTO plans (id, title, updated_at, date_range, payload) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at, date_range = excluded.date_range, payload = excluded.payload').run(plan.id, plan.metadata.title, plan.updatedAt, dateRange, JSON.stringify(input))
  }
  remove(id: string): boolean { return this.database.prepare('DELETE FROM plans WHERE id = ?').run(id).changes > 0 }
}

type JenaChatRow = { day: string; time: string; phase: string; activity: string; material?: string; break?: boolean }
type JenaChatSource = {
  metadata: { title: string; subtitle: string; subject: string; targetGroup: string; institution: string; location: string; authors: string[]; description: string }
  days: Array<{ id: string; date: string; title: string; startTime: string; endTime: string }>
  contentAnalysis: string[]; didacticAnalysis: string[]; learningObjectives: string[]; rows: JenaChatRow[]; materials: string[]
}

const documentFrom = (text: string) => ({ type: 'doc' as const, content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] })
const minutes = (value: string): number => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes }
const timeFromMinutes = (value: number): string => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`

export const readJenaChatSample = (): unknown => {
  const source = JSON.parse(readFileSync(resolve(process.cwd(), 'data', 'samples', 'jenachat.json'), 'utf8')) as JenaChatSource
  const rows = source.rows.map((row, index) => {
    const next = source.rows.slice(index + 1).find((candidate) => candidate.day === row.day)
    const day = source.days.find((candidate) => candidate.id === row.day)
    const endTime = next?.time ?? day?.endTime
    return {
      id: `6be955db-b8d7-4d72-8dbb-${String(100000000000 + index).slice(-12)}`,
      dayId: day?.id,
      startTime: row.time,
      endTime,
      durationMinutes: endTime ? Math.max(0, minutes(endTime) - minutes(row.time)) : undefined,
      type: row.break ? 'break' : 'phase',
      phase: row.break ? undefined : row.phase,
      title: row.break ? row.phase : '',
      content: documentFrom(row.activity), objective: documentFrom(''), method: row.material ?? '', materialIds: [], notes: documentFrom(''),
    }
  })
  return {
    schemaVersion: 1, id: '6be955db-b8d7-4d72-8dbb-86cc00000001', metadata: source.metadata, days: source.days,
    learningObjectives: source.learningObjectives.map((text, index) => ({ id: `6be955db-b8d7-4d72-8dbb-${String(100000000050 + index).slice(-12)}`, text, level: String(index + 1), competencyIds: [] })),
    competencies: [], contentAnalysis: { type: 'doc', content: source.contentAnalysis.map((text) => documentFrom(text).content[0]) },
    didacticAnalysis: { type: 'doc', content: source.didacticAnalysis.map((text) => documentFrom(text).content[0]) }, schedule: rows,
    materials: source.materials.map((name, index) => ({ id: `6be955db-b8d7-4d72-8dbb-${String(100000000100 + index).slice(-12)}`, name, resourceType: 'physical' })),
    settings: { scheduleLayoutId: 'jenachat', timeDisplay: 'start' }, createdAt: '2026-07-01T08:00:00.000Z', updatedAt: '2026-07-01T08:00:00.000Z',
  }
}
