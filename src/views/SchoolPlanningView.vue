<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getApplicableCurriculum, getCurriculum, getCurriculumTree } from '../data/curricula/registry'
import { createId } from '../domain/factories'
import type { ClassGroup, ClassSubjectAssignment, SchoolPlanningSnapshot, SchoolYear } from '../domain/schoolPlanning'
import { SchoolPlanningRepository } from '../repositories/SchoolPlanningRepository'

const router = useRouter()
const repository = new SchoolPlanningRepository()
const snapshot = ref<SchoolPlanningSnapshot>()
const error = ref('')
const notice = ref('')
const schoolYearName = ref('2026/27')
const startDate = ref('2026-08-01')
const endDate = ref('2027-07-31')
const className = ref('8a')
const classGrade = ref(8)
const assignmentClassId = ref('')
const subjectId = ref('subject-history')
const subjects = [
  { id: 'subject-history', label: 'Geschichte' },
  { id: 'subject-informatics', label: 'Informatik' },
  { id: 'subject-media-informatics', label: 'Medienbildung und Informatik' },
]

const activeYear = computed(() => snapshot.value?.schoolYears.find((year) => year.active) ?? snapshot.value?.schoolYears[0])
const classes = computed(() => snapshot.value?.classGroups.filter((group) => group.schoolYearId === activeYear.value?.id) ?? [])
const assignmentClass = computed(() => classes.value.find((group) => group.id === assignmentClassId.value))
const availableCurriculum = computed(() => assignmentClass.value && getApplicableCurriculum({
  state: 'TH', schoolType: 'gymnasium', subjectId: subjectId.value, grade: assignmentClass.value.grade, schoolYear: activeYear.value?.name ?? schoolYearName.value,
}))
const subjectLabel = (id: string) => subjects.find((subject) => subject.id === id)?.label ?? id
const assignmentsFor = (group: ClassGroup) => snapshot.value?.assignments.filter((assignment) => assignment.classGroupId === group.id) ?? []
const assignmentFor = (group: ClassGroup, subject = subjectId.value) => assignmentsFor(group).find((assignment) => assignment.subjectId === subject)
const assignmentLabel = (assignment: ClassSubjectAssignment) => `${snapshot.value?.classGroups.find((group) => group.id === assignment.classGroupId)?.name ?? 'Klasse'} · ${subjectLabel(assignment.subjectId)}`

async function load(): Promise<void> {
  try {
    snapshot.value = await repository.get()
    if (!classes.value.some((group) => group.id === assignmentClassId.value)) assignmentClassId.value = classes.value[0]?.id ?? ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Daten konnten nicht geladen werden.'
  }
}

async function createSchoolYear(): Promise<void> {
  error.value = ''
  const timestamp = new Date().toISOString()
  const value: SchoolYear = { id: createId(), name: schoolYearName.value, federalState: 'TH', schoolType: 'Gymnasium', startDate: startDate.value, endDate: endDate.value, active: true, createdAt: timestamp, updatedAt: timestamp }
  try {
    for (const year of snapshot.value?.schoolYears ?? []) if (year.active) await repository.saveSchoolYear({ ...year, active: false })
    await repository.saveSchoolYear(value)
    notice.value = `Schuljahr ${value.name} ist aktiv.`
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Schuljahr konnte nicht gespeichert werden.'
  }
}

async function createClass(): Promise<void> {
  const year = activeYear.value
  if (!year) { error.value = 'Bitte zuerst ein Schuljahr anlegen.'; return }
  const timestamp = new Date().toISOString()
  const group: ClassGroup = { id: createId(), schoolYearId: year.id, name: className.value, grade: classGrade.value, schoolType: year.schoolType, createdAt: timestamp, updatedAt: timestamp }
  try {
    await repository.saveClassGroup(group)
    assignmentClassId.value = group.id
    notice.value = `Klasse ${group.name} angelegt. Jetzt kann ein Fachlehrplan zugeordnet werden.`
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Klasse konnte nicht gespeichert werden.'
  }
}

async function assign(): Promise<void> {
  const group = assignmentClass.value
  const curriculum = availableCurriculum.value
  if (!group || !curriculum) { error.value = 'Für diese Klassen-Fach-Kombination ist kein verifiziertes Curriculum verfügbar.'; return }
  if (assignmentFor(group)) { error.value = `${subjectLabel(subjectId.value)} ist ${group.name} bereits zugeordnet.`; return }
  const timestamp = new Date().toISOString()
  const assignment: ClassSubjectAssignment = { id: createId(), classGroupId: group.id, schoolYearId: group.schoolYearId, subjectId: subjectId.value, curriculumId: curriculum.id, createdAt: timestamp, updatedAt: timestamp }
  try {
    await repository.saveAssignment(assignment)
    notice.value = `${assignmentLabel(assignment)} ist eingerichtet. Der Fortschritt bleibt nur für diese Zuordnung gespeichert.`
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Zuordnung konnte nicht gespeichert werden.'
  }
}

