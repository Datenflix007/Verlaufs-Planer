<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  PresentationElement,
  PresentationSlide,
} from "../../domain/types";
import { presentationTheme } from "../presentation";
import MindmapWidget from "./MindmapWidget.vue";

const props = withDefaults(
  defineProps<{
    slide: PresentationSlide;
    themeId: import("../../domain/types").PresentationThemeId;
    selectedElementId?: string;
    editingMindmapId?: string;
    selectedMindmapNodeId?: string;
    focusMindmapRoot?: boolean;
    showMindmapEditButton?: boolean;
    presenterControls?: boolean;
    zoom?: number;
    audienceZoom?: boolean;
    readonly?: boolean;
  }>(),
  { readonly: false },
);
const emit = defineEmits<{
  select: [id?: string];
  changed: [];
  beginChange: [];
  context: [id: string, event: MouseEvent];
  mindmapEdit: [id: string];
  mindmapFinish: [];
  mindmapNodeSelect: [id?: string];
  mindmapImageRequest: [nodeId: string];
  zoomIn: [];
  zoomOut: [];
  audienceZoomToggle: [];
  undo: [];
  redo: [];
}>();
const canvas = ref<HTMLElement>();
const drag = ref<{
  id: string;
  offsetX: number;
  offsetY: number;
  handle?: string;
  original: Pick<PresentationElement, "x" | "y" | "width" | "height">;
}>();
const editingId = ref<string>();
const theme = computed(() => presentationTheme(props.themeId));
const elements = computed(() =>
  [...props.slide.elements].sort((a, b) => a.zIndex - b.zIndex),
);
function styleFor(element: PresentationElement) {
  const shape = element.content.shape;
  const line = shape === "line" || shape === "arrow";
  return {
    left: `${element.x / 12.8}%`,
    top: `${element.y / 7.2}%`,
    width: `${element.width / 12.8}%`,
    height: `${element.height / 7.2}%`,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: element.zIndex,
    color: element.style.color ?? theme.value.text,
    backgroundColor:
      element.type === "shape" && !line
        ? (element.style.backgroundColor ?? theme.value.primary)
        : undefined,
    borderRadius: `${element.style.borderRadius ?? (shape === "ellipse" ? 999 : 5)}px`,
    opacity: element.style.opacity ?? 1,
    fontSize: `${element.style.fontSize ?? 42}px`,
    fontFamily: element.style.fontFamily ?? theme.value.bodyFont,
    fontWeight: element.style.fontWeight ?? 400,
    fontStyle: element.style.fontStyle ?? "normal",
    textDecoration: element.style.textDecoration ?? "none",
    textAlign: element.style.textAlign ?? "left",
    lineHeight: element.style.lineHeight ?? 1.18,
    letterSpacing: `${element.style.letterSpacing ?? 0}px`,
    "--stroke": element.style.stroke ?? theme.value.primary,
    "--stroke-width": `${element.style.strokeWidth ?? 3}px`,
    "--object-fit": element.style.objectFit ?? "cover",
  };
}
function coordinates(
  event: PointerEvent,
): { x: number; y: number } | undefined {
  const rect = canvas.value?.getBoundingClientRect();
  if (!rect) return;
  return {
    x: ((event.clientX - rect.left) / rect.width) * 1280,
    y: ((event.clientY - rect.top) / rect.height) * 720,
  };
}
function start(
  element: PresentationElement,
  event: PointerEvent,
  handle?: string,
): void {
  if (
    props.readonly ||
    element.style.locked ||
    editingId.value ||
    props.editingMindmapId === element.id
  )
    return;
  event.stopPropagation();
  const point = coordinates(event);
  if (!point) return;
  emit("beginChange");
  drag.value = {
    id: element.id,
    offsetX: point.x - element.x,
    offsetY: point.y - element.y,
    handle,
    original: {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    },
  };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  emit("select", element.id);
}
function move(event: PointerEvent): void {
  const state = drag.value;
  const point = coordinates(event);
  if (!state || !point) return;
  const element = props.slide.elements.find((item) => item.id === state.id);
  if (!element) return;
  if (!state.handle) {
    element.x = Math.max(
      0,
      Math.min(1280 - element.width, point.x - state.offsetX),
    );
    element.y = Math.max(
      0,
      Math.min(720 - element.height, point.y - state.offsetY),
    );
  } else {
    const { x, y, width, height } = state.original;
    const direction = state.handle;
    const right = x + width;
    const bottom = y + height;
    if (direction.includes("e")) element.width = Math.max(40, point.x - x);
    if (direction.includes("s")) element.height = Math.max(24, point.y - y);
    if (direction.includes("w")) {
      element.x = Math.min(point.x, right - 40);
      element.width = Math.max(40, right - point.x);
    }
    if (direction.includes("n")) {
      element.y = Math.min(point.y, bottom - 24);
      element.height = Math.max(24, bottom - point.y);
    }
  }
  element.updatedAt = new Date().toISOString();
  emit("changed");
}
function end(): void {
  drag.value = undefined;
}
function startEditing(element: PresentationElement, event: MouseEvent): void {
  if (props.readonly) return;
  if (element.type === "mindmap") {
    event.stopPropagation();
    emit("select", element.id);
    emit("mindmapEdit", element.id);
    return;
  }
  if (element.type !== "text") return;
  event.stopPropagation();
  emit("select", element.id);
  editingId.value = element.id;
}
function finishEditing(element: PresentationElement): void {
  editingId.value = undefined;
  element.updatedAt = new Date().toISOString();
  emit("changed");
}
function keydown(element: PresentationElement, event: KeyboardEvent): void {
  if (event.key === "Escape") {
    editingId.value = undefined;
    (event.target as HTMLElement).blur();
  }
  if (event.key === "Enter" && event.ctrlKey) {
    event.preventDefault();
    finishEditing(element);
    (event.target as HTMLElement).blur();
  }
}
</script>

