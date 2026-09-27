<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createId } from '../domain/factories'
import type { DashboardBreakpoint, DashboardWidget, InventoryScope, MaterialResourceType, WorkspaceSettings } from '../domain/types'
import { useAppearanceStore } from '../stores/appearanceStore'
import DashboardEditor from '../components/dashboard/DashboardEditor.vue'
import { defaultDashboardGridColumns, defaultDashboardWidgets } from '../data/dashboardWidgets'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import { useProjectStore } from '../stores/projectStore'

const repository = new WorkspaceRepository(); const router = useRouter(); const projectStore = useProjectStore(); const appearanceStore = useAppearanceStore(); const workspace = ref<WorkspaceSettings>(); const message = ref(''); const error = ref('')
const buildingName = ref(''); const roomName = ref(''); const roomBuildingId = ref(''); const inventoryName = ref(''); const inventoryQuantity = ref(''); const inventoryScope = ref<InventoryScope>('personal'); const inventoryBuildingId = ref(''); const inventoryRoomId = ref(''); const todoTitle = ref(''); const todoDate = ref(''); const dashboardSaving = ref(false); let dashboardSaveTimer: ReturnType<typeof setTimeout> | undefined
const materialTypes: MaterialResourceType[] = ['physical', 'file', 'worksheet', 'link', 'interactive-html']; const inventoryType = ref<MaterialResourceType>('physical')
const roomsForInventory = computed(() => (workspace.value?.rooms ?? []).filter((room) => !inventoryBuildingId.value || room.buildingId === inventoryBuildingId.value))
async function load(): Promise<void> { try { workspace.value = await repository.get(); appearanceStore.apply(workspace.value.appearance) } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Arbeitsbereich konnte nicht geladen werden.' } }
onMounted(() => void load())
onBeforeUnmount(() => { if (dashboardSaveTimer) clearTimeout(dashboardSaveTimer) })
async function save(note = 'Einstellungen gespeichert.'): Promise<void> { if (!workspace.value) return; try { workspace.value = await repository.save(workspace.value); message.value = note; error.value = '' } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Einstellungen konnten nicht gespeichert werden.' } }
async function addBuilding(): Promise<void> { if (!workspace.value || !buildingName.value.trim()) return; workspace.value.buildings.push({ id: createId(), name: buildingName.value.trim() }); buildingName.value = ''; await save('Gebäude gespeichert.') }
async function addRoom(): Promise<void> { if (!workspace.value || !roomName.value.trim() || !roomBuildingId.value) return; workspace.value.rooms.push({ id: createId(), buildingId: roomBuildingId.value, name: roomName.value.trim() }); roomName.value = ''; await save('Raum gespeichert.') }
async function addInventory(): Promise<void> { if (!workspace.value || !inventoryName.value.trim()) return; const scope = inventoryScope.value; if ((scope === 'building' || scope === 'room') && !inventoryBuildingId.value) { error.value = 'Für Gebäude- oder Raumbestand wählen Sie ein Gebäude.'; return } if (scope === 'room' && !inventoryRoomId.value) { error.value = 'Für Raumbestand wählen Sie einen Raum.'; return }; workspace.value.inventoryMaterials.push({ id: createId(), name: inventoryName.value.trim(), quantity: inventoryQuantity.value || undefined, resourceType: inventoryType.value, scope, buildingId: scope === 'personal' ? undefined : inventoryBuildingId.value, roomId: scope === 'room' ? inventoryRoomId.value : undefined }); inventoryName.value = ''; inventoryQuantity.value = ''; await save('Bestandsmaterial gespeichert.') }
async function addTodo(): Promise<void> { if (!workspace.value || !todoTitle.value.trim()) return; workspace.value.todos.push({ id: createId(), title: todoTitle.value.trim(), dueDate: todoDate.value || undefined, completed: false }); todoTitle.value = ''; todoDate.value = ''; await save('Aufgabe gespeichert.') }
async function remove(kind: 'buildings' | 'rooms' | 'inventoryMaterials' | 'todos', id: string): Promise<void> { if (!workspace.value) return; if (kind === 'buildings') { workspace.value.buildings = workspace.value.buildings.filter((item) => item.id !== id); workspace.value.rooms = workspace.value.rooms.filter((item) => item.buildingId !== id) } else workspace.value[kind] = workspace.value[kind].filter((item) => item.id !== id) as never; await save('Eintrag entfernt.') }
async function toggleTodo(id: string): Promise<void> { if (!workspace.value) return; const todo = workspace.value.todos.find((item) => item.id === id); if (todo) { todo.completed = !todo.completed; await save('Aufgabe aktualisiert.') } }
async function saveDashboard(note = 'Dashboard gespeichert.'): Promise<void> { if (dashboardSaveTimer) clearTimeout(dashboardSaveTimer); dashboardSaving.value = true; await save(note); dashboardSaving.value = false }
async function saveAppearance(): Promise<void> { if (!workspace.value) return; appearanceStore.apply(workspace.value.appearance); await save('Erscheinungsbild gespeichert.') }
function updateDashboard(widgets: DashboardWidget[]): void { if (!workspace.value) return; workspace.value.dashboard = widgets; if (dashboardSaveTimer) clearTimeout(dashboardSaveTimer); dashboardSaveTimer = setTimeout(() => { dashboardSaveTimer = undefined; void saveDashboard('Dashboard-Änderungen automatisch gespeichert.') }, 450) }
function updateGridColumns(columns: Record<DashboardBreakpoint, number>): void { if (!workspace.value) return; workspace.value.dashboardGridColumns = columns; if (dashboardSaveTimer) clearTimeout(dashboardSaveTimer); dashboardSaveTimer = setTimeout(() => { dashboardSaveTimer = undefined; void saveDashboard('Dashboard-Änderungen automatisch gespeichert.') }, 450) }
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
            <button v-for="palette in [{ id: 'lagoon', label: 'Lagune', color: '#1d777f' }, { id: 'forest', label: 'Wald', color: '#47734f' }, { id: 'berry', label: 'Beere', color: '#a54863' }, { id: 'citrus', label: 'Zitrus', color: '#b57522' }] as const" :key="palette.id" type="button" class="palette-swatch" :class="{ active: workspace.appearance.palette === palette.id }" :aria-label="palette.label" :aria-pressed="workspace.appearance.palette === palette.id" :title="palette.label" :style="{ '--swatch-color': palette.color }" @click="workspace.appearance.palette = palette.id; saveAppearance()"><span aria-hidden="true"></span><small>{{ palette.label }}</small></button>
          </div>
        </fieldset>
        <label class="appearance-field background-field">Hintergrund
          <select v-model="workspace.appearance.background" @change="saveAppearance">
            <option value="mist">Sanfter Farbton</option>
            <option value="plain">Einfarbig</option>
            <option value="grid">Feines Raster</option>
          </select>
        </label>
      </div>
    </section>
    <section class="settings-card"><div class="section-heading"><h2>Planung importieren</h2><p>Importieren Sie eine zuvor exportierte JSON-Planung. Nach der Prüfung wird sie direkt im Editor geöffnet.</p></div><label class="file-label">JSON importieren<input type="file" accept="application/json,.json" @change="importProject"></label></section>
    <DashboardEditor :model-value="workspace.dashboard" :grid-columns="workspace.dashboardGridColumns" :saving="dashboardSaving" @update:model-value="updateDashboard" @update:grid-columns="updateGridColumns" @save="saveDashboard" @reset="resetDashboard" />
    <section class="settings-card"><div class="section-heading"><h2>Gebäude und Räume</h2><p>Diese Auswahl steht beim Anlegen und in den allgemeinen Angaben einer Planung bereit.</p></div><div class="settings-two-column"><form class="stack-form" @submit.prevent="addBuilding"><label>Gebäude<input v-model="buildingName" placeholder="z. B. Hauptgebäude"></label><button type="submit">Gebäude hinzufügen</button></form><form class="stack-form" @submit.prevent="addRoom"><label>Gebäude<select v-model="roomBuildingId" required><option value="">Auswählen</option><option v-for="building in workspace.buildings" :key="building.id" :value="building.id">{{ building.name }}</option></select></label><label>Raum<input v-model="roomName" placeholder="z. B. 2.14"></label><button type="submit">Raum hinzufügen</button></form></div><div class="settings-list"><article v-for="building in workspace.buildings" :key="building.id"><div><strong>{{ building.name }}</strong><small>{{ workspace.rooms.filter((room) => room.buildingId === building.id).map((room) => room.name).join(', ') || 'Noch keine Räume' }}</small></div><button type="button" class="danger" @click="remove('buildings', building.id)">Entfernen</button></article></div></section>
    <section class="settings-card"><div class="section-heading"><h2>Materialbestand</h2><p>Bestand ist entweder Ihrem Privatbestand, einem Gebäude oder einem konkreten Raum zugeordnet und kann anschließend in Planungen übernommen werden.</p></div><form class="inventory-form" @submit.prevent="addInventory"><label>Bezeichnung<input v-model="inventoryName" required placeholder="z. B. Beamer"></label><label>Menge<input v-model="inventoryQuantity" placeholder="z. B. 1"></label><label>Typ<select v-model="inventoryType"><option v-for="type in materialTypes" :key="type" :value="type">{{ type }}</option></select></label><label>Bestand<select v-model="inventoryScope"><option value="personal">Referenten-/Lehrerprivatbestand</option><option value="building">Gebäude</option><option value="room">Raum</option></select></label><label v-if="inventoryScope !== 'personal'">Gebäude<select v-model="inventoryBuildingId"><option value="">Auswählen</option><option v-for="building in workspace.buildings" :key="building.id" :value="building.id">{{ building.name }}</option></select></label><label v-if="inventoryScope === 'room'">Raum<select v-model="inventoryRoomId"><option value="">Auswählen</option><option v-for="room in roomsForInventory" :key="room.id" :value="room.id">{{ room.name }}</option></select></label><button type="submit">Bestandsmaterial speichern</button></form><div class="settings-list"><article v-for="material in workspace.inventoryMaterials" :key="material.id"><div><strong>{{ material.name }}</strong><small>{{ material.scope === 'personal' ? 'Privatbestand' : material.scope === 'room' ? 'Raumbestand' : 'Gebäudebestand' }}{{ material.quantity ? ` · ${material.quantity}` : '' }}</small></div><button type="button" class="danger" @click="remove('inventoryMaterials', material.id)">Entfernen</button></article></div></section>
    <section class="settings-card"><div class="section-heading"><h2>Aufgaben</h2><p>Aufgaben mit Datum erscheinen im Dashboard und im Kalender.</p></div><form class="settings-two-column" @submit.prevent="addTodo"><label>Aufgabe<input v-model="todoTitle" required placeholder="z. B. Arbeitsblätter drucken"></label><label>Fällig am<input v-model="todoDate" type="date"></label><button type="submit">Aufgabe hinzufügen</button></form><div class="settings-list"><article v-for="todo in workspace.todos" :key="todo.id"><label class="todo-toggle"><input type="checkbox" :checked="todo.completed" @change="toggleTodo(todo.id)"><span :class="{ completed: todo.completed }">{{ todo.title }} <small>{{ todo.dueDate || 'ohne Termin' }}</small></span></label><button type="button" class="danger" @click="remove('todos', todo.id)">Entfernen</button></article></div></section>
    <p v-if="message" class="success-message">{{ message }}</p><p v-if="error" class="error-message">{{ error }}</p>
  </main>
  <main v-else class="loading">Arbeitsbereich wird geladen ...</main>
</template>
