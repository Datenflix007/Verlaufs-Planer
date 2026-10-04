<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createId } from '../domain/factories'
import type { AppearanceColorKey, DashboardBreakpoint, DashboardWidget, InventoryScope, MaterialResourceType, PriorityDefinition, WorkspaceSettings } from '../domain/types'
import { useAppearanceStore } from '../stores/appearanceStore'
import { appearanceColorPresets } from '../data/appearanceColors'
import DashboardEditor from '../components/dashboard/DashboardEditor.vue'
import { defaultDashboardGridColumns, defaultDashboardWidgets } from '../data/dashboardWidgets'
import { reorderPriorities } from '../domain/priorities'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import { useProjectStore } from '../stores/projectStore'

const repository = new WorkspaceRepository(); const router = useRouter(); const projectStore = useProjectStore(); const appearanceStore = useAppearanceStore(); const workspace = ref<WorkspaceSettings>(); const message = ref(''); const error = ref('')
const buildingName = ref(''); const roomName = ref(''); const roomBuildingId = ref(''); const inventoryName = ref(''); const inventoryQuantity = ref(''); const inventoryScope = ref<InventoryScope>('personal'); const inventoryBuildingId = ref(''); const inventoryRoomId = ref(''); const todoTitle = ref(''); const todoDate = ref(''); const todoPriorityId = ref('medium'); const dashboardSaving = ref(false); const priorityDragId = ref<string>(); let dashboardSaveTimer: ReturnType<typeof setTimeout> | undefined
const materialTypes: MaterialResourceType[] = ['physical', 'file', 'worksheet', 'link', 'interactive-html']; const inventoryType = ref<MaterialResourceType>('physical')
const backgroundImageError = ref('')
const appearancePalettes = [{ id: 'lagoon', label: 'Lagune' }, { id: 'forest', label: 'Wald' }, { id: 'berry', label: 'Beere' }, { id: 'citrus', label: 'Zitrus' }] as const
const appearanceColorRoles: Array<{ key: AppearanceColorKey; label: string }> = [
  { key: 'pageBackground', label: 'Seitenhintergrund' },
  { key: 'surface', label: 'Panels und Karten' },
  { key: 'raisedSurface', label: 'Eingaben und erhöhte Flächen' },
  { key: 'text', label: 'Haupttext' },
  { key: 'mutedText', label: 'Sekundärtext' },
  { key: 'border', label: 'Rahmen und Trennlinien' },
  { key: 'action', label: 'Aktionsflächen' },
  { key: 'actionText', label: 'Text auf Aktionsflächen' },
]
const roomsForInventory = computed(() => (workspace.value?.rooms ?? []).filter((room) => !inventoryBuildingId.value || room.buildingId === inventoryBuildingId.value))
async function load(): Promise<void> { try { workspace.value = await repository.get(); appearanceStore.apply(workspace.value.appearance) } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Arbeitsbereich konnte nicht geladen werden.' } }
onMounted(() => void load())
onBeforeUnmount(() => { if (dashboardSaveTimer) clearTimeout(dashboardSaveTimer) })
async function save(note = 'Einstellungen gespeichert.'): Promise<void> { if (!workspace.value) return; try { workspace.value = await repository.save(workspace.value); message.value = note; error.value = '' } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Einstellungen konnten nicht gespeichert werden.' } }
async function addBuilding(): Promise<void> { if (!workspace.value || !buildingName.value.trim()) return; workspace.value.buildings.push({ id: createId(), name: buildingName.value.trim() }); buildingName.value = ''; await save('Gebäude gespeichert.') }
async function addRoom(): Promise<void> { if (!workspace.value || !roomName.value.trim() || !roomBuildingId.value) return; workspace.value.rooms.push({ id: createId(), buildingId: roomBuildingId.value, name: roomName.value.trim() }); roomName.value = ''; await save('Raum gespeichert.') }
async function addInventory(): Promise<void> { if (!workspace.value || !inventoryName.value.trim()) return; const scope = inventoryScope.value; if ((scope === 'building' || scope === 'room') && !inventoryBuildingId.value) { error.value = 'Für Gebäude- oder Raumbestand wählen Sie ein Gebäude.'; return } if (scope === 'room' && !inventoryRoomId.value) { error.value = 'Für Raumbestand wählen Sie einen Raum.'; return }; workspace.value.inventoryMaterials.push({ id: createId(), name: inventoryName.value.trim(), quantity: inventoryQuantity.value || undefined, resourceType: inventoryType.value, scope, buildingId: scope === 'personal' ? undefined : inventoryBuildingId.value, roomId: scope === 'room' ? inventoryRoomId.value : undefined }); inventoryName.value = ''; inventoryQuantity.value = ''; await save('Bestandsmaterial gespeichert.') }
async function addTodo(): Promise<void> { if (!workspace.value || !todoTitle.value.trim()) return; workspace.value.todos.push({ id: createId(), title: todoTitle.value.trim(), dueDate: todoDate.value || undefined, priorityId: todoPriorityId.value || undefined, completed: false }); todoTitle.value = ''; todoDate.value = ''; todoPriorityId.value = 'medium'; await save('Aufgabe gespeichert.') }
async function remove(kind: 'buildings' | 'rooms' | 'inventoryMaterials' | 'todos', id: string): Promise<void> { if (!workspace.value) return; if (kind === 'buildings') { workspace.value.buildings = workspace.value.buildings.filter((item) => item.id !== id); workspace.value.rooms = workspace.value.rooms.filter((item) => item.buildingId !== id) } else workspace.value[kind] = workspace.value[kind].filter((item) => item.id !== id) as never; await save('Eintrag entfernt.') }
async function toggleTodo(id: string): Promise<void> { if (!workspace.value) return; const todo = workspace.value.todos.find((item) => item.id === id); if (todo) { todo.completed = !todo.completed; await save('Aufgabe aktualisiert.') } }
async function updateTodoPriority(id: string, event: Event): Promise<void> { if (!workspace.value) return; const todo = workspace.value.todos.find((item) => item.id === id); if (!todo) return; todo.priorityId = (event.target as HTMLSelectElement).value || undefined; await save('Aufgabenpriorität gespeichert.') }
async function saveDashboard(note = 'Dashboard gespeichert.'): Promise<void> { if (dashboardSaveTimer) clearTimeout(dashboardSaveTimer); dashboardSaving.value = true; await save(note); dashboardSaving.value = false }
function scheduleWorkspaceSave(note: string): void {
  if (dashboardSaveTimer) clearTimeout(dashboardSaveTimer)
  dashboardSaveTimer = setTimeout(() => {
    dashboardSaveTimer = undefined
    void saveDashboard(note)
  }, 450)
}
function applyPriorityOrder(priorities: PriorityDefinition[]): void {
  if (!workspace.value) return
  workspace.value.priorities = priorities
  scheduleWorkspaceSave('Prioritäten automatisch gespeichert.')
}
function movePriority(id: string, offset: -1 | 1): void {
  if (!workspace.value) return
  const currentIndex = workspace.value.priorities.findIndex((priority) => priority.id === id)
  const nextIndex = currentIndex + offset
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= workspace.value.priorities.length) return
  applyPriorityOrder(reorderPriorities(workspace.value.priorities, id, workspace.value.priorities[nextIndex]!.id))
}
function startPriorityDrag(id: string, event: DragEvent): void {
  priorityDragId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function dropPriority(targetId: string, event: DragEvent): void {
  const sourceId = event.dataTransfer?.getData('text/plain') || priorityDragId.value
  priorityDragId.value = undefined
  if (!workspace.value || !sourceId || sourceId === targetId) return
  applyPriorityOrder(reorderPriorities(workspace.value.priorities, sourceId, targetId))
}
async function saveAppearance(): Promise<void> { if (!workspace.value) return; appearanceStore.apply(workspace.value.appearance); await save('Erscheinungsbild gespeichert.') }
function updateAppearanceColor(key: AppearanceColorKey, event: Event): void {
  if (!workspace.value) return
  const value = (event.target as HTMLInputElement).value
  workspace.value.appearance.colorOverrides = { ...workspace.value.appearance.colorOverrides, [key]: value }
  appearanceStore.apply(workspace.value.appearance)
}
async function resetAppearanceColors(): Promise<void> {
  if (!workspace.value) return
  workspace.value.appearance.colorOverrides = undefined
  await saveAppearance()
}
function loadBackgroundImage(event: Event): void {
  if (!workspace.value) return
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { backgroundImageError.value = 'Bitte eine Bilddatei auswählen.'; return }
  if (file.size > 2_000_000) { backgroundImageError.value = 'Das Bild darf höchstens 2 MB groß sein.'; return }
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result !== 'string') return
    workspace.value!.appearance.backgroundImageData = reader.result
    workspace.value!.appearance.background = 'image'
    backgroundImageError.value = ''
    void saveAppearance()
  }
  reader.readAsDataURL(file)
  ;(event.target as HTMLInputElement).value = ''
}
function updateDashboard(widgets: DashboardWidget[]): void { if (!workspace.value) return; workspace.value.dashboard = widgets; scheduleWorkspaceSave('Dashboard-Änderungen automatisch gespeichert.') }
function updateGridColumns(columns: Record<DashboardBreakpoint, number>): void { if (!workspace.value) return; workspace.value.dashboardGridColumns = columns; scheduleWorkspaceSave('Dashboard-Änderungen automatisch gespeichert.') }
async function resetDashboard(): Promise<void> { if (!workspace.value) return; workspace.value.dashboard = defaultDashboardWidgets(); workspace.value.dashboardGridColumns = { ...defaultDashboardGridColumns }; await saveDashboard() }
async function importProject(event: Event): Promise<void> { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; try { const plan = await projectStore.importProject(JSON.parse(await file.text())); await router.push({ name: 'editor', params: { id: plan.id } }) } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Import fehlgeschlagen.' } finally { (event.target as HTMLInputElement).value = '' } }
</script>

<template>
  <main class="settings-shell" v-if="workspace">
    <section class="settings-card appearance-settings">
      <div class="section-heading"><h2>Erscheinungsbild</h2><p>Farben, Modus und Seitenhintergrund für den gesamten Verlaufsplaner anpassen.</p></div>
      <div class="appearance-controls">
        <fieldset class="appearance-field">
          <legend>Darstellung</legend>
          <div class="appearance-mode-switch" role="group" aria-label="Darstellungsmodus">
            <button v-for="mode in [{ id: 'light', label: 'Hell' }, { id: 'dark', label: 'Dunkel' }, { id: 'system', label: 'System' }] as const" :key="mode.id" type="button" :class="{ active: workspace.appearance.mode === mode.id }" :aria-pressed="workspace.appearance.mode === mode.id" @click="workspace.appearance.mode = mode.id; saveAppearance()">{{ mode.label }}</button>
          </div>
        </fieldset>
        <fieldset class="appearance-field">
          <legend>Farbset</legend>
          <div class="palette-picker" role="group" aria-label="Farbset">
            <button v-for="palette in appearancePalettes" :key="palette.id" type="button" class="palette-swatch" :class="{ active: workspace.appearance.palette === palette.id }" :aria-label="palette.label" :aria-pressed="workspace.appearance.palette === palette.id" :title="palette.label" :style="{ '--swatch-bg': appearanceColorPresets[palette.id].light.pageBackground, '--swatch-surface': appearanceColorPresets[palette.id].light.surface, '--swatch-action': appearanceColorPresets[palette.id].light.action, '--swatch-text': appearanceColorPresets[palette.id].light.text }" @click="workspace.appearance.palette = palette.id; workspace.appearance.colorOverrides = undefined; saveAppearance()"><span class="palette-preview" aria-hidden="true"><i></i><i></i><i></i><i></i></span><small>{{ palette.label }}</small></button>
          </div>
        </fieldset>
        <fieldset class="appearance-field appearance-color-field">
          <legend>UI-Farben einzeln anpassen</legend>
          <p class="appearance-help">Ändert gezielt Seitenfläche, Karten, Texte, Rahmen und Aktionsflächen. Die Vorschau aktualisiert sich sofort.</p>
          <div class="appearance-role-grid">
            <label v-for="role in appearanceColorRoles" :key="role.key" class="appearance-color-role">
              <span>{{ role.label }}</span>
              <span class="appearance-color-input"><input type="color" :aria-label="role.label" :value="appearanceStore.colors[role.key]" @input="updateAppearanceColor(role.key, $event)" @change="saveAppearance" /><code>{{ appearanceStore.colors[role.key] }}</code></span>
            </label>
          </div>
          <button type="button" class="secondary appearance-reset-colors" :disabled="!workspace.appearance.colorOverrides || !Object.keys(workspace.appearance.colorOverrides).length" @click="resetAppearanceColors">Individuelle Farben zurücksetzen</button>
        </fieldset>
        <label class="appearance-field background-field">Hintergrund
          <select v-model="workspace.appearance.background" @change="saveAppearance">
            <option value="mist">Sanfter Farbton</option>
            <option value="plain">Einfarbig</option>
            <option value="grid">Feines Raster</option>
            <option value="gradient">Eigener Farbverlauf</option>
            <option value="image">Eigenes Hintergrundbild</option>
          </select>
        </label>
        <label v-if="workspace.appearance.background === 'gradient'" class="appearance-field gradient-colors">Verlaufsfarben
          <span class="gradient-color-pair">
            <input v-model="workspace.appearance.gradientStart" type="color" aria-label="Erste Verlaufsfarbe" @input="appearanceStore.apply(workspace.appearance)" @change="saveAppearance" />
            <input v-model="workspace.appearance.gradientEnd" type="color" aria-label="Zweite Verlaufsfarbe" @input="appearanceStore.apply(workspace.appearance)" @change="saveAppearance" />
          </span>
        </label>
        <div v-if="workspace.appearance.background === 'image'" class="appearance-field background-image-control">
          <label class="file-label">Hintergrundbild auswählen<input type="file" accept="image/*" @change="loadBackgroundImage"></label>
          <button v-if="workspace.appearance.backgroundImageData" type="button" class="secondary" @click="workspace.appearance.backgroundImageData = undefined; workspace.appearance.background = 'mist'; saveAppearance()">Bild entfernen</button>
          <small v-if="backgroundImageError" class="error-message">{{ backgroundImageError }}</small>
        </div>
      </div>
      <div class="appearance-contrast-preview">
        <div class="contrast-sample-card"><strong>Beispielkarte</strong><p>Lesbarer Oberflächentext</p><small>Sekundärer Hinweistext</small></div>
        <button type="button" class="contrast-sample-action">Aktionsbutton</button>
        <div class="contrast-results">
          <span :class="{ pass: appearanceStore.textContrast >= 4.5, warning: appearanceStore.textContrast < 4.5 }">Textkontrast <strong>{{ appearanceStore.textContrast.toFixed(2) }}:1</strong><small>{{ appearanceStore.textContrast >= 4.5 ? 'Gut lesbar' : 'Zu niedrig (Ziel: 4,5:1)' }}</small></span>
          <span :class="{ pass: appearanceStore.actionContrast >= 4.5, warning: appearanceStore.actionContrast < 4.5 }">Buttonkontrast <strong>{{ appearanceStore.actionContrast.toFixed(2) }}:1</strong><small>{{ appearanceStore.actionContrast >= 4.5 ? 'Gut lesbar' : 'Zu niedrig (Ziel: 4,5:1)' }}</small></span>
        </div>
      </div>
    </section>
    <section class="settings-card"><div class="section-heading"><h2>Planung importieren</h2><p>Importieren Sie eine zuvor exportierte JSON-Planung. Nach der Prüfung wird sie direkt im Editor geöffnet.</p></div><label class="file-label">JSON importieren<input type="file" accept="application/json,.json" @change="importProject"></label></section>
    <DashboardEditor :model-value="workspace.dashboard" :grid-columns="workspace.dashboardGridColumns" :saving="dashboardSaving" @update:model-value="updateDashboard" @update:grid-columns="updateGridColumns" @save="saveDashboard" @reset="resetDashboard" />
    <section class="settings-card"><div class="section-heading"><h2>Gebäude und Räume</h2><p>Diese Auswahl steht beim Anlegen und in den allgemeinen Angaben einer Planung bereit.</p></div><div class="settings-two-column"><form class="stack-form" @submit.prevent="addBuilding"><label>Gebäude<input v-model="buildingName" placeholder="z. B. Hauptgebäude"></label><button type="submit">Gebäude hinzufügen</button></form><form class="stack-form" @submit.prevent="addRoom"><label>Gebäude<select v-model="roomBuildingId" required><option value="">Auswählen</option><option v-for="building in workspace.buildings" :key="building.id" :value="building.id">{{ building.name }}</option></select></label><label>Raum<input v-model="roomName" placeholder="z. B. 2.14"></label><button type="submit">Raum hinzufügen</button></form></div><div class="settings-list"><article v-for="building in workspace.buildings" :key="building.id"><div><strong>{{ building.name }}</strong><small>{{ workspace.rooms.filter((room) => room.buildingId === building.id).map((room) => room.name).join(', ') || 'Noch keine Räume' }}</small></div><button type="button" class="danger" @click="remove('buildings', building.id)">Entfernen</button></article></div></section>
    <section class="settings-card"><div class="section-heading"><h2>Materialbestand</h2><p>Bestand ist entweder Ihrem Privatbestand, einem Gebäude oder einem konkreten Raum zugeordnet und kann anschließend in Planungen übernommen werden.</p></div><form class="inventory-form" @submit.prevent="addInventory"><label>Bezeichnung<input v-model="inventoryName" required placeholder="z. B. Beamer"></label><label>Menge<input v-model="inventoryQuantity" placeholder="z. B. 1"></label><label>Typ<select v-model="inventoryType"><option v-for="type in materialTypes" :key="type" :value="type">{{ type }}</option></select></label><label>Bestand<select v-model="inventoryScope"><option value="personal">Referenten-/Lehrerprivatbestand</option><option value="building">Gebäude</option><option value="room">Raum</option></select></label><label v-if="inventoryScope !== 'personal'">Gebäude<select v-model="inventoryBuildingId"><option value="">Auswählen</option><option v-for="building in workspace.buildings" :key="building.id" :value="building.id">{{ building.name }}</option></select></label><label v-if="inventoryScope === 'room'">Raum<select v-model="inventoryRoomId"><option value="">Auswählen</option><option v-for="room in roomsForInventory" :key="room.id" :value="room.id">{{ room.name }}</option></select></label><button type="submit">Bestandsmaterial speichern</button></form><div class="settings-list"><article v-for="material in workspace.inventoryMaterials" :key="material.id"><div><strong>{{ material.name }}</strong><small>{{ material.scope === 'personal' ? 'Privatbestand' : material.scope === 'room' ? 'Raumbestand' : 'Gebäudebestand' }}{{ material.quantity ? ` · ${material.quantity}` : '' }}</small></div><button type="button" class="danger" @click="remove('inventoryMaterials', material.id)">Entfernen</button></article></div></section>
    <section class="settings-card priority-settings">
      <div class="section-heading">
        <h2>Prioritäten</h2>
        <p id="priority-order-help">Die oberste Priorität erscheint zuerst. Ziehen Sie eine Zeile an ihrem Griff an die gewünschte Stelle oder nutzen Sie die Pfeil-Schaltflächen. Änderungen werden automatisch gespeichert.</p>
      </div>
      <ol class="priority-list" aria-describedby="priority-order-help" aria-label="Reihenfolge der Prioritäten">
        <li
          v-for="(priority, index) in workspace.priorities"
          :key="priority.id"
          class="priority-row"
          :class="{ dragging: priorityDragId === priority.id }"
          @dragover.prevent
          @drop.prevent="dropPriority(priority.id, $event)"
        >
          <button type="button" class="priority-drag-handle" draggable="true" :aria-label="`${priority.label} ziehen, um die Reihenfolge zu ändern`" title="Zum Verschieben ziehen" @dragstart="startPriorityDrag(priority.id, $event)" @dragend="priorityDragId = undefined">⠿</button>
          <span class="priority-icon" aria-hidden="true">{{ priority.icon }}</span>
          <div class="priority-copy"><strong>{{ priority.label }}</strong><small>Gewicht {{ priority.weight }} · Rang {{ index + 1 }}</small></div>
          <div class="priority-actions" aria-label="Reihenfolge per Tastatur ändern">
            <button type="button" class="secondary" :disabled="index === 0" :aria-label="`${priority.label} eine Position nach oben`" @click="movePriority(priority.id, -1)">↑</button>
            <button type="button" class="secondary" :disabled="index === workspace.priorities.length - 1" :aria-label="`${priority.label} eine Position nach unten`" @click="movePriority(priority.id, 1)">↓</button>
          </div>
        </li>
      </ol>
    </section>
    <section class="settings-card"><div class="section-heading"><h2>Aufgaben</h2><p>Aufgaben mit Datum erscheinen im Dashboard und im Kalender.</p></div><form class="settings-two-column" @submit.prevent="addTodo"><label>Aufgabe<input v-model="todoTitle" required placeholder="z. B. Arbeitsblätter drucken"></label><label>Fällig am<input v-model="todoDate" type="date"></label><label>Priorität<select v-model="todoPriorityId"><option v-for="priority in workspace.priorities" :key="priority.id" :value="priority.id">{{ priority.icon }} {{ priority.label }}</option></select></label><button type="submit">Aufgabe hinzufügen</button></form><div class="settings-list"><article v-for="todo in workspace.todos" :key="todo.id"><label class="todo-toggle"><input type="checkbox" :checked="todo.completed" @change="toggleTodo(todo.id)"><span :class="{ completed: todo.completed }">{{ todo.title }} <small>{{ todo.dueDate || 'ohne Termin' }}</small></span></label><label class="todo-priority">Priorität<select :value="todo.priorityId ?? 'medium'" :aria-label="`Priorität für ${todo.title}`" @change="updateTodoPriority(todo.id, $event)"><option v-for="priority in workspace.priorities" :key="priority.id" :value="priority.id">{{ priority.icon }} {{ priority.label }}</option></select></label><button type="button" class="danger" @click="remove('todos', todo.id)">Entfernen</button></article></div></section>
    <p v-if="message" class="success-message">{{ message }}</p><p v-if="error" class="error-message">{{ error }}</p>
  </main>
  <main v-else class="loading">Arbeitsbereich wird geladen ...</main>
</template>

<style scoped>
.priority-list { display: grid; gap: .5rem; padding: 0; margin: 0; list-style: none }
.priority-row { display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; gap: .65rem; align-items: center; padding: .65rem .75rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-raised); transition: border-color .15s ease, background-color .15s ease, opacity .15s ease }
.priority-row:focus-within { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent) }
.priority-row.dragging { opacity: .55; background: var(--accent-soft); border-style: dashed }
.priority-drag-handle { min-width: 2.2rem; padding: .35rem; color: var(--muted); border-color: transparent; background: transparent; cursor: grab; font-size: 1.1rem; line-height: 1 }
.priority-drag-handle:hover { color: var(--accent-strong); background: var(--accent-soft) }
.priority-drag-handle:active { cursor: grabbing }
.priority-icon { display: grid; place-items: center; width: 2rem; height: 2rem; color: var(--accent-strong); border-radius: 50%; background: var(--accent-soft); font-weight: 800 }
.priority-copy { display: grid; gap: .1rem; min-width: 0 }
.priority-copy small { color: var(--muted); font-size: .78rem }
.priority-actions { display: flex; gap: .35rem }
.priority-actions button { min-width: 2.35rem; padding: .35rem .5rem }
@media (max-width: 520px) { .priority-row { grid-template-columns: auto auto 1fr; gap: .45rem }.priority-actions { grid-column: 3; justify-content: flex-start } }
@media (prefers-reduced-motion: reduce) { .priority-row { transition: none } }
</style>
