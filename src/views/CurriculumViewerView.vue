<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCompetenciesForLearningArea, getCurriculum, getCurriculumTree } from '../data/curricula/registry'
import { createId } from '../domain/factories'
import { deriveCurriculumAnnotationStatus } from '../domain/curriculumProgress'
import type { CurriculumAnnotationStatus, CurriculumComment, SchoolPlanningSnapshot } from '../domain/schoolPlanning'
import { SchoolPlanningRepository } from '../repositories/SchoolPlanningRepository'

type NodeKind = 'learning-area' | 'content-point'

const router = useRouter()
const repository = new SchoolPlanningRepository()
const data = ref<SchoolPlanningSnapshot>()
const assignmentId = ref('')
const selectedNodeId = ref('')
const selectedNodeKind = ref<NodeKind>('content-point')
const note = ref('')
const editingCommentId = ref('')
const sequenceTitle = ref('')
const sequenceQuestion = ref('')
const sequenceStart = ref('')
const sequenceEnd = ref('')
const selectedCompetencyIds = ref<string[]>([])
const competencyRoles = ref<Record<string, 'primary' | 'secondary' | 'supporting'>>({})

const labels: Record<CurriculumAnnotationStatus, string> = {
  'rough-planned': '○ Vorgemerkt',
  scheduled: '◐ Geplant',
  completed: '✓ Behandelt',
  'needs-revisit': '! Wiederholen',
}
const assignment = computed(() => data.value?.assignments.find((item) => item.id === assignmentId.value) ?? data.value?.assignments[0])
const group = computed(() => data.value?.classGroups.find((item) => item.id === assignment.value?.classGroupId))
const curriculum = computed(() => assignment.value && getCurriculum(assignment.value.curriculumId))
const tree = computed(() => curriculum.value ? getCurriculumTree(curriculum.value.id, group.value?.grade) : [])
const annotations = computed(() => data.value?.annotations.filter((item) => item.classSubjectAssignmentId === assignment.value?.id) ?? [])
const selectedAnnotation = computed(() => annotations.value.find((item) => item.curriculumNodeId === selectedNodeId.value))
const comments = computed(() => data.value?.comments.filter((item) => item.classSubjectAssignmentId === assignment.value?.id && item.curriculumNodeId === selectedNodeId.value) ?? [])
const selectedNodeTitle = computed(() => {
  for (const area of tree.value) {
    if (area.id === selectedNodeId.value) return area.title
    const point = area.contentPoints.find((item) => item.id === selectedNodeId.value)
    if (point) return point.title
  }
  return ''
})
const calendarWeeks = Array.from({ length: 53 }, (_, index) => index + 1)
function nodeTitle(nodeId: string) {
  for (const area of tree.value) {
    if (area.id === nodeId) return area.title
    const point = area.contentPoints.find((item) => item.id === nodeId)
    if (point) return point.title
  }
  return 'Lehrplaninhalt'
}
const annualMarkers = computed(() => annotations.value.filter((item) => item.plannedWeek).map((item) => ({ ...item, title: nodeTitle(item.curriculumNodeId), status: derivedStatus(item) })))
const selectedAreaId = computed(() => tree.value.find((area) => area.id === selectedNodeId.value || area.contentPoints.some((point) => point.id === selectedNodeId.value))?.id)
const selectableCompetencies = computed(() => curriculum.value && selectedAreaId.value ? getCompetenciesForLearningArea(curriculum.value.id, selectedAreaId.value) : [])

