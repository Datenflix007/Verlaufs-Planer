import type { ScheduleEntry, WorkshopDay } from './types'

const toMinutes = (value?: string): number | undefined => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return undefined
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}
const toTime = (minutes: number): string => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function synchronizeTime(entry: ScheduleEntry, changed: 'start' | 'end' | 'duration'): ScheduleEntry {
  const start = toMinutes(entry.startTime); const end = toMinutes(entry.endTime); const duration = entry.durationMinutes
  if (changed === 'duration' && start !== undefined && duration !== undefined) return { ...entry, endTime: toTime(start + duration) }
  if (changed === 'end' && start !== undefined && end !== undefined) return { ...entry, durationMinutes: Math.max(0, end - start) }
  if (changed === 'start' && end !== undefined && duration !== undefined) return { ...entry, endTime: toTime(start! + duration) }
  return entry
}

export const totalDayMinutes = (entries: ScheduleEntry[], dayId: string): number => entries.filter((entry) => entry.dayId === dayId).reduce((total, entry) => total + (entry.durationMinutes ?? 0), 0)
export const nextStartTime = (entries: ScheduleEntry[], dayId: string): string | undefined => entries.filter((entry) => entry.dayId === dayId).at(-1)?.endTime
export const orderedDays = (days: WorkshopDay[]): WorkshopDay[] => [...days].sort((a, b) => a.date.localeCompare(b.date))
