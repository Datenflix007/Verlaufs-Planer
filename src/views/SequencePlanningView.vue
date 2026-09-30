<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createId, createPlan, richTextFromPlain } from '../domain/factories'
import { getCurriculum } from '../data/curricula/registry'
import type { LessonReflection, SequenceLesson, SchoolPlanningSnapshot } from '../domain/schoolPlanning'
import { SchoolPlanningRepository } from '../repositories/SchoolPlanningRepository'
import { SqlitePlanRepository } from '../repositories/SqlitePlanRepository'
import type { PlanSummary } from '../repositories/PlanRepository'

const router = useRouter()
const repository = new SchoolPlanningRepository()
const planRepository = new SqlitePlanRepository()
const data = ref<SchoolPlanningSnapshot>()
const assignmentId = ref('')
const title = ref('Neue Unterrichtsreihe')
const question = ref('')
const start = ref('')
const end = ref('')
const selectedSequenceId = ref('')
const selectedLessonId = ref('')
const copyTargetAssignmentId = ref('')
const copyNotice = ref('')
const existingPlanId = ref('')
const detailedPlans = ref<PlanSummary[]>([])
const reflectionOutcome = ref<LessonReflection['outcome']>('completed')
const reflectionNote = ref('')
const date = ref('')
const startTime = ref('')
const endTime = ref('')
const contextType = ref<'REGULAR_LESSON' | 'DOUBLE_LESSON'>('REGULAR_LESSON')

const assignment = computed(() => data.value?.assignments.find((item) => item.id === assignmentId.value) ?? data.value?.assignments[0])
const sequences = computed(() => data.value?.sequences.filter((item) => item.classSubjectAssignmentId === assignment.value?.id) ?? [])
const lessons = computed(() => data.value?.sequenceLessons.filter((item) => item.teachingSequenceId === selectedSequenceId.value) ?? [])
const selectedLesson = computed(() => lessons.value.find((item) => item.id === selectedLessonId.value))
const selectedReflection = computed(() => data.value?.lessonReflections.find((item) => item.sequenceLessonId === selectedLessonId.value))
const scheduleFor = (lessonId: string) => data.value?.scheduledLessons.find((item) => item.sequenceLessonId === lessonId)
const copyTargets = computed(() => data.value?.assignments.filter((item) => item.id !== assignment.value?.id && item.subjectId === assignment.value?.subjectId) ?? [])
const sequenceReferencesFor = (sequenceId: string) => data.value?.sequenceCurriculumReferences.filter((item) => item.teachingSequenceId === sequenceId) ?? []
const sequenceCompetenciesFor = (sequenceId: string) => data.value?.sequenceCompetencies.filter((item) => item.teachingSequenceId === sequenceId) ?? []
function curriculumNodeLabel(nodeId: string) {
  const curriculum = assignment.value && getCurriculum(assignment.value.curriculumId)
  return curriculum?.learningAreas.find((item) => item.id === nodeId)?.title
    ?? curriculum?.contentPoints.find((item) => item.id === nodeId)?.title
    ?? curriculum?.competencies.find((item) => item.id === nodeId)?.normalizedLabel
    ?? nodeId
}

