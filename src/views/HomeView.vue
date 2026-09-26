<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPlanningTemplate, getPlanningTemplates } from '../data/templates/registry'
import { aggregateMaterials } from '../domain/materials'
import type { DashboardWidget, DashboardWidgetHeight, DashboardWidgetWidth, Room, WorkshopPlan, WorkspaceSettings } from '../domain/types'
import { SqlitePlanRepository } from '../repositories/SqlitePlanRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import { useProjectStore } from '../stores/projectStore'

const store = useProjectStore(); const router = useRouter(); const planRepository = new SqlitePlanRepository(); const workspaceRepository = new WorkspaceRepository()
const newTitle = ref(''); const templateId = ref(''); const buildingId = ref(''); const roomId = ref(''); const importError = ref(''); const workspace = ref<WorkspaceSettings>(); const planDetails = ref<WorkshopPlan[]>([])
type WidgetResizeDrag = { widgetId: string; startX: number; startY: number; widthIndex: number; heightIndex: number; initialWidth: DashboardWidgetWidth; initialHeight: DashboardWidgetHeight }
const widgetResizeDrag = ref<WidgetResizeDrag>()
const widgetWidths: DashboardWidgetWidth[] = ['half', 'wide', 'full']
const widgetHeights: DashboardWidgetHeight[] = ['compact', 'standard', 'tall']
const templates = computed(() => getPlanningTemplates())
const today = new Date().toISOString().slice(0, 10)
const nextDay = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
const rooms = computed<Room[]>(() => (workspace.value?.rooms ?? []).filter((room) => !buildingId.value || room.buildingId === buildingId.value))
const widgets = computed(() => [...(workspace.value?.dashboard ?? [])].filter((widget) => widget.enabled).sort((left, right) => left.order - right.order))
const allEvents = computed(() => [
  ...planDetails.value.flatMap((plan) => plan.days.map((day) => ({ id: `${plan.id}-${day.id}`, date: day.date, type: 'plan' as const, title: plan.metadata.title, planId: plan.id, detail: [day.title, plan.metadata.location].filter(Boolean).join(' · ') }))),
  ...(workspace.value?.todos ?? []).filter((todo) => todo.dueDate).map((todo) => ({ id: todo.id, date: todo.dueDate!, type: 'todo' as const, title: todo.title, completed: todo.completed, detail: '' })),
])
const upcomingPlans = computed(() => allEvents.value.filter((event) => event.type === 'plan' && event.date >= today).sort((left, right) => left.date.localeCompare(right.date)))
const upcomingTodos = computed(() => allEvents.value.filter((event) => event.type === 'todo' && !event.completed && event.date >= today).sort((left, right) => left.date.localeCompare(right.date)))
const nextDayMaterials = computed(() => {
  const relevant = planDetails.value.filter((plan) => plan.days.some((day) => day.date === nextDay))
  const grouped = new Map<string, { name: string; quantity: string[]; plans: string[] }>()
  for (const plan of relevant) for (const item of aggregateMaterials(plan.materials, plan.schedule)) { const current = grouped.get(item.material.name) ?? { name: item.material.name, quantity: [], plans: [] }; if (item.material.quantity) current.quantity.push(item.material.quantity); current.plans.push(plan.metadata.title); grouped.set(item.material.name, current) }
  return [...grouped.values()]
})
function daysFor(view: 'day' | 'week' | 'month'): string[] { const base = new Date(`${today}T12:00:00`); if (view === 'day') return [today]; if (view === 'week') { const monday = new Date(base); monday.setDate(base.getDate() - ((base.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date.toISOString().slice(0, 10) }) }; const first = new Date(base.getFullYear(), base.getMonth(), 1); const count = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate(); return Array.from({ length: count }, (_, index) => new Date(base.getFullYear(), base.getMonth(), index + 1).toISOString().slice(0, 10)) }
function formatDate(date: string): string { return new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) }
function openEvent(event: typeof allEvents.value[number]): void { if (event.type === 'plan') void open(event.planId); else void router.push({ name: 'workspace-settings' }) }
async function refreshDashboard(): Promise<void> { await store.refresh(); planDetails.value = (await Promise.all(store.plans.map((plan) => planRepository.get(plan.id)))).filter((plan): plan is WorkshopPlan => Boolean(plan)) }
function resizeSteps(distance: number, snapPixels: number): number { return distance < 0 ? Math.ceil(distance / snapPixels) : Math.floor(distance / snapPixels) }
function clampIndex(index: number, length: number): number { return Math.max(0, Math.min(length - 1, index)) }
function beginWidgetResize(widget: DashboardWidget, event: PointerEvent): void {
  event.preventDefault()
  event.stopPropagation()
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  widgetResizeDrag.value = { widgetId: widget.id, startX: event.clientX, startY: event.clientY, widthIndex: widgetWidths.indexOf(widget.width), heightIndex: widgetHeights.indexOf(widget.height), initialWidth: widget.width, initialHeight: widget.height }
}
function resizeWidget(widget: DashboardWidget, event: PointerEvent): void {
  const drag = widgetResizeDrag.value
  if (!drag || drag.widgetId !== widget.id) return
  widget.width = widgetWidths[clampIndex(drag.widthIndex + resizeSteps(event.clientX - drag.startX, 72), widgetWidths.length)]
  widget.height = widgetHeights[clampIndex(drag.heightIndex + resizeSteps(event.clientY - drag.startY, 58), widgetHeights.length)]
}
async function finishWidgetResize(widget: DashboardWidget, event: PointerEvent): Promise<void> {
  const drag = widgetResizeDrag.value
  if (!drag || drag.widgetId !== widget.id) return
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
  widgetResizeDrag.value = undefined
  if (widget.width === drag.initialWidth && widget.height === drag.initialHeight) return
  try { workspace.value = await workspaceRepository.save(workspace.value!) } catch (cause) { importError.value = cause instanceof Error ? cause.message : 'Widget-Größe konnte nicht gespeichert werden.' }
}
function cancelWidgetResize(widget: DashboardWidget, event: PointerEvent): void {
  const drag = widgetResizeDrag.value
  if (!drag || drag.widgetId !== widget.id) return
  widget.width = drag.initialWidth
  widget.height = drag.initialHeight
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
  widgetResizeDrag.value = undefined
}
onMounted(async () => { try { await Promise.all([refreshDashboard(), workspaceRepository.get().then((settings) => { workspace.value = settings })]) } catch (cause) { importError.value = cause instanceof Error ? cause.message : 'Dashboard konnte nicht geladen werden.' } })
async function create(): Promise<void> { const room = workspace.value?.rooms.find((item) => item.id === roomId.value); const building = workspace.value?.buildings.find((item) => item.id === (room?.buildingId ?? buildingId.value)); const location = room ? { buildingId: room.buildingId, roomId: room.id, label: `${building?.name ?? ''} · ${room.name}` } : building ? { buildingId: building.id, label: building.name } : undefined; const plan = await store.create(newTitle.value || 'Neue Planung', getPlanningTemplate(templateId.value), location); await router.push({ name: 'editor', params: { id: plan.id } }) }
async function loadJenaChatSample(): Promise<void> { try { const plan = await store.loadJenaChatSample(); await router.push({ name: 'editor', params: { id: plan.id } }) } catch (error) { importError.value = error instanceof Error ? error.message : 'JenaChat-Sample konnte nicht geladen werden.' } }
async function open(id: string): Promise<void> { await router.push({ name: 'editor', params: { id } }) }
async function importProject(event: Event): Promise<void> { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; try { const plan = await store.importProject(JSON.parse(await file.text())); await router.push({ name: 'editor', params: { id: plan.id } }) } catch (error) { importError.value = error instanceof Error ? error.message : 'Import fehlgeschlagen.' } }
</script>

