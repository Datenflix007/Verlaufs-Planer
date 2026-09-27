import type { WorkshopPlan } from '../domain/types'
import { migratePlan } from '../schemas/plan'
import type { PlanRepository, PlanSummary } from './PlanRepository'

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `SQLite-Speicher nicht erreichbar (${response.status}). Starten Sie die Anwendung mit npm run dev.`)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export class SqlitePlanRepository implements PlanRepository {
  async list(): Promise<PlanSummary[]> { return api<PlanSummary[]>('/api/plans') }
  async get(id: string): Promise<WorkshopPlan | undefined> {
    const response = await fetch(`/api/plans/${encodeURIComponent(id)}`)
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`SQLite-Speicher nicht erreichbar (${response.status}). Starten Sie die Anwendung mit npm run dev.`)
    return migratePlan(await response.json())
  }
  async save(plan: WorkshopPlan): Promise<void> { await api<void>(`/api/plans/${encodeURIComponent(plan.id)}`, { method: 'PUT', body: JSON.stringify(migratePlan(plan)) }) }
  async remove(id: string): Promise<void> { await api<void>(`/api/plans/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
}
