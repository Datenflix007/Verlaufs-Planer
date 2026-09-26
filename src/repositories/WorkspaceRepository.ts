import type { WorkspaceSettings } from '../domain/types'

const request = async <T>(init?: RequestInit): Promise<T> => {
  const response = await fetch('/api/workspace', { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  if (!response.ok) throw new Error(`Arbeitsbereich konnte nicht gespeichert werden (${response.status}).`)
  return response.json() as Promise<T>
}

export class WorkspaceRepository {
  async get(): Promise<WorkspaceSettings> { return request<WorkspaceSettings>() }
  async save(settings: WorkspaceSettings): Promise<WorkspaceSettings> { return request<WorkspaceSettings>({ method: 'PUT', body: JSON.stringify(settings) }) }
}