async function load() { data.value = await repository.get(); detailedPlans.value = await planRepository.list(); if (!assignmentId.value && assignment.value) assignmentId.value = assignment.value.id }
async function createSequence() {
  if (!assignment.value) return
  const stamp = new Date().toISOString()
  const item = await repository.saveSequence({ id: createId(), classSubjectAssignmentId: assignment.value.id, title: title.value, overarchingQuestion: question.value || undefined, startDate: start.value || undefined, endDate: end.value || undefined, status: 'planned', createdAt: stamp, updatedAt: stamp })
  selectedSequenceId.value = item.id
  await load()
}
async function addLesson() {
  if (!selectedSequenceId.value) return
  const stamp = new Date().toISOString()
  const item = await repository.saveSequenceLesson({ id: createId(), teachingSequenceId: selectedSequenceId.value, position: lessons.value.length + 1, title: `Stunde ${lessons.value.length + 1}`, status: 'draft', createdAt: stamp, updatedAt: stamp })
  selectedLessonId.value = item.id
  await load()
}
function selectLesson(lesson: SequenceLesson) {
  selectedLessonId.value = lesson.id
  const scheduled = scheduleFor(lesson.id)
  date.value = scheduled?.date ?? lesson.plannedDate ?? ''
  startTime.value = scheduled?.startTime ?? ''
  endTime.value = scheduled?.endTime ?? ''
  contextType.value = scheduled?.contextType === 'DOUBLE_LESSON' ? 'DOUBLE_LESSON' : 'REGULAR_LESSON'
  reflectionOutcome.value = selectedReflection.value?.outcome ?? 'completed'
  reflectionNote.value = selectedReflection.value?.note ?? ''
}
async function scheduleLesson() {
  if (!assignment.value || !selectedLesson.value || !date.value) return
  const stamp = new Date().toISOString()
  const current = scheduleFor(selectedLesson.value.id)
  const scheduled = await repository.saveScheduledLesson({ id: current?.id ?? createId(), classSubjectAssignmentId: assignment.value.id, sequenceLessonId: selectedLesson.value.id, date: date.value, startTime: startTime.value || undefined, endTime: endTime.value || undefined, contextType: contextType.value, status: 'planned', createdAt: current?.createdAt ?? stamp, updatedAt: stamp })
  await repository.saveSequenceLesson({ ...selectedLesson.value, scheduledLessonId: scheduled.id, plannedDate: scheduled.date, plannedDuration: startTime.value && endTime.value ? Math.max(1, (Number(endTime.value.slice(0, 2)) * 60 + Number(endTime.value.slice(3))) - (Number(startTime.value.slice(0, 2)) * 60 + Number(startTime.value.slice(3)))) : selectedLesson.value.plannedDuration, status: 'planned', updatedAt: stamp })
  await load()
}
async function copySequence() {
  const source = data.value?.sequences.find((item) => item.id === selectedSequenceId.value)
  const target = copyTargets.value.find((item) => item.id === copyTargetAssignmentId.value)
  if (!source || !target) return
  const stamp = new Date().toISOString()
  const clone = await repository.saveSequence({ ...source, id: createId(), classSubjectAssignmentId: target.id, title: `${source.title} (Kopie)`, status: 'draft', createdAt: stamp, updatedAt: stamp })
  for (const reference of sequenceReferencesFor(source.id)) await repository.saveSequenceCurriculumReference({ ...reference, id: createId(), teachingSequenceId: clone.id, createdAt: stamp, updatedAt: stamp })
  for (const competency of sequenceCompetenciesFor(source.id)) await repository.saveSequenceCompetency({ ...competency, id: createId(), teachingSequenceId: clone.id, createdAt: stamp, updatedAt: stamp })
  const sourceLessons = data.value?.sequenceLessons.filter((item) => item.teachingSequenceId === source.id) ?? []
  for (const lesson of sourceLessons) await repository.saveSequenceLesson({ ...lesson, id: createId(), teachingSequenceId: clone.id, scheduledLessonId: undefined, planId: undefined, plannedDate: undefined, status: 'draft', createdAt: stamp, updatedAt: stamp })
  copyNotice.value = `Reihe mit ${sourceLessons.length} Stunde${sourceLessons.length === 1 ? '' : 'n'} als Entwurf kopiert.`
  await load()
}
async function createDetailedPlan() {
  if (!selectedLesson.value) return
  const lesson = selectedLesson.value
  const plan = createPlan(lesson.title)
  plan.days = [{ id: createId(), date: lesson.plannedDate ?? new Date().toISOString().slice(0, 10), title: lesson.title }]
  if (lesson.lessonObjective) plan.learningObjectives = [{ id: createId(), text: lesson.lessonObjective, competencyIds: [] }]
  if (lesson.contentSummary) plan.contentAnalysis = richTextFromPlain(lesson.contentSummary)
  await planRepository.save(plan)
  await repository.saveSequenceLesson({ ...lesson, planId: plan.id, updatedAt: new Date().toISOString() })
  await router.push({ name: 'editor', params: { id: plan.id } })
}
async function linkExistingPlan() {
  if (!selectedLesson.value || !existingPlanId.value) return
  const plan = await planRepository.get(existingPlanId.value)
  if (!plan) return
  const lesson = selectedLesson.value
  const plannedDate = lesson.plannedDate
  if (plannedDate && !plan.days.some((day) => day.date === plannedDate)) plan.days.push({ id: createId(), date: plannedDate, title: lesson.title })
  if (lesson.lessonObjective && !plan.learningObjectives.some((objective) => objective.text === lesson.lessonObjective)) plan.learningObjectives.push({ id: createId(), text: lesson.lessonObjective, competencyIds: [] })
  await planRepository.save(plan)
  await repository.saveSequenceLesson({ ...lesson, planId: plan.id, updatedAt: new Date().toISOString() })
  await router.push({ name: 'editor', params: { id: plan.id } })
}
async function saveReflection() {
  if (!selectedLesson.value) return
  const lesson = selectedLesson.value
  const stamp = new Date().toISOString()
  const reflection = selectedReflection.value
  await repository.saveLessonReflection({ id: reflection?.id ?? createId(), sequenceLessonId: lesson.id, outcome: reflectionOutcome.value, note: reflectionNote.value.trim() || undefined, repeatNeeded: reflectionOutcome.value === 'needs-revisit', createdAt: reflection?.createdAt ?? stamp, updatedAt: stamp })
  const status = reflectionOutcome.value === 'completed' ? 'completed' : reflectionOutcome.value
  await repository.saveSequenceLesson({ ...lesson, status, updatedAt: stamp })
  const sequence = data.value?.sequences.find((item) => item.id === lesson.teachingSequenceId)
  const annotation = data.value?.annotations.find((item) => item.teachingSequenceId === sequence?.id)
  if (annotation && (reflectionOutcome.value === 'completed' || reflectionOutcome.value === 'needs-revisit')) {
    await repository.saveAnnotation({ ...annotation, status: reflectionOutcome.value === 'completed' ? 'completed' : 'needs-revisit', updatedAt: stamp })
  }
  await load()
}
onMounted(() => void load())
</script>