<template>
  <div
    ref="canvas"
    class="slide-canvas"
    :class="{ readonly }"
    :style="{
      '--slide-background': slide.background.color || theme.background,
      '--slide-primary': theme.primary,
      '--slide-text': theme.text,
      '--slide-image': slide.background.imageUrl
        ? `url(${slide.background.imageUrl})`
        : 'none',
      '--slide-image-fit': slide.background.imageFit || 'cover',
    }"
    @pointermove="move"
    @pointerup="end"
    @pointerleave="end"
    @pointerdown.self="emit('select')"
  >
    <div class="slide-content" :style="{ transform: `scale(${zoom ?? 1})` }">
    <div class="slide-background-image" />
    <div v-if="!slide.elements.length" class="empty-slide">
      <strong>{{
        slide.layoutType === "blank" ? "Leere Folie" : "Titel hinzufügen"
      }}</strong
      ><span>{{
        slide.layoutType === "blank"
          ? "Elemente über die Werkzeugleiste einfügen"
          : "Wählen Sie ein Layout oder fügen Sie Text hinzu."
      }}</span>
    </div>
    <article
      v-for="element in elements"
      :key="element.id"
      class="slide-element"
      :class="[
        element.type,
        element.content.shape,
        {
          selected: selectedElementId === element.id,
          locked: element.style.locked,
          editing: editingId === element.id,
          'mindmap-editing': editingMindmapId === element.id,
        },
      ]"
      :style="styleFor(element)"
      @pointerdown="start(element, $event)"
      @dblclick="startEditing(element, $event)"
      @contextmenu.prevent="emit('context', element.id, $event)"
    >
      <template v-if="element.type === 'mindmap' && element.content.mindmap">
        <MindmapWidget
          :mindmap="element.content.mindmap"
          :editing="!readonly && editingMindmapId === element.id"
          :selected-node-id="selectedMindmapNodeId"
          :focus-root="focusMindmapRoot"
          @select="emit('mindmapNodeSelect', $event)"
          @begin-change="emit('beginChange')"
          @changed="emit('changed')"
          @edit-request="emit('mindmapEdit', element.id)"
          @finish="emit('mindmapFinish')"
          @image-request="emit('mindmapImageRequest', $event)"
          @undo="emit('undo')"
          @redo="emit('redo')"
        />
        <button
          v-if="
            !readonly &&
            selectedElementId === element.id &&
            editingMindmapId !== element.id
          "
          type="button"
          class="mindmap-edit-button"
          @pointerdown.stop
          @click.stop="emit('mindmapEdit', element.id)"
        >
          Mindmap bearbeiten
        </button>
      </template>
      <template v-else-if="element.type === 'image'"
        ><img
          v-if="element.content.src"
          :src="element.content.src"
          alt=""
        /><span v-else class="image-placeholder"
          >Bild hinzufügen</span
        ></template
      >
      <template v-else-if="element.type === 'icon'"
        ><span class="icon-content">{{
          element.content.icon || "★"
        }}</span></template
      >
      <template v-else-if="element.type === 'text'"
        ><div
          :contenteditable="editingId === element.id"
          spellcheck="true"
          @input="
            element.content.text = ($event.target as HTMLElement).innerText;
            emit('changed');
          "
          @blur="finishEditing(element)"
          @keydown="keydown(element, $event)"
        >
          {{ element.content.text }}
        </div></template
      >
      <template v-else
        ><span v-if="element.content.shape === 'arrow'" class="arrow-tip"
      /></template>
      <template
        v-if="
          selectedElementId === element.id &&
          !readonly &&
          !editingId &&
          editingMindmapId !== element.id &&
          !element.style.locked
        "
        ><button
          v-for="handle in ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']"
          :key="handle"
          type="button"
          class="resize-handle"
          :class="handle"
          :aria-label="`Größe ändern (${handle})`"
          @pointerdown.stop="start(element, $event, handle)"
      /></template>
    </article>
    </div>
    <div v-if="presenterControls" class="presenter-slide-actions" @pointerdown.stop>
      <button
        v-if="showMindmapEditButton"
        type="button"
        aria-label="Mindmap bearbeiten"
        title="Mindmap bearbeiten"
        @click.stop="emit('mindmapEdit', slide.elements.find((element) => element.type === 'mindmap')?.id ?? '')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 4 4 4L9 19l-5 1 1-5L16 4zM14.5 5.5l4 4" /></svg>
      </button>
      <button
        type="button"
        :class="{ active: audienceZoom }"
        :aria-label="audienceZoom ? 'Zoom im Plenum ausschalten' : 'Zoom im Plenum einschalten'"
        :aria-pressed="audienceZoom ?? false"
        :title="audienceZoom ? 'Zoom im Plenum ausschalten' : 'Zoom im Plenum einschalten'"
        @click.stop="emit('audienceZoomToggle')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      </button>
      <span class="presenter-zoom-level">{{ Math.round((zoom ?? 1) * 100) }}%</span>
      <button type="button" aria-label="Referentenansicht vergrößern" title="Referentenansicht vergrößern" @click.stop="emit('zoomIn')">+</button>
      <button type="button" aria-label="Referentenansicht verkleinern" title="Referentenansicht verkleinern" @click.stop="emit('zoomOut')">−</button>
    </div>
  </div>