function coverageFor(assignment: ClassSubjectAssignment): { completed: number; total: number; percent: number } {
  const group = snapshot.value?.classGroups.find((item) => item.id === assignment.classGroupId)
  const curriculum = getCurriculum(assignment.curriculumId)
  const nodeIds = curriculum ? getCurriculumTree(curriculum.id, group?.grade).flatMap((area) => area.contentPoints.map((point) => point.id)) : []
  const completed = (snapshot.value?.annotations ?? []).filter((item) => item.classSubjectAssignmentId === assignment.id && item.status === 'completed' && nodeIds.includes(item.curriculumNodeId)).length
  return { completed, total: nodeIds.length, percent: nodeIds.length ? Math.round((completed / nodeIds.length) * 100) : 0 }
}

function openCurriculum(assignment: ClassSubjectAssignment) { void router.push({ name: 'curriculum-viewer', query: { assignmentId: assignment.id } }) }
function openSequences(assignment: ClassSubjectAssignment) { void router.push({ name: 'sequence-planning', query: { assignmentId: assignment.id } }) }

onMounted(() => void load())
</script>

<template>
  <main class="school-planning-shell">
    <header class="school-planning-header">
      <div><p class="eyebrow">Unterrichtsplanung</p><h1>Schuljahr &amp; Fachlehrpläne</h1><p>Lege beliebig viele Klassen an und richte jeden Fachlehrplan getrennt pro Klasse ein. Fortschritt, Kommentare und Reihen bleiben dabei eindeutig zugeordnet.</p></div>
      <nav><button type="button" class="secondary" @click="router.push({ name: 'timetable-settings' })">Stundenplan</button><button type="button" class="secondary" @click="router.push({ name: 'home' })">← Dashboard</button></nav>
    </header>
    <p v-if="error" class="error-message">{{ error }}</p><p v-if="notice" class="success-message">{{ notice }}</p>
    <section class="planning-grid">
      <article class="planning-card"><p class="step">01</p><h2>Schuljahr</h2><form @submit.prevent="createSchoolYear"><label>Bezeichnung<input v-model="schoolYearName" required placeholder="2026/27"></label><div class="two"><label>Beginn<input v-model="startDate" type="date" required></label><label>Ende<input v-model="endDate" type="date" required></label></div><button type="submit">Schuljahr aktivieren</button></form><p v-if="activeYear" class="current"><strong>{{ activeYear.name }}</strong><span>Thüringen · {{ activeYear.schoolType }}</span></p></article>
      <article class="planning-card"><p class="step">02</p><h2>Klasse oder Kurs</h2><form @submit.prevent="createClass"><label>Name<input v-model="className" required placeholder="z. B. 8a"></label><label>Klassenstufe<input v-model.number="classGrade" min="1" max="13" type="number" required></label><button type="submit" :disabled="!activeYear">Klasse anlegen</button></form><p v-if="!classes.length" class="empty-state">Noch keine Klasse im aktiven Schuljahr.</p><div v-else class="class-pills"><span v-for="group in classes" :key="group.id">{{ group.name }} · {{ group.grade }}</span></div></article>
      <article class="planning-card curriculum-card"><p class="step">03</p><h2>Fachlehrplan zuordnen</h2><label>Klasse oder Kurs<select v-model="assignmentClassId" :disabled="!classes.length"><option value="" disabled>Klasse auswählen</option><option v-for="group in classes" :key="group.id" :value="group.id">{{ group.name }} · Klassenstufe {{ group.grade }}</option></select></label><label>Fach<select v-model="subjectId" :disabled="!assignmentClass"><option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.label }}</option></select></label><p v-if="assignmentClass && assignmentFor(assignmentClass)" class="curriculum-existing"><strong>Bereits eingerichtet</strong><span>{{ assignmentLabel(assignmentFor(assignmentClass)!) }} hat einen eigenen Fachlehrplan.</span></p><p v-else-if="availableCurriculum" class="curriculum-available"><strong>Verifiziert verfügbar</strong><span>{{ availableCurriculum.title }} · {{ availableCurriculum.version }}</span></p><p v-else class="curriculum-missing">Für diese Klassen-Fach-Kombination liegt kein verifiziertes Referenzcurriculum vor. Es wird nichts erfunden oder zugeordnet.</p><button type="button" :disabled="!availableCurriculum || !assignmentClass || Boolean(assignmentClass && assignmentFor(assignmentClass))" @click="assign">Fachlehrplan zuordnen</button></article>
    </section>
    <section class="class-overview">
      <header><div><p class="eyebrow">Klassenfachbereiche</p><h2>Eigene Planungsräume</h2></div><span>{{ classes.length }} Klasse{{ classes.length === 1 ? '' : 'n' }} · {{ snapshot?.assignments.length ?? 0 }} Fach{{ (snapshot?.assignments.length ?? 0) === 1 ? '' : 'e' }}</span></header>
      <p v-if="!classes.length" class="empty-state">Lege oben zuerst ein Schuljahr und mindestens eine Klasse an.</p>
      <article v-for="group in classes" :key="group.id" class="class-row"><div class="class-badge">{{ group.name }}</div><div><strong>Klassenstufe {{ group.grade }}</strong><p v-if="!assignmentsFor(group).length">Noch kein Fach zugeordnet – wähle oben diese Klasse und ein Fach aus.</p><div v-for="assignment in assignmentsFor(group)" :key="assignment.id" class="assignment-card"><div class="coverage" :aria-label="`Lehrplanabdeckung ${subjectLabel(assignment.subjectId)}: ${coverageFor(assignment).percent} Prozent`"><span>{{ subjectLabel(assignment.subjectId) }} · Lehrplanabdeckung</span><div class="coverage-bar"><span :style="{ width: `${coverageFor(assignment).percent}%` }"></span></div><strong>{{ coverageFor(assignment).percent }} %</strong><small>{{ coverageFor(assignment).completed }} von {{ coverageFor(assignment).total }} Inhalten dokumentiert behandelt</small></div><div class="assignment-actions"><button type="button" class="secondary" @click="openCurriculum(assignment)">Fachlehrplan öffnen</button><button type="button" @click="openSequences(assignment)">Reihen planen</button></div></div></div></article>
    </section>
  </main>