<template>
  <main class="sequence">
    <header><div><p class="eyebrow">Reihenplanung</p><h1>Unterrichtsreihe planen</h1><p>Reihen und Stunden werden getrennt pro Klasse und Fach gespeichert.</p></div><nav><button class="secondary" @click="router.push({ name: 'curriculum-viewer' })">← Lehrplan</button><button class="secondary" @click="router.push({ name: 'school-planning' })">Schuljahr</button></nav></header>
    <label class="assignment-picker">Klasse &amp; Fach<select v-model="assignmentId"><option v-for="item in data?.assignments" :key="item.id" :value="item.id">{{ data?.classGroups.find((group) => group.id === item.classGroupId)?.name }} · {{ item.subjectId }}</option></select></label>
    <form class="sequence-form" @submit.prevent="createSequence"><label>Titel<input v-model="title" required></label><label>Leitfrage<input v-model="question"></label><label>Beginn<input v-model="start" type="date"></label><label>Ende<input v-model="end" type="date"></label><button>Reihe anlegen</button></form>
    <section v-for="sequence in sequences" :key="sequence.id" class="sequence-card"><header><div><p class="eyebrow">{{ sequence.startDate || 'ohne Beginn' }} – {{ sequence.endDate || 'ohne Ende' }}</p><h2>{{ sequence.title }}</h2><p>{{ sequence.overarchingQuestion || 'Keine Leitfrage hinterlegt.' }}</p><div v-if="sequenceReferencesFor(sequence.id).length || sequenceCompetenciesFor(sequence.id).length" class="reference-chips" aria-label="Lehrplan- und Kompetenzbezüge"><span v-for="reference in sequenceReferencesFor(sequence.id)" :key="reference.id" class="reference-chip">Lehrplan · {{ curriculumNodeLabel(reference.curriculumNodeId) }}</span><span v-for="competency in sequenceCompetenciesFor(sequence.id)" :key="competency.id" class="competency-chip">{{ competency.role === 'primary' ? 'Primär' : competency.role === 'secondary' ? 'Sekundär' : 'Unterstützend' }} · {{ curriculumNodeLabel(competency.competencyId) }}</span></div></div><button @click="selectedSequenceId = sequence.id">{{ selectedSequenceId === sequence.id ? 'Geöffnet' : 'Öffnen' }}</button></header><template v-if="selectedSequenceId === sequence.id"><div class="sequence-timeline" role="list" aria-label="Sequenzstunden"><button v-for="lesson in lessons" :key="lesson.id" class="timeline-item" :class="{ selected: lesson.id === selectedLessonId, gap: !scheduleFor(lesson.id) }" role="listitem" @click="selectLesson(lesson)"><span class="timeline-node" :class="lesson.status" aria-hidden="true"></span><span class="timeline-copy"><strong>{{ lesson.position }}. {{ lesson.title }}</strong><small v-if="scheduleFor(lesson.id)">{{ scheduleFor(lesson.id)?.date }} · {{ scheduleFor(lesson.id)?.startTime || 'Zeit offen' }} · {{ lesson.status }}</small><small v-else>Planungslücke: Termin offen</small></span><span v-if="lesson.planId" class="plan-badge">Plan</span></button><p v-if="!lessons.length" class="timeline-empty">Noch keine Stunde angelegt.</p></div><div class="lesson-list"><button v-for="lesson in lessons" :key="lesson.id" class="lesson-row" :class="{ selected: lesson.id === selectedLessonId }" @click="selectLesson(lesson)"><strong>{{ lesson.position }}. {{ lesson.title }}</strong><span v-if="scheduleFor(lesson.id)">{{ scheduleFor(lesson.id)?.date }} · {{ scheduleFor(lesson.id)?.startTime || 'Zeit offen' }}</span><span v-else>Termin offen</span></button></div><div class="sequence-actions"><button class="secondary" @click="addLesson">+ Sequenzstunde</button><label v-if="copyTargets.length">In Parallelklasse kopieren<select v-model="copyTargetAssignmentId"><option value="" disabled>Zielklasse auswählen</option><option v-for="target in copyTargets" :key="target.id" :value="target.id">{{ data?.classGroups.find((group) => group.id === target.classGroupId)?.name }}</option></select></label><button v-if="copyTargets.length" :disabled="!copyTargetAssignmentId" @click="copySequence">Reihe kopieren</button></div><p v-if="copyNotice" class="copy-notice">{{ copyNotice }}</p></template></section>
    <aside v-if="selectedLesson" class="schedule-editor"><div><p class="eyebrow">Stunde {{ selectedLesson.position }}</p><h2>{{ selectedLesson.title }}</h2><p>Ein gespeicherter Termin ist die verbindliche Kalenderreferenz dieser Stunde.</p><button class="secondary" @click="createDetailedPlan">{{ selectedLesson.planId ? 'Verlaufsplan neu erstellen' : 'Detaillierten Verlaufsplan erstellen' }}</button><label class="existing-plan-picker">In vorhandenen Plan übernehmen<select v-model="existingPlanId"><option value="">Plan auswählen</option><option v-for="plan in detailedPlans" :key="plan.id" :value="plan.id">{{ plan.title }} · {{ plan.dateRange || 'ohne Termin' }}</option></select></label><button class="secondary" :disabled="!existingPlanId" @click="linkExistingPlan">Mit bestehendem Plan verknüpfen</button><section class="reflection"><h3>Stunde abschließen</h3><label>Durchführung<select v-model="reflectionOutcome"><option value="completed">Wie geplant durchgeführt</option><option value="partial">Teilweise durchgeführt</option><option value="needs-revisit">Erneut aufgreifen</option><option value="cancelled">Ausgefallen</option></select></label><label>Reflexion<textarea v-model="reflectionNote" placeholder="z. B. Gruppenarbeit dauerte länger …"></textarea></label><button @click="saveReflection">Durchführung speichern</button></section></div><form @submit.prevent="scheduleLesson"><label>Datum<input v-model="date" type="date" required></label><label>Beginn<input v-model="startTime" type="time"></label><label>Ende<input v-model="endTime" type="time"></label><label>Unterrichtsform<select v-model="contextType"><option value="REGULAR_LESSON">Einzelstunde</option><option value="DOUBLE_LESSON">Doppelstunde</option></select></label><button>Termin speichern</button></form></aside>
  </main>