</template>

<style scoped>
.slide-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: var(--slide-background);
  color: var(--slide-text);
  box-shadow: 0 22px 50px #0714178c;
  user-select: none;
}
.slide-content {
  position: absolute;
  inset: 0;
  transform-origin: center;
}
.slide-background-image {
  position: absolute;
  inset: 0;
  background-image: var(--slide-image);
  background-size: var(--slide-image-fit);
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.4;
  pointer-events: none;
}
.empty-slide {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.6rem;
  color: color-mix(in srgb, var(--slide-text) 65%, transparent);
  text-align: center;
}
.empty-slide strong {
  font-size: clamp(1.2rem, 3vw, 2.2rem);
}
.empty-slide span {
  font-size: clamp(0.75rem, 1.4vw, 1rem);
}
.slide-element {
  position: absolute;
  z-index: 2;
  display: grid;
  align-content: center;
  overflow: visible;
  cursor: move;
  white-space: pre-wrap;
  border: 0 solid transparent;
}
.slide-element.locked {
  cursor: not-allowed;
}
.slide-element.image {
  overflow: hidden;
  background: #dbe7e6;
}
.slide-element.mindmap {
  display: block;
  overflow: hidden;
  background: #f7fbfb;
}
.slide-element.mindmap-editing {
  overflow: visible;
  z-index: 20 !important;
  cursor: default;
}
.mindmap-edit-button {
  position: absolute;
  z-index: 5;
  top: 5px;
  right: 5px;
  padding: 4px 7px;
  color: #edffff;
  background: #11656c;
  border: 1px solid #5ee0d9;
  border-radius: 4px;
  font-size: 12px;
}
.presenter-slide-actions {
  position: absolute;
  z-index: 40;
  top: 5px;
  right: 5px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  background: #173238c9;
  border: 1px solid #63a5a3;
  border-radius: 5px;
}
.presenter-slide-actions button {
  display: grid;
  width: 30px;
  aspect-ratio: 1;
  place-items: center;
  padding: 0;
  color: #edffff;
  background: #11656c;
  border: 1px solid #5ee0d9;
  border-radius: 4px;
  font-size: 18px;
  line-height: 1;
}
.presenter-slide-actions button.active { color: #15343a; background: #80eee1; }
.presenter-slide-actions svg { width: 19px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
.presenter-zoom-level { padding: 0 3px; color: #edffff; font-size: 11px; font-weight: 700; }
.slide-element.image img {
  width: 100%;
  height: 100%;
  object-fit: var(--object-fit);
}
.image-placeholder {
  display: grid;
  height: 100%;
  place-items: center;
  border: 2px dashed color-mix(in srgb, var(--slide-primary) 55%, transparent);
  color: var(--slide-primary);
  background: #fff8;
  font-size: 16px;
}
.slide-element.icon {
  place-items: center;
  font-size: clamp(24px, 5vw, 82px);
}
.icon-content {
  line-height: 1;
}
.slide-element.line,
.slide-element.arrow {
  align-content: center;
  height: max(var(--stroke-width), 4px) !important;
  background: var(--stroke) !important;
  border-radius: 999px !important;
}
.arrow-tip {
  position: absolute;
  right: -1px;
  top: 50%;
  width: 18px;
  height: 18px;
  border-top: var(--stroke-width) solid var(--stroke);
  border-right: var(--stroke-width) solid var(--stroke);
  transform: translateY(-50%) rotate(45deg);
}
.slide-element.selected {
  outline: 2px solid #18d5d4;
  outline-offset: 3px;
  box-shadow: 0 0 0 1px #ffffff66;
}
.slide-element.editing {
  cursor: text;
  user-select: text;
}
.slide-element.editing div {
  min-height: 100%;
  outline: 0;
  cursor: text;
  user-select: text;
}
.readonly .slide-element {
  cursor: default;
}
.resize-handle {
  position: absolute;
  z-index: 4;
  width: 11px;
  height: 11px;
  padding: 0;
  border: 2px solid white;
  border-radius: 2px;
  background: #13bfc5;
}
.resize-handle.nw {
  left: -7px;
  top: -7px;
}
.resize-handle.n {
  left: calc(50% - 5px);
  top: -7px;
}
.resize-handle.ne {
  right: -7px;
  top: -7px;
}
.resize-handle.e {
  right: -7px;
  top: calc(50% - 5px);
}
.resize-handle.se {
  right: -7px;
  bottom: -7px;
}
.resize-handle.s {
  bottom: -7px;
  left: calc(50% - 5px);
}
.resize-handle.sw {
  left: -7px;
  bottom: -7px;
}
.resize-handle.w {
  left: -7px;
  top: calc(50% - 5px);
}
</style>