</template>

<style scoped>
.school-planning-shell { max-width: 1180px; margin: auto; padding: clamp(1.25rem, 4vw, 3.5rem) }
.school-planning-header, .class-overview > header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start }
.school-planning-header { padding-bottom: 1.6rem; border-bottom: 1px solid var(--border) }
.school-planning-header nav, .assignment-actions { display: flex; flex-wrap: wrap; gap: .5rem }
.school-planning-header p:last-child { max-width: 48rem; color: var(--muted) }
.planning-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin: 1.5rem 0 }
.planning-card, .class-overview { border: 1px solid var(--border); border-radius: 12px; padding: 1.2rem; color: var(--text); background: var(--surface); box-shadow: 0 2px 12px color-mix(in srgb, var(--text) 8%, transparent) }
.planning-card h2 { margin-bottom: 1rem }
.planning-card form, .curriculum-card { display: grid; gap: .75rem }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem }
.step { color: var(--accent-strong); font-size: .72rem; font-weight: 900; letter-spacing: .1em }
.current, .curriculum-available, .curriculum-existing { display: grid; gap: .2rem; margin: 1rem 0 0; padding: .7rem; border: 1px solid color-mix(in srgb, var(--success) 35%, var(--border)); border-radius: 7px; color: var(--success); background: var(--success-soft); font-size: .84rem }
.curriculum-existing { color: var(--accent-strong); border-color: var(--border); background: var(--accent-soft) }
.curriculum-missing { margin: 1rem 0 0; color: var(--warning); font-size: .85rem; line-height: 1.45 }
.class-pills { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: 1rem }
.class-pills span { padding: .3rem .55rem; color: var(--accent-strong); background: var(--accent-soft); border-radius: 999px; font-size: .8rem; font-weight: 700 }
.class-overview { margin-top: 1rem }
.class-overview > header { align-items: center; margin-bottom: 1rem }
.class-overview > header span, .class-row p { color: var(--muted); font-size: .85rem }
.class-row { display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: start; padding: 1rem 0; border-top: 1px solid var(--border) }
.class-row p { margin: .2rem 0 0 }
.class-badge { display: grid; width: 3.1rem; height: 3.1rem; place-items: center; color: var(--accent-text); background: var(--accent-strong); border-radius: 10px; font-weight: 900 }
.assignment-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .75rem; align-items: center; margin-top: .75rem; padding: .7rem; border: 1px solid var(--border); border-radius: 9px; background: var(--surface-raised) }
.assignment-actions { justify-content: flex-end }
.assignment-actions button { white-space: nowrap }
.coverage { display: grid; grid-template-columns: auto minmax(90px, 1fr) auto; gap: .35rem .55rem; align-items: center; padding: .15rem; font-size: .78rem }
.coverage small { grid-column: 1 / -1; color: var(--muted) }
.coverage-bar { height: .45rem; overflow: hidden; border-radius: 999px; background: var(--accent-soft) }
.coverage-bar span { display: block; height: 100%; border-radius: inherit; background: var(--success); transition: width .2s ease }
@media (max-width: 800px) { .planning-grid { grid-template-columns: 1fr }.school-planning-header, .class-overview > header { flex-direction: column }.two, .assignment-card { grid-template-columns: 1fr }.assignment-actions { justify-content: flex-start } }
</style>