function annotationFor(nodeId: string) { return annotations.value.find((item) => item.curriculumNodeId === nodeId) }
function derivedStatus(annotation?: ReturnType<typeof annotationFor>): CurriculumAnnotationStatus | undefined {
  if (!annotation || !data.value) return annotation?.status
  return deriveCurriculumAnnotationStatus(annotation, data.value.sequences, data.value.sequenceCurriculumReferences, data.value.sequenceLessons, data.value.scheduledLessons)
}
function selectNode(nodeId: string, kind: NodeKind, title: string) {
  selectedNodeId.value = nodeId; selectedNodeKind.value = kind; sequenceTitle.value = `Reihe: ${title}`
  const area = tree.value.find((item) => item.id === nodeId || item.contentPoints.some((point) => point.id === nodeId))
  selectedCompetencyIds.value = area?.competencyIds ?? []
  competencyRoles.value = Object.fromEntries((area?.competencyIds ?? []).map((id, index) => [id, index === 0 ? 'primary' : 'secondary']))
}
async function load() { data.value = await repository.get(); if (!assignmentId.value && assignment.value) assignmentId.value = assignment.value.id }
async function updateAnnotation(nodeId: string, kind: NodeKind, patch: Partial<{ status: CurriculumAnnotationStatus; plannedWeek: number | undefined; teachingSequenceId: string }>) {
  if (!assignment.value) return
  const existing = annotationFor(nodeId), stamp = new Date().toISOString()
  await repository.saveAnnotation({ id: existing?.id ?? createId(), classSubjectAssignmentId: assignment.value.id, curriculumNodeId: nodeId, nodeKind: kind, status: patch.status ?? existing?.status ?? 'rough-planned', plannedWeek: patch.plannedWeek ?? existing?.plannedWeek, teachingSequenceId: patch.teachingSequenceId ?? existing?.teachingSequenceId, createdAt: existing?.createdAt ?? stamp, updatedAt: stamp })
  await load()
}
async function saveStatus(nodeId: string, kind: NodeKind, status: CurriculumAnnotationStatus) { await updateAnnotation(nodeId, kind, { status }) }
async function setWeek(event: Event) { const week = Number((event.target as HTMLInputElement).value); if (!selectedNodeId.value || !Number.isInteger(week) || week < 1 || week > 53) return; await updateAnnotation(selectedNodeId.value, selectedNodeKind.value, { plannedWeek: week }) }
async function saveComment() { if (!assignment.value || !selectedNodeId.value || !note.value.trim()) return; const stamp = new Date().toISOString(); const existing = comments.value.find((item) => item.id === editingCommentId.value); await repository.saveComment(existing ? { ...existing, comment: note.value.trim(), updatedAt: stamp } : { id: createId(), classSubjectAssignmentId: assignment.value.id, curriculumNodeId: selectedNodeId.value, comment: note.value.trim(), resolved: false, createdAt: stamp, updatedAt: stamp }); note.value = ''; editingCommentId.value = ''; await load() }
async function toggleComment(comment: CurriculumComment) { await repository.saveComment({ ...comment, resolved: !comment.resolved, updatedAt: new Date().toISOString() }); await load() }
function editComment(comment: CurriculumComment) { editingCommentId.value = comment.id; note.value = comment.comment }
async function removeComment(comment: CurriculumComment) { await repository.remove('comments', comment.id); if (editingCommentId.value === comment.id) { editingCommentId.value = ''; note.value = '' }; await load() }
async function createSequence() {
  if (!assignment.value || !selectedNodeId.value || !sequenceTitle.value.trim()) return
  const stamp = new Date().toISOString()
  const sequence = await repository.saveSequence({ id: createId(), classSubjectAssignmentId: assignment.value.id, title: sequenceTitle.value.trim(), overarchingQuestion: sequenceQuestion.value.trim() || undefined, startDate: sequenceStart.value || undefined, endDate: sequenceEnd.value || undefined, status: 'planned', createdAt: stamp, updatedAt: stamp })
  await repository.saveSequenceCurriculumReference({ id: createId(), teachingSequenceId: sequence.id, curriculumNodeId: selectedNodeId.value, nodeKind: selectedNodeKind.value, relationType: 'primary', createdAt: stamp, updatedAt: stamp })
  for (const competencyId of selectedCompetencyIds.value) await repository.saveSequenceCompetency({ id: createId(), teachingSequenceId: sequence.id, competencyId, role: competencyRoles.value[competencyId] ?? 'supporting', createdAt: stamp, updatedAt: stamp })
  await updateAnnotation(selectedNodeId.value, selectedNodeKind.value, { status: 'scheduled', teachingSequenceId: sequence.id })
  await router.push({ name: 'sequence-planning' })
}
onMounted(() => void load())
</script>

