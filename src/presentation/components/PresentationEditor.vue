<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  Presentation,
  PresentationElement,
  PresentationShapeType,
  PresentationSlide,
  WorkshopPlan,
} from "../../domain/types";
import {
  applySlideLayout,
  bringToFront,
  clonePresentationData,
  createElement,
  createShape,
  createTextElement,
  deleteSlide,
  duplicateSlide,
  ensurePresentation,
  insertSlide,
  moveSlide,
  orderedSlides,
  presentationLayouts,
  presentationThemes,
  sendToBack,
} from "../presentation";
import { createMindmapElement, duplicateMindmap } from "../mindmap";
import ImageSourcePicker from "./ImageSourcePicker.vue";
import MindmapProperties from "./MindmapProperties.vue";
import SlideCanvas from "./SlideCanvas.vue";

const props = defineProps<{ plan: WorkshopPlan; initialSlideId?: string }>();
const emit = defineEmits<{
  changed: [];
  present: [slideId: string];
  preview: [slideId: string];
  export: [format: 'pdf' | 'html'];
}>();
const presentation = computed(() => ensurePresentation(props.plan));
const slides = computed(() => orderedSlides(presentation.value));
const selectedSlideId = ref(props.initialSlideId ?? slides.value[0]?.id);
const selectedElementId = ref<string>();
const editingMindmapId = ref<string>();
const selectedMindmapNodeId = ref<string>();
const focusMindmapRoot = ref(false);
const tab = ref<"properties" | "layout" | "design" | "animation">("properties");
const zoom = ref(100);
const notesOpen = ref(true);
const textMenu = ref(false);
const shapeMenu = ref(false);
const imageMenu = ref(false);
const draggingSlideId = ref<string>();
const imageInput = ref<HTMLInputElement>();
const backgroundInput = ref<HTMLInputElement>();
const contextMenu = ref<{ x: number; y: number }>();
const past = ref<Presentation[]>([]);
const future = ref<Presentation[]>([]);
let recording = false;
const selectedSlide = computed(
  () =>
    slides.value.find((slide) => slide.id === selectedSlideId.value) ??
    slides.value[0],
);
const selectedElement = computed(() =>
  selectedSlide.value?.elements.find(
    (element) => element.id === selectedElementId.value,
  ),
);
const materialImages = computed(() =>
  props.plan.materials.filter(
    (material) =>
      material.resourceType === "file" &&
      /^(data:image|https?:\/\/.*\.(png|jpe?g|gif|webp|svg))/i.test(
        material.description ?? "",
      ),
  ),
);
watch(
  () => props.initialSlideId,
  (id) => {
    if (id && slides.value.some((slide) => slide.id === id))
      selectedSlideId.value = id;
  },
);
function changed(): void {
  presentation.value.updatedAt = new Date().toISOString();
  emit("changed");
}
function remember(): void {
  if (recording) return;
  past.value.push(clonePresentationData(presentation.value));
  if (past.value.length > 60) past.value.shift();
  future.value = [];
}
function restore(snapshot: Presentation): void {
  recording = true;
  props.plan.presentation = clonePresentationData(snapshot);
  selectedSlideId.value = props.plan.presentation.slides[0]?.id;
  selectedElementId.value = undefined;
  editingMindmapId.value = undefined;
  selectedMindmapNodeId.value = undefined;
  recording = false;
  changed();
}
function undo(): void {
  const snapshot = past.value.pop();
  if (snapshot) {
    future.value.push(clonePresentationData(presentation.value));
    restore(snapshot);
  }
}
function redo(): void {
  const snapshot = future.value.pop();
  if (snapshot) {
    past.value.push(clonePresentationData(presentation.value));
    restore(snapshot);
  }
}
function maxZ(): number {
  return Math.max(
    0,
    ...(selectedSlide.value?.elements.map((element) => element.zIndex) ?? []),
  );
}
function addSlide(
  layout: import("../../domain/types").PresentationLayoutType | Event = "blank",
): void {
  const selectedLayout = typeof layout === "string" ? layout : "blank";
  remember();
  const slide = insertSlide(presentation.value, selectedSlideId.value);
  if (selectedLayout !== "blank") applySlideLayout(slide, selectedLayout);
  selectedSlideId.value = slide.id;
  selectedElementId.value = undefined;
  changed();
}
function duplicateSlideCurrent(): void {
  if (!selectedSlide.value) return;
  remember();
  const copy = duplicateSlide(presentation.value, selectedSlide.value.id);
  if (copy) selectedSlideId.value = copy.id;
  changed();
}
function removeSlideCurrent(): void {
  const slide = selectedSlide.value;
  if (!slide) return;
  const used = props.plan.schedule.filter(
    (entry) => entry.presentationEntryPoint?.slideId === slide.id,
  ).length;
  if (
    !window.confirm(
      used
        ? `Diese Folie wird von ${used} Einstiegspunkt(en) verwendet und als Broken Link markiert. Wirklich löschen?`
        : "Diese Folie wirklich löschen?",
    )
  )
    return;
  remember();
  deleteSlide(presentation.value, slide.id);
  selectedSlideId.value = slides.value[0]?.id;
  selectedElementId.value = undefined;
  changed();
}
function addText(kind: "title" | "subtitle" | "body" | "caption"): void {
  if (!selectedSlide.value) return;
  remember();
  const element = createTextElement(kind, {
    x: 110,
    y: 100 + selectedSlide.value.elements.length * 25,
  });
  element.zIndex = maxZ() + 1;
  selectedSlide.value.elements.push(element);
  selectedElementId.value = element.id;
  textMenu.value = false;
  changed();
}
function addShape(shape: PresentationShapeType): void {
  if (!selectedSlide.value) return;
  remember();
  const element = createShape(shape);
  element.zIndex = maxZ() + 1;
  selectedSlide.value.elements.push(element);
  selectedElementId.value = element.id;
  shapeMenu.value = false;
  changed();
}
function addImage(src = ""): void {
  if (!selectedSlide.value) return;
  remember();
  const element = createElement("image", { x: 300, y: 210 });
  element.content.src = src;
  element.zIndex = maxZ() + 1;
  selectedSlide.value.elements.push(element);
  selectedElementId.value = element.id;
  imageMenu.value = false;
  changed();
}
function addIcon(): void {
  if (!selectedSlide.value) return;
  remember();
  const element = createElement("icon", { x: 570, y: 270 });
  element.zIndex = maxZ() + 1;
  selectedSlide.value.elements.push(element);
  selectedElementId.value = element.id;
  changed();
}
function addMindmap(): void {
  if (!selectedSlide.value) return;
  remember();
  const element = createMindmapElement();
  element.zIndex = maxZ() + 1;
  selectedSlide.value.elements.push(element);
  selectedElementId.value = element.id;
  editingMindmapId.value = element.id;
  selectedMindmapNodeId.value = element.content.mindmap!.rootNodeId;
  focusMindmapRoot.value = true;
  changed();
}
function selectElement(id?: string): void {
  selectedElementId.value = id;
  if (id !== editingMindmapId.value) finishMindmapEdit();
}
function startMindmapEdit(id: string): void {
  const element = selectedSlide.value?.elements.find((item) => item.id === id);
  if (!element?.content.mindmap) return;
  selectedElementId.value = id;
  editingMindmapId.value = id;
  selectedMindmapNodeId.value = element.content.mindmap.rootNodeId;
  focusMindmapRoot.value = false;
}
function finishMindmapEdit(): void {
  editingMindmapId.value = undefined;
  selectedMindmapNodeId.value = undefined;
  focusMindmapRoot.value = false;
}
function duplicateElement(): void {
  if (!selectedSlide.value || !selectedElement.value) return;
  remember();
  const copy = clonePresentationData(selectedElement.value);
  const timestamp = new Date().toISOString();
  copy.id = crypto.randomUUID();
  if (copy.content.mindmap)
    copy.content.mindmap = duplicateMindmap(copy.content.mindmap);
  copy.x += 20;
  copy.y += 20;
  copy.zIndex = maxZ() + 1;
  copy.createdAt = timestamp;
  copy.updatedAt = timestamp;
  selectedSlide.value.elements.push(copy);
  selectedElementId.value = copy.id;
  finishMindmapEdit();
  changed();
}
function removeElement(): void {
  if (!selectedSlide.value || !selectedElementId.value) return;
  remember();
  selectedSlide.value.elements = selectedSlide.value.elements.filter(
    (element) => element.id !== selectedElementId.value,
  );
  selectedElementId.value = undefined;
  finishMindmapEdit();
  changed();
}
function updateNumber(
  key: "x" | "y" | "width" | "height" | "rotation",
  value: number,
): void {
  if (!selectedElement.value) return;
  remember();
  selectedElement.value[key] = value;
  changed();
}
function updateStyle(
  key: keyof PresentationElement["style"],
  value: PresentationElement["style"][keyof PresentationElement["style"]],
): void {
  if (!selectedElement.value) return;
  remember();
  selectedElement.value.style[key] = value as never;
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value))
    presentation.value.recentColors = [
      value,
      ...(presentation.value.recentColors ?? []).filter(
        (color) => color !== value,
      ),
    ].slice(0, 8);
  changed();
}
function updateText(value: string): void {
  if (!selectedElement.value) return;
  remember();
  selectedElement.value.content.text = value;
  changed();
}
function applyLayout(
  layout: import("../../domain/types").PresentationLayoutType,
): void {
  if (!selectedSlide.value) return;
  if (
    selectedSlide.value.elements.length &&
    !window.confirm(
      "Das Layout fügt Platzhalter hinzu. Bestehende Elemente bleiben erhalten. Fortfahren?",
    )
  )
    return;
  remember();
  applySlideLayout(selectedSlide.value, layout);
  changed();
}
function chooseFile(event: Event, background = false): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file?.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (background && selectedSlide.value) {
      remember();
      selectedSlide.value.background.imageUrl = String(reader.result);
      selectedSlide.value.background.imageFit = "cover";
      changed();
    } else addImage(String(reader.result));
  };
  reader.readAsDataURL(file);
  (event.target as HTMLInputElement).value = "";
}
function context(id: string, event: MouseEvent): void {
  selectedElementId.value = id;
  contextMenu.value = { x: event.clientX, y: event.clientY };
}
function contextAction(action: "front" | "back" | "lock" | "delete"): void {
  const slide = selectedSlide.value;
  const element = selectedElement.value;
  contextMenu.value = undefined;
  if (!slide || !element) return;
  remember();
  if (action === "front") bringToFront(slide, element.id);
  if (action === "back") sendToBack(slide, element.id);
  if (action === "lock") element.style.locked = !element.style.locked;
  if (action === "delete") {
    slide.elements = slide.elements.filter((item) => item.id !== element.id);
    selectedElementId.value = undefined;
  }
  changed();
}
function align(
  kind: "left" | "center" | "right" | "top" | "middle" | "bottom",
): void {
  const element = selectedElement.value;
  if (!element) return;
  remember();
  if (kind === "left") element.x = 0;
  if (kind === "center") element.x = (1280 - element.width) / 2;
  if (kind === "right") element.x = 1280 - element.width;
  if (kind === "top") element.y = 0;
  if (kind === "middle") element.y = (720 - element.height) / 2;
  if (kind === "bottom") element.y = 720 - element.height;
  changed();
}
function beginSlideDrag(id: string, event: DragEvent): void {
  draggingSlideId.value = id;
  event.dataTransfer?.setData("text/plain", id);
}
function dropSlide(target: PresentationSlide): void {
  if (!draggingSlideId.value) return;
  remember();
  moveSlide(presentation.value, draggingSlideId.value, target.position);
  draggingSlideId.value = undefined;
  changed();
}
function keydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement;
  if (target.matches('input,textarea,select,[contenteditable="true"]')) return;
  if (editingMindmapId.value) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  } else if (
    (event.ctrlKey || event.metaKey) &&
    ["y", "d"].includes(event.key.toLowerCase())
  ) {
    event.preventDefault();
    event.key.toLowerCase() === "y" ? redo() : duplicateElement();
  } else if (event.key === "Delete") {
    event.preventDefault();
    removeElement();
  } else if (
    selectedElement.value &&
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
  ) {
    event.preventDefault();
    remember();
    const step = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowLeft") selectedElement.value.x -= step;
    if (event.key === "ArrowRight") selectedElement.value.x += step;
    if (event.key === "ArrowUp") selectedElement.value.y -= step;
    if (event.key === "ArrowDown") selectedElement.value.y += step;
    changed();
  }
}
onMounted(() => window.addEventListener("keydown", keydown));
onBeforeUnmount(() => window.removeEventListener("keydown", keydown));
</script>

