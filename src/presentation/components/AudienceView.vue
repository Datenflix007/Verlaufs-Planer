<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import type { Presentation, WorkshopPlan } from "../../domain/types";
import { SqlitePlanRepository } from "../../repositories/SqlitePlanRepository";
import { orderedSlides } from "../presentation";
import { applyMindmapUpdate } from "../liveMindmap";
import { tryPresentationFullscreen } from "../fullscreen";
import {
  isSlideChange,
  openPresentationChannel,
  type PresentationInkStroke,
  type PresentationChannelEvent,
} from "../presenterChannel";
import SlideCanvas from "./SlideCanvas.vue";
import PresentationInkOverlay from "./PresentationInkOverlay.vue";

const route = useRoute();
const plan = ref<WorkshopPlan>();
const currentSlideId = ref<string>();
const error = ref("");
const fullscreen = ref(false);
const ended = ref(false);
const audienceZoom = ref(1);
const inkStrokes = ref<PresentationInkStroke[]>([]);
const inkTimers = new Map<string, ReturnType<typeof setTimeout>>();
let channel: BroadcastChannel | undefined;
function send(event: PresentationChannelEvent): void {
  channel?.postMessage(event);
}
async function requestFullscreen(): Promise<void> {
  const granted = await tryPresentationFullscreen(document);
  if (!granted) {
    fullscreen.value = false;
    send({ type: "FULLSCREEN_STATUS", active: false });
  }
}
function fullscreenChanged(): void {
  fullscreen.value = Boolean(document.fullscreenElement);
  send({ type: "FULLSCREEN_STATUS", active: fullscreen.value });
}
function windowClosing(): void {
  send({ type: "AUDIENCE_CLOSED" });
}
function clearInkTimers(): void {
  for (const timer of inkTimers.values()) clearTimeout(timer);
  inkTimers.clear();
}
const presentation = computed<Presentation | undefined>(() =>
  plan.value?.presentation?.id === String(route.params.presentationId)
    ? plan.value.presentation
    : undefined,
);
const slide = computed(
  () =>
    presentation.value &&
    orderedSlides(presentation.value).find(
      (item) => item.id === currentSlideId.value,
    ),
);
onMounted(async () => {
  document.addEventListener("fullscreenchange", fullscreenChanged);
  window.addEventListener("beforeunload", windowClosing);
  void requestFullscreen();
  const planId =
    typeof route.query.planId === "string" ? route.query.planId : undefined;
  if (!planId) {
    error.value = "Die Plan-ID für diese Präsentation fehlt.";
    return;
  }
  try {
    plan.value = await new SqlitePlanRepository().get(planId);
    if (!presentation.value) {
      error.value = "Die Präsentation wurde nicht gefunden.";
      return;
    }
    const savedId = localStorage.getItem(
      `verlaufsplaner-presentation-current-${presentation.value.id}`,
    );
    currentSlideId.value = orderedSlides(presentation.value).some(
      (item) => item.id === savedId,
    )
      ? savedId!
      : orderedSlides(presentation.value)[0]?.id;
    channel = openPresentationChannel(presentation.value.id);
    channel.onmessage = (message: MessageEvent<PresentationChannelEvent>) => {
      const event = message.data;
      if (
        isSlideChange(event) &&
        presentation.value?.slides.some((item) => item.id === event.slideId)
      ) {
        currentSlideId.value = event.slideId;
        audienceZoom.value = 1;
        inkStrokes.value = [];
        clearInkTimers();
      }
      if (event.type === "PRESENTATION_END") ended.value = true;
      if (event.type === "FULLSCREEN_REQUEST") void requestFullscreen();
      if (event.type === "MINDMAP_UPDATED" && presentation.value)
        applyMindmapUpdate(presentation.value, event);
      if (event.type === 'PRESENTATION_VIEW_STATE' && event.slideId === currentSlideId.value)
        audienceZoom.value = event.audienceZoom ? event.zoom : 1;
      if (event.type === 'PRESENTATION_INK_STROKE' && event.stroke.slideId === currentSlideId.value) {
        inkStrokes.value = [...inkStrokes.value.filter((stroke) => stroke.id !== event.stroke.id), event.stroke];
        if (event.stroke.expiresAt) {
          const delay = Math.max(0, event.stroke.expiresAt - Date.now());
          inkTimers.set(event.stroke.id, setTimeout(() => {
            inkStrokes.value = inkStrokes.value.filter((stroke) => stroke.id !== event.stroke.id);
            inkTimers.delete(event.stroke.id);
          }, delay));
        }
      }
      if (event.type === 'PRESENTATION_INK_REMOVE' && event.slideId === currentSlideId.value) {
        inkStrokes.value = inkStrokes.value.filter((stroke) => stroke.id !== event.strokeId);
        const timer = inkTimers.get(event.strokeId);
        if (timer) clearTimeout(timer);
        inkTimers.delete(event.strokeId);
      }
    };
    channel.postMessage({
      type: "PRESENTATION_REQUEST_STATE",
    } satisfies PresentationChannelEvent);
    send({ type: "AUDIENCE_READY" });
    send({
      type: "FULLSCREEN_STATUS",
      active: Boolean(document.fullscreenElement),
    });
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : "Die Präsentation konnte nicht geladen werden.";
  }
});
onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", fullscreenChanged);
  window.removeEventListener("beforeunload", windowClosing);
  clearInkTimers();
  channel?.close();
});
</script>

<template>
  <main v-if="ended" class="audience-error">Präsentation beendet.</main>
  <main v-else-if="slide && presentation" class="audience-view">
    <div class="audience-stage">
      <SlideCanvas
        :key="slide.id"
        :slide="slide"
        :theme-id="presentation.themeId"
        :zoom="audienceZoom"
        readonly
        :class="`transition-${slide.transition.type}`"
        :style="{ animationDuration: `${slide.transition.duration}ms` }"
      />
      <PresentationInkOverlay :strokes="inkStrokes" :zoom="audienceZoom" />
    </div>
    <div v-if="!fullscreen" class="fullscreen-hint">
      <span>Für Präsentation Vollbild aktivieren</span
      ><button type="button" @click="requestFullscreen">
        Vollbild starten
      </button>
    </div>
  </main>
  <main v-else class="audience-error">
    {{ error || "Präsentation wird geladen …" }}
  </main>
</template>

<style scoped>
.audience-view {
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #10191b;
}
.audience-stage {
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
.audience-stage :deep(.slide-canvas) {
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
  box-shadow: none;
}
.fullscreen-hint {
  position: fixed;
  z-index: 5;
  top: 10px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.35rem 0.55rem;
  transform: translateX(-50%);
  color: #d7f4f0;
  background: #102b30d9;
  border: 1px solid #3f7175;
  border-radius: 5px;
  font-size: 0.75rem;
}
.fullscreen-hint button {
  padding: 0.2rem 0.45rem;
  font-size: 0.75rem;
}
.audience-view :deep(.transition-fade) {
  animation: fade-in ease both;
}
.audience-view :deep(.transition-slide) {
  animation: slide-in ease both;
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(7%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.audience-error {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  color: #f1fbfa;
  background: #10191b;
  text-align: center;
}
</style>
