<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { MindmapNode, MindmapWidget } from "../../domain/types";
import {
  addMindmapChild,
  addMindmapSibling,
  branchIds,
  deleteMindmapBranch,
  duplicateMindmapBranch,
  layoutMindmap,
  mindmapNode,
  moveMindmapNode,
  MINDMAP_HEIGHT,
  MINDMAP_WIDTH,
} from "../mindmap";

const props = withDefaults(
  defineProps<{
    mindmap: MindmapWidget;
    editing?: boolean;
    selectedNodeId?: string;
    focusRoot?: boolean;
  }>(),
  { editing: false, focusRoot: false },
);
const emit = defineEmits<{
  select: [id?: string];
  beginChange: [];
  changed: [];
  editRequest: [];
  finish: [];
  imageRequest: [id: string];
  undo: [];
  redo: [];
}>();
const host = ref<HTMLElement>();
const layout = computed(() => layoutMindmap(props.mindmap));
const editingNodeId = ref<string>();
const draft = ref("");
const draggedId = ref<string>();
const dropHint = ref("");
const context = ref<{ x: number; y: number; id: string }>();
const reconnectingNodeId = ref<string>();
const zoom = ref(1);
const pan = ref({ x: 0, y: 0 });
const panning = ref<{
  x: number;
  y: number;
  originX: number;
  originY: number;
}>();
const colors = {
  schlicht: "#f7fbfb",
  organisch: "#f1f7ed",
  tafel: "#183d37",
  neon: "#15152d",
  pastell: "#fbf1f8",
};
const background = computed(() => colors[props.mindmap.settings.design]);

