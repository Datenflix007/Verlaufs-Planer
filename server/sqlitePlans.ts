import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { appConfig } from './config'
import { builtInSchedulePatternSeeds } from '../src/data/schedulePatterns'
import { createWorkspaceSettings, normaliseWorkspaceSettings } from '../src/data/workspaceDefaults'
import type { DigitalLearningMaterial, SchedulePattern } from '../src/domain/types'
import type { WorkspaceSettings } from '../src/domain/types'

export interface StoredPlanSummary { id: string; title: string; updatedAt: string; dateRange: string }
type StoredPlan = { id: string; metadata: { title: string }; updatedAt: string; days: Array<{ date: string }> }
export interface StoredPresentationMedia {
  id: string; planId: string; name: string; mimeType: string; size: number; createdAt: string; content: Buffer
}
export interface PresentationMediaInput {
  planId: string; name: string; mimeType: string; content: Buffer
}
export class SqlitePlans {
  private readonly database: DatabaseSync
  constructor(path = appConfig().databasePath) {
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

/** Stores plan-owned media as BLOBs, while the plan JSON keeps only the stable API URL. */
export class SqlitePresentationMedia {
  private readonly database: DatabaseSync
  constructor(path = appConfig().databasePath) {
    mkdirSync(dirname(path), { recursive: true })
    this.database = new DatabaseSync(path)
    this.database.exec('CREATE TABLE IF NOT EXISTS presentation_media (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, name TEXT NOT NULL, mime_type TEXT NOT NULL, content BLOB NOT NULL, created_at TEXT NOT NULL) STRICT; CREATE INDEX IF NOT EXISTS presentation_media_plan_id ON presentation_media(plan_id);')
  }
  save(input: PresentationMediaInput): Omit<StoredPresentationMedia, 'content'> {
    const record = { id: randomUUID(), planId: input.planId, name: input.name || 'Medium', mimeType: input.mimeType, size: input.content.byteLength, createdAt: new Date().toISOString() }
    this.database.prepare('INSERT INTO presentation_media (id, plan_id, name, mime_type, content, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(record.id, record.planId, record.name, record.mimeType, input.content, record.createdAt)
    return record
  }
  get(id: string): StoredPresentationMedia | undefined {
    const row = this.database.prepare('SELECT id, plan_id AS planId, name, mime_type AS mimeType, length(content) AS size, created_at AS createdAt, content FROM presentation_media WHERE id = ?').get(id) as Omit<StoredPresentationMedia, 'content'> & { content: Uint8Array } | undefined
    return row && { ...row, content: Buffer.from(row.content) }
  }
  list(planId: string): Array<Omit<StoredPresentationMedia, 'content'>> {
    return this.database.prepare('SELECT id, plan_id AS planId, name, mime_type AS mimeType, length(content) AS size, created_at AS createdAt FROM presentation_media WHERE plan_id = ? ORDER BY created_at').all(planId) as Array<Omit<StoredPresentationMedia, 'content'>>
  }
  remove(id: string): boolean { return this.database.prepare('DELETE FROM presentation_media WHERE id = ?').run(id).changes > 0 }
  removeForPlan(planId: string): number { return Number(this.database.prepare('DELETE FROM presentation_media WHERE plan_id = ?').run(planId).changes) }
}

export class SqliteDigitalLearningMaterials {
  private readonly database: DatabaseSync
  constructor(path = appConfig().databasePath) {
    mkdirSync(dirname(path), { recursive: true })
    this.database = new DatabaseSync(path)
    this.database.exec('CREATE TABLE IF NOT EXISTS digital_learning_materials (id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL) STRICT;')
  }
  list(): DigitalLearningMaterial[] {
    const rows = this.database.prepare('SELECT payload FROM digital_learning_materials ORDER BY updated_at DESC').all() as Array<{ payload: string }>
    return rows.map((row) => JSON.parse(row.payload) as DigitalLearningMaterial)
  }
  get(id: string): DigitalLearningMaterial | undefined {
    const row = this.database.prepare('SELECT payload FROM digital_learning_materials WHERE id = ?').get(id) as { payload: string } | undefined
    return row ? JSON.parse(row.payload) as DigitalLearningMaterial : undefined
  }
  save(input: DigitalLearningMaterial): void {
    const existing = this.get(input.id)
    const material = { ...input, createdAt: existing?.createdAt ?? input.createdAt, updatedAt: new Date().toISOString() }
    this.database.prepare('INSERT INTO digital_learning_materials (id, title, kind, updated_at, payload) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, kind = excluded.kind, updated_at = excluded.updated_at, payload = excluded.payload').run(material.id, material.title, material.kind, material.updatedAt, JSON.stringify(material))
  }
  remove(id: string): boolean { return this.database.prepare('DELETE FROM digital_learning_materials WHERE id = ?').run(id).changes > 0 }
}

type StoredSchedulePattern = {
  id: string; name: string; markdown: string; columns_json: string
  createdAt: string; updatedAt: string; isBuiltIn: number
}

/** Stores user-defined schedule layouts separately from individual plans. */
export class SqliteSchedulePatterns {
  private readonly database: DatabaseSync
  constructor(path = appConfig().databasePath) {
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
  constructor(path = appConfig().databasePath) {
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
