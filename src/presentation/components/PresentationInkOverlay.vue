<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PresentationInkStroke } from '../presenterChannel'

type Point = PresentationInkStroke['points'][number]

const props = withDefaults(defineProps<{
  strokes: PresentationInkStroke[]
  tool?: 'off' | 'pen' | 'highlighter'
  color?: string
  width?: number
  zoom?: number
}>(), { tool: 'off', color: '#e53935', width: 5, zoom: 1 })
const emit = defineEmits<{ draw: [points: Point[]] }>()
const svg = ref<SVGSVGElement>()
const draft = ref<Point[]>([])
const enabled = computed(() => props.tool !== 'off')
function point(event: PointerEvent): Point | undefined {
  const rect = svg.value?.getBoundingClientRect()
  if (!rect?.width || !rect.height) return
  return {
    x: Math.max(0, Math.min(1280, ((((event.clientX - rect.left) / rect.width) * 1280 - 640) / props.zoom) + 640)),
    y: Math.max(0, Math.min(720, ((((event.clientY - rect.top) / rect.height) * 720 - 360) / props.zoom) + 360)),
  }
}
function begin(event: PointerEvent): void {
  if (!enabled.value) return
  event.preventDefault()
  const first = point(event)
  if (!first) return
  draft.value = [first]
  svg.value?.setPointerCapture(event.pointerId)
}
function move(event: PointerEvent): void {
  if (!draft.value.length) return
  const next = point(event)
  if (next) draft.value = [...draft.value, next]
}
function finish(): void {
  if (draft.value.length > 1) emit('draw', draft.value)
  draft.value = []
}
function path(points: Point[]): string {
  return points.map((item, index) => `${index ? 'L' : 'M'}${item.x},${item.y}`).join(' ')
}
</script>

<template>
  <svg
    ref="svg"
    class="presentation-ink-overlay"
    :class="{ drawing: enabled }"
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
      v-for="stroke in strokes"
      :key="stroke.id"
      :d="path(stroke.points)"
      fill="none"
      :stroke="stroke.color"
      :stroke-width="stroke.width"
      :stroke-opacity="stroke.glow ? 0.9 : 1"
      :filter="stroke.glow ? 'url(#presentation-ink-glow)' : undefined"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      v-if="draft.length"
      :d="path(draft)"
      fill="none"
      :stroke="color"
      :stroke-width="width"
      :stroke-opacity="tool === 'highlighter' ? 0.9 : 1"
      :filter="tool === 'highlighter' ? 'url(#presentation-ink-glow)' : undefined"
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
</style>
