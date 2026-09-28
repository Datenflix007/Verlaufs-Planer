<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import type { DashboardBreakpoint, DashboardWidget, DashboardWidgetId } from '../../domain/types'
import { clampDashboardGridColumns, dashboardWidgetRegistry, findNextFreePosition, getWidgetLayout, normaliseResponsiveLayout, normaliseWidget, resolveResponsiveWidgetLayouts, resolveWidgetCollisions } from '../../data/dashboardWidgets'

const props = defineProps<{ modelValue: DashboardWidget[]; gridColumns: Record<DashboardBreakpoint, number>; saving?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [widgets: DashboardWidget[]]; 'update:gridColumns': [columns: Record<DashboardBreakpoint, number>]; save: []; reset: [] }>()
const gridElement = ref<HTMLElement>(); const activeMenu = ref<DashboardWidgetId>(); const addMenuOpen = ref(false); const resetOpen = ref(false); const activeBreakpoint = ref<DashboardBreakpoint>('laptop')
let grid: GridStack | undefined; let syncing = false
const activeGridColumns = computed(() => props.gridColumns[activeBreakpoint.value])
const visibleWidgets = computed(() => props.modelValue.filter((widget) => widget.enabled).map((widget) => ({ ...widget, ...getWidgetLayout(widget, activeBreakpoint.value) })))
const paletteWidgets = computed(() => Object.values(dashboardWidgetRegistry))
const activeIds = computed(() => new Set(visibleWidgets.value.map((widget) => widget.id)))
const widgetById = (id: DashboardWidgetId) => props.modelValue.find((widget) => widget.id === id)!

function updateWidgets(next: DashboardWidget[]): void { emit('update:modelValue', resolveWidgetCollisions(next)) }
function updateWidget(id: DashboardWidgetId, patch: Partial<DashboardWidget>): void { updateWidgets(props.modelValue.map((widget) => widget.id === id ? normaliseWidget({ ...widget, ...patch }, widget) : widget)) }
function addWidget(id: DashboardWidgetId): void { if (activeIds.value.has(id)) return; const fallback = { id, enabled: true, ...dashboardWidgetRegistry[id].defaultLayout, calendarView: id === 'calendar' ? 'week' as const : undefined, limit: id === 'calendar' || id === 'next-day-materials' ? undefined : 5 }; updateWidgets([...props.modelValue, fallback]); addMenuOpen.value = false }
function removeWidget(id: DashboardWidgetId): void { updateWidget(id, { enabled: false }); activeMenu.value = undefined }
function onPaletteDrop(event: DragEvent): void { const id = event.dataTransfer?.getData('text/plain') as DashboardWidgetId; if (id && id in dashboardWidgetRegistry) addWidget(id) }
function updateGridColumns(value: number): void {
  const columns = clampDashboardGridColumns(value)
  emit('update:gridColumns', { ...props.gridColumns, [activeBreakpoint.value]: columns })
  updateWidgets(resolveResponsiveWidgetLayouts(props.modelValue, activeBreakpoint.value, columns))
}
function syncGrid(): void {
  if (!grid || !gridElement.value) return
  syncing = true
  gridElement.value.classList.toggle('device-phone', activeBreakpoint.value === 'phone')
  gridElement.value.classList.toggle('device-tablet', activeBreakpoint.value === 'tablet')
  grid.column(activeGridColumns.value, 'moveScale')
  const layout = visibleWidgets.value.map((widget) => ({ id: widget.id, x: widget.x, y: widget.y, w: widget.w, h: widget.h, minW: Math.min(dashboardWidgetRegistry[widget.id].minW, activeGridColumns.value), minH: dashboardWidgetRegistry[widget.id].minH }))
  const ids = new Set(layout.map((widget) => widget.id))
  for (const node of [...grid.engine.nodes]) if (node.id && !ids.has(node.id as DashboardWidgetId)) grid.removeWidget(node.el!, false, false)
  for (const element of Array.from(gridElement.value.querySelectorAll<HTMLElement>('.grid-stack-item'))) if (!(element as HTMLElement & { gridstackNode?: unknown }).gridstackNode) {
    const id = element.getAttribute('gs-id') as DashboardWidgetId
    const widget = layout.find((item) => item.id === id)
    if (widget) grid.makeWidget(element, widget)
  }
  for (const node of grid.engine.nodes) {
    const widget = layout.find((item) => item.id === node.id)
    if (widget && node.el) grid.update(node.el, { minW: widget.minW, minH: widget.minH })
  }
  grid.load(layout, false)
  syncing = false
}
function previewClass(widget: DashboardWidget): string { return widget.w >= 8 || widget.h >= 4 ? 'preview-large' : widget.w >= 5 ? 'preview-medium' : 'preview-small' }

