import type { PriorityDefinition } from './types'

export const defaultPriorities = (): PriorityDefinition[] => [
  { id: 'lightning', label: 'Blitz', order: 0, icon: '⚡' },
  { id: 'high', label: 'Hoch', order: 1, icon: '↑' },
  { id: 'medium', label: 'Mittel', order: 2, icon: '●' },
  { id: 'waiting', label: 'Kann warten', order: 3, icon: '○' },
]

export const normalisePriorities = (input: PriorityDefinition[] | undefined): PriorityDefinition[] => {
  const defaults = defaultPriorities()
  const known = (input?.length ? input : defaults).filter((priority, index, priorities) => priority.id.trim() && priorities.findIndex((candidate) => candidate.id === priority.id) === index)
  return known.map((priority, index) => ({ ...priority, label: priority.label.trim() || `Priorität ${index + 1}`, order: index, icon: priority.icon ?? defaults[index]?.icon ?? '●' }))
}

export type PriorityQueueItem = { id: string; date: string; priorityId?: string }

/**
 * A binary max-heap combines configured priority and time urgency without changing persisted
 * dates or priority definitions. Higher configured priority dominates, then earlier dates win.
 */
export function prioritiseUpcoming<T extends PriorityQueueItem>(items: T[], priorities: PriorityDefinition[], today: string): T[] {
  const ordered = normalisePriorities(priorities); const rank = new Map(ordered.map((priority, index) => [priority.id, ordered.length - index])); const fallback = rank.get('medium') ?? 1
  const score = (item: T): number => { const days = Math.max(0, Math.floor((new Date(`${item.date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000)); return (rank.get(item.priorityId ?? '') ?? fallback) * 100000 - Math.min(days, 99999) }
  const heap: Array<{ item: T; score: number }> = []
  const push = (entry: { item: T; score: number }): void => { heap.push(entry); for (let child = heap.length - 1; child > 0;) { const parent = Math.floor((child - 1) / 2); if (heap[parent].score >= heap[child].score) break; [heap[parent], heap[child]] = [heap[child], heap[parent]]; child = parent } }
  const pop = (): T | undefined => { if (!heap.length) return undefined; const top = heap[0]; const last = heap.pop()!; if (heap.length) { heap[0] = last; for (let parent = 0;;) { const left = parent * 2 + 1; const right = left + 1; const next = right < heap.length && heap[right].score > heap[left].score ? right : left; if (left >= heap.length || heap[parent].score >= heap[next].score) break; [heap[parent], heap[next]] = [heap[next], heap[parent]]; parent = next } }; return top.item }
  items.forEach((item) => push({ item, score: score(item) })); const result: T[] = []; for (let next = pop(); next; next = pop()) result.push(next); return result
}
