<script setup lang="ts">
import { computed, ref } from 'vue'
import { phaseSuggestions as bundledPhaseSuggestions, scheduleLayouts } from '../../data/layouts'
import { getPlanningTemplate } from '../../data/templates/registry'
import { createId, richTextFromPlain } from '../../domain/factories'
import { richTextPlain } from '../../export/render'
import { nextStartTime, synchronizeTime, totalDayMinutes } from '../../domain/schedule'
import type { RichTextDocument, ScheduleEntry, WorkshopDay, WorkshopPlan } from '../../domain/types'

const props = defineProps<{ plan: WorkshopPlan }>()
const emit = defineEmits<{ changed: [] }>()
const template = computed(() => getPlanningTemplate(props.plan.settings.templateId))
const availableLayouts = computed(() => {
  const allowed = template.value?.scheduleLayoutIds
  const layouts = allowed?.length ? scheduleLayouts.filter((layout) => allowed.includes(layout.id)) : scheduleLayouts
  const current = scheduleLayouts.find((layout) => layout.id === props.plan.settings.scheduleLayoutId)
  return current && !layouts.some((layout) => layout.id === current.id) ? [...layouts, current] : layouts
})
const layout = computed(() => scheduleLayouts.find((item) => item.id === props.plan.settings.scheduleLayoutId) ?? availableLayouts.value[0] ?? scheduleLayouts[0])
const phaseSuggestions = computed(() => [...new Set([...(template.value?.suggestedPhases ?? []), ...bundledPhaseSuggestions])])
const methodSuggestions = computed(() => template.value?.suggestedMethods ?? [])
const entriesForDay = (dayId: string): ScheduleEntry[] => props.plan.schedule.filter((item) => item.dayId === dayId)
const draggedEntryId = ref<string>()
function add(day: WorkshopDay, type: ScheduleEntry['type'] = 'phase'): void {
  const startTime = nextStartTime(props.plan.schedule, day.id)
  props.plan.schedule.push({ id: createId(), dayId: day.id, startTime, type, phase: type === 'break' ? undefined : 'Einstieg', title: type === 'break' ? 'Pause' : '', materialIds: [], content: richTextFromPlain(''), objective: richTextFromPlain(''), notes: richTextFromPlain('') })
  emit('changed')
}
function updateText(entry: ScheduleEntry, field: 'content' | 'objective' | 'notes' | 'teacherActivity' | 'participantActivity', event: Event): void { entry[field] = richTextFromPlain((event.target as HTMLTextAreaElement).value); emit('changed') }
function toggleMaterial(entry: ScheduleEntry, id: string): void { entry.materialIds = entry.materialIds.includes(id) ? entry.materialIds.filter((item) => item !== id) : [...entry.materialIds, id]; emit('changed') }
function updateTime(entry: ScheduleEntry, changed: 'start' | 'end' | 'duration'): void { Object.assign(entry, synchronizeTime(entry, changed)); emit('changed') }
function duplicate(entry: ScheduleEntry): void { const clone = structuredClone(entry); clone.id = createId(); const index = props.plan.schedule.findIndex((item) => item.id === entry.id); props.plan.schedule.splice(index + 1, 0, clone); emit('changed') }
function remove(entry: ScheduleEntry): void { props.plan.schedule = props.plan.schedule.filter((item) => item.id !== entry.id); emit('changed') }
function materialLabel(entry: ScheduleEntry): string { return entry.materialIds.map((id) => props.plan.materials.find((material) => material.id === id)?.name).filter(Boolean).join(', ') }
function beginDrag(entry: ScheduleEntry, event: DragEvent): void { draggedEntryId.value = entry.id; event.dataTransfer?.setData('text/plain', entry.id); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move' }
function reorder(target: ScheduleEntry): void {
  const draggedId = draggedEntryId.value
  if (!draggedId || draggedId === target.id) return
  const sourceIndex = props.plan.schedule.findIndex((entry) => entry.id === draggedId)
  const targetIndex = props.plan.schedule.findIndex((entry) => entry.id === target.id)
  const source = props.plan.schedule[sourceIndex]
  if (!source || source.dayId !== target.dayId || sourceIndex < 0 || targetIndex < 0) return
  props.plan.schedule.splice(sourceIndex, 1)
  props.plan.schedule.splice(sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, source)
  emit('changed')
}
function endDrag(): void { draggedEntryId.value = undefined }
</script>

<template>
  <section class="section-card schedule-section">
    <div class="section-heading with-action"><div><p class="eyebrow">Kern der Planung</p><h1>Verlaufsplan</h1><p>Die Unterrichtsansicht folgt dem Aufbau der PDF: Zeit, Phase, Lehrenden- und Lernendenhandeln sowie Material und Sozialform.</p></div><div><label>Layout<select v-model="plan.settings.scheduleLayoutId" @change="emit('changed')"><option v-for="item in availableLayouts" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label>Zeitangabe<select v-model="plan.settings.timeDisplay" @change="emit('changed')"><option value="start">Startzeit</option><option value="duration">Dauer in Minuten</option></select></label></div></div>
    <datalist id="phase-suggestions"><option v-for="phase in phaseSuggestions" :key="phase" :value="phase" /></datalist><datalist id="method-suggestions"><option v-for="method in methodSuggestions" :key="method" :value="method" /></datalist>
    <section v-for="day in plan.days" :key="day.id" class="schedule-day">
      <div class="day-plan-heading"><div><h2>{{ day.title || `Tag - ${day.date}` }}</h2><p>{{ totalDayMinutes(plan.schedule, day.id) }} Minuten geplant</p></div><div><button type="button" @click="add(day)">+ Phase</button><button type="button" class="secondary" @click="add(day, 'break')">+ Pause</button></div></div>
      <div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th v-for="column in layout.columns" :key="column.id">{{ column.label }}</th><th aria-label="Zeilenaktionen" /></tr></thead><tbody>
        <tr v-for="entry in entriesForDay(day.id)" :key="entry.id" :class="{ break: entry.type === 'break', dragging: draggedEntryId === entry.id }" @dragover.prevent @drop.prevent="reorder(entry)">
          <template v-for="column in layout.columns" :key="column.id">
            <td v-if="column.field === 'time'"><input v-if="plan.settings.timeDisplay === 'start'" v-model="entry.startTime" type="time" aria-label="Startzeit" @change="updateTime(entry, 'start')"><input v-else v-model.number="entry.durationMinutes" type="number" min="0" aria-label="Dauer in Minuten" @change="updateTime(entry, 'duration')"></td>
            <td v-else-if="column.field === 'phase'" class="phase-cell"><strong v-if="entry.type === 'break'">{{ entry.title || 'Pause' }}</strong><template v-else><input v-model="entry.phase" list="phase-suggestions" placeholder="Phase" @change="emit('changed')"><input v-model="entry.title" placeholder="Schritt / Aktivität" @change="emit('changed')"></template></td>
            <td v-else-if="column.field === 'title'"><input v-model="entry.title" @change="emit('changed')"></td>
            <td v-else-if="column.field === 'content'"><textarea :value="richTextPlain(entry.content)" rows="3" :placeholder="entry.type === 'break' ? 'Pausenhinweis' : 'Ablauf'" @change="updateText(entry, 'content', $event)" /></td>
            <td v-else-if="column.field === 'objective'"><textarea :value="richTextPlain(entry.objective)" rows="3" placeholder="Ziel" @change="updateText(entry, 'objective', $event)" /></td>
            <td v-else-if="column.field === 'teacherActivity'"><textarea :value="richTextPlain(entry.teacherActivity)" rows="3" placeholder="Lehrendenhandeln" @change="updateText(entry, 'teacherActivity', $event)" /></td>
            <td v-else-if="column.field === 'participantActivity'"><textarea :value="richTextPlain(entry.participantActivity)" rows="3" placeholder="Lernendenhandeln" @change="updateText(entry, 'participantActivity', $event)" /></td>
            <td v-else-if="column.field === 'method'"><input v-model="entry.method" list="method-suggestions" placeholder="Material / Sozialform" @change="emit('changed')"><input v-model="entry.socialForm" placeholder="Sozialform" @change="emit('changed')"></td>
            <td v-else-if="column.field === 'socialForm'"><input v-model="entry.socialForm" @change="emit('changed')"></td>
            <td v-else-if="column.field === 'materials'"><details><summary>{{ materialLabel(entry) || 'Material wählen' }}</summary><label v-for="material in plan.materials" :key="material.id" class="material-check"><input type="checkbox" :checked="entry.materialIds.includes(material.id)" @change="toggleMaterial(entry, material.id)">{{ material.name || 'Unbenanntes Material' }}</label></details></td>
            <td v-else-if="column.field === 'notes'"><textarea :value="richTextPlain(entry.notes)" rows="3" placeholder="Hinweise" @change="updateText(entry, 'notes', $event)" /></td>
          </template>
          <td class="schedule-actions"><button type="button" class="drag-handle" draggable="true" title="Zeile ziehen und auf der Zielzeile ablegen" @dragstart="beginDrag(entry, $event)" @dragend="endDrag">Ziehen</button><button type="button" title="Duplizieren" @click="duplicate(entry)">Kopie</button><button type="button" class="danger" title="Löschen" @click="remove(entry)">Löschen</button></td>
        </tr>
        <tr v-if="!entriesForDay(day.id).length"><td :colspan="layout.columns.length + 1" class="empty-state">Noch keine Phasen. Fügen Sie die erste Phase oder Pause hinzu.</td></tr>
      </tbody></table></div>
    </section>
  </section>
</template>
