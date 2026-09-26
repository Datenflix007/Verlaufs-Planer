import type { Material, ScheduleEntry } from './types'

export interface MaterialUsage { material: Material; entries: ScheduleEntry[] }
export function aggregateMaterials(materials: Material[], schedule: ScheduleEntry[]): MaterialUsage[] {
  return materials.map((material) => ({ material, entries: schedule.filter((entry) => entry.materialIds.includes(material.id)) })).filter((usage) => usage.entries.length > 0)
}
