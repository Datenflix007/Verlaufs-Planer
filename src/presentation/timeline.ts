import { createId } from '../domain/factories'
import type { PresentationElement, TimelineWidget } from '../domain/types'

export function createTimeline(): TimelineWidget {
  return {
    id: createId(),
    orientation: 'horizontal',
    template: 'chronik',
    colorSet: 'ozean',
    entries: [
      { id: createId(), date: '1789', title: 'Französische Revolution', description: 'Sturm auf die Bastille und Beginn des Umbruchs.' },
      { id: createId(), date: '1791', title: 'Erste Verfassung', description: 'Frankreich wird zur konstitutionellen Monarchie.' },
      { id: createId(), date: '1799', title: 'Napoleons Staatsstreich', description: 'Das Direktorium endet; Napoleon übernimmt die Macht.' },
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
