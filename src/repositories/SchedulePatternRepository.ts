import type { SchedulePattern } from '../domain/types'

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { error?: string } | undefined
    throw new Error(payload?.error ?? `SQLite-Speicher nicht erreichbar (${response.status}). Starten Sie die Anwendung mit npm run dev.`)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export class SchedulePatternRepository {
  async list(): Promise<SchedulePattern[]> { return api<SchedulePattern[]>('/api/schedule-patterns') }
  async save(pattern: SchedulePattern): Promise<void> { await api<void>(`/api/schedule-patterns/${encodeURIComponent(pattern.id)}`, { method: 'PUT', body: JSON.stringify(pattern) }) }
  async remove(id: string): Promise<void> { await api<void>(`/api/schedule-patterns/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
}
