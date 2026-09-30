<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createId } from '../domain/factories'
import type { CalendarExceptionType, SchoolPlanningSnapshot, TeachingContextType, TimetableVersion } from '../domain/schoolPlanning'
import { SchoolPlanningRepository } from '../repositories/SchoolPlanningRepository'

const router = useRouter()
const repository = new SchoolPlanningRepository()
const data = ref<SchoolPlanningSnapshot>()
const error = ref('')
const notice = ref('')
const selectedVersionId = ref('')
const versionName = ref('Neuer Stundenplan')
const validFrom = ref('')
const validUntil = ref('')
const copySlots = ref(true)
const assignmentId = ref('')
const weekday = ref(1)
const startTime = ref('08:00')
const endTime = ref('08:45')
const room = ref('')
const contextType = ref<TeachingContextType>('REGULAR_LESSON')
const exceptionDate = ref('')
const exceptionTitle = ref('')
const exceptionType = ref<CalendarExceptionType>('VACATION')
const exceptionAssignmentId = ref('')
const exceptionSlotId = ref('')
const exceptionNote = ref('')

const activeYear = computed(() => data.value?.schoolYears.find((item) => item.active) ?? data.value?.schoolYears[0])
const versions = computed(() => data.value?.timetableVersions.filter((item) => item.schoolYearId === activeYear.value?.id) ?? [])
const selectedVersion = computed(() => versions.value.find((item) => item.id === selectedVersionId.value) ?? versions.value.find((item) => item.active) ?? versions.value[0])
const slots = computed(() => data.value?.timetableSlots.filter((item) => item.timetableVersionId === selectedVersion.value?.id) ?? [])
const exceptions = computed(() => data.value?.calendarExceptions.filter((item) => item.schoolYearId === activeYear.value?.id) ?? [])
const assignments = computed(() => data.value?.assignments.filter((item) => item.schoolYearId === activeYear.value?.id) ?? [])
const classLabel = (id: string) => { const assignment = data.value?.assignments.find((item) => item.id === id); const group = data.value?.classGroups.find((item) => item.id === assignment?.classGroupId); return `${group?.name ?? 'Klasse'} · ${assignment?.subjectId ?? 'Fach'}` }
const weekdayLabel = (value: number) => ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'][value - 1] ?? 'Tag'