function select(id: string): void {
  const sourceId = reconnectingNodeId.value;
  if (sourceId && sourceId !== id) {
    emit("beginChange");
    if (moveMindmapNode(props.mindmap, sourceId, id)) {
      reconnectingNodeId.value = undefined;
      dropHint.value = `„${mindmapNode(props.mindmap, sourceId)?.text ?? "Ast"}“ wurde mit „${mindmapNode(props.mindmap, id)?.text ?? "Ast"}“ verbunden.`;
      emit("select", sourceId);
      emit("changed");
    } else {
      dropHint.value = "Dieser Knoten kann nicht mit sich selbst oder einem Unterast verbunden werden.";
    }
    host.value?.focus();
    return;
  }
  emit("select", id);
  host.value?.focus();
}
function startReconnect(): void {
  const sourceId = props.selectedNodeId;
  if (!sourceId || sourceId === props.mindmap.rootNodeId) return;
  reconnectingNodeId.value = sourceId;
  dropHint.value = `Zielknoten für „${mindmapNode(props.mindmap, sourceId)?.text ?? "Ast"}“ auswählen.`;
}
function cancelReconnect(): void {
  reconnectingNodeId.value = undefined;
  dropHint.value = "";
}
async function edit(node: MindmapNode): Promise<void> {
  if (!props.editing) {
    emit("editRequest");
    return;
  }
  emit("select", node.id);
  draft.value = node.text;
  editingNodeId.value = node.id;
  await nextTick();
  const input = host.value?.querySelector<HTMLInputElement>(".map-node input");
  input?.focus();
  input?.select();
}
function finishEdit(save: boolean): void {
  const node =
    editingNodeId.value && mindmapNode(props.mindmap, editingNodeId.value);
  if (node && save && node.text !== draft.value.trim()) {
    emit("beginChange");
    node.text = draft.value.trim() || "Neuer Ast";
    emit("changed");
  }
  editingNodeId.value = undefined;
  host.value?.focus();
}
function addChild(
  parentId = props.selectedNodeId ?? props.mindmap.rootNodeId,
): void {
  if (!props.editing) return;
  emit("beginChange");
  const child = addMindmapChild(props.mindmap, parentId);
  if (child) {
    emit("changed");
    void edit(child);
  }
}
function addSibling(
  nodeId = props.selectedNodeId ?? props.mindmap.rootNodeId,
): void {
  if (!props.editing) return;
  emit("beginChange");
  const sibling = addMindmapSibling(props.mindmap, nodeId);
  if (sibling) {
    emit("changed");
    void edit(sibling);
  }
}
function remove(id = props.selectedNodeId ?? props.mindmap.rootNodeId): void {
  if (!props.editing || !id) return;
  const descendants = branchIds(props.mindmap, id).size - 1;
  const prompt =
    id === props.mindmap.rootNodeId
      ? "Mindmap leeren? Der Wurzelknoten bleibt erhalten."
      : descendants
        ? `Dieser Ast enthält ${descendants} Unteräste. Soll der gesamte Ast gelöscht werden?`
        : "Diesen Ast löschen?";
  if (!window.confirm(prompt)) return;
  emit("beginChange");
  deleteMindmapBranch(props.mindmap, id);
  emit("select", props.mindmap.rootNodeId);
  emit("changed");
}
function duplicate(nodeId = props.selectedNodeId): void {
  if (!props.editing || !nodeId) return;
  emit("beginChange");
  const copy = duplicateMindmapBranch(props.mindmap, nodeId);
  if (copy) {
    emit("select", copy.id);
    emit("changed");
  }
}
function toggle(node: MindmapNode, event: MouseEvent): void {
  event.stopPropagation();
  emit("beginChange");
  node.collapsed = !node.collapsed;
  emit("changed");
}
function key(event: KeyboardEvent): void {
  if (!props.editing || editingNodeId.value) return;
  if ((event.target as HTMLElement).matches("input,button,select")) return;
  if (event.key === "Escape" && reconnectingNodeId.value) {
    event.preventDefault();
    cancelReconnect();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? emit("redo") : emit("undo");
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
    event.preventDefault();
    emit("redo");
    return;
  }
  if (event.key === "Insert") {
    event.preventDefault();
    addChild();
  } else if (event.key === "Enter") {
    event.preventDefault();
    addSibling();
  } else if (event.key === "Delete") {
    event.preventDefault();
    remove();
  } else if (event.key === "F2") {
    event.preventDefault();
    const node = mindmapNode(
      props.mindmap,
      props.selectedNodeId ?? props.mindmap.rootNodeId,
    );
    if (node) void edit(node);
  } else if (event.key.startsWith("Arrow")) {
    event.preventDefault();
    const nodes = layout.value.nodes.map((item) => item.node);
    const index = nodes.findIndex((node) => node.id === props.selectedNodeId);
    const next =
      nodes[
        (index +
          (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) +
          nodes.length) %
          nodes.length
      ];
    if (next) emit("select", next.id);
  }
}
function beginDrag(node: MindmapNode, event: DragEvent): void {
  if (
    !props.editing ||
    editingNodeId.value ||
    node.id === props.mindmap.rootNodeId
  ) {
    event.preventDefault();
    return;
  }
  draggedId.value = node.id;
  event.dataTransfer?.setData("text/plain", node.id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}
function overNode(node: MindmapNode, event: DragEvent): void {
  if (!draggedId.value || node.id === draggedId.value) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / rect.height;
  dropHint.value =
    ratio < 0.22 || ratio > 0.78
      ? `Vor/Nach „${node.text}“ einordnen`
      : `Unterordnen unter „${node.text}“`;
}
function dropOnNode(node: MindmapNode, event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  const source = draggedId.value && mindmapNode(props.mindmap, draggedId.value);
  if (!source || source.id === node.id) return;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / rect.height;
  const sameLevel = (ratio < 0.22 || ratio > 0.78) && node.parentId;
  const parentId = sameLevel ? node.parentId! : node.id;
  const beforeId = sameLevel && ratio < 0.22 ? node.id : undefined;
  if (parentId === source.parentId && !beforeId && ratio > 0.78) {
    const siblings = props.mindmap.nodes
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.order - b.order);
    const afterIndex = siblings.findIndex((item) => item.id === node.id);
    const next = siblings
      .slice(afterIndex + 1)
      .find((item) => item.id !== source.id);
    emit("beginChange");
    if (moveMindmapNode(props.mindmap, source.id, parentId, next?.id))
      emit("changed");
  } else {
    emit("beginChange");
    if (moveMindmapNode(props.mindmap, source.id, parentId, beforeId))
      emit("changed");
  }
  draggedId.value = undefined;
  dropHint.value = "";
}
function dropFree(event: DragEvent): void {
  if (!draggedId.value) return;
  event.preventDefault();
  const rect = host.value?.getBoundingClientRect();
  const node = mindmapNode(props.mindmap, draggedId.value);
  if (!rect || !node) return;
  emit("beginChange");
  if (props.mindmap.settings.autoLayout) {
    for (const item of layout.value.nodes) {
      item.node.x = item.x;
      item.node.y = item.y;
    }
    props.mindmap.settings.autoLayout = false;
  }
  node.x = Math.max(
    50,
    Math.min(
      MINDMAP_WIDTH - 50,
      ((event.clientX - rect.left - pan.value.x) / rect.width / zoom.value) *
        MINDMAP_WIDTH,
    ),
  );
  node.y = Math.max(
    35,
    Math.min(
      MINDMAP_HEIGHT - 35,
      ((event.clientY - rect.top - pan.value.y) / rect.height / zoom.value) *
        MINDMAP_HEIGHT,
    ),
  );
  draggedId.value = undefined;
  dropHint.value = "";
  emit("changed");
}
function startPan(event: PointerEvent): void {
  if (
    !props.editing ||
    (event.target as HTMLElement).closest(".map-node,.map-toolbar,.map-context")
  )
    return;
  event.stopPropagation();
  panning.value = {
    x: event.clientX,
    y: event.clientY,
    originX: pan.value.x,
    originY: pan.value.y,
  };
  host.value?.setPointerCapture?.(event.pointerId);
}
function movePan(event: PointerEvent): void {
  if (panning.value)
    pan.value = {
      x: panning.value.originX + event.clientX - panning.value.x,
      y: panning.value.originY + event.clientY - panning.value.y,
    };
}
function wheel(event: WheelEvent): void {
  if (!props.editing || !event.ctrlKey) return;
  event.preventDefault();
  zoom.value = Math.max(
    0.5,
    Math.min(2, zoom.value + (event.deltaY < 0 ? 0.1 : -0.1)),
  );
}
function center(): void {
  zoom.value = 1;
  pan.value = { x: 0, y: 0 };
}
function cycleDesign(): void {
  const designs = [
    "schlicht",
    "organisch",
    "tafel",
    "neon",
    "pastell",
  ] as const;
  const next =
    designs[
      (designs.indexOf(props.mindmap.settings.design) + 1) % designs.length
    ]!;
  emit("beginChange");
  props.mindmap.settings.design = next;
  emit("changed");
}
function contextMenu(node: MindmapNode, event: MouseEvent): void {
  if (!props.editing) return;
  event.preventDefault();
  event.stopPropagation();
  emit("select", node.id);
  const rect = host.value!.getBoundingClientRect();
  context.value = {
    x: Math.min(event.clientX - rect.left, rect.width - 180),
    y: Math.min(event.clientY - rect.top, rect.height - 280),
    id: node.id,
  };
  host.value?.focus();
}
function menuAction(
  action: "child" | "childImage" | "sibling" | "image" | "duplicate" | "delete",
): void {
  const id = context.value?.id;
  context.value = undefined;
  if (!id) return;
  emit("select", id);
  if (action === "child") addChild(id);
  if (action === "childImage") {
    emit("beginChange");
    const child = addMindmapChild(props.mindmap, id);
    if (child) {
      emit("select", child.id);
      emit("changed");
      emit("imageRequest", child.id);
    }
  }
  if (action === "sibling") addSibling(id);
  if (action === "image") emit("imageRequest", id);
  if (action === "duplicate") duplicate(id);
  if (action === "delete") remove(id);
}
function changeColor(
  node: MindmapNode,
  key: "textColor" | "backgroundColor" | "branchColor",
  event: Event,
): void {
  emit("beginChange");
  node.style[key] = (event.target as HTMLInputElement).value;
  emit("changed");
}
function changeSize(node: MindmapNode, event: Event): void {
  emit("beginChange");
  node.style.fontSize = Number((event.target as HTMLInputElement).value);
  emit("changed");
}
watch(
  () => props.editing,
  (editing) => {
    if (editing) {
      host.value?.focus();
      if (props.focusRoot) {
        const root = mindmapNode(props.mindmap, props.mindmap.rootNodeId);
        if (root) void edit(root);
      }
    } else {
      editingNodeId.value = undefined;
      context.value = undefined;
      reconnectingNodeId.value = undefined;
    }
  },
);
onMounted(() => {
  if (props.editing && props.focusRoot) {
    const root = mindmapNode(props.mindmap, props.mindmap.rootNodeId);
    if (root) void edit(root);
  }
});
</script>

