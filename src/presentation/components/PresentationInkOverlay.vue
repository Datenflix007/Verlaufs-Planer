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
const emit = defineEmits<{ ink: [strokeId: string, points: Point[]]; erase: [strokeIds: string[]] }>()
const svg = ref<SVGSVGElement>()
const draft = ref<Point[]>([])
const draftStrokeId = ref<string>()
const erasing = ref(false)
const clock = ref(Date.now())
const enabled = computed(() => props.tool !== 'off')
const regularStrokes = computed(() => props.strokes.filter((stroke) => !stroke.glow && stroke.id !== draftStrokeId.value))
const glowIntervalMs = 48
type CurvePiece = { at: number; start: Point; control?: Point; end: Point }
type GlowSegment = { id: string; path: string; color: string; width: number; opacity: number }
function midpoint(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
}
function curvePieces(points: Point[]): CurvePiece[] {
  if (points.length < 2) return []
  if (points.length === 2) return [{ at: points[1]!.at ?? clock.value, start: points[0]!, end: points[1]! }]

  return Array.from({ length: points.length - 2 }, (_, offset) => {
    const index = offset + 1
    const control = points[index]!
    return {
      at: control.at ?? clock.value,
      start: index === 1 ? points[0]! : midpoint(points[index - 1]!, control),
      control,
      end: index === points.length - 2 ? points.at(-1)! : midpoint(control, points[index + 1]!),
    }
  })
}
function curveCommand(piece: CurvePiece): string {
  return piece.control
    ? ` Q${piece.control.x},${piece.control.y} ${piece.end.x},${piece.end.y}`
    : ` L${piece.end.x},${piece.end.y}`
}
function curvePath(pieces: CurvePiece[]): string {
  if (!pieces.length) return ''
  return `M${pieces[0]!.start.x},${pieces[0]!.start.y}${pieces.map(curveCommand).join('')}`
}
function fadeOpacity(at: number, fadeAfterMs: number): number {
  const fadeStarted = at + fadeAfterMs
  return Math.max(0, Math.min(1, 1 - Math.max(0, clock.value - fadeStarted) / presentationInkFadeDurationMs))
}
function segments(id: string, points: Point[], color: string, width: number, fadeAfterMs: number): GlowSegment[] {
  const chunks: Array<{ at: number; pieces: CurvePiece[] }> = []
  for (const piece of curvePieces(points)) {
    const bucket = Math.floor(piece.at / glowIntervalMs)
    const current = chunks.at(-1)
    if (!current || Math.floor(current.at / glowIntervalMs) !== bucket)
      chunks.push({ at: piece.at, pieces: [piece] })
    else current.pieces.push(piece)
  }
  return chunks.flatMap((chunk, index) => {
    const opacity = fadeOpacity(chunk.at, fadeAfterMs)
    return opacity > 0 ? [{ id: `${id}-${index}`, path: curvePath(chunk.pieces), color, width, opacity }] : []
  })
}
const glowSegments = computed(() => {
  clock.value
  return props.strokes.filter((stroke) => stroke.glow && stroke.id !== draftStrokeId.value).flatMap((stroke) => segments(stroke.id, stroke.points, stroke.color, stroke.width, stroke.fadeAfterMs ?? 3000))
})
const draftGlowSegments = computed(() => {
  clock.value
  return props.tool === 'highlighter' ? segments('draft', draft.value, props.color, props.width, props.fadeAfterMs) : []
})
let clockTimer: ReturnType<typeof setInterval> | undefined
let inkFrame: number | undefined
onMounted(() => { clockTimer = setInterval(() => (clock.value = Date.now()), 32) })
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (inkFrame !== undefined) cancelAnimationFrame(inkFrame)
})
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
  draftStrokeId.value = crypto.randomUUID()
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
  if (next) {
    draft.value = [...draft.value, next]
    scheduleInkSync()
  }
}
function publishDraft(): void {
  if (draftStrokeId.value && draft.value.length > 1)
    emit('ink', draftStrokeId.value, draft.value.map((point) => ({ ...point })))
}
function scheduleInkSync(): void {
  if (inkFrame !== undefined) return
  inkFrame = requestAnimationFrame(() => {
    inkFrame = undefined
    publishDraft()
  })
}
function finish(): void {
  erasing.value = false
  if (inkFrame !== undefined) {
    cancelAnimationFrame(inkFrame)
    inkFrame = undefined
  }
  publishDraft()
  draft.value = []
  draftStrokeId.value = undefined
}
function smoothPath(points: Point[]): string {
  if (points.length === 1) return `M${points[0]!.x},${points[0]!.y}`
  return curvePath(curvePieces(points))
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
    <path
      v-for="stroke in regularStrokes"
      :key="stroke.id"
      :d="smoothPath(stroke.points)"
      fill="none"
      :stroke="stroke.color"
      :stroke-width="stroke.width"
      stroke-opacity="1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <g
      v-for="segment in glowSegments"
      :key="segment.id"
      class="presentation-ink-glow-segment"
    >
      <path class="presentation-ink-glow-aura" :d="segment.path" fill="none" :stroke="segment.color" :stroke-width="segment.width * 1.9" :stroke-opacity="segment.opacity * .1" stroke-linecap="butt" stroke-linejoin="round" />
      <path class="presentation-ink-glow-halo" :d="segment.path" fill="none" :stroke="segment.color" :stroke-width="segment.width * 1.35" :stroke-opacity="segment.opacity * .16" stroke-linecap="butt" stroke-linejoin="round" />
      <path class="presentation-ink-glow-core" :d="segment.path" fill="none" :stroke="segment.color" :stroke-width="segment.width * .84" :stroke-opacity="segment.opacity * .76" stroke-linecap="butt" stroke-linejoin="round" />
      <path class="presentation-ink-glow-sheen" :d="segment.path" fill="none" stroke="#fff" :stroke-width="segment.width * .2" :stroke-opacity="segment.opacity * .2" stroke-linecap="butt" stroke-linejoin="round" />
    </g>
    <path
      v-if="draft.length && tool !== 'highlighter'"
      :d="smoothPath(draft)"
      fill="none"
      :stroke="color"
      :stroke-width="width"
      stroke-opacity="1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <g
      v-for="segment in draftGlowSegments"
      :key="segment.id"
      class="presentation-ink-glow-segment"
    >
      <path class="presentation-ink-glow-aura" :d="segment.path" fill="none" :stroke="segment.color" :stroke-width="segment.width * 1.9" :stroke-opacity="segment.opacity * .1" stroke-linecap="butt" stroke-linejoin="round" />
      <path class="presentation-ink-glow-halo" :d="segment.path" fill="none" :stroke="segment.color" :stroke-width="segment.width * 1.35" :stroke-opacity="segment.opacity * .16" stroke-linecap="butt" stroke-linejoin="round" />
      <path class="presentation-ink-glow-core" :d="segment.path" fill="none" :stroke="segment.color" :stroke-width="segment.width * .84" :stroke-opacity="segment.opacity * .76" stroke-linecap="butt" stroke-linejoin="round" />
      <path class="presentation-ink-glow-sheen" :d="segment.path" fill="none" stroke="#fff" :stroke-width="segment.width * .2" :stroke-opacity="segment.opacity * .2" stroke-linecap="butt" stroke-linejoin="round" />
    </g>
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
.presentation-ink-glow-aura,
.presentation-ink-glow-halo,
.presentation-ink-glow-core,
.presentation-ink-glow-sheen { transition: stroke-opacity 80ms linear; }
</style>
