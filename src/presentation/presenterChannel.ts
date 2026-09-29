import type { MindmapWidget, TimelineWidget } from '../domain/types'

export interface PresentationInkPoint {
  x: number
  y: number
  at?: number
}

export const presentationInkFadeDurationMs = 600

export interface PresentationInkStroke {
  id: string
  slideId: string
  points: PresentationInkPoint[]
  color: string
  width: number
  glow: boolean
  fadeAfterMs?: number
  expiresAt?: number
}

export function copyPresentationInkStroke(stroke: PresentationInkStroke): PresentationInkStroke {
  return {
    ...stroke,
    points: stroke.points.map((point) => ({ x: point.x, y: point.y, at: point.at })),
  }
}

export type PresentationChannelEvent =
  | { type: 'PRESENTATION_START' | 'PRESENTATION_STATE'; slideId: string }
  | { type: 'SLIDE_CHANGE'; slideId: string }
  | { type: 'PRESENTATION_REQUEST_STATE' }
  | { type: 'PRESENTATION_END' }
  | { type: 'AUDIENCE_READY' | 'AUDIENCE_CLOSED' | 'FULLSCREEN_REQUEST' }
  | { type: 'FULLSCREEN_STATUS'; active: boolean }
  | { type: 'MINDMAP_UPDATED'; slideId: string; elementId: string; mindmap: MindmapWidget }
  | { type: 'TIMELINE_UPDATED'; slideId: string; elementId: string; timeline: TimelineWidget }
  | { type: 'PRESENTATION_VIEW_STATE'; slideId: string; zoom: number; audienceZoom: boolean; panX: number; panY: number }
  | { type: 'PRESENTATION_AUDIENCE_PAN'; slideId: string; panX: number; panY: number }
  | { type: 'PRESENTATION_AUDIENCE_ZOOM'; slideId: string; zoom: number }
  | { type: 'POLL_VOTE'; slideId: string; elementId: string; optionId: string }
  | { type: 'POLL_STATE'; slideId: string; elementId: string; votes: Record<string, number>; showResults: boolean }
  | { type: 'PRESENTATION_INK_PERMISSION'; slideId: string; enabled: boolean }
  | { type: 'PRESENTATION_INK_STATE'; strokes: PresentationInkStroke[] }
  | { type: 'PRESENTATION_INK_STROKE'; stroke: PresentationInkStroke }
  | { type: 'PRESENTATION_INK_REMOVE'; slideId: string; strokeId: string }

export const presentationChannelName = (presentationId: string): string => `verlaufsplaner-presentation-${presentationId}`
export function openPresentationChannel(presentationId: string): BroadcastChannel { return new BroadcastChannel(presentationChannelName(presentationId)) }
export function isSlideChange(event: PresentationChannelEvent): event is Extract<PresentationChannelEvent, { slideId: string }> { return event.type === 'SLIDE_CHANGE' || event.type === 'PRESENTATION_START' || event.type === 'PRESENTATION_STATE' }