<template>
  <div
    ref="host"
    class="mindmap-widget"
    :class="[mindmap.settings.design, { editing }]"
    :style="{ background }"
    :tabindex="editing ? 0 : -1"
    @keydown.stop="key"
    @wheel="wheel"
    @pointerdown="startPan"
    @pointermove="movePan"
    @pointerup="panning = undefined"
    @drop="dropFree"
    @dragover.prevent
  >
    <div
      class="map-content"
      :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
    >
      <svg
        class="map-edges"
        :viewBox="`0 0 ${MINDMAP_WIDTH} ${MINDMAP_HEIGHT}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          v-for="item in layout.edges"
          :key="item.edge.id"
          :d="item.path"
          fill="none"
          :stroke="item.color"
          :stroke-width="item.edge.style.width ?? 2"
          stroke-linecap="round"
        />
      </svg>
      <div
        v-for="item in layout.nodes"
        :key="item.node.id"
        class="map-node"
        :class="{
          selected: editing && selectedNodeId === item.node.id,
          reconnecting: reconnectingNodeId === item.node.id,
          root: item.node.id === mindmap.rootNodeId,
          collapsed: item.node.collapsed,
        }"
        :style="{
          left: `${(item.x / MINDMAP_WIDTH) * 100}%`,
          top: `${(item.y / MINDMAP_HEIGHT) * 100}%`,
          '--branch': item.color,
          background: item.node.style.backgroundColor,
          color: item.node.style.textColor,
          borderColor: item.node.style.borderColor || item.color,
          borderWidth: `${item.node.style.borderWidth ?? 2}px`,
          borderRadius: `${item.node.style.borderRadius ?? (mindmap.settings.design === 'organisch' ? 26 : 12)}px`,
          fontSize: `max(9px, ${((item.node.style.fontSize ?? 16) / MINDMAP_WIDTH) * 100}cqw)`,
          fontWeight: item.node.style.fontWeight ?? 600,
        }"
        :draggable="editing && editingNodeId !== item.node.id"
        @click.stop="editing ? select(item.node.id) : undefined"
        @dblclick.stop="edit(item.node)"
        @contextmenu="contextMenu(item.node, $event)"
        @dragstart="beginDrag(item.node, $event)"
        @dragover="overNode(item.node, $event)"
        @drop="dropOnNode(item.node, $event)"
        @dragend="
          draggedId = undefined;
          dropHint = '';
        "
      >
        <img
          v-if="item.node.image"
          :src="item.node.image.source"
          alt=""
          :style="{ objectFit: item.node.image.fit }"
        />
        <input
          v-if="editingNodeId === item.node.id"
          v-model="draft"
          :aria-label="`Text für ${item.node.text}`"
          @click.stop
          @keydown.enter.stop.prevent="finishEdit(true)"
          @keydown.esc.stop.prevent="finishEdit(false)"
          @blur="finishEdit(true)"
        />
        <span v-else>{{ item.node.text }}</span>
        <button
          v-if="
            editing &&
            mindmap.nodes.some((node) => node.parentId === item.node.id)
          "
          class="collapse"
          type="button"
          :aria-label="
            item.node.collapsed ? 'Ast aufklappen' : 'Ast einklappen'
          "
          @click="toggle(item.node, $event)"
        >
          {{ item.node.collapsed ? "▸" : "▾" }}
        </button>
      </div>
    </div>
    <div v-if="editing" class="map-toolbar" @pointerdown.stop>
      <button type="button" @click="addChild()">+ Unterast</button
      ><button type="button" @click="addSibling()">+ Geschwister</button
      ><button
        type="button"
        :disabled="!selectedNodeId || selectedNodeId === mindmap.rootNodeId"
        :aria-pressed="Boolean(reconnectingNodeId)"
        @click="reconnectingNodeId ? cancelReconnect() : startReconnect()"
      >{{ reconnectingNodeId ? "Verbindung abbrechen" : "Neu verbinden" }}</button
      ><button
        type="button"
        :disabled="!selectedNodeId"
        @click="selectedNodeId && emit('imageRequest', selectedNodeId)"
      >
        Bild</button
      ><button
        type="button"
        @click="
          emit('beginChange');
          mindmap.settings.autoLayout = !mindmap.settings.autoLayout;
          emit('changed');
        "
      >
        {{
          mindmap.settings.autoLayout ? "Auto-Layout ✓" : "Auto-Layout"
        }}</button
      ><button type="button" @click="center">Zentrieren</button
      ><button type="button" @click="cycleDesign">Stil</button
      ><button
        type="button"
          :aria-label="selectedNodeId ? 'Ausgewählten Ast löschen' : 'Mindmap leeren'"
          :title="selectedNodeId ? 'Ausgewählten Ast löschen' : 'Mindmap leeren'"
        @click="remove()"
      >
        🗑</button
      ><button type="button" @click="zoom = Math.max(0.5, zoom - 0.1)">−</button
      ><small>{{ Math.round(zoom * 100) }}%</small
      ><button type="button" @click="zoom = Math.min(2, zoom + 0.1)">+</button
      ><button type="button" @click="emit('finish')">
        Bearbeitung beenden
      </button>
    </div>
    <p v-if="editing && dropHint" class="drop-hint">{{ dropHint }}</p>
    <menu
      v-if="editing && context"
      class="map-context"
      :style="{ left: `${context.x}px`, top: `${context.y}px` }"
      @pointerdown.stop
    >
      <button type="button" @click="menuAction('child')">Neuer Unterast</button
      ><button type="button" @click="menuAction('childImage')">
        Unterast mit Bild</button
      ><button type="button" @click="menuAction('sibling')">
        Neuer Ast gleicher Ebene</button
      ><button type="button" @click="menuAction('image')">
        Bild hinzufügen</button
      ><label
        >Textfarbe
        <input
          type="color"
          :value="
            mindmapNode(mindmap, context.id)?.style.textColor || '#17363a'
          "
          @change="
            mindmapNode(mindmap, context.id) &&
            changeColor(mindmapNode(mindmap, context.id)!, 'textColor', $event)
          " /></label
      ><label
        >Hintergrund
        <input
          type="color"
          :value="
            mindmapNode(mindmap, context.id)?.style.backgroundColor || '#f7fbfb'
          "
          @change="
            mindmapNode(mindmap, context.id) &&
            changeColor(
              mindmapNode(mindmap, context.id)!,
              'backgroundColor',
              $event,
            )
          " /></label
      ><label
        >Astfarbe
        <input
          type="color"
          :value="
            mindmapNode(mindmap, context.id)?.style.branchColor || '#21b8b0'
          "
          @change="
            mindmapNode(mindmap, context.id) &&
            changeColor(
              mindmapNode(mindmap, context.id)!,
              'branchColor',
              $event,
            )
          " /></label
      ><label
        >Textgröße<input
          type="number"
          min="8"
          max="60"
          :value="mindmapNode(mindmap, context.id)?.style.fontSize ?? 16"
          @change="
            mindmapNode(mindmap, context.id) &&
            changeSize(mindmapNode(mindmap, context.id)!, $event)
          " /></label
      ><button type="button" @click="menuAction('duplicate')">
        Ast duplizieren</button
      ><button type="button" @click="menuAction('delete')">
        {{
          context.id === mindmap.rootNodeId ? "Mindmap leeren" : "Ast löschen"
        }}
      </button>
    </menu>
  </div>
