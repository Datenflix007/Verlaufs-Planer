<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getApplicableCurriculum } from '../data/curricula/registry'
import { createId } from '../domain/factories'
import type { ClassGroup, ClassSubjectAssignment, SchoolYear } from '../domain/schoolPlanning'
import { SchoolPlanningRepository } from '../repositories/SchoolPlanningRepository'

const router = useRouter()
const repository = new SchoolPlanningRepository()
const step = ref(1); const error = ref(''); const notice = ref('')
const schoolYearName = ref('2026/27'); const startDate = ref('2026-08-01'); const endDate = ref('2027-07-31')
const className = ref('8a'); const grade = ref(8); const subjectId = ref('subject-history')
const subjects = [{ id: 'subject-history', label: 'Geschichte' }, { id: 'subject-informatics', label: 'Informatik' }, { id: 'subject-media-informatics', label: 'Medienbildung und Informatik' }]
const curriculum = computed(() => getApplicableCurriculum({ state: 'TH', schoolType: 'gymnasium', subjectId: subjectId.value, grade: grade.value, schoolYear: schoolYearName.value }))
const next = () => { error.value = ''; if (step.value === 1 && startDate.value >= endDate.value) { error.value = 'Das Schuljahr muss vor seinem Ende beginnen.'; return } if (step.value === 3 && !curriculum.value) { error.value = 'Für Fach und Klassenstufe ist kein verifiziertes Curriculum verfügbar.'; return } step.value += 1 }
async function finish(): Promise<void> {
  if (!curriculum.value) { error.value = 'Für diese Kombination ist kein verifiziertes Curriculum verfügbar.'; return }
  error.value = ''; const stamp = new Date().toISOString()
  try {
    const snapshot = await repository.get()
    for (const year of snapshot.schoolYears.filter((item) => item.active)) await repository.saveSchoolYear({ ...year, active: false })
    const year: SchoolYear = await repository.saveSchoolYear({ id: createId(), name: schoolYearName.value, federalState: 'TH', schoolType: 'Gymnasium', startDate: startDate.value, endDate: endDate.value, active: true, createdAt: stamp, updatedAt: stamp })
    const group: ClassGroup = await repository.saveClassGroup({ id: createId(), schoolYearId: year.id, name: className.value, grade: grade.value, schoolType: year.schoolType, createdAt: stamp, updatedAt: stamp })
    const assignment: ClassSubjectAssignment = await repository.saveAssignment({ id: createId(), schoolYearId: year.id, classGroupId: group.id, subjectId: subjectId.value, curriculumId: curriculum.value.id, createdAt: stamp, updatedAt: stamp })
    notice.value = `${year.name}, ${group.name} und ${subjects.find((item) => item.id === assignment.subjectId)?.label} sind eingerichtet.`
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Die Einrichtung konnte nicht gespeichert werden.' }
}
</script>

<template>
  <main class="onboarding-shell"><header><div><p class="eyebrow">Erste Einrichtung</p><h1>Schuljahresplanung starten</h1><p>Der Assistent legt einen persönlichen Planungsraum an. Verfügbare Referenzcurricula bleiben unverändert.</p></div><button class="secondary" @click="router.push({ name: 'home' })">← Dashboard</button></header><ol class="steps" aria-label="Einrichtungsschritte"><li v-for="item in 4" :key="item" :class="{ active: step === item, complete: step > item }">{{ item }}</li></ol><p v-if="error" class="error-message">{{ error }}</p><p v-if="notice" class="success-message">{{ notice }}</p>
    <section v-if="!notice" class="wizard-card"><template v-if="step === 1"><p class="step">01 · Rahmen</p><h2>Bundesland, Schulart und Schuljahr</h2><p>Aktuell stehen verifizierte Lehrpläne für Thüringen am Gymnasium bereit.</p><dl><div><dt>Bundesland</dt><dd>Thüringen</dd></div><div><dt>Schulart</dt><dd>Gymnasium</dd></div></dl><label>Schuljahr<input v-model="schoolYearName" required></label><div class="two"><label>Beginn<input v-model="startDate" type="date" required></label><label>Ende<input v-model="endDate" type="date" required></label></div></template><template v-else-if="step === 2"><p class="step">02 · Lerngruppe</p><h2>Klasse oder Kurs</h2><label>Name<input v-model="className" placeholder="z. B. 8a" required></label><label>Klassenstufe<input v-model.number="grade" min="1" max="13" type="number" required></label></template><template v-else-if="step === 3"><p class="step">03 · Fachlehrplan</p><h2>Fach auswählen</h2><label>Fach<select v-model="subjectId"><option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.label }}</option></select></label><p v-if="curriculum" class="curriculum"><strong>Verifiziert verfügbar</strong><span>{{ curriculum.title }} · {{ curriculum.version }}</span></p><p v-else class="unavailable">Für diese Klassenstufe ist kein verifiziertes Curriculum verfügbar. Es wird keine Zuordnung erzeugt.</p></template><template v-else><p class="step">04 · Abschluss</p><h2>Planungsraum anlegen</h2><p>Es werden angelegt: das aktive Schuljahr <strong>{{ schoolYearName }}</strong>, die Lerngruppe <strong>{{ className }}</strong> und die Fachzuordnung mit dem ausgewählten Referenzcurriculum.</p><p class="hint">Stundenplan, Ferien und Sondertage werden anschließend getrennt verwaltet.</p></template><footer><button v-if="step > 1" class="secondary" @click="step -= 1">Zurück</button><button v-if="step < 4" @click="next">Weiter</button><button v-else @click="finish">Einrichtung abschließen</button></footer></section>
    <section v-else class="next-card"><h2>Einrichtung abgeschlossen</h2><p>Fügen Sie bei Bedarf weitere Klassen und Fachlehrpläne hinzu oder prüfen Sie Zeiten und Ausnahmen.</p><div><button @click="router.push({ name: 'school-planning' })">Klassen &amp; Fächer verwalten</button><button class="secondary" @click="router.push({ name: 'timetable-settings' })">Stundenplan prüfen</button><button class="secondary" @click="router.push({ name: 'home' })">Zum Dashboard</button></div></section>
  </main>