<template>
  <main class="presentation-editor" @click.self="contextMenu = undefined">
    <input
      ref="imageInput"
      class="hidden"
      type="file"
      accept="image/*"
      @change="chooseFile($event)"
    /><input
      ref="backgroundInput"
      class="hidden"
      type="file"
      accept="image/*"
      @change="chooseFile($event, true)"
    />
    <header class="toolbar">
      <div class="drop">
        <button type="button" title="Text" @click="textMenu = !textMenu">
          T Text
        </button>
        <menu v-if="textMenu">
          <button
            v-for="kind in ['title', 'subtitle', 'body', 'caption'] as const"
            :key="kind"
            type="button"
            @click="addText(kind)"
          >
            {{
              {
                title: "Titel",
                subtitle: "Untertitel",
                body: "Fließtext",
                caption: "Beschriftung",
              }[kind]
            }}
          </button>
        </menu>
      </div>
      <div class="drop">
        <button type="button" title="Bild" @click="imageMenu = !imageMenu">
          ▧ Bild
        </button>
        <menu v-if="imageMenu">
          <ImageSourcePicker
            :materials="materialImages"
            @select="addImage($event)"
          />
        </menu>
      </div>
      <div class="drop">
        <button type="button" title="Form" @click="shapeMenu = !shapeMenu">
          ◇ Form
        </button>
        <menu v-if="shapeMenu">
          <button
            v-for="shape in [
              'rectangle',
              'roundedRectangle',
              'ellipse',
              'line',
              'arrow',
            ] as PresentationShapeType[]"
            :key="shape"
            type="button"
            @click="addShape(shape)"
          >
            {{
              {
                rectangle: "Rechteck",
                roundedRectangle: "Rundes Rechteck",
                ellipse: "Ellipse",
                line: "Linie",
                arrow: "Pfeil",
              }[shape]
            }}
          </button>
        </menu>
      </div>
      <button type="button" title="Icon" @click="addIcon">★ Icon</button>
      <button type="button" title="Mindmap" @click="addMindmap">
        ✣ Mindmap</button
      ><i /><button type="button" @click="tab = 'layout'">▤ Layout</button
      ><button type="button" @click="tab = 'design'">◐ Design</button
      ><i /><button
        type="button"
        title="Rückgängig"
        :disabled="!past.length"
        @click="undo"
      >
        ↶</button
      ><button
        type="button"
        title="Wiederholen"
        :disabled="!future.length"
        @click="redo"
      >
        ↷</button
      ><button
        type="button"
        title="Duplizieren"
        :disabled="!selectedElement"
        @click="duplicateElement"
      >
        ⧉</button
      ><button
        type="button"
        title="Löschen"
        :disabled="!selectedElement"
        @click="removeElement"
      >
        ⌫</button
      ><span /><label
        >Zoom
        <select v-model.number="zoom">
          <option :value="50">50%</option>
          <option :value="75">75%</option>
          <option :value="100">100%</option>
          <option :value="125">125%</option>
        </select></label
      >
    </header>
    <div class="workspace">
      <aside class="slides">
        <div>
          <strong>Folien ({{ slides.length }})</strong
          ><button type="button" @click="addSlide">+ Folie</button>
        </div>
        <button
          v-for="slide in slides"
          :key="slide.id"
          type="button"
          class="thumb"
          :class="{ active: selectedSlideId === slide.id }"
          draggable="true"
          @dragstart="beginSlideDrag(slide.id, $event)"
          @dragover.prevent
          @drop.prevent="dropSlide(slide)"
          @click="
            selectedSlideId = slide.id;
            selectedElementId = undefined;
            finishMindmapEdit();
          "
        >
          <b>{{ slide.position + 1 }}</b
          ><span
            :style="{
              background:
                slide.background.color ||
                presentationThemes.find(
                  (theme) => theme.id === presentation.themeId,
                )?.background,
            }"
            >{{
              slide.title ||
              slide.elements.find((item) => item.type === "text")?.content
                .text ||
              "Leere Folie"
            }}</span
          ><small
            v-if="
              plan.schedule.filter(
                (entry) => entry.presentationEntryPoint?.slideId === slide.id,
              ).length
            "
            >↗
            {{
              plan.schedule.filter(
                (entry) => entry.presentationEntryPoint?.slideId === slide.id,
              ).length
            }}</small
          >
        </button>
        <footer>
          <button type="button" @click="duplicateSlideCurrent">Kopie</button
          ><button type="button" class="danger" @click="removeSlideCurrent">
            Löschen
          </button>
        </footer>
      </aside>
      <section class="canvas-area">
        <header>
          <div>
            <input
              v-if="selectedSlide"
              v-model="selectedSlide.title"
              placeholder="Ohne Titel"
              @change="changed"
            /><small>Folieninhalt bearbeiten</small>
          </div>
          <button type="button" :disabled="!selectedSlide" @click="emit('export', 'pdf')">PDF exportieren</button>
          <button type="button" :disabled="!selectedSlide" @click="emit('export', 'html')">HTML exportieren</button>
          <button
            type="button"
            :disabled="!selectedSlide"
            @click="selectedSlide && emit('preview', selectedSlide.id)"
          >
            Vorschau</button
          ><button
            type="button"
            :disabled="!selectedSlide"
            @click="selectedSlide && emit('present', selectedSlide.id)"
          >
            ▶ Präsentieren
          </button>
        </header>
        <div class="stage">
          <div
            v-if="selectedSlide"
            class="zoom"
            :style="{ '--zoom': zoom / 100 }"
          >
            <SlideCanvas
              :slide="selectedSlide"
              :theme-id="presentation.themeId"
              :selected-element-id="selectedElementId"
              :editing-mindmap-id="editingMindmapId"
              :selected-mindmap-node-id="selectedMindmapNodeId"
              :focus-mindmap-root="focusMindmapRoot"
              @select="selectElement"
              @begin-change="remember"
              @changed="changed"
              @context="context"
              @mindmap-edit="startMindmapEdit"
              @mindmap-finish="finishMindmapEdit"
              @mindmap-node-select="selectedMindmapNodeId = $event"
              @mindmap-image-request="selectedMindmapNodeId = $event"
              @undo="undo"
              @redo="redo"
            />
          </div>
          <div v-else class="empty">
            <p>Noch keine Folien</p>
            <button type="button" @click="addSlide('titleContent')">
              Erste Folie erstellen
            </button>
          </div>
        </div>
        <section class="notes">
          <button type="button" @click="notesOpen = !notesOpen">
            {{
              notesOpen ? "▾ Notizen ausblenden" : "▸ Sprechernotizen"
            }}</button
          ><textarea
            v-if="notesOpen && selectedSlide"
            v-model="selectedSlide.notes"
            rows="4"
            placeholder="Hier Notizen eingeben …"
            @focus="remember"
            @input="changed"
          />
        </section>
      </section>
      <aside class="properties">
        <nav>
          <button
            v-for="item in [
              'properties',
              'layout',
              'design',
              'animation',
            ] as const"
            :key="item"
            type="button"
            :class="{ active: tab === item }"
            @click="tab = item"
          >
            {{
              {
                properties: "Eigenschaften",
                layout: "Layout",
                design: "Design",
                animation: "Animation",
              }[item]
            }}
          </button>
        </nav>
        <div v-if="tab === 'properties'" class="panel">
          <template v-if="selectedElement"
            ><h2>
              {{
                {
                  text: "Text",
                  image: "Bild",
                  shape: "Form",
                  icon: "Icon",
                  mindmap: "Mindmap",
                }[selectedElement.type]
              }}
            </h2>
            <div class="grid">
              <label
                >X<input
                  :value="selectedElement.x"
                  type="number"
                  @change="
                    updateNumber(
                      'x',
                      Number(($event.target as HTMLInputElement).value),
                    )
                  " /></label
              ><label
                >Y<input
                  :value="selectedElement.y"
                  type="number"
                  @change="
                    updateNumber(
                      'y',
                      Number(($event.target as HTMLInputElement).value),
                    )
                  " /></label
              ><label
                >Breite<input
                  :value="selectedElement.width"
                  type="number"
                  @change="
                    updateNumber(
                      'width',
                      Number(($event.target as HTMLInputElement).value),
                    )
                  " /></label
              ><label
                >Höhe<input
                  :value="selectedElement.height"
                  type="number"
                  @change="
                    updateNumber(
                      'height',
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
              /></label>
            </div>
            <label
              >Drehung<input
                :value="selectedElement.rotation"
                type="range"
                min="-180"
                max="180"
                @input="
                  updateNumber(
                    'rotation',
                    Number(($event.target as HTMLInputElement).value),
                  )
                " /></label
            ><template v-if="selectedElement.type === 'text'"
              ><label
                >Text<textarea
                  :value="selectedElement.content.text"
                  rows="4"
                  @focus="remember"
                  @input="
                    updateText(($event.target as HTMLTextAreaElement).value)
                  "
                /></label
              ><label
                >Schrift<select
                  :value="selectedElement.style.fontFamily"
                  @change="
                    updateStyle(
                      'fontFamily',
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option value="Inter, sans-serif">Sans Serif</option>
                  <option value="Georgia, serif">Serif</option>
                  <option value="monospace">Monospace</option>
                </select></label
              ><label
                >Größe<input
                  :value="selectedElement.style.fontSize ?? 24"
                  type="number"
                  @change="
                    updateStyle(
                      'fontSize',
                      Number(($event.target as HTMLInputElement).value),
                    )
                  " /></label></template
            ><template v-if="selectedElement.type === 'image'"
              ><button type="button" @click="imageInput?.click()">
                Bild ersetzen</button
              ><label
                >Fit<select
                  :value="selectedElement.style.objectFit ?? 'cover'"
                  @change="
                    updateStyle(
                      'objectFit',
                      ($event.target as HTMLSelectElement).value as
                        'contain' | 'cover' | 'fill',
                    )
                  "
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill</option>
                </select></label
              ></template
            ><template v-if="selectedElement.type === 'shape'"
              ><label
                >Form<select
                  :value="selectedElement.content.shape"
                  @change="
                    selectedElement.content.shape = (
                      $event.target as HTMLSelectElement
                    ).value as PresentationShapeType;
                    changed();
                  "
                >
                  <option value="rectangle">Rechteck</option>
                  <option value="roundedRectangle">Rundes Rechteck</option>
                  <option value="ellipse">Ellipse</option>
                  <option value="line">Linie</option>
                  <option value="arrow">Pfeil</option>
                </select></label
              ></template
            ><label
              >Farbe<input
                :value="
                  selectedElement.style.color ??
                  selectedElement.style.backgroundColor ??
                  '#17646a'
                "
                type="color"
                @input="
                  selectedElement.type === 'shape'
                    ? updateStyle(
                        'backgroundColor',
                        ($event.target as HTMLInputElement).value,
                      )
                    : updateStyle(
                        'color',
                        ($event.target as HTMLInputElement).value,
                      )
                " /></label
            ><label
              >Deckkraft<input
                :value="selectedElement.style.opacity ?? 1"
                type="range"
                min="0"
                max="1"
                step=".05"
                @input="
                  updateStyle(
                    'opacity',
                    Number(($event.target as HTMLInputElement).value),
                  )
                " /></label
            ><label
              >Eckenradius<input
                :value="selectedElement.style.borderRadius ?? 0"
                type="range"
                min="0"
                max="80"
                @input="
                  updateStyle(
                    'borderRadius',
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
            /></label>
            <div class="align">
              <button
                v-for="side in [
                  'left',
                  'center',
                  'right',
                  'top',
                  'middle',
                  'bottom',
                ] as const"
                :key="side"
                type="button"
                @click="align(side)"
              >
                {{ side }}
              </button>
            </div></template
          >
          <p v-else>Element auf der Folie auswählen.</p>
        </div>
        <div v-else-if="tab === 'layout'" class="panel">
          <h2>Folienlayouts</h2>
          <button
            v-for="layout in presentationLayouts"
            :key="layout.id"
            type="button"
            class="layout"
            @click="applyLayout(layout.id)"
          >
            <span /><strong>{{ layout.label }}</strong
            ><small>{{ layout.description }}</small>
          </button>
        </div>
        <div v-else-if="tab === 'design'" class="panel">
          <h2>Design</h2>
          <div class="themes">
            <button
              v-for="theme in presentationThemes"
              :key="theme.id"
              type="button"
              :style="{
                background: theme.background,
                color: theme.text,
                borderColor: theme.primary,
              }"
              @click="
                remember();
                presentation.themeId = theme.id;
                changed();
              "
            >
              {{ theme.label }}
            </button>
          </div>
          <label
            >Hintergrund<input
              v-if="selectedSlide"
              v-model="selectedSlide.background.color"
              type="color"
              @focus="remember"
              @input="changed" /></label
          ><button type="button" @click="backgroundInput?.click()">
            Hintergrundbild</button
          ><button
            v-if="selectedSlide?.background.imageUrl"
            type="button"
            @click="
              remember();
              selectedSlide!.background.imageUrl = undefined;
              changed();
            "
          >
            Bild zurücksetzen
          </button>
        </div>
        <div v-else class="panel">
          <h2>Folienübergang</h2>
          <label
            >Effekt<select
              v-if="selectedSlide"
              v-model="selectedSlide.transition.type"
              @focus="remember"
              @change="changed"
            >
              <option value="none">Keine</option>
              <option value="fade">Überblenden</option>
              <option value="slide">Schieben</option>
            </select></label
          ><label
            >Dauer<select
              v-if="selectedSlide"
              v-model.number="selectedSlide.transition.duration"
              @focus="remember"
              @change="changed"
            >
              <option :value="200">Schnell</option>
              <option :value="400">Normal</option>
              <option :value="700">Langsam</option>
            </select></label
          >
        </div>
      </aside>
      <MindmapProperties
        v-if="selectedElement?.content.mindmap"
        :element="selectedElement"
        :mindmap="selectedElement.content.mindmap"
        :selected-node-id="selectedMindmapNodeId"
        :materials="materialImages"
        :editing="editingMindmapId === selectedElement.id"
        @begin-change="remember"
        @changed="changed"
        @edit="startMindmapEdit(selectedElement.id)"
        @finish="finishMindmapEdit"
      />
    </div>
    <footer class="status">
      <span
        >Folie {{ selectedSlide ? selectedSlide.position + 1 : 0 }} von
        {{ slides.length }}</span
      ><span>16:9</span><span>{{ zoom }}%</span><span>Autosave ✓</span>
    </footer>
    <menu
      v-if="contextMenu"
      class="context"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
    >
      <button type="button" @click="contextAction('front')">Nach vorne</button
      ><button type="button" @click="contextAction('back')">Nach hinten</button
      ><button type="button" @click="contextAction('lock')">
        {{ selectedElement?.style.locked ? "Entsperren" : "Sperren" }}</button
      ><button type="button" @click="contextAction('delete')">Löschen</button>
    </menu>
  </main>
</template>

<style scoped>
.presentation-editor {
  min-height: calc(100vh - 48px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  color: #dcedec;
  background: #102126;
}
.hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.7rem;
  background: #183238;
  border-bottom: 1px solid #38565c;
}
.toolbar button {
  padding: 0.4rem 0.5rem;
  color: #e5f3f2;
  background: transparent;
  border-color: transparent;
  font-size: 0.78rem;
}
.toolbar button:hover:not(:disabled) {
  background: #28535a;
}
.toolbar i {
  height: 24px;
  border-left: 1px solid #48686d;
}
.toolbar span {
  flex: 1;
}
.toolbar label {
  display: flex;
  gap: 0.3rem;
  align-items: center;
  font-size: 0.75rem;
}
.toolbar select {
  width: auto;
  padding: 0.2rem;
  color: #e5f3f2;
  background: #10272d;
  border-color: #45666b;
}
.drop {
  position: relative;
}
.drop menu,
.context {
  position: absolute;
  z-index: 30;
  display: grid;
  min-width: 150px;
  margin: 0;
  padding: 0.35rem;
  background: #183238;
  border: 1px solid #507178;
  border-radius: 7px;
  box-shadow: 0 12px 25px #000b;
}
.drop menu {
  top: calc(100% + 0.25rem);
  left: 0;
}
.drop menu button,
.context button {
  color: #e6f4f3;
  background: transparent;
  border: 0;
  text-align: left;
}
.workspace {
  position: relative;
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 280px;
  min-height: 0;
}
.slides,
.properties {
  padding: 0.8rem;
  overflow: auto;
  background: #183238;
}
.slides {
  border-right: 1px solid #38565c;
}
.properties {
  border-left: 1px solid #38565c;
}
.slides > div,
.slides footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}
.slides > div {
  margin-bottom: 0.6rem;
}
.slides button,
.properties button {
  font-size: 0.76rem;
}
.thumb {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 0.3rem;
  width: 100%;
  margin: 0.4rem 0;
  padding: 0.4rem;
  color: #dceceb;
  background: #214249;
  border-color: #38626a;
  text-align: left;
}
.thumb.active {
  border: 2px solid #22cfca;
  background: #2b5960;
}
.thumb > b {
  color: #84ded8;
}
.thumb span {
  grid-column: 2/-1;
  min-height: 42px;
  padding: 0.25rem;
  overflow: hidden;
  color: #284044;
  font-size: 0.65rem;
}
.thumb small {
  color: #a9c7c8;
}
.canvas-area {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  background: #102126;
}
.canvas-area > header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  background: #142a30;
  border-bottom: 1px solid #38565c;
}
.canvas-area > header > div {
  margin-right: auto;
}
.canvas-area input {
  max-width: 360px;
  padding: 0.1rem 0;
  color: #eaf5f4;
  background: transparent;
  border: 0;
  font-weight: 700;
}
.canvas-area small {
  display: block;
  color: #8facad;
  font-size: 0.68rem;
}
.stage {
  display: grid;
  place-items: center;
  min-height: 0;
  padding: 2rem;
  overflow: auto;
  background: radial-gradient(circle, #24444a, #0e2025 68%);
}
.zoom {
  width: calc(100% * var(--zoom));
  min-width: min(720px, 100%);
}
.notes {
  background: #183238;
  border-top: 1px solid #38565c;
}
.notes button {
  width: 100%;
  color: #dcecea;
  background: transparent;
  border: 0;
  text-align: left;
}
.notes textarea {
  width: calc(100% - 1rem);
  margin: 0.2rem 0.5rem 0.5rem;
  color: #e5f2f1;
  background: #10272d;
  border-color: #45666b;
}
.properties nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.properties nav button {
  color: #afc9c9;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #38565c;
}
.properties nav button.active {
  color: white;
  background: #28545a;
  border-bottom: 2px solid #1bd1cd;
}
.panel {
  display: grid;
  gap: 0.65rem;
  padding-top: 0.8rem;
}
.panel h2 {
  margin: 0;
  font-size: 1rem;
}
.panel label {
  display: grid;
  gap: 0.25rem;
  color: #bad0d0;
  font-size: 0.76rem;
}
.panel input,
.panel select,
.panel textarea {
  color: #e8f4f3;
  background: #10272d;
  border-color: #45666b;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}
.align {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}
.align button {
  flex: 1;
}
.layout {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 0.1rem 0.45rem;
  padding: 0.4rem;
  color: #e0efee;
  background: #214249;
  border-color: #38626a;
  text-align: left;
}
.layout span {
  grid-row: span 2;
  min-height: 30px;
  border: 1px solid #8cc6c1;
  background: #d8eeee;
}
.layout small {
  color: #b1c9c9;
}
.themes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}
.themes button {
  min-height: 48px;
}
.status {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 0.35rem;
  color: #a8c2c3;
  background: #142a30;
  border-top: 1px solid #38565c;
  font-size: 0.72rem;
}
.status span + span {
  padding-left: 1rem;
  border-left: 1px solid #45666b;
}
.context {
  position: fixed;
}
.empty {
  text-align: center;
}
@media (max-width: 1180px) {
  .properties {
    position: absolute;
    right: 0;
    z-index: 10;
    width: 280px;
    height: calc(100vh - 110px);
    box-shadow: -10px 0 25px #0008;
  }
  .workspace {
    grid-template-columns: 210px minmax(0, 1fr);
  }
}
@media (max-width: 980px) {
  .slides {
    position: absolute;
    left: 0;
    z-index: 10;
    width: 230px;
    height: calc(100vh - 110px);
    box-shadow: 10px 0 25px #0008;
  }
  .workspace {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 680px) {
  .workspace {
    display: block;
  }
  .slides,
  .properties {
    position: static;
    width: auto;
    height: auto;
    box-shadow: none;
  }
  .slides {
    display: flex;
    overflow: auto;
  }
  .slides > div {
    min-width: 125px;
  }
  .thumb {
    min-width: 145px;
  }
  .toolbar {
    flex-wrap: wrap;
  }
  .status {
    justify-content: start;
    overflow: auto;
  }
  .status span {
    white-space: nowrap;
  }
}
</style>