<template>
  <main class="home-shell">
    <header class="home-header"><div><p class="eyebrow">Verlaufsplaner · lokaler Arbeitsbereich</p><h1>Mein Dashboard</h1><p>Planungen, Aufgaben und Materialvorbereitung auf einen Blick.</p></div><form class="new-plan dashboard-new-plan" @submit.prevent="create"><input v-model="newTitle" placeholder="Titel der neuen Planung" aria-label="Titel der neuen Planung"><label>Vorlage<select v-model="templateId"><option value="">Ohne Vorlage</option><option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name.de }}</option></select></label><label>Gebäude<select v-model="buildingId" @change="roomId = ''"><option value="">Kein Gebäude</option><option v-for="building in workspace?.buildings" :key="building.id" :value="building.id">{{ building.name }}</option></select></label><label>Raum<select v-model="roomId" :disabled="!buildingId"><option value="">Kein Raum</option><option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option></select></label><button type="submit">Neue Planung</button></form><button type="button" class="settings-trigger" aria-label="Einstellungen öffnen" title="Einstellungen" @click="router.push({ name: 'workspace-settings' })">⚙</button></header>
    <section class="home-tools"><label class="file-label">JSON importieren<input type="file" accept="application/json,.json" @change="importProject"></label><button type="button" class="secondary" @click="loadJenaChatSample">JenaChat-Sample laden</button><p v-if="store.migrationNotice" class="success-message">{{ store.migrationNotice }}</p><p v-if="importError" class="error-message">{{ importError }}</p></section>
    <section class="dashboard-grid"><article v-for="widget in widgets" :key="widget.id" class="dashboard-widget" :class="[`widget-${widget.id}`, `widget-width-${widget.width}`, `widget-height-${widget.height}`, { resizing: widgetResizeDrag?.widgetId === widget.id }] "><template v-if="widget.id === 'calendar'"><div class="widget-heading"><div><p class="eyebrow">{{ widget.calendarView === 'day' ? 'Heute' : widget.calendarView === 'month' ? 'Dieser Monat' : 'Diese Woche' }}</p><h2>Kalender</h2></div><button type="button" class="secondary" @click="router.push({ name: 'workspace-settings' })">Ansicht</button></div><div class="calendar-events"><div v-for="date in daysFor(widget.calendarView ?? 'week')" :key="date" class="calendar-day"><strong>{{ formatDate(date) }}</strong><button v-for="event in allEvents.filter((item) => item.date === date)" :key="event.id" type="button" class="calendar-event" :class="event.type" @click="openEvent(event)">{{ event.type === 'plan' ? 'Plan' : 'Aufgabe' }}: {{ event.title }}<small v-if="event.detail">{{ event.detail }}</small></button><span v-if="!allEvents.some((item) => item.date === date)" class="empty-state">Keine Einträge</span></div></div></template><template v-else-if="widget.id === 'upcoming-plans'"><div class="widget-heading"><div><p class="eyebrow">Planungen</p><h2>Nächste Verlaufspläne</h2></div><span>{{ widget.limit ?? 5 }}</span></div><ol class="dashboard-list"><li v-for="event in upcomingPlans.slice(0, widget.limit ?? 5)" :key="event.id"><button type="button" @click="openEvent(event)"><strong>{{ event.title }}</strong><small>{{ formatDate(event.date) }}{{ event.detail ? ` · ${event.detail}` : '' }}</small></button></li><li v-if="!upcomingPlans.length" class="empty-state">Keine kommenden Planungen.</li></ol></template><template v-else-if="widget.id === 'upcoming-todos'"><div class="widget-heading"><div><p class="eyebrow">Aufgaben</p><h2>Nächste Todos</h2></div><span>{{ widget.limit ?? 5 }}</span></div><ol class="dashboard-list"><li v-for="event in upcomingTodos.slice(0, widget.limit ?? 5)" :key="event.id"><button type="button" @click="router.push({ name: 'workspace-settings' })"><strong>{{ event.title }}</strong><small>{{ formatDate(event.date) }}</small></button></li><li v-if="!upcomingTodos.length" class="empty-state">Keine offenen Aufgaben mit Termin.</li></ol></template><template v-else><div class="widget-heading"><div><p class="eyebrow">Vorbereitung</p><h2>Materialien für morgen</h2></div><span>{{ formatDate(nextDay) }}</span></div><p v-if="!nextDayMaterials.length" class="empty-state">Für morgen sind keine Planmaterialien hinterlegt.</p><ul v-else class="material-prep-list"><li v-for="material in nextDayMaterials" :key="material.name"><strong>{{ material.name }}</strong><span>{{ material.quantity.join(', ') || 'Menge offen' }}</span><small>{{ [...new Set(material.plans)].join(', ') }}</small></li></ul><RouterLink class="secondary link-button" :to="{ name: 'workspace-settings' }">Bestand vorbereiten</RouterLink></template><button type="button" class="widget-resize-handle" :aria-label="`${widget.id} in Rastergröße ändern`" title="Zum Ändern von Breite und Höhe ziehen" @pointerdown="beginWidgetResize(widget, $event)" @pointermove="resizeWidget(widget, $event)" @pointerup="finishWidgetResize(widget, $event)" @pointercancel="cancelWidgetResize(widget, $event)">&#x2198;</button></article></section>
    <section v-if="store.plans.length" class="project-grid"><article v-for="plan in store.plans" :key="plan.id" class="project-card"><p class="eyebrow">{{ plan.dateRange || 'Ohne Termin' }}</p><h2>{{ plan.title }}</h2><p>Zuletzt bearbeitet: {{ new Date(plan.updatedAt).toLocaleString('de-DE') }}</p><div><button type="button" @click="open(plan.id)">Öffnen</button><button type="button" class="secondary" @click="store.duplicate(plan.id).then((copy) => open(copy.id))">Duplizieren</button><button type="button" class="danger" @click="store.remove(plan.id).then(refreshDashboard)">Löschen</button></div></article></section>
    <section v-else class="home-empty"><h2>Die erste Planung beginnt hier.</h2><p>Erstellen Sie eine Planung oder ergänzen Sie Gebäude, Bestände und Aufgaben unter Arbeitsbereich.</p></section>
  </main>
</template>

<style scoped>
.dashboard-widget { position:relative }
.dashboard-widget.resizing { user-select:none; outline:2px solid #397078; outline-offset:2px }
.widget-resize-handle { position:absolute; right:.35rem; bottom:.35rem; z-index:2; width:28px; height:28px; padding:0; display:grid; place-items:center; border:1px solid #b8cacc; border-radius:5px; color:#397078; background:#f7fbfb; cursor:nwse-resize; touch-action:none; line-height:1; opacity:.7 }
.widget-resize-handle:hover,.widget-resize-handle:focus-visible { opacity:1; outline:2px solid #397078; outline-offset:2px }
</style>