<template>
  <main class="viewer">
    <header class="viewer-header"><div><p class="eyebrow">Fachlehrplan</p><h1>{{ curriculum?.title ?? 'Lehrplan auswählen' }}</h1><p>{{ group?.name ?? '—' }} · Persönlicher Planungs-Layer; die offizielle Quelle bleibt unverändert.</p></div><nav><button class="secondary" @click="router.push({ name: 'sequence-planning' })">Reihenplanung</button><button class="secondary" @click="router.push({ name: 'school-planning' })">← Schuljahr</button></nav></header>
    <label class="assignment-picker">Klasse &amp; Fach<select v-model="assignmentId"><option v-for="item in data?.assignments" :key="item.id" :value="item.id">{{ data?.classGroups.find((group) => group.id === item.classGroupId)?.name }} · {{ getCurriculum(item.curriculumId)?.subject.name.de }}</option></select></label>
    <section class="annual-plan" aria-label="Jahresplanung"><header><div><p class="eyebrow">Jahresplanung</p><h2>Lehrplanmarker nach Kalenderwoche</h2></div><p>{{ annualMarkers.length }} grobe Planung{{ annualMarkers.length === 1 ? '' : 'en' }}</p></header><div class="week-grid"><article v-for="week in calendarWeeks" :key="week" class="week-cell" :class="{ occupied: annualMarkers.some((marker) => marker.plannedWeek === week) }"><strong>KW {{ week }}</strong><span v-for="marker in annualMarkers.filter((item) => item.plannedWeek === week)" :key="marker.id" :class="`marker ${marker.status}`" :title="marker.title">{{ marker.title }}</span></article></div></section>
    <section class="layout"><article class="curriculum-panel"><h2>Lehrplanbereiche</h2><p class="source">Referenz: {{ curriculum?.sourceId }}</p><section v-for="area in tree" :key="area.id" class="area"><header><div><h3>{{ area.title }}</h3><p>{{ area.description }}</p></div><div class="statuses"><button v-for="(label, status) in labels" :key="status" :class="[`status-${status}`, { active: derivedStatus(annotationFor(area.id)) === status }]" :aria-label="`${area.title}: ${label}`" :aria-pressed="derivedStatus(annotationFor(area.id)) === status" @click="saveStatus(area.id, 'learning-area', status)">{{ label }}</button></div></header><button class="node-select" :class="{ selected: selectedNodeId === area.id }" @click="selectNode(area.id, 'learning-area', area.title)">Bereich für Jahresplanung / Reihe auswählen</button><article v-for="point in area.contentPoints" :key="point.id" class="point" :class="{ selected: selectedNodeId === point.id }"><div><strong>{{ point.title }}</strong><p v-if="point.description">{{ point.description }}</p></div><div class="point-actions"><span v-if="annotationFor(point.id)?.plannedWeek" class="week-chip">KW {{ annotationFor(point.id)?.plannedWeek }}</span><button v-for="(label, status) in labels" :key="status" :title="label" :class="[`status-${status}`, { active: derivedStatus(annotationFor(point.id)) === status }]" :aria-label="`${point.title}: ${label}`" :aria-pressed="derivedStatus(annotationFor(point.id)) === status" @click="saveStatus(point.id, 'content-point', status)">{{ label.slice(0, 1) }}</button><button @click="selectNode(point.id, 'content-point', point.title)">Planen</button></div></article></section></article>
      <aside class="planning-sidebar"><template v-if="selectedNodeId"><p class="eyebrow">Ausgewählter Lehrplanknoten</p><h2>{{ selectedNodeTitle }}</h2><label>Kalenderwoche<input :value="selectedAnnotation?.plannedWeek ?? ''" type="number" min="1" max="53" placeholder="1–53" @change="setWeek"></label><p v-if="selectedAnnotation?.plannedWeek" class="hint">Für KW {{ selectedAnnotation.plannedWeek }} vorgemerkt.</p><section class="side-section"><h3>Kommentar</h3><textarea v-model="note" placeholder="Eigene Notiz zu diesem Lehrplaninhalt …"></textarea><div class="comment-compose"><button :disabled="!note.trim()" @click="saveComment">{{ editingCommentId ? 'Kommentar aktualisieren' : 'Kommentar speichern' }}</button><button v-if="editingCommentId" class="secondary" @click="editingCommentId = ''; note = ''">Abbrechen</button></div><article v-for="comment in comments" :key="comment.id" class="comment" :class="{ resolved: comment.resolved }"><p>{{ comment.comment }}</p><div class="comment-actions"><button class="secondary" @click="toggleComment(comment)">{{ comment.resolved ? 'Wieder öffnen' : 'Als erledigt markieren' }}</button><button class="secondary" @click="editComment(comment)">Bearbeiten</button><button class="danger" @click="removeComment(comment)">Löschen</button></div></article></section><section class="side-section"><h3>Reihe daraus erstellen</h3><label>Titel<input v-model="sequenceTitle" required></label><label>Leitfrage<input v-model="sequenceQuestion"></label><div class="date-grid"><label>Beginn<input v-model="sequenceStart" type="date"></label><label>Ende<input v-model="sequenceEnd" type="date"></label></div><fieldset v-if="selectableCompetencies.length" class="competency-picker"><legend>Kompetenzbezüge</legend><label v-for="competency in selectableCompetencies" :key="competency.id" class="competency-choice"><input v-model="selectedCompetencyIds" type="checkbox" :value="competency.id"><span>{{ competency.normalizedLabel ?? competency.text }}</span><select v-if="selectedCompetencyIds.includes(competency.id)" v-model="competencyRoles[competency.id]"><option value="primary">Primär</option><option value="secondary">Sekundär</option><option value="supporting">Unterstützend</option></select></label></fieldset><button @click="createSequence">Gespeicherte Reihe anlegen</button></section></template><p v-else class="empty">Wähle einen Lehrplanbereich oder Inhaltspunkt aus. Wochenmarker, Kommentare und Reihen werden nur für diese Klasse und dieses Fach gespeichert.</p></aside></section>
  </main>