async function load() { data.value = await repository.get(); const year = activeYear.value; if (year) { validFrom.value ||= year.startDate; validUntil.value ||= year.endDate; exceptionDate.value ||= year.startDate }; selectedVersionId.value ||= selectedVersion.value?.id ?? ''; assignmentId.value ||= assignments.value[0]?.id ?? '' }
async function createVersion() {
  const year = activeYear.value
  if (!year || !validFrom.value) return
  error.value = ''
  const stamp = new Date().toISOString(); const previous = selectedVersion.value
  try {
    for (const item of versions.value.filter((item) => item.active)) await repository.saveTimetableVersion({ ...item, active: false, updatedAt: stamp })
    const version = await repository.saveTimetableVersion({ id: createId(), schoolYearId: year.id, name: versionName.value.trim() || 'Stundenplan', validFrom: validFrom.value, validUntil: validUntil.value || undefined, active: true, createdAt: stamp, updatedAt: stamp })
    if (copySlots.value && previous) for (const slot of data.value?.timetableSlots.filter((item) => item.timetableVersionId === previous.id) ?? []) await repository.saveTimetableSlot({ ...slot, id: createId(), timetableVersionId: version.id, createdAt: stamp, updatedAt: stamp })
    selectedVersionId.value = version.id; notice.value = `Stundenplan ab ${version.validFrom} gespeichert.`; await load()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Stundenplan konnte nicht gespeichert werden.' }
}
async function addSlot() { if (!selectedVersion.value || !assignmentId.value) return; const stamp = new Date().toISOString(); await repository.saveTimetableSlot({ id: createId(), timetableVersionId: selectedVersion.value.id, classSubjectAssignmentId: assignmentId.value, weekday: weekday.value, startTime: startTime.value, endTime: endTime.value, room: room.value.trim() || undefined, contextType: contextType.value, createdAt: stamp, updatedAt: stamp }); notice.value = 'Stundenplan-Slot gespeichert.'; await load() }
async function addException() { const year = activeYear.value; if (!year || !exceptionDate.value || !exceptionTitle.value.trim()) return; const stamp = new Date().toISOString(); await repository.saveCalendarException({ id: createId(), schoolYearId: year.id, classSubjectAssignmentId: exceptionAssignmentId.value || undefined, timetableSlotId: exceptionSlotId.value || undefined, date: exceptionDate.value, type: exceptionType.value, title: exceptionTitle.value.trim(), note: exceptionNote.value.trim() || undefined, createdAt: stamp, updatedAt: stamp }); exceptionTitle.value = ''; exceptionNote.value = ''; notice.value = 'Kalenderausnahme gespeichert.'; await load() }
onMounted(() => void load())
</script>

<template>
  <main class="timetable-shell"><header><div><p class="eyebrow">Schuljahresplanung</p><h1>Stundenplan &amp; Ausnahmen</h1><p>Versionen gelten ab einem Stichtag; bereits geplante Unterrichtstermine bleiben unverändert.</p></div><nav><button class="secondary" @click="router.push({ name: 'school-planning' })">← Schuljahr</button><button class="secondary" @click="router.push({ name: 'home' })">Dashboard</button></nav></header>
    <p v-if="error" class="error-message">{{ error }}</p><p v-if="notice" class="success-message">{{ notice }}</p><p v-if="!activeYear" class="empty">Lege zuerst ein Schuljahr und mindestens eine Klassen-Fach-Zuordnung an.</p>
    <template v-else><section class="grid"><article class="card"><p class="step">01</p><h2>Neue Version</h2><form @submit.prevent="createVersion"><label>Name<input v-model="versionName" required></label><label>Gültig ab<input v-model="validFrom" type="date" required></label><label>Gültig bis<input v-model="validUntil" type="date"></label><label class="toggle"><input v-model="copySlots" type="checkbox"> Slots der ausgewählten Version übernehmen</label><button>Version speichern</button></form></article><article class="card"><p class="step">02</p><h2>Aktive Version</h2><label>Stundenplan<select v-model="selectedVersionId"><option v-for="version in versions" :key="version.id" :value="version.id">{{ version.name }} · ab {{ version.validFrom }}{{ version.active ? ' · aktiv' : '' }}</option></select></label><p v-if="selectedVersion" class="hint">{{ selectedVersion.validFrom }} – {{ selectedVersion.validUntil || 'offen' }} · {{ slots.length }} Slot{{ slots.length === 1 ? '' : 's' }}</p><p v-else class="empty">Noch keine Version angelegt.</p></article></section>
    <section v-if="selectedVersion" class="grid detail"><article class="card"><p class="step">03</p><h2>Unterrichts-Slot</h2><form @submit.prevent="addSlot"><label>Klasse &amp; Fach<select v-model="assignmentId" required><option v-for="assignment in assignments" :key="assignment.id" :value="assignment.id">{{ classLabel(assignment.id) }}</option></select></label><div class="two"><label>Wochentag<select v-model.number="weekday"><option v-for="day in 5" :key="day" :value="day">{{ weekdayLabel(day) }}</option></select></label><label>Unterrichtsform<select v-model="contextType"><option value="REGULAR_LESSON">Einzelstunde</option><option value="DOUBLE_LESSON">Doppelstunde</option><option value="SUBSTITUTION">Vertretung</option></select></label></div><div class="two"><label>Beginn<input v-model="startTime" type="time" required></label><label>Ende<input v-model="endTime" type="time" required></label></div><label>Raum<input v-model="room" placeholder="z. B. R 204"></label><button>Slot hinzufügen</button></form><ul class="list"><li v-for="slot in slots" :key="slot.id"><span><strong>{{ weekdayLabel(slot.weekday) }} · {{ slot.startTime }}–{{ slot.endTime }}</strong><small>{{ classLabel(slot.classSubjectAssignmentId) }}{{ slot.room ? ` · ${slot.room}` : '' }}</small></span><button class="danger" @click="repository.remove('timetable-slots', slot.id).then(load)">Löschen</button></li></ul></article><article class="card"><p class="step">04</p><h2>Kalenderausnahme</h2><form @submit.prevent="addException"><div class="two"><label>Datum<input v-model="exceptionDate" type="date" required></label><label>Art<select v-model="exceptionType"><option value="VACATION">Ferien</option><option value="HOLIDAY">Feiertag</option><option value="CANCELLATION">Ausfall</option><option value="SUBSTITUTION">Vertretung</option><option value="OTHER">Sondertag</option></select></label></div><label>Titel<input v-model="exceptionTitle" required placeholder="z. B. Herbstferien"></label><label>Klasse &amp; Fach (optional)<select v-model="exceptionAssignmentId"><option value="">Für das ganze Schuljahr</option><option v-for="assignment in assignments" :key="assignment.id" :value="assignment.id">{{ classLabel(assignment.id) }}</option></select></label><label>Slot (optional)<select v-model="exceptionSlotId"><option value="">Nicht an einen Slot gebunden</option><option v-for="slot in slots" :key="slot.id" :value="slot.id">{{ weekdayLabel(slot.weekday) }} · {{ classLabel(slot.classSubjectAssignmentId) }}</option></select></label><label>Notiz<textarea v-model="exceptionNote"></textarea></label><button>Ausnahme speichern</button></form><ul class="list"><li v-for="item in exceptions" :key="item.id"><span><strong>{{ item.date }} · {{ item.title }}</strong><small>{{ item.type }}{{ item.classSubjectAssignmentId ? ` · ${classLabel(item.classSubjectAssignmentId)}` : '' }}</small></span><button class="danger" @click="repository.remove('calendar-exceptions', item.id).then(load)">Löschen</button></li></ul></article></section></template>
  </main>
</template>

<style scoped>
.timetable-shell{max-width:1180px;margin:auto;padding:clamp(1.25rem,4vw,3.5rem)}header{display:flex;justify-content:space-between;gap:1rem;align-items:start;border-bottom:1px solid #cbd9db;padding-bottom:1.4rem}header p{color:#5b6e73}nav{display:flex;gap:.5rem}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-top:1.25rem}.card{padding:1.1rem;border:1px solid #cad8da;border-radius:12px;background:#fff;box-shadow:0 2px 12px #1833380d}.card form{display:grid;gap:.7rem}.step{color:#198089;font-size:.72rem;font-weight:900;letter-spacing:.1em}.two{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}.toggle{display:flex;gap:.5rem;align-items:center;font-weight:600}.toggle input{width:auto}.hint,.empty{color:#62777c;line-height:1.5}.success-message{color:#176341;font-weight:700}.list{display:grid;gap:.35rem;padding:0;margin:1rem 0 0;list-style:none}.list li{display:flex;justify-content:space-between;gap:.7rem;align-items:center;padding:.6rem 0;border-top:1px solid #e1e9ea}.list small{display:block;color:#657980;margin-top:.2rem}.list button{padding:.35rem .5rem;font-size:.78rem}@media(max-width:760px){header,.grid{grid-template-columns:1fr;flex-direction:column}.two{grid-template-columns:1fr}.detail{margin-top:1rem}}
</style>
