<script setup lang="ts">
import { computed } from "vue";
import type {
  Material,
  MindmapDesign,
  MindmapWidget,
  PresentationElement,
} from "../../domain/types";
import { mindmapNode } from "../mindmap";
import ImageSourcePicker from "./ImageSourcePicker.vue";

const props = defineProps<{
  element: PresentationElement;
  mindmap: MindmapWidget;
  selectedNodeId?: string;
  materials: Material[];
  editing: boolean;
}>();
const emit = defineEmits<{
  beginChange: [];
  changed: [];
  edit: [];
  finish: [];
}>();
const node = computed(() =>
  props.selectedNodeId
    ? mindmapNode(props.mindmap, props.selectedNodeId)
    : undefined,
);
const designs: { id: MindmapDesign; label: string }[] = [
  { id: "schlicht", label: "Schlicht" },
  { id: "organisch", label: "Organisch" },
  { id: "tafel", label: "Tafel" },
  { id: "neon", label: "Neon" },
  { id: "pastell", label: "Pastell" },
];
function update(change: () => void): void {
  emit("beginChange");
  change();
  emit("changed");
}
function number(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}
function value(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
</script>

<template>
  <aside class="mindmap-properties">
    <nav>
      <strong>Mindmap</strong
      ><button type="button" @click="editing ? emit('finish') : emit('edit')">
        {{ editing ? "Bearbeitung beenden" : "Mindmap bearbeiten" }}
      </button>
    </nav>
    <div class="panel">
      <template v-if="node && editing">
        <h2>Knoten</h2>
        <label
          >Text<input
            :value="node.text"
            @change="update(() => (node!.text = value($event)))"
        /></label>
        <div class="grid">
          <label
            >Textgröße<input
              type="number"
              min="8"
              max="60"
              :value="node.style.fontSize ?? 16"
              @change="
                update(() => (node!.style.fontSize = number($event)))
              " /></label
          ><label
            >Rahmen<input
              type="number"
              min="0"
              max="12"
              :value="node.style.borderWidth ?? 2"
              @change="
                update(() => (node!.style.borderWidth = number($event)))
              "
          /></label>
        </div>
        <div class="grid">
          <label
            >Textfarbe<input
              type="color"
              :value="node.style.textColor ?? '#17363a'"
              @change="
                update(() => (node!.style.textColor = value($event)))
              " /></label
          ><label
            >Hintergrund<input
              type="color"
              :value="node.style.backgroundColor ?? '#f7fbfb'"
              @change="
                update(() => (node!.style.backgroundColor = value($event)))
              "
          /></label>
        </div>
        <div class="grid">
          <label
            >Astfarbe<input
              type="color"
              :value="node.style.branchColor ?? '#21b8b0'"
              @change="
                update(() => (node!.style.branchColor = value($event)))
              " /></label
          ><label
            >Rahmenfarbe<input
              type="color"
              :value="node.style.borderColor ?? '#21b8b0'"
              @change="update(() => (node!.style.borderColor = value($event)))"
          /></label>
        </div>
        <label
          >Eckenradius<input
            type="range"
            min="0"
            max="40"
            :value="node.style.borderRadius ?? 12"
            @change="update(() => (node!.style.borderRadius = number($event)))"
        /></label>
        <label
          >Schriftgewicht<select
            :value="node.style.fontWeight ?? 600"
            @change="update(() => (node!.style.fontWeight = number($event)))"
          >
            <option :value="400">Normal</option>
            <option :value="600">Halbfett</option>
            <option :value="800">Fett</option>
          </select></label
        >
        <h3>Bild</h3>
        <ImageSourcePicker
          :materials="materials"
          @select="
            update(() => (node!.image = { source: $event, fit: 'contain' }))
          "
        />
        <label v-if="node.image"
          >Bildanzeige<select
            :value="node.image.fit"
            @change="
              update(
                () =>
                  (node!.image!.fit = value($event) as
                    'contain' | 'cover' | 'fill'),
              )
            "
          >
            <option value="contain">Einpassen</option>
            <option value="cover">Füllen</option>
            <option value="fill">Strecken</option>
          </select></label
        >
        <button
          v-if="node.image"
          type="button"
          @click="update(() => (node!.image = undefined))"
        >
          Bild entfernen
        </button>
      </template>
      <h2>Layout</h2>
      <label
        >Ausrichtung<select
          :value="mindmap.settings.layout"
          @change="
            update(
              () =>
                (mindmap.settings.layout = value($event) as
                  'horizontal' | 'radial'),
            )
          "
        >
          <option value="horizontal">Horizontal</option>
          <option value="radial">Radial</option>
        </select></label
      >
      <label class="check"
        ><input
          type="checkbox"
          :checked="mindmap.settings.autoLayout"
          @change="
            update(
              () =>
                (mindmap.settings.autoLayout = (
                  $event.target as HTMLInputElement
                ).checked),
            )
          "
        />Automatisch anordnen</label
      >
      <div class="grid">
        <label
          >Horizontaler Abstand<input
            type="number"
            min="80"
            max="350"
            :value="mindmap.settings.spacingX"
            @change="
              update(() => (mindmap.settings.spacingX = number($event)))
            " /></label
        ><label
          >Vertikaler Abstand<input
            type="number"
            min="35"
            max="180"
            :value="mindmap.settings.spacingY"
            @change="
              update(() => (mindmap.settings.spacingY = number($event)))
            "
        /></label>
      </div>
      <label class="check"
        ><input
          type="checkbox"
          :checked="mindmap.settings.branchColors"
          @change="
            update(
              () =>
                (mindmap.settings.branchColors = (
                  $event.target as HTMLInputElement
                ).checked),
            )
          "
        />Astfarben verwenden</label
      >
      <h2>Design</h2>
      <div class="designs">
        <button
          v-for="design in designs"
          :key="design.id"
          type="button"
          :class="{ active: mindmap.settings.design === design.id }"
          @click="update(() => (mindmap.settings.design = design.id))"
        >
          {{ design.label }}
        </button>
      </div>
      <h2>Widget auf Folie</h2>
      <div class="grid">
        <label
          >X<input
            type="number"
            :value="element.x"
            @change="update(() => (element.x = number($event)))" /></label
        ><label
          >Y<input
            type="number"
            :value="element.y"
            @change="update(() => (element.y = number($event)))" /></label
        ><label
          >Breite<input
            type="number"
            min="200"
            :value="element.width"
            @change="update(() => (element.width = number($event)))" /></label
        ><label
          >Höhe<input
            type="number"
            min="120"
            :value="element.height"
            @change="update(() => (element.height = number($event)))"
        /></label>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.mindmap-properties {
  position: absolute;
  z-index: 12;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  overflow: auto;
  padding: 0.8rem;
  color: #dceceb;
  background: #183238;
  border-left: 1px solid #38565c;
  box-shadow: -8px 0 20px #0005;
}
.mindmap-properties nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid #38565c;
}
.mindmap-properties nav button {
  font-size: 0.72rem;
}
.panel {
  display: grid;
  gap: 0.7rem;
  padding-top: 0.8rem;
}
.panel h2 {
  margin: 0.35rem 0 0;
  font-size: 0.95rem;
}
.panel h3 {
  margin: 0;
  font-size: 0.8rem;
}
.panel label {
  display: grid;
  gap: 0.2rem;
  color: #bad0d0;
  font-size: 0.75rem;
}
.panel input,
.panel select {
  min-width: 0;
  color: #e8f4f3;
  background: #10272d;
  border-color: #45666b;
}
.panel input[type="color"] {
  width: 100%;
  height: 30px;
}
.panel .check {
  display: flex;
  align-items: center;
}
.grid,
.designs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}
.designs button.active {
  border-color: #19d2cd;
  background: #17575d;
}
</style>
