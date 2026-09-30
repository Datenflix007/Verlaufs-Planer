import type { Presentation, TimelineWidget } from '../domain/types'
import type { PresentationChannelEvent } from './presenterChannel'

export type TimelineUpdate = Extract<PresentationChannelEvent, { type: 'TIMELINE_UPDATED' }>

export function timelineUpdate(slideId: string, elementId: string, timeline: TimelineWidget): TimelineUpdate {
  return { type: 'TIMELINE_UPDATED', slideId, elementId, timeline: JSON.parse(JSON.stringify(timeline)) as TimelineWidget }
}

export function applyTimelineUpdate(presentation: Presentation, update: TimelineUpdate): boolean {
  const element = presentation.slides.find((slide) => slide.id === update.slideId)?.elements.find((item) => item.id === update.elementId)
  if (!element || element.type !== 'timeline') return false
  element.content.timeline = update.timeline
  return true
}
