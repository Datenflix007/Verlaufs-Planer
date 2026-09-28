<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { Presentation, PresentationElement, WorkshopPlan } from "../../domain/types";
import {
  audienceWindowOpen,
  automaticScreen,
  externalScreens,
  placeAudience,
  reserveAudience,
  sameScreen,
  screenConnected,
  screenLabel,
  takeReservedAudience,
  type PreparedAudience,
  type PresentationScreen,
  type PresentationScreenDetails,
} from "../audienceWindow";
import { nextSlide, orderedSlides } from "../presentation";
import { mindmapUpdate } from "../liveMindmap";
import {
  isSlideChange,
  openPresentationChannel,
  type PresentationChannelEvent,
} from "../presenterChannel";
import SlideCanvas from "./SlideCanvas.vue";
import MindmapWidget from "./MindmapWidget.vue";
import ImageSourcePicker from "./ImageSourcePicker.vue";

const props = defineProps<{
  plan: WorkshopPlan;
  presentation: Presentation;
  initialSlideId?: string;
}>();
const emit = defineEmits<{ close: []; changed: [] }>();
const router = useRouter();
const slides = computed(() => orderedSlides(props.presentation));
const currentSlideId = ref(
  props.initialSlideId &&
    slides.value.some((slide) => slide.id === props.initialSlideId)
    ? props.initialSlideId
    : slides.value[0]?.id,
);
const current = computed(() =>
  slides.value.find((slide) => slide.id === currentSlideId.value),
);
const upcoming = computed(() =>
  currentSlideId.value
    ? nextSlide(props.presentation, currentSlideId.value)
    : undefined,
);
const currentMindmaps = computed(() => current.value?.elements.filter((element) => element.type === 'mindmap' && element.content.mindmap) ?? []);
const selectedMindmapId = ref<string>();
const selectedNodeId = ref<string>();
const imagePickerOpen = ref(false);
const liveMindmap = computed<PresentationElement | undefined>(() => currentMindmaps.value.find(element => element.id === selectedMindmapId.value) ?? currentMindmaps.value[0]);
const liveNode = computed(() => liveMindmap.value?.content.mindmap?.nodes.find(node => node.id === (selectedNodeId.value ?? liveMindmap.value?.content.mindmap?.rootNodeId)));
const materialImages = computed(() => props.plan.materials.filter(material => material.resourceType === 'file' && /^(data:image|https?:\/\/.*\.(png|jpe?g|gif|webp|svg))/i.test(material.description ?? '')));
function liveChanged(): void {
  const element = liveMindmap.value;
  if (!current.value || !element?.content.mindmap) return;
  current.value.updatedAt = new Date().toISOString();
  props.presentation.updatedAt = current.value.updatedAt;
  send(mindmapUpdate(current.value.id, element.id, element.content.mindmap));
  emit('changed');
}
function setNodeImage(source: string): void {
  if (!liveNode.value) return;
  liveNode.value.image = { source, fit: 'contain' };
  liveChanged();
}
function syncMindmaps(): void {
  for (const slide of slides.value)
    for (const element of slide.elements)
      if (element.type === 'mindmap' && element.content.mindmap)
        send(mindmapUpdate(slide.id, element.id, element.content.mindmap));
}
const elapsed = ref(0);
let channel: BroadcastChannel | undefined;
let clock: ReturnType<typeof setInterval> | undefined;
let audiencePoll: ReturnType<typeof setInterval> | undefined;
let audienceWindow: Window | null = null;
let screenDetails: PresentationScreenDetails | undefined;
let chosenScreen: PresentationScreen | undefined;
const screenChoices = ref<PresentationScreen[]>([]);
const screenStatus = ref<
  "opening" | "connected" | "blocked" | "closed" | "disconnected"
