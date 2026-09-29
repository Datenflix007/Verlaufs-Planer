import { createId } from '../domain/factories'
import type { PresentationElement, TimelineWidget } from '../domain/types'

export function createTimeline(): TimelineWidget {
  return {
    id: createId(),
    orientation: 'horizontal',
    entries: [
      { id: createId(), date: 'Start', title: 'Ausgangslage', description: 'Worum geht es?' },
      { id: createId(), date: 'Mitte', title: 'Erarbeitung', description: 'Zentrale Station' },
      { id: createId(), date: 'Ziel', title: 'Sicherung', description: 'Ergebnis festhalten' },
    ],
  }
}

export function createTimelineElement(position = { x: 120, y: 195 }): PresentationElement {
  const timestamp = new Date().toISOString()
  return {
    id: createId(), type: 'timeline', x: position.x, y: position.y, width: 1040, height: 340, rotation: 0, zIndex: 1,
    style: { opacity: 1 }, content: { timeline: createTimeline() }, createdAt: timestamp, updatedAt: timestamp,
  }
}

export function duplicateTimeline(timeline: TimelineWidget): TimelineWidget {
  return { ...timeline, id: createId(), entries: timeline.entries.map((entry) => ({ ...entry, id: createId() })) }
}
