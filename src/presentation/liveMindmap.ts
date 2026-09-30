import type { MindmapWidget, Presentation } from '../domain/types'
import type { PresentationChannelEvent } from './presenterChannel'

export type MindmapUpdate = Extract<PresentationChannelEvent, { type: 'MINDMAP_UPDATED' }>

export function mindmapUpdate(slideId: string, elementId: string, mindmap: MindmapWidget): MindmapUpdate {
  return { type: 'MINDMAP_UPDATED', slideId, elementId, mindmap: JSON.parse(JSON.stringify(mindmap)) as MindmapWidget }
}

export function applyMindmapUpdate(presentation: Presentation, update: MindmapUpdate): boolean {
  const element = presentation.slides.find(slide => slide.id === update.slideId)?.elements.find(item => item.id === update.elementId)
  if (!element || element.type !== 'mindmap' || element.content.mindmap?.id !== update.mindmap.id) return false
  element.content.mindmap = update.mindmap
  presentation.updatedAt = new Date().toISOString()
  return true
}
