import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { builtInSchedulePatternSeeds } from '../src/data/schedulePatterns'
import { createWorkspaceSettings, normaliseWorkspaceSettings } from '../src/data/workspaceDefaults'
import type { SchedulePattern } from '../src/domain/types'
import type { WorkspaceSettings } from '../src/domain/types'

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

type StoredSchedulePattern = {
  id: string; name: string; markdown: string; columns_json: string
  createdAt: string; updatedAt: string; isBuiltIn: number
}

/** Stores user-defined schedule layouts separately from individual plans. */
export class SqliteSchedulePatterns {
  private readonly database: DatabaseSync
  constructor(path = databasePath) {
    mkdirSync(dirname(path), { recursive: true })
    this.database = new DatabaseSync(path)
    this.database.exec('CREATE TABLE IF NOT EXISTS schedule_patterns (id TEXT PRIMARY KEY, name TEXT NOT NULL, markdown TEXT NOT NULL, columns_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, is_builtin INTEGER NOT NULL DEFAULT 0 CHECK(is_builtin IN (0, 1))) STRICT;')
    this.seedBuiltIns()
  }
  private seedBuiltIns(): void {
    const now = new Date().toISOString()
    const statement = this.database.prepare('INSERT OR IGNORE INTO schedule_patterns (id, name, markdown, columns_json, created_at, updated_at, is_builtin) VALUES (?, ?, ?, ?, ?, ?, 1)')
    for (const pattern of builtInSchedulePatternSeeds) statement.run(pattern.id, pattern.name, pattern.markdown, JSON.stringify(pattern.columns), now, now)
  }
  private toPattern(row: StoredSchedulePattern): SchedulePattern {
    return { id: row.id, name: row.name, markdown: row.markdown, columns: JSON.parse(row.columns_json), createdAt: row.createdAt, updatedAt: row.updatedAt, isBuiltIn: row.isBuiltIn === 1 }
  }
  list(): SchedulePattern[] {
    const rows = this.database.prepare('SELECT id, name, markdown, columns_json AS columns_json, created_at AS createdAt, updated_at AS updatedAt, is_builtin AS isBuiltIn FROM schedule_patterns ORDER BY is_builtin DESC, name COLLATE NOCASE').all() as unknown as StoredSchedulePattern[]
    return rows.map((row) => this.toPattern(row))
  }
  get(id: string): SchedulePattern | undefined {
    const row = this.database.prepare('SELECT id, name, markdown, columns_json AS columns_json, created_at AS createdAt, updated_at AS updatedAt, is_builtin AS isBuiltIn FROM schedule_patterns WHERE id = ?').get(id) as unknown as StoredSchedulePattern | undefined
    return row && this.toPattern(row)
  }
  save(input: SchedulePattern): void {
    const existing = this.get(input.id)
    if (existing?.isBuiltIn) throw new Error('Die mitgelieferten Verlaufsplan-Muster können nicht überschrieben werden.')
    const createdAt = existing?.createdAt ?? input.createdAt ?? new Date().toISOString()
    const updatedAt = new Date().toISOString()
    this.database.prepare('INSERT INTO schedule_patterns (id, name, markdown, columns_json, created_at, updated_at, is_builtin) VALUES (?, ?, ?, ?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET name = excluded.name, markdown = excluded.markdown, columns_json = excluded.columns_json, updated_at = excluded.updated_at').run(input.id, input.name, input.markdown, JSON.stringify(input.columns), createdAt, updatedAt)
  }
  remove(id: string): boolean {
    const pattern = this.get(id)
    if (pattern?.isBuiltIn) throw new Error('Die mitgelieferten Verlaufsplan-Muster können nicht gelöscht werden.')
    return this.database.prepare('DELETE FROM schedule_patterns WHERE id = ?').run(id).changes > 0
  }
}

/** One local workspace contains dashboard configuration, rooms, stock and tasks. */
export class SqliteWorkspaceSettings {
  private readonly database: DatabaseSync
  constructor(path = databasePath) {
    mkdirSync(dirname(path), { recursive: true })
    this.database = new DatabaseSync(path)
    this.database.exec('CREATE TABLE IF NOT EXISTS workspace_settings (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;')
    if (!this.database.prepare("SELECT 1 FROM workspace_settings WHERE id = 'default'").get()) this.save(createWorkspaceSettings())
  }
  get(): WorkspaceSettings {
    const row = this.database.prepare("SELECT payload FROM workspace_settings WHERE id = 'default'").get() as { payload: string } | undefined
    return normaliseWorkspaceSettings(row ? JSON.parse(row.payload) : undefined)
  }
  save(input: WorkspaceSettings): WorkspaceSettings {
    const settings = normaliseWorkspaceSettings(input)
    this.database.prepare("INSERT INTO workspace_settings (id, payload, updated_at) VALUES ('default', ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at").run(JSON.stringify(settings), new Date().toISOString())
    return settings
  }
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
