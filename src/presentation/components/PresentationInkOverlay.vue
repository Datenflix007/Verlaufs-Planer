<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { presentationInkFadeDurationMs, type PresentationInkStroke } from '../presenterChannel'

type Point = PresentationInkStroke['points'][number]

const props = withDefaults(defineProps<{
  strokes: PresentationInkStroke[]
  tool?: 'off' | 'pen' | 'highlighter' | 'eraser'
  color?: string
  width?: number
  zoom?: number
  fadeAfterMs?: number
}>(), { tool: 'off', color: '#e53935', width: 5, zoom: 1, fadeAfterMs: 3000 })
const emit = defineEmits<{ draw: [points: Point[]]; erase: [strokeIds: string[]] }>()
const svg = ref<SVGSVGElement>()
const draft = ref<Point[]>([])
const erasing = ref(false)
const clock = ref(Date.now())
const enabled = computed(() => props.tool !== 'off')
const regularStrokes = computed(() => props.strokes.filter((stroke) => !stroke.glow))
type GlowSegment = { id: string; points: Point[]; color: string; width: number; opacity: number }
function fadeOpacity(point: Point, fadeAfterMs: number): number {
  const fadeStarted = (point.at ?? clock.value) + fadeAfterMs
  return Math.max(0, Math.min(1, 1 - Math.max(0, clock.value - fadeStarted) / presentationInkFadeDurationMs))
}
function segments(id: string, points: Point[], color: string, width: number, fadeAfterMs: number): GlowSegment[] {
  return points.slice(1).flatMap((point, index) => {
    const opacity = fadeOpacity(point, fadeAfterMs)
    return opacity > 0 ? [{ id: `${id}-${index + 1}`, points: [points[index]!, point], color, width, opacity: opacity * .9 }] : []
  })
}
const glowSegments = computed(() => {
  clock.value
  return props.strokes.filter((stroke) => stroke.glow).flatMap((stroke) => segments(stroke.id, stroke.points, stroke.color, stroke.width, stroke.fadeAfterMs ?? 3000))
})
const draftGlowSegments = computed(() => {
  clock.value
  return props.tool === 'highlighter' ? segments('draft', draft.value, props.color, props.width, props.fadeAfterMs) : []
})
let clockTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => { clockTimer = setInterval(() => (clock.value = Date.now()), 50) })
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })
function point(event: PointerEvent): Point | undefined {
  const rect = svg.value?.getBoundingClientRect()
  if (!rect?.width || !rect.height) return
  return {
    x: Math.max(0, Math.min(1280, ((((event.clientX - rect.left) / rect.width) * 1280 - 640) / props.zoom) + 640)),
    y: Math.max(0, Math.min(720, ((((event.clientY - rect.top) / rect.height) * 720 - 360) / props.zoom) + 360)),
    at: Date.now(),
  }
}
function begin(event: PointerEvent): void {
  if (!enabled.value || event.button !== 0) return
  event.preventDefault()
  const first = point(event)
  if (!first) return
  if (props.tool === 'eraser') {
    erasing.value = true
    eraseAt(first)
    svg.value?.setPointerCapture(event.pointerId)
    return
  }
  draft.value = [first]
  svg.value?.setPointerCapture(event.pointerId)
}
function move(event: PointerEvent): void {
  if (props.tool === 'eraser') {
    if (!erasing.value) return
    const next = point(event)
    if (next) eraseAt(next)
    return
  }
  if (!draft.value.length) return
  const next = point(event)
  if (next) draft.value = [...draft.value, next]
}
function finish(): void {
  erasing.value = false
  if (draft.value.length > 1) emit('draw', draft.value)
  draft.value = []
}
function path(points: Point[]): string {
  return points.map((item, index) => `${index ? 'L' : 'M'}${item.x},${item.y}`).join(' ')
}
function eraseAt(point: Point): void {
  const removed = props.strokes
    .filter((stroke) => stroke.points.some((current, index) => {
      const previous = stroke.points[Math.max(0, index - 1)]!
      const dx = current.x - previous.x
      const dy = current.y - previous.y
      const lengthSquared = dx * dx + dy * dy || 1
      const progress = Math.max(0, Math.min(1, ((point.x - previous.x) * dx + (point.y - previous.y) * dy) / lengthSquared))
      const nearestX = previous.x + progress * dx
      const nearestY = previous.y + progress * dy
      const threshold = Math.max(14, stroke.width / 2 + 6)
      return (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2 <= threshold ** 2
    }))
    .map((stroke) => stroke.id)
  if (removed.length) emit('erase', removed)
}
</script>

<template>
  <svg
    ref="svg"
    class="presentation-ink-overlay"
    :class="{ drawing: enabled, erasing: tool === 'eraser' }"
    :style="{ transform: `scale(${zoom})` }"
    viewBox="0 0 1280 720"
    preserveAspectRatio="none"
    aria-hidden="true"
    @pointerdown="begin"
    @pointermove="move"
    @pointerup="finish"
    @pointercancel="finish"
  >
    <defs>
      <filter id="presentation-ink-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="9" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <path
      v-for="stroke in regularStrokes"
      :key="stroke.id"
      :d="path(stroke.points)"
      fill="none"
      :stroke="stroke.color"
      :stroke-width="stroke.width"
      stroke-opacity="1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      v-for="segment in glowSegments"
      :key="segment.id"
      class="presentation-ink-glow-segment"
      :d="path(segment.points)"
      fill="none"
      :stroke="segment.color"
      :stroke-width="segment.width"
      :stroke-opacity="segment.opacity"
      filter="url(#presentation-ink-glow)"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      v-if="draft.length && tool !== 'highlighter'"
      :d="path(draft)"
      fill="none"
      :stroke="color"
      :stroke-width="width"
      stroke-opacity="1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      v-for="segment in draftGlowSegments"
      :key="segment.id"
      class="presentation-ink-glow-segment"
      :d="path(segment.points)"
      fill="none"
      :stroke="segment.color"
      :stroke-width="segment.width"
      :stroke-opacity="segment.opacity"
      filter="url(#presentation-ink-glow)"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.presentation-ink-overlay {
  position: absolute;
  z-index: 30;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.presentation-ink-overlay.drawing { pointer-events: auto; touch-action: none; cursor: crosshair; }
.presentation-ink-overlay.erasing { cursor: cell; }
</style>
