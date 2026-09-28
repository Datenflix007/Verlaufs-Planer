import type { MindmapWidget } from '../domain/types'

export type PresentationChannelEvent =
  | { type: 'PRESENTATION_START' | 'PRESENTATION_STATE'; slideId: string }
  | { type: 'SLIDE_CHANGE'; slideId: string }
  | { type: 'PRESENTATION_REQUEST_STATE' }
  | { type: 'PRESENTATION_END' }
  | { type: 'AUDIENCE_READY' | 'AUDIENCE_CLOSED' | 'FULLSCREEN_REQUEST' }
  | { type: 'FULLSCREEN_STATUS'; active: boolean }
  | { type: 'MINDMAP_UPDATED'; slideId: string; elementId: string; mindmap: MindmapWidget }

export const presentationChannelName = (presentationId: string): string => `verlaufsplaner-presentation-${presentationId}`
export function openPresentationChannel(presentationId: string): BroadcastChannel { return new BroadcastChannel(presentationChannelName(presentationId)) }
export function isSlideChange(event: PresentationChannelEvent): event is Extract<PresentationChannelEvent, { slideId: string }> { return event.type === 'SLIDE_CHANGE' || event.type === 'PRESENTATION_START' || event.type === 'PRESENTATION_STATE' }