onMounted(async () => {
  await nextTick()
  if (!gridElement.value) return
  grid = GridStack.init({ column: 12, cellHeight: 72, margin: 7, float: true, animate: true, draggable: { handle: '.widget-drag-handle' }, resizable: { handles: 'se' } }, gridElement.value)
  grid.on('change', (_event, items) => {
    if (syncing) return
    const positions = new Map(items.filter((item) => item.id).map((item) => [item.id!, item]))
    updateWidgets(props.modelValue.map((widget) => {
      const next = positions.get(widget.id)
      if (!next) return widget
      const layout = normaliseResponsiveLayout({ x: next.x, y: next.y, w: next.w, h: next.h }, getWidgetLayout(widget, activeBreakpoint.value), widget.id, activeGridColumns.value)
      return { ...widget, ...(activeBreakpoint.value === 'laptop' ? layout : {}), responsiveLayouts: { ...widget.responsiveLayouts, [activeBreakpoint.value]: layout } }
    }))
  })
  syncGrid()
})
onBeforeUnmount(() => grid?.destroy(false))
watch([visibleWidgets, activeBreakpoint, activeGridColumns], async () => { await nextTick(); syncGrid() }, { deep: true })
</script>

<template>
  <section class="dashboard-editor">
    <div class="dashboard-device-toolbar">
      <div class="dashboard-device-switch" role="group" aria-label="Geräte-Layout">
        <button v-for="device in [{ id: 'phone', label: 'Smartphone' }, { id: 'tablet', label: 'Tablet' }, { id: 'laptop', label: 'Laptop' }] as const" :key="device.id" type="button" :class="{ active: activeBreakpoint === device.id }" :aria-pressed="activeBreakpoint === device.id" @click="activeBreakpoint = device.id">{{ device.label }}</button>
      </div>
      <label class="dashboard-column-control">Spalten
        <input type="number" min="2" max="16" :value="activeGridColumns" @change="updateGridColumns(Number(($event.target as HTMLInputElement).value))" />
      </label>
      <span class="dashboard-layout-hint">Anordnung wird je Gerät separat gespeichert.</span>
    </div>
    <header class="dashboard-editor-header"><div><p class="eyebrow">Arbeitsbereich</p><h2>Dashboard bearbeiten</h2><p>Widgets frei anordnen, verschieben und in der Größe anpassen.</p></div><div class="dashboard-editor-actions"><div class="add-widget-menu"><button type="button" class="secondary" aria-haspopup="menu" :aria-expanded="addMenuOpen" @click="addMenuOpen = !addMenuOpen">＋ Widget hinzufügen</button><div v-if="addMenuOpen" class="add-widget-popover" role="menu"><button v-for="definition in paletteWidgets.filter((item) => !activeIds.has(item.id))" :key="definition.id" type="button" role="menuitem" @click="addWidget(definition.id)">{{ definition.icon }} {{ definition.title }}</button><p v-if="activeIds.size === paletteWidgets.length">Alle verfügbaren Widgets sind bereits aktiv.</p></div></div><button type="button" class="secondary" @click="resetOpen = true">↻ Layout zurücksetzen</button><button type="button" :disabled="saving" @click="emit('save')">{{ saving ? 'Speichert …' : 'Speichern' }}</button></div></header>
    <div class="dashboard-editor-layout"><div class="dashboard-grid-editor" @dragover.prevent @drop.prevent="onPaletteDrop"><div ref="gridElement" class="grid-stack"><article v-for="widget in visibleWidgets" :key="widget.id" class="grid-stack-item" :gs-id="widget.id" :gs-x="widget.x" :gs-y="widget.y" :gs-w="widget.w" :gs-h="widget.h" :gs-min-w="dashboardWidgetRegistry[widget.id].minW" :gs-min-h="dashboardWidgetRegistry[widget.id].minH"><div class="grid-stack-item-content editor-widget-card" :class="previewClass(widget)"><header><button type="button" class="widget-drag-handle" :aria-label="`${dashboardWidgetRegistry[widget.id].title} verschieben`" title="Zum Verschieben ziehen">⠿</button><span class="widget-icon" aria-hidden="true">{{ dashboardWidgetRegistry[widget.id].icon }}</span><strong>{{ dashboardWidgetRegistry[widget.id].title }}</strong><button type="button" class="widget-menu-trigger" :aria-label="`${dashboardWidgetRegistry[widget.id].title} konfigurieren`" :aria-expanded="activeMenu === widget.id" @click="activeMenu = activeMenu === widget.id ? undefined : widget.id">⋮</button></header><div v-if="activeMenu === widget.id" class="widget-settings-menu"><label v-if="widget.id === 'calendar'">Standardansicht<select :value="widget.calendarView ?? 'week'" @change="updateWidget(widget.id, { calendarView: ($event.target as HTMLSelectElement).value as DashboardWidget['calendarView'] })"><option value="day">Tag</option><option value="week">Woche</option><option value="month">Monat</option></select></label><label v-if="widget.id === 'upcoming-plans' || widget.id === 'upcoming-todos'">Einträge<select :value="widget.limit ?? 5" @change="updateWidget(widget.id, { limit: Number(($event.target as HTMLSelectElement).value) })"><option :value="3">3</option><option :value="5">5</option><option :value="10">10</option></select></label><button type="button" class="danger" @click="removeWidget(widget.id)">Vom Dashboard entfernen</button></div><div v-if="widget.id === 'calendar'" class="calendar-preview"><div class="preview-title"><span>September 2026</span><small>{{ widget.calendarView === 'day' ? 'Tag' : widget.calendarView === 'month' ? 'Monat' : 'Woche' }}</small></div><div class="preview-calendar"><span v-for="day in ['Mo','Di','Mi','Do','Fr','Sa','So']" :key="day">{{ day }}</span><span v-for="day in ['31','1','2','3','4','5','6','7','8','9','10','11','12','13']" :key="day" :class="{ event: day === '8' || day === '12' }">{{ day }}</span></div><p class="compact-preview">Nächster Termin: JenaChat – Verlaufsplan</p></div><ul v-else-if="widget.id === 'upcoming-todos'" class="preview-list"><li v-for="item in ['Arbeitsblatt drucken|Heute','Materialien vorbereiten|Morgen','Exkursionsroute prüfen|28.09.','Rückmeldung Schule|29.09.','Auswertung schreiben|30.09.'].slice(0, widget.limit ?? 5)" :key="item"><span>□ {{ item.split('|')[0] }}</span><small>{{ item.split('|')[1] }}</small></li></ul><ul v-else-if="widget.id === 'upcoming-plans'" class="preview-list"><li v-for="item in ['28.09.|JenaChat – Verlaufsplan','30.09.|Neue Planung','02.10.|Exkursion Venedig','05.10.|Smart City – Auswertung','08.10.|Kartenarbeit Stadtentwicklung'].slice(0, widget.limit ?? 5)" :key="item"><small>{{ item.split('|')[0] }}</small><span>{{ item.split('|')[1] }}</span></li></ul><ul v-else class="preview-list material-preview"><li v-for="item in ['Arbeitsblätter (10x)','Karten ausdrucken','iPads laden','Minecraft-Welt testen','Namensschilder vorbereiten']" :key="item">□ {{ item }}</li></ul><span class="widget-resize-hint" aria-hidden="true">◢</span></div></article></div></div><aside class="widget-palette"><h3>Widgets</h3><p>Ziehen Sie ein Widget auf das Dashboard.</p><button v-for="definition in paletteWidgets" :key="definition.id" type="button" class="palette-widget" :class="{ active: activeIds.has(definition.id) }" :disabled="activeIds.has(definition.id)" draggable="true" @dragstart="$event.dataTransfer?.setData('text/plain', definition.id)" @click="addWidget(definition.id)"><span>{{ definition.icon }}</span>{{ definition.title }}<small v-if="activeIds.has(definition.id)">✓</small></button></aside></div>
    <div v-if="resetOpen" class="editor-confirm-backdrop"><section class="editor-confirm" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h3 id="reset-title">Dashboard auf Standardlayout zurücksetzen?</h3><p>Die aktuelle Anordnung und Größe der Widgets wird durch das Standardlayout ersetzt.</p><div><button type="button" class="secondary" @click="resetOpen = false">Abbrechen</button><button type="button" @click="emit('reset'); resetOpen = false">Zurücksetzen</button></div></section></div>
  </section>