</template>

<style scoped>
.mindmap-widget {
  position: relative;
  container-type: inline-size;
  width: 100%;
  height: 100%;
  overflow: hidden;
  outline: none;
  user-select: none;
  font-family: Inter, system-ui, sans-serif;
}
.mindmap-widget.editing {
  outline: 2px solid #23d4ce;
  cursor: grab;
}
.mindmap-widget.tafel,
.mindmap-widget.neon {
  color: #f4faf7;
}
.map-content {
  position: absolute;
  inset: 0;
  transform-origin: center;
  pointer-events: auto;
}
.map-edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.map-node {
  position: absolute;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 2px;
  width: 15%;
  min-height: 8%;
  padding: clamp(2px, 0.4cqw, 6px) clamp(3px, 0.7cqw, 9px);
  transform: translate(-50%, -50%);
  border: solid;
  box-shadow: 0 3px 10px #09252935;
  background: #f7fbfb;
  color: #17363a;
  text-align: center;
  font-size: 11px;
  line-height: 1.1;
  overflow: visible;
  cursor: default;
  word-break: break-word;
}
.map-node.root {
  width: 17%;
  border-width: 3px !important;
}
.editing .map-node {
  cursor: grab;
}
.map-node.selected {
  outline: 3px solid #16d7dc;
  outline-offset: 2px;
}
.map-node.reconnecting {
  outline: 4px solid #f0ae31;
  outline-offset: 3px;
}
.map-node img {
  max-width: 100%;
  max-height: 54px;
  border-radius: 5px;
}
.map-node input {
  width: 100%;
  min-width: 0;
  color: inherit;
  background: transparent;
  border: 0;
  text-align: center;
  font: inherit;
  outline: none;
}
.map-node .collapse {
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 50%;
  color: #fff;
  background: var(--branch);
  border: 1px solid #fff;
}
.organisch .map-node {
  border-radius: 28px;
}
.tafel .map-node {
  background: #23453e;
  color: #f3f6e9;
  box-shadow: 0 0 2px #fff;
}
.neon .map-node {
  background: #222246;
  color: #f5f0ff;
  box-shadow: 0 0 8px var(--branch);
}
.pastell .map-node {
  background: #fff7fb;
}
.map-toolbar {
  position: absolute;
  z-index: 8;
  top: 4px;
  left: 4px;
  right: 4px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  padding: 3px;
  background: #123036e8;
  border: 1px solid #418188;
  border-radius: 5px;
}
.map-toolbar button {
  padding: 3px 5px;
  color: #e9f8f7;
  background: #28535a;
  border: 0;
  border-radius: 3px;
  font-size: 11px;
  white-space: nowrap;
}
.map-toolbar button:last-child {
  margin-left: auto;
  background: #167a80;
}
.map-toolbar small {
  color: white;
  font-size: 11px;
  white-space: nowrap;
}
.drop-hint {
  position: absolute;
  z-index: 9;
  left: 10px;
  bottom: 8px;
  padding: 4px 7px;
  color: #dffffd;
  background: #123036d9;
  border-radius: 4px;
  font-size: 12px;
}
.map-context {
  position: absolute;
  z-index: 20;
  display: grid;
  gap: 2px;
  min-width: 175px;
  margin: 0;
  padding: 5px;
  color: #e8f8f7;
  background: #17343a;
  border: 1px solid #50969a;
  border-radius: 5px;
  box-shadow: 0 8px 20px #0008;
}
.map-context button,
.map-context label {
  padding: 4px 6px;
  color: inherit;
  background: transparent;
  border: 0;
  text-align: left;
  font-size: 12px;
}
.map-context label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.map-context input {
  width: 34px;
  height: 22px;
  padding: 0;
}
</style>