</template>

<style scoped>
.viewer{max-width:1380px;margin:auto;padding:clamp(1.2rem,3vw,3rem)}.viewer-header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;border-bottom:1px solid #cad8da;padding-bottom:1.4rem}.viewer-header p{color:#5b6e73}.viewer-header nav{display:flex;gap:.55rem;flex-wrap:wrap}.assignment-picker{display:grid;gap:.35rem;max-width:480px;margin:1.2rem 0}.layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:1rem}.curriculum-panel,.planning-sidebar{background:#fff;border:1px solid #cad8da;border-radius:14px;padding:1.1rem;box-shadow:0 2px 12px #1833380d}.source,.hint{font-size:.82rem;color:#657a80}.area{padding:1rem 0;border-top:1px solid #dce5e6}.area>header{display:flex;justify-content:space-between;gap:1rem}.area h3,.area p{margin:.15rem 0}.area p{color:#607379}.statuses,.point-actions{display:flex;gap:.25rem;align-items:flex-start;flex-wrap:wrap}.statuses button,.point-actions button,.node-select{font-size:.78rem;padding:.35rem .5rem;color:#28565c;background:#fff;border:1px solid #bad0d2;border-radius:6px}.statuses button.active,.point-actions button.active{color:#fff;background:#1d777f;border-color:#1d777f}.node-select{margin:.6rem 0}.node-select.selected,.point.selected{outline:2px solid #2aa5aa;outline-offset:2px}.point{display:flex;justify-content:space-between;gap:1rem;padding:.8rem;border-top:1px solid #e6eeee}.point p{font-size:.86rem}.week-chip{padding:.32rem .48rem;border-radius:999px;color:#176341;background:#e8f5ee;font-size:.76rem;font-weight:800}.planning-sidebar{height:max-content;position:sticky;top:1rem}.planning-sidebar label{display:grid;gap:.3rem;margin:.65rem 0;font-size:.86rem;font-weight:700}.side-section{margin-top:1rem;padding-top:1rem;border-top:1px solid #dce5e6}.side-section h3{margin:0}.date-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.planning-sidebar textarea{width:100%;min-height:100px}.comment{margin:.7rem 0;padding:.7rem;background:#f3f8f8;border-radius:8px}.comment p{margin:0 0 .5rem}.comment.resolved{opacity:.58;text-decoration:line-through}.empty{color:#62777c;line-height:1.5}@media(max-width:950px){.layout{grid-template-columns:1fr}.planning-sidebar{position:static}.viewer-header{flex-direction:column}}@media(max-width:620px){.area>header,.point{flex-direction:column}.date-grid{grid-template-columns:1fr}}
</style>

