import type { DigitalLearningMaterial } from '../domain/types'

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as { error?: string } | undefined
    throw new Error(body?.error ?? `Lernmaterial-Speicher nicht erreichbar (${response.status}).`)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export class LearningMaterialRepository {
  async list(): Promise<DigitalLearningMaterial[]> { return api<DigitalLearningMaterial[]>('/api/learning-materials') }
  async get(id: string): Promise<DigitalLearningMaterial | undefined> {
    const response = await fetch(`/api/learning-materials/${encodeURIComponent(id)}`)
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`Lernmaterial-Speicher nicht erreichbar (${response.status}).`)
    return response.json() as Promise<DigitalLearningMaterial>
  }
  async save(material: DigitalLearningMaterial): Promise<void> {
    await api<void>(`/api/learning-materials/${encodeURIComponent(material.id)}`, { method: 'PUT', body: JSON.stringify(material) })
  }
  async remove(id: string): Promise<void> {
    await api<void>(`/api/learning-materials/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }
}
