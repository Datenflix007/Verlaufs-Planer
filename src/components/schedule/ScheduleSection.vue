<script setup lang="ts">
import { computed, ref } from 'vue'
import { phaseSuggestions as bundledPhaseSuggestions, scheduleLayouts } from '../../data/layouts'
import { getPlanningTemplate } from '../../data/templates/registry'
import { createId, richTextFromPlain } from '../../domain/factories'
import { richTextPlain } from '../../export/render'
import { nextStartTime, synchronizeTime, totalDayMinutes } from '../../domain/schedule'
import type { RichTextDocument, ScheduleEntry, ScheduleLayout, SchedulePattern, WorkshopDay, WorkshopPlan } from '../../domain/types'
import { orderedSlides } from '../../presentation/presentation'

const props = defineProps<{ plan: WorkshopPlan; patterns?: SchedulePattern[] }>()
const emit = defineEmits<{ changed: []; openPresentation: [slideId?: string] }>()
const template = computed(() => getPlanningTemplate(props.plan.settings.templateId))
const layouts = computed<ScheduleLayout[]>(() => {
  const persisted = props.patterns ?? []
  const persistedIds = new Set(persisted.map((pattern) => pattern.id))
  return [...persisted, ...scheduleLayouts.filter((item) => !persistedIds.has(item.id))]
})
const availableLayouts = computed(() => {
  const allowed = template.value?.scheduleLayoutIds
  const selectable = allowed?.length ? layouts.value.filter((item) => allowed.includes(item.id)) : layouts.value
  const current = layouts.value.find((item) => item.id === props.plan.settings.scheduleLayoutId)
  return current && !selectable.some((item) => item.id === current.id) ? [...selectable, current] : selectable
})
const layout = computed(() => layouts.value.find((item) => item.id === props.plan.settings.scheduleLayoutId) ?? availableLayouts.value[0] ?? scheduleLayouts[0])
const phaseSuggestions = computed(() => [...new Set([...(template.value?.suggestedPhases ?? []), ...bundledPhaseSuggestions])])
const methodSuggestions = computed(() => template.value?.suggestedMethods ?? [])
const entriesForDay = (dayId: string): ScheduleEntry[] => props.plan.schedule.filter((item) => item.dayId === dayId)
const draggedEntryId = ref<string>()
const slides = computed(() => props.plan.presentation ? orderedSlides(props.plan.presentation) : [])
function linkedSlide(entry: ScheduleEntry) { return slides.value.find((slide) => slide.id === entry.presentationEntryPoint?.slideId) }
function setEntryPoint(entry: ScheduleEntry, slideId: string): void {
  if (!slideId) { delete entry.presentationEntryPoint; emit('changed'); return }
  entry.presentationEntryPoint = { id: entry.presentationEntryPoint?.id ?? createId(), slideId, createdAt: entry.presentationEntryPoint?.createdAt ?? new Date().toISOString() }
  emit('changed')
}
function removeEntryPoint(entry: ScheduleEntry): void { delete entry.presentationEntryPoint; emit('changed') }
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
    <div class="section-heading with-action schedule-heading"><div><p class="eyebrow">Kern der Planung</p><h1>Verlaufsplan</h1><p>Plane den Unterricht in klaren Phasen. Zeit, Lernziel, Ablauf, Material und Sozialform bleiben direkt in ihrem didaktischen Zusammenhang.</p></div><div class="schedule-controls"><label>Layout<select v-model="plan.settings.scheduleLayoutId" @change="emit('changed')"><option v-for="item in availableLayouts" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label>Zeitangabe<select v-model="plan.settings.timeDisplay" @change="emit('changed')"><option value="start">Startzeit</option><option value="duration">Dauer in Minuten</option></select></label></div></div>
    <datalist id="phase-suggestions"><option v-for="phase in phaseSuggestions" :key="phase" :value="phase" /></datalist><datalist id="method-suggestions"><option v-for="method in methodSuggestions" :key="method" :value="method" /></datalist>
    <section v-for="day in plan.days" :key="day.id" class="schedule-day">
      <div class="day-plan-heading"><div><p class="day-overline">Unterrichtsverlauf</p><h2>{{ day.title || `Tag - ${day.date}` }}</h2><p>{{ totalDayMinutes(plan.schedule, day.id) }} Minuten geplant</p></div><div><button type="button" @click="add(day)">+ Phase</button><button type="button" class="secondary" @click="add(day, 'break')">+ Pause</button></div></div>
      <div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th v-for="column in layout.columns" :key="column.id">{{ column.label }}</th><th aria-label="Zeilenaktionen" /></tr></thead><tbody>
        <tr v-for="entry in entriesForDay(day.id)" :key="entry.id" class="schedule-row" :class="{ break: entry.type === 'break', dragging: draggedEntryId === entry.id }" @dragover.prevent @drop.prevent="reorder(entry)">
          <template v-for="column in layout.columns" :key="column.id">
            <td v-if="column.field === 'time'" :class="['schedule-cell', `field-${column.field}`]"><input v-if="plan.settings.timeDisplay === 'start'" v-model="entry.startTime" type="time" aria-label="Startzeit" @change="updateTime(entry, 'start')"><input v-else v-model.number="entry.durationMinutes" type="number" min="0" aria-label="Dauer in Minuten" @change="updateTime(entry, 'duration')"></td>
            <td v-else-if="column.field === 'phase'" :class="['schedule-cell', 'phase-cell', `field-${column.field}`]"><strong v-if="entry.type === 'break'">{{ entry.title || 'Pause' }}</strong><template v-else><input v-model="entry.phase" list="phase-suggestions" placeholder="Phase" @change="emit('changed')"><input v-model="entry.title" placeholder="Schritt / Aktivität" @change="emit('changed')"></template></td>
            <td v-else-if="column.field === 'title'" :class="['schedule-cell', `field-${column.field}`]"><input v-model="entry.title" @change="emit('changed')"></td>
            <td v-else-if="column.field === 'content'" :class="['schedule-cell', `field-${column.field}`]"><textarea :value="richTextPlain(entry.content)" rows="3" :placeholder="entry.type === 'break' ? 'Pausenhinweis' : 'Ablauf'" @change="updateText(entry, 'content', $event)" /></td>
            <td v-else-if="column.field === 'objective'" :class="['schedule-cell', `field-${column.field}`]"><textarea :value="richTextPlain(entry.objective)" rows="3" placeholder="Ziel" @change="updateText(entry, 'objective', $event)" /></td>
            <td v-else-if="column.field === 'teacherActivity'" :class="['schedule-cell', `field-${column.field}`]"><textarea :value="richTextPlain(entry.teacherActivity)" rows="3" placeholder="Lehrendenhandeln" @change="updateText(entry, 'teacherActivity', $event)" /></td>
            <td v-else-if="column.field === 'participantActivity'" :class="['schedule-cell', `field-${column.field}`]"><textarea :value="richTextPlain(entry.participantActivity)" rows="3" placeholder="Lernendenhandeln" @change="updateText(entry, 'participantActivity', $event)" /></td>
            <td v-else-if="column.field === 'method'" :class="['schedule-cell', `field-${column.field}`]"><input v-model="entry.method" list="method-suggestions" placeholder="Material / Sozialform" @change="emit('changed')"><input v-model="entry.socialForm" placeholder="Sozialform" @change="emit('changed')"></td>
            <td v-else-if="column.field === 'socialForm'" :class="['schedule-cell', `field-${column.field}`]"><input v-model="entry.socialForm" @change="emit('changed')"></td>
            <td v-else-if="column.field === 'materials'" :class="['schedule-cell', `field-${column.field}`]"><details><summary>{{ materialLabel(entry) || 'Material wählen' }}</summary><label v-for="material in plan.materials" :key="material.id" class="material-check"><input type="checkbox" :checked="entry.materialIds.includes(material.id)" @change="toggleMaterial(entry, material.id)">{{ material.name || 'Unbenanntes Material' }}</label></details></td>
            <td v-else-if="column.field === 'notes'" :class="['schedule-cell', `field-${column.field}`]"><textarea :value="richTextPlain(entry.notes)" rows="3" placeholder="Hinweise" @change="updateText(entry, 'notes', $event)" /></td>
          </template>
          <td class="schedule-actions"><div v-if="entry.type === 'phase'" class="presentation-entry-point"><button v-if="!plan.presentation" type="button" class="secondary" title="Präsentation für diesen Verlaufsplan öffnen" @click="emit('openPresentation')">↗ Präsentation</button><template v-else-if="entry.presentationEntryPoint"><button v-if="linkedSlide(entry)" type="button" class="entry-link" :title="`Öffnet die Präsentation direkt bei Folie ${linkedSlide(entry)!.position + 1}.`" @click="emit('openPresentation', entry.presentationEntryPoint.slideId)">↗ Folie {{ linkedSlide(entry)!.position + 1 }}</button><span v-else class="broken-entry">⚠ Folie nicht gefunden</span><select :value="entry.presentationEntryPoint.slideId" aria-label="Präsentationsfolie neu zuweisen" @change="setEntryPoint(entry, ($event.target as HTMLSelectElement).value)"><option value="">Neu zuweisen …</option><option v-for="slide in slides" :key="slide.id" :value="slide.id">Folie {{ slide.position + 1 }} · {{ slide.title || 'Ohne Titel' }}</option></select><button type="button" class="secondary" title="Einstiegspunkt entfernen" @click="removeEntryPoint(entry)">×</button></template><select v-else aria-label="Präsentations-Einstiegspunkt setzen" :disabled="!slides.length" @change="setEntryPoint(entry, ($event.target as HTMLSelectElement).value)"><option value="">↗ Einstiegspunkt setzen …</option><option v-for="slide in slides" :key="slide.id" :value="slide.id">Folie {{ slide.position + 1 }} · {{ slide.title || 'Ohne Titel' }}</option></select></div><button type="button" class="drag-handle" draggable="true" title="Zeile ziehen und auf der Zielzeile ablegen" @dragstart="beginDrag(entry, $event)" @dragend="endDrag">Ziehen</button><button type="button" title="Duplizieren" @click="duplicate(entry)">Kopie</button><button type="button" class="danger" title="Löschen" @click="remove(entry)">Löschen</button></td>
        </tr>
        <tr v-if="!entriesForDay(day.id).length"><td :colspan="layout.columns.length + 1" class="empty-state">Noch keine Phasen. Fügen Sie die erste Phase oder Pause hinzu.</td></tr>
      </tbody></table></div>
    </section>
  </section>