</template>

<style scoped>
.onboarding-shell { max-width: 760px; margin: auto; padding: clamp(1.25rem, 4vw, 3.5rem); color: var(--text) }
header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; padding-bottom: 1.4rem; border-bottom: 1px solid var(--border) }
header h1 { margin: .15rem 0 }
header p { max-width: 38rem; color: var(--muted) }
.steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem; padding: 0; margin: 1.3rem 0; list-style: none }
.steps li { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border: 1px solid var(--border); border-radius: 50%; color: var(--muted); background: var(--surface-raised); font-weight: 900 }
.steps li.active { color: var(--accent-text); border-color: var(--accent-strong); background: var(--accent-strong) }
.steps li.complete { color: var(--success); border-color: color-mix(in srgb, var(--success) 40%, var(--border)); background: var(--success-soft) }
.wizard-card, .next-card { display: grid; gap: 1rem; padding: clamp(1.1rem, 3vw, 1.5rem); border: 1px solid var(--border); border-radius: 14px; color: var(--text); background: var(--surface); box-shadow: 0 2px 12px color-mix(in srgb, var(--text) 8%, transparent) }
.wizard-card h2, .next-card h2 { margin: 0 }
.wizard-card > p:not(.step), .next-card > p { margin-bottom: 0; color: var(--muted) }
.step { margin: 0; color: var(--accent-strong); font-size: .86rem; font-weight: 800 }
.wizard-card label { display: grid; gap: .35rem; color: var(--text); font-weight: 800; font-size: .86rem }
.wizard-card :is(input, select) { min-height: 2.75rem; border-color: var(--border); color: var(--text); background: var(--surface-raised) }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem }
.wizard-card dl { display: flex; gap: 1.5rem; margin: 0; padding: .85rem; border: 1px solid var(--border); border-radius: 9px; background: var(--surface-raised) }
.wizard-card dt { color: var(--muted); font-size: .78rem }
.wizard-card dd { margin: .15rem 0; color: var(--text); font-weight: 800 }
.wizard-card footer, .next-card div { display: flex; justify-content: space-between; gap: .6rem; margin-top: .5rem }
.curriculum, .hint { display: grid; gap: .2rem; margin-bottom: 0; padding: .8rem; border: 1px solid color-mix(in srgb, var(--success) 40%, var(--border)); border-radius: 8px; color: var(--success); background: var(--success-soft) }
.curriculum span, .hint { color: var(--text) }
.unavailable { margin-bottom: 0; padding: .8rem; border: 1px solid color-mix(in srgb, var(--warning) 40%, var(--border)); border-radius: 8px; color: var(--warning); background: var(--warning-soft) }
.error-message { margin: 0 0 1rem; padding: .8rem; border: 1px solid color-mix(in srgb, var(--danger) 40%, var(--border)); border-radius: 8px; color: var(--danger); background: var(--danger-soft); font-weight: 700 }
.success-message { margin: 0 0 1rem; padding: .8rem; border: 1px solid color-mix(in srgb, var(--success) 40%, var(--border)); border-radius: 8px; color: var(--success); background: var(--success-soft); font-weight: 800 }
@media (max-width: 600px) { header, .wizard-card footer, .next-card div { flex-direction: column }.wizard-card footer button, .next-card div button { width: 100% }.two { grid-template-columns: 1fr }.wizard-card dl { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem } }
</style>