>("opening");
const screenMessage = ref("Präsentationsbildschirm wird geöffnet …");
const fullscreen = ref(false);
const screenSize = ref("");
function persist(): void {
  if (currentSlideId.value)
    localStorage.setItem(
      `verlaufsplaner-presentation-current-${props.presentation.id}`,
      currentSlideId.value,
    );
}
function send(event: PresentationChannelEvent): void {
  channel?.postMessage(event);
}
function goToSlide(slideId?: string): void {
  if (!slideId || !slides.value.some((slide) => slide.id === slideId)) return;
  currentSlideId.value = slideId;
  persist();
  send({ type: "SLIDE_CHANGE", slideId });
}
function next(): void {
  goToSlide(upcoming.value?.id);
}
function previous(): void {
  const index = slides.value.findIndex(
    (slide) => slide.id === currentSlideId.value,
  );
  goToSlide(slides.value[index - 1]?.id);
}
function audienceUrl(): string {
  return new URL(
    router.resolve({
      name: "presentation-audience",
      params: { presentationId: props.presentation.id },
      query: { planId: props.plan.id },
    }).href,
    window.location.origin,
  ).href;
}
function screensChanged(): void {
  if (!chosenScreen || !screenDetails) return;
  if (!screenConnected(screenDetails, chosenScreen)) {
    screenStatus.value = "disconnected";
    screenMessage.value =
      "Präsentationsbildschirm wurde getrennt. Fenster neu öffnen oder Bildschirm auswählen.";
    fullscreen.value = false;
  }
}
function launchAudience(screen?: PresentationScreen): void {
  if (!audienceWindowOpen(audienceWindow)) {
    screenStatus.value = "closed";
    screenMessage.value = "Präsentationsfenster ist geschlossen.";
    return;
  }
  chosenScreen = screen;
  screenChoices.value = [];
  const positioned = screen ? placeAudience(audienceWindow, screen) : false;
  screenSize.value = screen ? `${screen.width} × ${screen.height}` : "";
  audienceWindow.location.href = audienceUrl();
  audienceWindow.focus();
  screenStatus.value = "opening";
  screenMessage.value = screen
    ? positioned
      ? "Präsentationsbildschirm wird verbunden …"
      : "Fenster geöffnet. Bitte bei Bedarf auf den Beamer verschieben."
    : "Fenster geöffnet. Falls nötig auf den Beamer verschieben.";
  if (currentSlideId.value)
    send({ type: "PRESENTATION_START", slideId: currentSlideId.value });
}
async function initializeAudience(
  reservation?: PreparedAudience,
): Promise<void> {
  if (!reservation) return;
  audienceWindow = reservation.popup;
  fullscreen.value = false;
  if (!audienceWindow) {
    screenStatus.value = "blocked";
    screenMessage.value =
      "Pop-up blockiert. Bitte für diese Seite erlauben und Fenster neu öffnen.";
    return;
  }
  const discovery = await reservation.discovery;
  screenDetails?.removeEventListener?.("screenschange", screensChanged);
  screenDetails = discovery.details;
  screenDetails?.addEventListener?.("screenschange", screensChanged);
  if (externalScreens(discovery).length > 1) {
    screenChoices.value = discovery.screens;
    screenMessage.value = "Präsentationsbildschirm auswählen.";
    return;
  }
  launchAudience(automaticScreen(discovery));
}
function openAudience(): void {
  void initializeAudience(reserveAudience(window, props.presentation.id));
}
function chooseScreen(screen: PresentationScreen): void {
  launchAudience(screen);
}
function requestAudienceFullscreen(): void {
  if (audienceWindowOpen(audienceWindow)) {
    audienceWindow!.focus();
    send({ type: "FULLSCREEN_REQUEST" });
  } else openAudience();
}
function keydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.matches('input, textarea, select, [contenteditable="true"]'))
    return;
  if (
    event.key === "ArrowRight" ||
    event.key === " " ||
    event.key === "PageDown"
  ) {
    event.preventDefault();
    next();
  } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    previous();
  } else if (event.key === "Home") {
    event.preventDefault();
    goToSlide(slides.value[0]?.id);
  } else if (event.key === "End") {
    event.preventDefault();
    goToSlide(slides.value.at(-1)?.id);
  }
}
onMounted(() => {
  channel = openPresentationChannel(props.presentation.id);
  channel.onmessage = (message: MessageEvent<PresentationChannelEvent>) => {
    if (
      message.data.type === "PRESENTATION_REQUEST_STATE" &&
      currentSlideId.value
    )
      send({ type: "PRESENTATION_STATE", slideId: currentSlideId.value });
    if (message.data.type === "AUDIENCE_READY") {
      screenStatus.value = "connected";
      screenMessage.value = "Präsentationsfenster verbunden.";
      if (currentSlideId.value)
        send({ type: "PRESENTATION_STATE", slideId: currentSlideId.value });
      syncMindmaps();
    }
    if (message.data.type === "FULLSCREEN_STATUS")
      fullscreen.value = message.data.active;
    if (message.data.type === "AUDIENCE_CLOSED") {
      screenStatus.value = "closed";
      screenMessage.value = "Präsentationsfenster ist geschlossen.";
      fullscreen.value = false;
    }
  };
  window.addEventListener("keydown", keydown);
  clock = setInterval(() => (elapsed.value += 1), 1000);
  persist();
  audiencePoll = setInterval(() => {
    if (
      audienceWindow &&
      !audienceWindowOpen(audienceWindow) &&
      screenStatus.value !== "closed"
    ) {
      screenStatus.value = "closed";
      screenMessage.value = "Präsentationsfenster ist geschlossen.";
      fullscreen.value = false;
    }
  }, 1000);
  const reservation = takeReservedAudience(props.presentation.id);
  if (reservation) void initializeAudience(reservation);
  else {
    screenStatus.value = "closed";
    screenMessage.value = "Präsentationsfenster noch nicht geöffnet.";
  }
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", keydown);
  window.clearInterval(clock);
  window.clearInterval(audiencePoll);
  screenDetails?.removeEventListener?.("screenschange", screensChanged);
  send({ type: "PRESENTATION_END" });
  channel?.close();
});
watch(() => props.initialSlideId, goToSlide);
watch(currentSlideId, () => { selectedMindmapId.value = undefined; selectedNodeId.value = undefined; imagePickerOpen.value = false; });
const time = computed(
  () =>
    `${String(Math.floor(elapsed.value / 60)).padStart(2, "0")}:${String(elapsed.value % 60).padStart(2, "0")}`,
);
</script>