</template>

<style scoped>
.dashboard-editor { display: flex; flex-direction: column }
.dashboard-editor-header { order: 0 }
.dashboard-device-toolbar { order: 1 }
.dashboard-editor-layout { order: 2 }
.dashboard-grid-editor .grid-stack.device-phone { min-width: 360px }
.dashboard-grid-editor .grid-stack.device-tablet { min-width: 640px }
.dashboard-device-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; margin: 1rem 0 }
.dashboard-device-switch { display: inline-flex; overflow: hidden; border: 1px solid #aec3c6; border-radius: 6px; background: #fff }
.dashboard-device-switch button { border: 0; border-radius: 0; color: #38545a; background: transparent }
.dashboard-device-switch button + button { border-left: 1px solid #d3dfe0 }
.dashboard-device-switch button.active { color: #fff; background: #1d5960 }
.dashboard-column-control { display: flex; grid-template-columns: none; align-items: center; gap: .45rem; font-size: .85rem }
.dashboard-column-control input { width: 4.5rem }
.dashboard-layout-hint { color: #607078; font-size: .82rem }
@media (max-width: 760px) {
  .dashboard-device-toolbar { align-items: stretch }
  .dashboard-device-switch { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) }
  .dashboard-device-switch button { padding-inline: .45rem }
  .dashboard-column-control { margin-left: auto }
  .dashboard-layout-hint { flex-basis: 100% }
}
</style>