</template>

<style scoped>
.schedule-section { max-width: 1540px; padding: clamp(1.1rem, 2.4vw, 2rem) }
.schedule-heading { align-items: flex-start; margin-bottom: 2rem }
.schedule-heading > div:first-child { max-width: 760px }
.schedule-heading h1 { margin-bottom: .45rem }
.schedule-controls { display: grid; grid-template-columns: minmax(150px, 1fr) minmax(150px, 1fr); gap: .65rem; min-width: 330px; padding: .8rem; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-raised) }
.schedule-controls label { color: var(--muted); font-size: .74rem; font-weight: 800; letter-spacing: .03em; text-transform: uppercase }
.schedule-controls select { min-height: 2.45rem; color: var(--text); background: var(--surface) }
.schedule-day { margin-top: 2.25rem }
.day-plan-heading { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-end; margin-bottom: .85rem }
.day-plan-heading h2 { margin: .1rem 0; font-size: clamp(1.2rem, 2vw, 1.5rem) }
.day-plan-heading p { margin: 0; color: var(--muted); font-size: .86rem }
.day-overline { color: var(--accent-strong) !important; font-size: .72rem !important; font-weight: 900; letter-spacing: .1em; text-transform: uppercase }
.day-plan-heading > div:last-child { display: flex; gap: .45rem }
.schedule-table-wrap { overflow-x: auto; padding: .2rem .35rem .55rem; border: 1px solid var(--border); border-radius: 14px; background: color-mix(in srgb, var(--surface-raised) 75%, var(--accent-soft)) }
.schedule-table { width: 100%; min-width: 1080px; border-collapse: separate; border-spacing: 0 .55rem; color: var(--text); font-size: .86rem }
.schedule-table thead th { position: sticky; top: 0; z-index: 1; padding: .15rem .7rem .55rem; color: var(--muted); background: transparent; font-size: .68rem; font-weight: 900; letter-spacing: .07em; text-align: left; text-transform: uppercase }
.schedule-table td { min-width: 128px; padding: .45rem; vertical-align: top; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--surface-raised); transition: border-color .16s ease, box-shadow .16s ease }
.schedule-table td:first-child { border-left: 1px solid var(--border); border-radius: 9px 0 0 9px }
.schedule-table td:last-child { border-right: 1px solid var(--border); border-radius: 0 9px 9px 0 }
.schedule-row:hover td { border-color: color-mix(in srgb, var(--accent) 46%, var(--border)); box-shadow: inset 0 1px 0 color-mix(in srgb, var(--accent) 18%, transparent), inset 0 -1px 0 color-mix(in srgb, var(--accent) 18%, transparent) }
.schedule-row.dragging td { opacity: .6; border-style: dashed }
.schedule-table tr.break td { color: var(--warning); border-color: color-mix(in srgb, var(--warning) 42%, var(--border)); background: var(--warning-soft) }
.schedule-cell :is(input, textarea) { width: 100%; border-color: transparent; border-radius: 6px; color: var(--text); background: transparent; box-shadow: none }
.schedule-cell :is(input, textarea):hover { background: color-mix(in srgb, var(--accent-soft) 42%, transparent) }
.schedule-cell :is(input, textarea):focus { border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent) }
.schedule-cell textarea { min-width: 176px; min-height: 5.35rem; resize: vertical; line-height: 1.5 }
.field-time { width: 100px; min-width: 100px; padding-top: .6rem !important }
.field-time input { padding: .46rem .36rem; font-variant-numeric: tabular-nums; font-weight: 800; letter-spacing: .02em }
.phase-cell { width: 170px; min-width: 170px; display: grid; gap: .35rem }
.phase-cell input:first-child { color: var(--accent-strong); font-size: .82rem; font-weight: 800 }
.phase-cell input:last-child { color: var(--text); font-size: .8rem }
.field-method { min-width: 176px; display: grid; gap: .35rem }
.field-method input:last-child { color: var(--muted); font-size: .76rem }
.field-materials { min-width: 190px }
.field-materials details { position: relative; border-radius: 6px }
.field-materials summary { padding: .46rem .35rem; color: var(--accent-strong); cursor: pointer; font-weight: 700; list-style: none }
.field-materials summary::before { content: '▸'; display: inline-block; margin-right: .35rem; transition: transform .15s ease }
.field-materials details[open] summary::before { transform: rotate(90deg) }
.field-materials details[open] { padding-bottom: .3rem; background: var(--accent-soft) }
.material-check { display: flex; gap: .4rem; align-items: center; padding: .3rem .45rem; color: var(--text); font-size: .78rem; font-weight: 600 }
.material-check input { width: auto }
.schedule-actions { min-width: 134px; padding: .35rem !important; white-space: normal }
.schedule-actions > button { margin: .12rem; padding: .4rem .48rem; font-size: .74rem }
.drag-handle { color: var(--muted) !important; border-color: transparent !important; background: transparent !important }
.drag-handle:hover { color: var(--accent-strong) !important; background: var(--accent-soft) !important }
.presentation-entry-point { display: grid; gap: .3rem; margin-bottom: .35rem; padding-bottom: .45rem; border-bottom: 1px solid var(--border) }
.presentation-entry-point :is(button, select) { min-width: 0; font-size: .72rem }
.entry-link { color: var(--accent-strong) !important; border-color: var(--border) !important; background: var(--accent-soft) !important }
.broken-entry { color: var(--danger); font-size: .73rem; font-weight: 700 }
@media (max-width: 850px) { .schedule-heading, .day-plan-heading { align-items: stretch; flex-direction: column }.schedule-controls { min-width: 0 }.day-plan-heading > div:last-child { justify-content: flex-start } }
@media (max-width: 560px) { .schedule-controls { grid-template-columns: 1fr }.schedule-table-wrap { margin-inline: -.3rem; border-radius: 10px }.day-plan-heading > div:last-child { display: grid; grid-template-columns: 1fr 1fr }.day-plan-heading button { width: 100% } }
</style>