<template>
  <main class="presenter-console">
    <header>
      <div>
        <p class="eyebrow">Presenter Console</p>
        <h1>{{ presentation.title }}</h1>
      </div>
      <span class="timer">⏱ {{ time }}</span
      ><button type="button" class="secondary" @click="openAudience">
        ▣
        {{
          screenStatus === "connected"
            ? "Fenster neu öffnen"
            : "Präsentationsfenster öffnen"
        }}</button
      ><button type="button" class="danger" @click="emit('close')">
        Präsentation beenden
      </button>
    </header>
    <section class="screen-status" role="status">
      <strong
        >Zweitbildschirm / Beamer:
        {{
          screenStatus === "connected" ? "● verbunden" : "○ nicht verbunden"
        }}</strong
      ><span
        >{{ screenSize }}
        {{ fullscreen ? "· Vollbild aktiv" : "· Vollbild aus" }}</span
      ><span>{{ screenMessage }}</span
      ><button
        v-if="screenStatus === 'connected' && !fullscreen"
        type="button"
        @click="requestAudienceFullscreen"
      >
        Vollbild erneut aktivieren</button
      ><button
        v-if="
          screenStatus === 'closed' ||
          screenStatus === 'blocked' ||
          screenStatus === 'disconnected'
        "
        type="button"
        @click="openAudience"
      >
        Fenster neu öffnen
      </button>
    </section>
    <div
      v-if="screenChoices.length"
      class="screen-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Präsentationsbildschirm auswählen"
    >
      <h2>Präsentationsbildschirm auswählen</h2>
      <button
        v-for="(screen, index) in screenChoices"
        :key="`${screen.availLeft}-${screen.availTop}-${index}`"
        type="button"
        @click="chooseScreen(screen)"
      >
        {{ screenLabel(screen, index)
        }}{{
          screenDetails && sameScreen(screen, screenDetails.currentScreen)
            ? " · aktueller Bildschirm"
            : ""
        }}
      </button>
    </div>
    <div class="presenter-grid">
      <aside class="presenter-plan">
        <h2>Verlaufsplan</h2>
        <div
          v-for="entry in plan.schedule.filter((item) => item.type === 'phase')"
          :key="entry.id"
          class="presenter-phase"
          :class="{
            active: entry.presentationEntryPoint?.slideId === currentSlideId,
            broken:
              entry.presentationEntryPoint &&
              !slides.some(
                (slide) => slide.id === entry.presentationEntryPoint?.slideId,
              ),
          }"
        >
          <small>{{
            entry.startTime ||
            (entry.durationMinutes ? `${entry.durationMinutes} Min.` : "—")
          }}</small
          ><strong>{{ entry.phase || entry.title || "Phase" }}</strong
          ><button
            v-if="
              entry.presentationEntryPoint &&
              slides.some(
                (slide) => slide.id === entry.presentationEntryPoint?.slideId,
              )
            "
            type="button"
            @click="goToSlide(entry.presentationEntryPoint?.slideId)"
          >
            ↗ Folie
            {{
              slides.find(
                (slide) => slide.id === entry.presentationEntryPoint?.slideId,
              )!.position + 1
            }}</button
          ><span v-else-if="entry.presentationEntryPoint"
            >⚠ Folie nicht gefunden</span
          >
        </div>
      </aside>
      <section class="presenter-current">
        <SlideCanvas
          v-if="current"
          :slide="current"
          :theme-id="presentation.themeId"
          readonly
        />
        <section v-if="currentMindmaps.length" class="live-mindmap-panel">
          <h2>Mindmap live ergänzen</h2>
          <label v-if="currentMindmaps.length > 1">Mindmap
            <select v-model="selectedMindmapId">
              <option v-for="(element, index) in currentMindmaps" :key="element.id" :value="element.id">Mindmap {{ index + 1 }}</option>
            </select>
          </label>
          <div v-if="liveMindmap?.content.mindmap" class="live-mindmap-stage">
            <MindmapWidget
              :key="liveMindmap.id"
              :mindmap="liveMindmap.content.mindmap"
              editing
              :selected-node-id="selectedNodeId ?? liveMindmap.content.mindmap.rootNodeId"
              @select="selectedNodeId = $event"
              @changed="liveChanged"
              @image-request="selectedNodeId = $event; imagePickerOpen = true"
            />
          </div>
          <div v-if="liveNode" class="live-node-fields">
            <label>Knotentext
              <input :value="liveNode.text" @change="liveNode.text = ($event.target as HTMLInputElement).value; liveChanged()" />
            </label>
            <details :open="imagePickerOpen" @toggle="imagePickerOpen = ($event.target as HTMLDetailsElement).open"><summary>Bild zum Knoten hinzufügen</summary><ImageSourcePicker :materials="materialImages" @select="setNodeImage" /></details>
          </div>
          <p>Änderungen erscheinen sofort auf dem Präsentationsbildschirm und werden im Plan gespeichert.</p>
        </section>
        <section class="speaker-notes">
          <h2>Sprechernotizen</h2>
          <p>
            {{ current?.notes || "Keine Sprechernotizen für diese Folie." }}
          </p>
        </section>
        <div class="presenter-controls">
          <button
            type="button"
            class="secondary"
            :disabled="current?.id === slides[0]?.id"
            @click="previous"
          >
            ← Vorherige</button
          ><span
            >Folie {{ (current?.position ?? 0) + 1 }} /
            {{ slides.length }}</span
          ><button type="button" :disabled="!upcoming" @click="next">
            Nächste →
          </button>
        </div>
      </section>
      <aside class="presenter-next">
        <h2>Nächste Folie</h2>
        <SlideCanvas
          v-if="upcoming"
          :slide="upcoming"
          :theme-id="presentation.themeId"
          readonly
        />
        <p v-else class="form-hint">Ende der Präsentation.</p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.presenter-console {
  min-height: 100vh;
  background: #172e33;
  color: #edf9f7;
}
.presenter-console header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.2rem;
  border-bottom: 1px solid #547075;
  background: #203c42;
}
.presenter-console header > div {
  margin-right: auto;
}
.presenter-console h1,
.presenter-console h2,
.presenter-console p {
  margin: 0;
}
.presenter-console h1 {
  font-size: 1.25rem;
}
.presenter-console .eyebrow {
  color: #80d9d3;
  margin-bottom: 0.15rem;
}
.timer {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}
.presenter-grid {
  display: grid;
  grid-template-columns: 225px minmax(0, 1fr) 260px;
  gap: 1rem;
  padding: 1rem;
}
.presenter-plan,
.presenter-next,
.speaker-notes {
  border: 1px solid #4b6b70;
  border-radius: 8px;
  padding: 0.8rem;
  background: #224147;
}
.presenter-plan h2,
.presenter-next h2,
.speaker-notes h2 {
  margin-bottom: 0.65rem;
  font-size: 0.95rem;
}
.presenter-phase {
  display: grid;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  padding: 0.6rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #19363c;
}
.presenter-phase small {
  color: #aec5c5;
}
.presenter-phase button {
  padding: 0.28rem 0.4rem;
  color: #d9ffff;
  background: #195e65;
  border-color: #34767b;
  font-size: 0.78rem;
  text-align: left;
}
.presenter-phase.active {
  border-color: #1ed2c7;
  background: #174f55;
}
.presenter-phase.broken {
  border-color: #bf9550;
  color: #ffe8b7;
}
.presenter-current {
  min-width: 0;
}
.speaker-notes {
  margin-top: 1rem;
  min-height: 90px;
}
.speaker-notes p {
  color: #d6e4e4;
  white-space: pre-wrap;
  line-height: 1.45;
}
.live-mindmap-panel {
  margin-top: 1rem;
  padding: 0.8rem;
  border: 1px solid #4b6b70;
  border-radius: 8px;
  background: #224147;
}
.live-mindmap-panel h2 { margin-bottom: 0.6rem; font-size: 0.95rem; }
.live-mindmap-panel > label, .live-node-fields label { display: grid; gap: 0.3rem; font-size: 0.8rem; }
.live-mindmap-panel input, .live-mindmap-panel select { width: 100%; color: #eefaf9; background: #143137; border: 1px solid #537b7d; padding: 0.35rem; }
.live-mindmap-stage { width: 100%; aspect-ratio: 16 / 9; margin-top: 0.5rem; }
.live-node-fields { display: grid; gap: 0.5rem; margin-top: 0.65rem; }
.live-node-fields details { color: #d4f0ec; font-size: 0.8rem; }
.live-mindmap-panel > p { margin-top: 0.6rem; color: #b9d6d3; font-size: 0.75rem; }
.presenter-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
}
.presenter-next :deep(.slide-canvas) {
  margin-top: 0.7rem;
}
.presenter-next p {
  color: #b5c9c8;
}
.screen-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0.45rem 1rem;
  color: #c6e5e2;
  background: #1b3439;
  border-bottom: 1px solid #3c656a;
  font-size: 0.78rem;
}
.screen-status strong {
  color: #8de5dc;
}
.screen-status span:nth-of-type(2) {
  margin-right: auto;
}
.screen-status button {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
.screen-dialog {
  position: fixed;
  z-index: 80;
  top: 50%;
  left: 50%;
  display: grid;
  gap: 0.6rem;
  width: min(420px, 90vw);
  padding: 1.3rem;
  transform: translate(-50%, -50%);
  color: #f1fbfa;
  background: #173238;
  border: 1px solid #63a5a3;
  border-radius: 9px;
  box-shadow: 0 0 0 100vmax #071719c9;
}
.screen-dialog h2 {
  margin: 0;
  font-size: 1.1rem;
}
.screen-dialog button {
  text-align: left;
}
@media (max-width: 950px) {
  .presenter-grid {
    grid-template-columns: 180px minmax(0, 1fr);
  }
  .presenter-next {
    grid-column: 1/-1;
  }
  .presenter-next :deep(.slide-canvas) {
    max-width: 360px;
  }
}
@media (max-width: 650px) {
  .presenter-console header {
    flex-wrap: wrap;
  }
  .presenter-console header > div {
    flex-basis: 100%;
  }
  .presenter-grid {
    grid-template-columns: 1fr;
  }
  .presenter-next {
    grid-column: auto;
  }
  .presenter-controls {
    flex-wrap: wrap;
  }
  .presenter-controls span {
    order: -1;
    width: 100%;
    text-align: center;
  }
}
</style>