</template>

<style scoped>
.sequence{max-width:1040px;margin:auto;padding:clamp(1.2rem,3vw,3rem)}.sequence>header,.sequence-card>header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.sequence>header{border-bottom:1px solid #cad8da;padding-bottom:1.3rem}.sequence>header p,.sequence-card p{color:#5f7277}.sequence nav{display:flex;gap:.55rem}.assignment-picker{display:grid;max-width:440px;gap:.3rem;margin:1rem 0}.sequence-form{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;padding:1rem;border:1px solid #cad8da;border-radius:12px;background:#fff}.sequence-form label,.schedule-editor label{display:grid;gap:.3rem;font-weight:700;font-size:.86rem}.sequence-form button{grid-column:1/-1}.sequence-card,.schedule-editor{margin:1rem 0;padding:1rem;border:1px solid #cad8da;border-radius:12px;background:#fff;box-shadow:0 2px 12px #1833380d}.lesson-list{display:grid;gap:.45rem;margin:1rem 0}.lesson-row{display:flex;justify-content:space-between;gap:.75rem;text-align:left;background:#f4f9f9;color:#2c555b;border:1px solid #d4e3e4}.lesson-row.selected{outline:2px solid #26a5a9;outline-offset:1px}.lesson-row span{font-size:.82rem;color:#60777b}.schedule-editor{display:grid;grid-template-columns:minmax(0,1fr) 1fr;gap:1rem;background:#f4fbfb}.schedule-editor h2{margin:.15rem 0}.schedule-editor form{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}.schedule-editor form button{grid-column:1/-1}@media(max-width:700px){.sequence-form,.schedule-editor,.schedule-editor form{grid-template-columns:1fr}.sequence>header,.sequence-card>header,.lesson-row{flex-direction:column}}
.reference-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.65rem}.reference-chip,.competency-chip{padding:.24rem .45rem;border-radius:999px;font-size:.72rem;font-weight:700}.reference-chip{color:#155d66;background:#d9f0f1}.competency-chip{color:#514c7c;background:#ece9f9}
</style>

<style scoped>
.reflection{display:grid;gap:.45rem;margin-top:1rem;padding-top:1rem;border-top:1px solid #cfe1e2}.reflection h3{margin:0}.reflection label{display:grid;gap:.3rem;font-size:.82rem;font-weight:800}.reflection textarea{min-height:70px;resize:vertical}
</style>

<style scoped>
.existing-plan-picker{display:grid;gap:.3rem;margin-top:.8rem;font-size:.82rem;font-weight:800}.existing-plan-picker select{min-width:0}.existing-plan-picker+button{margin-top:.45rem}
</style>

<style scoped>
.sequence-timeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.7rem;margin:1.15rem 0;padding:.9rem;border-radius:10px;background:linear-gradient(135deg,#f1fbfb,#f8fbff)}
.timeline-item{position:relative;display:grid;grid-template-columns:auto 1fr auto;gap:.55rem;align-items:center;min-height:88px;padding:.75rem;text-align:left;color:#244e55;background:#fff;border:1px solid #cde1e2;box-shadow:0 2px 7px #173e4410}
.timeline-item::after{content:'';position:absolute;top:50%;left:calc(100% - .2rem);width:.5rem;height:2px;background:#5cc0c3}.timeline-item:last-of-type::after{display:none}.timeline-item.selected{outline:2px solid #148f94;outline-offset:2px}.timeline-item.gap{border-style:dashed;border-color:#d69a49;background:#fffaf1}.timeline-node{width:1rem;height:1rem;border-radius:50%;background:#96b8ba;box-shadow:0 0 0 4px #d8eeee}.timeline-node.planned,.timeline-node.completed{background:#1d9b84;box-shadow:0 0 0 4px #d9f2e9}.timeline-node.needs-revisit{background:#d68030;box-shadow:0 0 0 4px #faecd7}.timeline-copy{display:grid;gap:.22rem}.timeline-copy small{color:#64787d;font-size:.76rem}.plan-badge{padding:.23rem .4rem;border-radius:999px;color:#176341;background:#e7f6ee;font-size:.72rem;font-weight:800}.timeline-empty{grid-column:1/-1;margin:.4rem;color:#687c80;text-align:center}@media(max-width:700px){.timeline-item::after{display:none}}
</style>
