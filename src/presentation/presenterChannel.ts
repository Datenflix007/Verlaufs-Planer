import type { MindmapWidget } from '../domain/types'

export interface PresentationInkStroke {
  id: string
  slideId: string
  points: Array<{ x: number; y: number }>
  color: string
  width: number
  glow: boolean
  expiresAt?: number
}

export type PresentationChannelEvent =
  | { type: 'PRESENTATION_START' | 'PRESENTATION_STATE'; slideId: string }
  | { type: 'SLIDE_CHANGE'; slideId: string }
  | { type: 'PRESENTATION_REQUEST_STATE' }
  | { type: 'PRESENTATION_END' }
  | { type: 'AUDIENCE_READY' | 'AUDIENCE_CLOSED' | 'FULLSCREEN_REQUEST' }
  | { type: 'FULLSCREEN_STATUS'; active: boolean }
  | { type: 'MINDMAP_UPDATED'; slideId: string; elementId: string; mindmap: MindmapWidget }
  | { type: 'PRESENTATION_VIEW_STATE'; slideId: string; zoom: number; audienceZoom: boolean }
  | { type: 'PRESENTATION_INK_STROKE'; stroke: PresentationInkStroke }
  | { type: 'PRESENTATION_INK_REMOVE'; slideId: string; strokeId: string }

export const presentationChannelName = (presentationId: string): string => `verlaufsplaner-presentation-${presentationId}`
export function openPresentationChannel(presentationId: string): BroadcastChannel { return new BroadcastChannel(presentationChannelName(presentationId)) }
export function isSlideChange(event: PresentationChannelEvent): event is Extract<PresentationChannelEvent, { slideId: string }> { return event.type === 'SLIDE_CHANGE' || event.type === 'PRESENTATION_START' || event.type === 'PRESENTATION_STATE' }