<style scoped>
.comment-compose,.comment-actions{display:flex;gap:.4rem;flex-wrap:wrap}.comment-actions button{font-size:.75rem;padding:.3rem .4rem}
.competency-picker{display:grid;gap:.45rem;margin:.85rem 0;padding:.7rem;border:1px solid #d3e2e3;border-radius:8px}.competency-picker legend{padding:0 .2rem;font-size:.82rem;font-weight:800}.competency-choice{grid-template-columns:auto 1fr auto!important;align-items:center;margin:0!important;font-size:.78rem!important;font-weight:600!important}.competency-choice select{font-size:.74rem}
</style>

<style scoped>
.annual-plan{margin:0 0 1rem;padding:1rem;border:1px solid #cad8da;border-radius:14px;background:#fff;box-shadow:0 2px 12px #1833380d}.annual-plan header{display:flex;justify-content:space-between;align-items:start;gap:1rem}.annual-plan h2,.annual-plan p{margin:.1rem 0}.annual-plan>header>p{color:#63777c;font-size:.84rem}.week-grid{display:grid;grid-template-columns:repeat(13,minmax(76px,1fr));gap:.35rem;margin-top:.8rem;overflow:auto}.week-cell{display:grid;align-content:start;gap:.2rem;min-height:58px;padding:.38rem;border:1px solid #e0e9ea;border-radius:7px;background:#fafcfc}.week-cell strong{font-size:.68rem;color:#70848a}.week-cell.occupied{border-color:#a7d5d7;background:#f2fbfb}.marker{overflow:hidden;padding:.2rem .3rem;border-radius:4px;text-overflow:ellipsis;white-space:nowrap;font-size:.68rem;font-weight:700;color:#43565b;background:#e7eff0}.marker.scheduled{color:#155c66;background:#ccecef}.marker.completed{color:#176341;background:#dff3e8}.marker.needs-revisit{color:#843c22;background:#fbe5d8}@media(max-width:800px){.week-grid{grid-template-columns:repeat(13,90px)}.annual-plan header{flex-direction:column}}
</style>

<style scoped>
.viewer{--status-rough-planned:#6a7480;--status-scheduled:#197e8a;--status-completed:#17734d;--status-needs-revisit:#a45d11}.statuses .status-rough-planned.active,.point-actions .status-rough-planned.active{background:var(--status-rough-planned);border-color:var(--status-rough-planned)}.statuses .status-scheduled.active,.point-actions .status-scheduled.active{background:var(--status-scheduled);border-color:var(--status-scheduled)}.statuses .status-completed.active,.point-actions .status-completed.active{background:var(--status-completed);border-color:var(--status-completed)}.statuses .status-needs-revisit.active,.point-actions .status-needs-revisit.active{background:var(--status-needs-revisit);border-color:var(--status-needs-revisit)}
</style>
