<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPlanningTemplate, getPlanningTemplates } from '../data/templates/registry'
import { createId } from '../domain/factories'
import { aggregateMaterials } from '../domain/materials'
import { prioritiseUpcoming } from '../domain/priorities'
import type { DashboardBreakpoint, DashboardWidget, Room, WorkshopPlan, WorkspaceSettings } from '../domain/types'
import { getWidgetLayout } from '../data/dashboardWidgets'
import type { DigitalLearningMaterial } from '../domain/types'
import type { SchoolPlanningSnapshot } from '../domain/schoolPlanning'
import { LearningMaterialRepository } from '../repositories/LearningMaterialRepository'
import { SchoolPlanningRepository } from '../repositories/SchoolPlanningRepository'
import { SqlitePlanRepository } from '../repositories/SqlitePlanRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import { useProjectStore } from '../stores/projectStore'

type CalendarView = 'day' | 'week' | 'month'
type CalendarEvent = {
  id: string
  date: string
  type: 'plan' | 'todo' | 'school' | 'exception'
  title: string
  detail: string
  planId?: string
  priorityId?: string
  completed?: boolean
  startTime?: string
  endTime?: string
  sequenceId?: string
  calendarState?: 'cancelled' | 'substitution'
}

const store = useProjectStore()
const router = useRouter()
const plans = new SqlitePlanRepository()
const learningMaterialRepository = new LearningMaterialRepository()
const workspaceRepository = new WorkspaceRepository()
const schoolPlanningRepository = new SchoolPlanningRepository()
const today = new Date().toISOString().slice(0, 10)
const nextDay = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

const newTitle = ref('')
const templateId = ref('')
const newPlanPriorityId = ref('medium')
const buildingId = ref('')
const roomId = ref('')
const importError = ref('')
const workspace = ref<WorkspaceSettings>()
const planDetails = ref<WorkshopPlan[]>([])
const learningMaterials = ref<DigitalLearningMaterial[]>([])
const schoolPlanning = ref<SchoolPlanningSnapshot>()
const newPlanningMenuOpen = ref(false)
const planningStep = ref<'choice' | 'school' | 'workshop' | 'series'>('choice')
const assignmentId = ref('')
const planningDate = ref(today)
const workshopGroup = ref('')
const workshopParticipants = ref('')
const quickCreateOpen = ref(false)
const quickCreateDate = ref(today)
const quickCreateTone = ref<'choice' | 'term' | 'todo'>('choice')
const quickCreateTitle = ref('')
const quickCreateDueDate = ref(today)
const quickCreatePriorityId = ref('medium')
const calendarAnchor = ref(today)
const dashboardBreakpoint = ref<DashboardBreakpoint>('laptop')
const timeSlots = Array.from({ length: 12 }, (_, index) => index + 7)

const templates = computed(() => getPlanningTemplates())
const planningAssignments = computed(() => schoolPlanning.value?.assignments ?? [])
const selectedAssignment = computed(() => planningAssignments.value.find((item) => item.id === assignmentId.value))
const selectedClassGroup = computed(() => schoolPlanning.value?.classGroups.find((item) => item.id === selectedAssignment.value?.classGroupId))
const selectedSubject = computed(() => selectedAssignment.value ? subjectLabel(selectedAssignment.value.subjectId) : '')
const assignmentLabel = (id: string) => {
  const assignment = schoolPlanning.value?.assignments.find((item) => item.id === id)
  const group = schoolPlanning.value?.classGroups.find((item) => item.id === assignment?.classGroupId)
  return `${group?.name ?? 'Lerngruppe'} · ${subjectLabel(assignment?.subjectId)}`
}
const rooms = computed<Room[]>(() =>
  (workspace.value?.rooms ?? []).filter((room) => !buildingId.value || room.buildingId === buildingId.value),
)
const widgets = computed(() =>
  [...(workspace.value?.dashboard ?? [])]
    .filter((widget) => widget.enabled)
    .map((widget) => ({ ...widget, ...getWidgetLayout(widget, dashboardBreakpoint.value) }))
    .sort((a, b) => a.y - b.y || a.x - b.x),
)

function updateDashboardBreakpoint(): void {
  dashboardBreakpoint.value = window.innerWidth <= 760 ? 'phone' : window.innerWidth <= 1100 ? 'tablet' : 'laptop'
}

const allEvents = computed<CalendarEvent[]>(() => [
  ...planDetails.value.flatMap((plan) =>
    plan.days.map((day) => {
      const entries = plan.schedule.filter((entry) => entry.dayId === day.id)
      const starts = entries
        .map((entry) => entry.startTime)
        .filter((time): time is string => Boolean(time))
        .sort()
      const ends = entries
        .map((entry) => entry.endTime)
        .filter((time): time is string => Boolean(time))
        .sort()

      return {
        id: `${plan.id}-${day.id}`,
        date: day.date,
        type: 'plan' as const,
        title: plan.metadata.title,
        detail: [day.title, plan.metadata.location].filter(Boolean).join(' · '),
        planId: plan.id,
        priorityId: plan.metadata.priorityId,
        startTime: day.startTime ?? starts[0],
        endTime: day.endTime ?? ends.at(-1),
      }
    }),
  ),
  ...schoolCalendarEvents.value,
  ...(workspace.value?.todos ?? [])
    .filter((todo) => todo.dueDate)
    .map((todo) => ({
      id: todo.id,
      date: todo.dueDate!,
      type: 'todo' as const,
      title: todo.title,
      detail: '',
      completed: todo.completed,
      priorityId: todo.priorityId,
    })),
])

const schoolCalendarEvents = computed<CalendarEvent[]>(() => {
  const snapshot = schoolPlanning.value
  if (!snapshot) return []

  const appliesToScheduledLesson = (exception: typeof snapshot.calendarExceptions[number], scheduled: typeof snapshot.scheduledLessons[number]): boolean => {
    if (exception.date !== scheduled.date) return false
    if (exception.classSubjectAssignmentId && exception.classSubjectAssignmentId !== scheduled.classSubjectAssignmentId) return false
    if (!exception.timetableSlotId) return true
    const slot = snapshot.timetableSlots.find((item) => item.id === exception.timetableSlotId)
    return Boolean(slot
      && slot.classSubjectAssignmentId === scheduled.classSubjectAssignmentId
      && slot.startTime === scheduled.startTime
      && slot.endTime === scheduled.endTime)
  }

  const scheduledEvents = snapshot.scheduledLessons.map((scheduled) => {
    const lesson = snapshot.sequenceLessons.find((item) => item.id === scheduled.sequenceLessonId)
    const sequence = snapshot.sequences.find((item) => item.id === lesson?.teachingSequenceId)
    const assignment = snapshot.assignments.find((item) => item.id === scheduled.classSubjectAssignmentId)
    const group = snapshot.classGroups.find((item) => item.id === assignment?.classGroupId)
    const exceptions = snapshot.calendarExceptions.filter((item) => appliesToScheduledLesson(item, scheduled))
    const cancellation = exceptions.find((item) => ['HOLIDAY', 'VACATION', 'CANCELLATION'].includes(item.type))
    const substitution = !cancellation ? exceptions.find((item) => item.type === 'SUBSTITUTION') : undefined
    const title = `${group?.name ?? 'Klasse'} · ${lesson?.title ?? sequence?.title ?? 'Unterrichtsstunde'}`
    const context = [assignment?.subjectId, sequence?.title, scheduled.contextType === 'DOUBLE_LESSON' ? 'Doppelstunde' : 'Einzelstunde']
      .filter(Boolean)
      .join(' · ')

    return {
      id: `school-${scheduled.id}`,
      date: scheduled.date,
      type: 'school' as const,
      title: cancellation ? `${title} (entfällt)` : substitution ? `${title} (Vertretung)` : title,
      detail: [context, cancellation ? cancellation.title : substitution ? `Vertretung: ${substitution.title}` : undefined].filter(Boolean).join(' · '),
      startTime: substitution?.replacementStartTime ?? scheduled.startTime,
      endTime: substitution?.replacementEndTime ?? scheduled.endTime,
      sequenceId: sequence?.id,
      calendarState: cancellation ? 'cancelled' as const : substitution ? 'substitution' as const : undefined,
    }
  })

  const unprojectedExceptions = snapshot.calendarExceptions
    .filter((exception) => exception.type === 'OTHER' || !snapshot.scheduledLessons.some((scheduled) => appliesToScheduledLesson(exception, scheduled)))
    .map((exception) => ({
      id: `exception-${exception.id}`,
      date: exception.date,
      type: 'exception' as const,
      title: exception.title,
      detail: exception.note ?? exception.type,
      calendarState: exception.type === 'SUBSTITUTION' ? 'substitution' as const : undefined,
    }))

  return [...scheduledEvents, ...unprojectedExceptions]
})

const upcomingPlans = computed(() =>
  prioritiseUpcoming(
    allEvents.value.filter((event) => (event.type === 'plan' || event.type === 'school') && event.date >= today),
    workspace.value?.priorities ?? [],
    today,
  ),
)
const sequenceProgress = computed(() => {
  const snapshot = schoolPlanning.value
  if (!snapshot) return []
  const scheduledLessonIds = new Set(snapshot.scheduledLessons.map((item) => item.sequenceLessonId).filter((id): id is string => Boolean(id)))
  return snapshot.sequences
    .filter((sequence) => sequence.status === 'planned' || sequence.status === 'active')
    .map((sequence) => {
      const assignment = snapshot.assignments.find((item) => item.id === sequence.classSubjectAssignmentId)
      const group = snapshot.classGroups.find((item) => item.id === assignment?.classGroupId)
      const lessons = snapshot.sequenceLessons.filter((lesson) => lesson.teachingSequenceId === sequence.id)
      return {
        id: sequence.id,
        title: sequence.title,
        context: `${group?.name ?? 'Klasse'} · ${subjectLabel(assignment?.subjectId)}`,
        plannedLessons: lessons.filter((lesson) => Boolean(lesson.plannedDate || lesson.scheduledLessonId || scheduledLessonIds.has(lesson.id))).length,
        totalLessons: lessons.length,
      }
    })
    .filter((sequence) => sequence.totalLessons > 0)
})
const upcomingTodos = computed(() =>
  prioritiseUpcoming(
    allEvents.value.filter((event) => event.type === 'todo' && !event.completed && event.date >= today),
    workspace.value?.priorities ?? [],
    today,
  ),
)
const todaySchedule = computed(() => allEvents.value.filter((event) => event.date === today).sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')))
const nextDayMaterials = computed(() => {
  const grouped = new Map<string, { name: string; quantity: string[]; plans: string[] }>()

  for (const plan of planDetails.value.filter((item) => item.days.some((day) => day.date === nextDay))) {
    for (const item of aggregateMaterials(plan.materials, plan.schedule)) {
      const current = grouped.get(item.material.name) ?? { name: item.material.name, quantity: [], plans: [] }
      if (item.material.quantity) current.quantity.push(item.material.quantity)
      current.plans.push(plan.metadata.title)
      grouped.set(item.material.name, current)
    }
  }

  return [...grouped.values()]
})

function asDate(date: string): Date {
  return new Date(`${date}T12:00:00`)
}

function key(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: string, amount: number): string {
  const result = asDate(date)
  result.setDate(result.getDate() + amount)
  return key(result)
}

function weekStart(date: string): string {
  const result = asDate(date)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return key(result)
}

function calendarDays(view: CalendarView): string[] {
  if (view === 'day') return [calendarAnchor.value]
  if (view === 'week') return Array.from({ length: 7 }, (_, index) => addDays(weekStart(calendarAnchor.value), index))

  const anchor = asDate(calendarAnchor.value)
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => key(new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset + index)))
}

function calendarLabel(view: CalendarView): string {
  const date = asDate(calendarAnchor.value)
  if (view === 'day') return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  if (view === 'week') {
    const days = calendarDays('week')
    return `${shortDate(days[0])} – ${shortDate(days[6])}`
  }
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function moveCalendar(view: CalendarView, direction: -1 | 1): void {
  if (view === 'month') {
    const date = asDate(calendarAnchor.value)
    date.setMonth(date.getMonth() + direction)
    calendarAnchor.value = key(date)
  } else {
    calendarAnchor.value = addDays(calendarAnchor.value, view === 'week' ? direction * 7 : direction)
  }
}

async function setCalendarView(widget: DashboardWidget, view: CalendarView): Promise<void> {
  if (widget.calendarView === view) return
  widget.calendarView = view
  try {
    workspace.value = await workspaceRepository.save(workspace.value!)
  } catch (cause) {
    importError.value = cause instanceof Error ? cause.message : 'Kalenderansicht konnte nicht gespeichert werden.'
  }
}

function formatDate(date: string): string {
  return asDate(date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}
function shortDate(date: string): string {
  return asDate(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}
function dayNumber(date: string): string {
  return String(asDate(date).getDate())
}
function weekday(date: string): string {
  return asDate(date).toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')
}
function subjectLabel(id?: string): string {
  return ({ 'subject-history': 'Geschichte', 'subject-informatics': 'Informatik', 'subject-media-informatics': 'Medienbildung und Informatik' } as Record<string, string>)[id ?? ''] ?? id ?? 'Fach'
}
function priorityLabel(id?: string): string {
  const priority = workspace.value?.priorities.find((item) => item.id === (id ?? 'medium'))
  return priority ? `${priority.icon} ${priority.label}` : '● Mittel'
}
function eventsFor(date: string): CalendarEvent[] {
  return allEvents.value.filter((event) => event.date === date)
}
function allDayEvents(date: string): CalendarEvent[] {
  return eventsFor(date).filter((event) => !event.startTime)
}
function timedEvents(date: string): CalendarEvent[] {
  return eventsFor(date).filter((event) => Boolean(event.startTime))
}
function toMinutes(time?: string): number {
  const [hour, minute] = (time ?? '07:00').split(':').map(Number)
  return hour * 60 + minute
}
function eventStyle(event: CalendarEvent): Record<string, string> {
  const start = Math.max(420, Math.min(1140, toMinutes(event.startTime)))
  const end = Math.max(start + 30, Math.min(1140, toMinutes(event.endTime || event.startTime) + 60))
  return { top: `${((start - 420) / 720) * 100}%`, height: `${Math.max(5, ((end - start) / 720) * 100)}%` }
}
function eventTime(event: CalendarEvent): string {
  return event.startTime ? `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ''}` : 'Ganztägig'
}

function openNewPlanningMenu(): void {
  planningStep.value = 'choice'
  assignmentId.value = planningAssignments.value[0]?.id ?? ''
  planningDate.value = today
  workshopGroup.value = ''
  workshopParticipants.value = ''
  newTitle.value = ''
  newPlanPriorityId.value = 'medium'
  newPlanningMenuOpen.value = true
}

function closeNewPlanningMenu(): void {
  newPlanningMenuOpen.value = false
}
function selectPlanningStep(step: 'school' | 'workshop' | 'series'): void {
  planningStep.value = step
  if (step !== 'workshop' && !assignmentId.value) assignmentId.value = planningAssignments.value[0]?.id ?? ''
}

function openQuickCreate(date: string = today, tone: 'choice' | 'term' | 'todo' = 'choice'): void {
  quickCreateDate.value = date
  quickCreateDueDate.value = date
  quickCreateTone.value = tone
  quickCreateTitle.value = ''
  quickCreatePriorityId.value = 'medium'
  quickCreateOpen.value = true
}

function closeQuickCreate(): void {
  quickCreateOpen.value = false
  quickCreateTone.value = 'choice'
  quickCreateTitle.value = ''
  quickCreatePriorityId.value = 'medium'
}

function chooseQuickCreate(kind: 'term' | 'todo' | 'plan'): void {
  if (kind === 'plan') {
    closeQuickCreate()
    openNewPlanningMenu()
    return
  }

  quickCreateTone.value = kind
  quickCreateTitle.value = ''
  quickCreateDueDate.value = quickCreateDate.value
  quickCreatePriorityId.value = 'medium'
}

async function saveQuickTodo(kind: 'term' | 'todo' = 'todo'): Promise<void> {
  if (!workspace.value) return

  const title = quickCreateTitle.value.trim()
  if (!title) return

  const newTodo = {
    id: createId(),
    title,
    dueDate: quickCreateDueDate.value || undefined,
    priorityId: quickCreatePriorityId.value || undefined,
    completed: false,
    kind,
  }

  workspace.value.todos.push(newTodo as any)
  workspace.value = await workspaceRepository.save(workspace.value)
  closeQuickCreate()
}

function openEvent(event: CalendarEvent): void {
  if (event.type === 'plan' && event.planId) {
    void open(event.planId)
    return
  }
  if (event.type === 'school' && event.sequenceId) {
    void router.push({ name: 'sequence-planning', query: { sequenceId: event.sequenceId } })
    return
  }
  void router.push({ name: 'workspace-settings' })
}

async function refresh(): Promise<void> {
  await store.refresh()
  planDetails.value = (await Promise.all(store.plans.map((plan) => plans.get(plan.id)))).filter((plan): plan is WorkshopPlan => Boolean(plan))
  schoolPlanning.value = await schoolPlanningRepository.get()
}

onMounted(async () => {
  updateDashboardBreakpoint()
  window.addEventListener('resize', updateDashboardBreakpoint)
  try {
    await Promise.all([
      refresh(),
      learningMaterialRepository.list().then((materials) => { learningMaterials.value = materials }),
      workspaceRepository.get().then((settings) => {
        workspace.value = settings
      }),
    ])
    if (router.currentRoute.value.query.action === 'new-plan') {
      openNewPlanningMenu()
      await router.replace({ name: 'home' })
    }
  } catch (cause) {
    importError.value = cause instanceof Error ? cause.message : 'Dashboard konnte nicht geladen werden.'
  }
})
onBeforeUnmount(() => window.removeEventListener('resize', updateDashboardBreakpoint))

function selectedLocation() {
  const room = workspace.value?.rooms.find((item) => item.id === roomId.value)
  const building = workspace.value?.buildings.find((item) => item.id === (room?.buildingId ?? buildingId.value))
  return room
    ? { buildingId: room.buildingId, roomId: room.id, label: `${building?.name ?? ''} · ${room.name}` }
    : building
      ? { buildingId: building.id, label: building.name }
      : undefined
}

async function createPlanning(): Promise<void> {
  if (planningStep.value === 'series') {
    if (!selectedAssignment.value) { importError.value = 'Bitte wählen Sie zuerst Klasse und Fach aus oder richten Sie diese im Schuljahr ein.'; return }
    const stamp = new Date().toISOString()
    const sequence = await schoolPlanningRepository.saveSequence({ id: createId(), classSubjectAssignmentId: selectedAssignment.value.id, title: newTitle.value.trim() || `Neue Reihe ${selectedSubject.value}`, startDate: planningDate.value || undefined, status: 'planned', createdAt: stamp, updatedAt: stamp })
    closeNewPlanningMenu()
    await router.push({ name: 'sequence-planning', query: { assignmentId: selectedAssignment.value.id, sequenceId: sequence.id } })
    return
  }

  if (planningStep.value === 'school' && !selectedAssignment.value) { importError.value = 'Bitte wählen Sie zuerst Klasse und Fach aus oder richten Sie diese im Schuljahr ein.'; return }
  if (planningStep.value === 'workshop' && !workshopGroup.value.trim()) { importError.value = 'Bitte geben Sie eine Workshop-Lerngruppe an.'; return }
  try {
    const plan = await store.create(newTitle.value.trim() || (planningStep.value === 'workshop' ? 'Neuer Workshop' : 'Neue Unterrichtsstunde'), getPlanningTemplate(templateId.value), selectedLocation())
    plan.days[0]!.date = planningDate.value || today
    plan.metadata.priorityId = newPlanPriorityId.value || undefined
    if (planningStep.value === 'school' && selectedAssignment.value) {
      plan.metadata.planningContext = 'school'
      plan.metadata.classSubjectAssignmentId = selectedAssignment.value.id
      plan.metadata.targetGroup = selectedClassGroup.value?.name
      plan.metadata.subject = selectedSubject.value
    } else {
      plan.metadata.planningContext = 'workshop'
      plan.metadata.targetGroup = workshopGroup.value.trim()
      plan.metadata.participants = workshopParticipants.value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
    }
    await store.save()
    closeNewPlanningMenu()
    await router.push({ name: 'editor', params: { id: plan.id } })
  } catch (cause) {
    importError.value = cause instanceof Error ? cause.message : 'Planung konnte nicht erstellt werden.'
  }
}

async function open(id: string): Promise<void> {
  await router.push({ name: 'editor', params: { id } })
}
</script>

<template>
  <main class="home-shell">
    <header class="home-header">
      <div>
        <p class="home-brand">Verlaufsplaner</p>
        <p class="home-tagline">Plan clever. Teach better.</p>
      </div>
      <div class="home-actions">
        <button type="button" class="new-planning-trigger" @click="openNewPlanningMenu">Neue Planung</button>
        <button type="button" class="secondary" @click="router.push({ name: 'school-onboarding' })">Einrichtung</button>
        <button type="button" class="secondary" @click="router.push({ name: 'school-planning' })">Schuljahr</button>
        <button type="button" class="secondary" @click="router.push({ name: 'sequence-planning' })">Reihen</button>
        <button type="button" class="new-todo-trigger" @click="openQuickCreate(today, 'todo')">Neues TODO</button>
        <button type="button" class="secondary plan-overview-trigger" @click="router.push({ name: 'plan-overview' })">Alle Planungen</button>
        <button type="button" class="settings-trigger" aria-label="Einstellungen öffnen" title="Einstellungen" @click="router.push({ name: 'workspace-settings' })">⚙</button>
      </div>
    </header>

    <p v-if="store.migrationNotice" class="success-message home-feedback">{{ store.migrationNotice }}</p>
    <p v-if="importError" class="error-message home-feedback">{{ importError }}</p>

    <section class="dashboard-grid" :style="{ gridTemplateColumns: `repeat(${workspace?.dashboardGridColumns[dashboardBreakpoint] ?? 12}, minmax(0, 1fr))` }">
      <article
        v-for="widget in widgets"
        :key="widget.id"
        class="dashboard-widget"
        :class="[`widget-${widget.id}`]"
        :style="{ '--widget-grid-column': `${widget.x + 1} / span ${widget.w}`, '--widget-grid-row': `${widget.y + 1} / span ${widget.h}`, gridColumn: `${widget.x + 1} / span ${widget.w}`, gridRow: `${widget.y + 1} / span ${widget.h}` }"
      >
        <template v-if="widget.id === 'calendar'">
          <div class="widget-heading calendar-heading">
            <div><h2>{{ calendarLabel(widget.calendarView ?? 'week') }}</h2></div>
            <div class="calendar-actions">
              <div class="calendar-view-switch" aria-label="Kalenderansicht">
                <button
                  v-for="view in ['day', 'week', 'month'] as CalendarView[]"
                  :key="view"
                  type="button"
                  :class="{ active: widget.calendarView === view }"
                  :aria-pressed="widget.calendarView === view"
                  @click="setCalendarView(widget, view)"
                >
                  {{ view === 'day' ? 'Tag' : view === 'week' ? 'Woche' : 'Monat' }}
                </button>
              </div>
              <button type="button" class="secondary nav" aria-label="Vorheriger Zeitraum" @click="moveCalendar(widget.calendarView ?? 'week', -1)">‹</button>
              <button type="button" class="secondary" @click="calendarAnchor = today">Heute</button>
              <button type="button" class="secondary nav" aria-label="Nächster Zeitraum" @click="moveCalendar(widget.calendarView ?? 'week', 1)">›</button>
            </div>
          </div>

          <div v-if="widget.calendarView === 'month'" class="month-grid">
            <span v-for="name in ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']" :key="name" class="weekday">{{ name }}</span>
            <section
              v-for="date in calendarDays('month')"
              :key="date"
              class="month-day"
              :class="{ muted: date.slice(0, 7) !== calendarAnchor.slice(0, 7), today: date === today }"
              @click="openQuickCreate(date, 'choice')"
            >
              <strong>{{ dayNumber(date) }}</strong>
              <button v-for="event in eventsFor(date)" :key="event.id" type="button" class="month-event" :class="[event.type, event.calendarState]" @click.stop="openEvent(event)">
                <span v-if="event.startTime">{{ event.startTime }}</span>{{ event.title }}
              </button>
            </section>
          </div>

          <div v-else class="time-scroll">
            <div class="time-grid" :style="{ gridTemplateColumns: `52px repeat(${calendarDays(widget.calendarView ?? 'week').length}, minmax(138px, 1fr))` }">
              <div class="time-axis">
                <span>Zeit</span>
                <span v-for="hour in timeSlots" :key="hour">{{ String(hour).padStart(2, '0') }}:00</span>
              </div>

              <section
                v-for="date in calendarDays(widget.calendarView ?? 'week')"
                :key="date"
                class="time-day"
                :class="{ today: date === today }"
                @click="openQuickCreate(date, 'choice')"
              >
                <header>
                  <small>{{ weekday(date) }}</small>
                  <strong>{{ dayNumber(date) }}</strong>
                </header>
                <div class="all-day">
                  <button v-for="event in allDayEvents(date)" :key="event.id" type="button" class="all-day-event" :class="[event.type, event.calendarState]" @click.stop="openEvent(event)">{{ event.title }}</button>
                </div>
                <div class="slots">
                  <button v-for="event in timedEvents(date)" :key="event.id" type="button" class="timed-event" :class="[event.type, event.calendarState]" :style="eventStyle(event)" @click.stop="openEvent(event)">
                    <strong>{{ event.title }}</strong>
                    <small>{{ eventTime(event) }}</small>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </template>

        <template v-else-if="widget.id === 'upcoming-plans'">
          <div class="widget-heading"><h2>Unterricht &amp; Planungen</h2><span>{{ widget.limit ?? 5 }}</span></div>
          <ol class="dashboard-list">
            <li v-for="event in upcomingPlans.slice(0, widget.limit ?? 5)" :key="event.id">
              <button type="button" @click="openEvent(event)">
                <strong>{{ event.title }}</strong>
                <small>{{ formatDate(event.date) }} · {{ priorityLabel(event.priorityId) }}{{ event.detail ? ` · ${event.detail}` : '' }}</small>
              </button>
            </li>
            <li v-if="!upcomingPlans.length" class="empty-state">Keine kommenden Unterrichtsstunden oder Planungen.</li>
          </ol>
          <div v-if="sequenceProgress.length" class="sequence-progress" aria-label="Fortschritt laufender Reihen">
            <p v-for="sequence in sequenceProgress.slice(0, 3)" :key="sequence.id"><strong>{{ sequence.context }} · {{ sequence.title }}</strong><span>{{ sequence.plannedLessons }} von {{ sequence.totalLessons }} Sequenzstunden geplant</span></p>
          </div>
        </template>

        <template v-else-if="widget.id === 'upcoming-todos'">
          <div class="widget-heading"><h2>Aufgaben</h2><span>{{ widget.limit ?? 5 }}</span></div>
          <ol class="dashboard-list">
            <li v-for="event in upcomingTodos.slice(0, widget.limit ?? 5)" :key="event.id">
              <button type="button" @click="router.push({ name: 'workspace-settings' })">
                <strong>{{ event.title }}</strong>
                <small>{{ formatDate(event.date) }} · {{ priorityLabel(event.priorityId) }}</small>
              </button>
            </li>
            <li v-if="!upcomingTodos.length" class="empty-state">Keine offenen Aufgaben mit Termin.</li>
          </ol>
        </template>

        <template v-else-if="widget.id === 'today-schedule'">
          <div class="widget-heading"><h2>Stundenablauf</h2><span>{{ formatDate(today) }}</span></div>
          <ol class="dashboard-list agenda-list">
            <li v-for="event in todaySchedule.slice(0, widget.limit ?? 5)" :key="event.id">
              <button type="button" @click="openEvent(event)">
                <strong>{{ event.title }}</strong>
                <small>{{ eventTime(event) }}{{ event.detail ? ` · ${event.detail}` : '' }}</small>
              </button>
            </li>
            <li v-if="!todaySchedule.length" class="empty-state">Heute sind keine Planungen eingetragen.</li>
          </ol>
        </template>

        <template v-else-if="widget.id === 'material-library'">
          <div class="widget-heading"><h2>Digitale Lernmaterialien</h2><span>{{ learningMaterials.length }}</span></div>
          <ol class="dashboard-list">
            <li v-for="material in learningMaterials.slice(0, widget.limit ?? 4)" :key="material.id">
              <button type="button" @click="router.push({ name: 'learning-material-edit', params: { id: material.id } })">
                <strong>{{ material.title }}</strong>
                <small>{{ material.kind === 'presentation' ? 'Präsentation' : material.kind === 'worksheet' ? 'Arbeitsblatt' : material.kind === 'mindmap' ? 'Mindmap' : 'Stundenablauf' }}</small>
              </button>
            </li>
            <li v-if="!learningMaterials.length" class="empty-state">Noch keine digitalen Lernmaterialien.</li>
          </ol>
          <RouterLink class="secondary link-button" :to="{ name: 'learning-materials' }">Baukasten öffnen</RouterLink>
        </template>

        <template v-else>
          <div class="widget-heading"><h2>Materialien</h2><span>{{ formatDate(nextDay) }}</span></div>
          <p v-if="!nextDayMaterials.length" class="empty-state">Für morgen sind keine Planmaterialien hinterlegt.</p>
          <ul v-else class="material-prep-list">
            <li v-for="material in nextDayMaterials" :key="material.name">
              <strong>{{ material.name }}</strong>
              <span>{{ material.quantity.join(', ') || 'Menge offen' }}</span>
              <small>{{ [...new Set(material.plans)].join(', ') }}</small>
            </li>
          </ul>
          <RouterLink class="secondary link-button" :to="{ name: 'workspace-settings' }">Bestand vorbereiten</RouterLink>
        </template>
      </article>
    </section>

    <div v-if="newPlanningMenuOpen" class="planning-menu-backdrop" @click.self="closeNewPlanningMenu">
      <section class="planning-menu" role="dialog" aria-modal="true" aria-labelledby="planning-menu-title">
        <header class="planning-menu-header">
          <div>
            <p class="eyebrow">Neue Planung</p>
            <h2 id="planning-menu-title">{{ planningStep === 'choice' ? 'Was möchten Sie vorbereiten?' : planningStep === 'series' ? 'Unterrichtsreihe anlegen' : planningStep === 'workshop' ? 'Workshop planen' : 'Unterrichtsstunde anlegen' }}</h2>
          </div>
          <button type="button" class="dialog-close" aria-label="Menü schließen" @click="closeNewPlanningMenu">×</button>
        </header>

        <div v-if="planningStep === 'choice'" class="planning-type-cards">
          <button type="button" class="planning-type-card" :disabled="!planningAssignments.length" @click="selectPlanningStep('series')">
            <span class="planning-type-icon">▤</span>
            <strong>Reihenplanung</strong>
            <small>Eine Unterrichtsreihe für Klasse, Fach und Fachlehrplan anlegen. Danach folgen die einzelnen Stunden.</small>
            <em>{{ planningAssignments.length ? 'Reihe starten' : 'Zuerst Klasse & Fach einrichten' }}</em>
          </button>
          <button type="button" class="planning-type-card" :disabled="!planningAssignments.length" @click="selectPlanningStep('school')">
            <span class="planning-type-icon">▧</span>
            <strong>Unterrichtsstunde</strong>
            <small>Eine einzelne Stunde mit Klasse, Fach und zugehörigem Lehrplan vorbereiten.</small>
            <em>{{ planningAssignments.length ? 'Stunde planen' : 'Zuerst Klasse & Fach einrichten' }}</em>
          </button>
          <button type="button" class="planning-type-card" @click="selectPlanningStep('workshop')">
            <span class="planning-type-icon">✦</span>
            <strong>Workshop</strong>
            <small>Eine unabhängige Planung für eine Workshop-Lerngruppe und ihre Teilnehmenden erstellen.</small>
            <em>Workshop planen</em>
          </button>
        </div>

        <div v-if="planningStep === 'choice' && !planningAssignments.length" class="planning-setup-hint"><strong>Für Unterrichtsstunden fehlt noch ein Planungsraum.</strong><span>Richten Sie einmal Klasse und Fachlehrplan ein. Workshops können Sie sofort planen.</span><button type="button" class="secondary" @click="router.push({ name: 'school-onboarding' }); closeNewPlanningMenu()">Schule einrichten</button></div>

        <form v-else-if="planningStep !== 'choice'" class="single-planning-form" @submit.prevent="createPlanning">
          <button type="button" class="back-to-cards" @click="planningStep = 'choice'">‹ Planungsart ändern</button>
          <template v-if="planningStep === 'school' || planningStep === 'series'">
            <label>
              Klasse, Fach und Lehrplan
              <select v-model="assignmentId" required>
                <option value="" disabled>Planungsraum auswählen</option>
                <option v-for="assignment in planningAssignments" :key="assignment.id" :value="assignment.id">{{ assignmentLabel(assignment.id) }}</option>
              </select>
              <small v-if="selectedAssignment">{{ selectedClassGroup?.name }} · {{ selectedSubject }} · Der verifizierte Fachlehrplan wird für diese Planung mitgeführt.</small>
            </label>
          </template>
          <template v-else>
            <label>Workshop-Lerngruppe<input v-model="workshopGroup" autofocus required placeholder="z. B. Fortbildungsteam Geschichte"></label>
            <label>Teilnehmende<textarea v-model="workshopParticipants" rows="3" placeholder="Namen durch Komma oder Zeilen trennen (optional)"></textarea><small>Die Teilnehmenden bleiben nur in dieser Workshop-Planung gespeichert.</small></label>
          </template>
          <label>
            {{ planningStep === 'series' ? 'Titel der Reihe' : 'Titel der Planung' }}
            <input v-model="newTitle" :autofocus="planningStep !== 'workshop'" :placeholder="planningStep === 'series' ? 'z. B. Vormärz und Revolution 1848/49' : planningStep === 'workshop' ? 'z. B. Quellenwerkstatt' : 'z. B. Vormärz: Historische Lieder'" />
          </label>
          <label>{{ planningStep === 'series' ? 'Geplanter Beginn' : 'Datum der Stunde' }}<input v-model="planningDate" type="date"></label>
          <template v-if="planningStep !== 'series'">
          <label>
            Vorlage
            <select v-model="templateId">
              <option value="">Ohne Vorlage</option>
              <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name.de }}</option>
            </select>
          </label>
          <label>
            Priorität
            <select v-model="newPlanPriorityId">
              <option v-for="priority in workspace?.priorities" :key="priority.id" :value="priority.id">{{ priority.icon }} {{ priority.label }}</option>
            </select>
          </label>
          <div class="planning-location">
            <label>
              Gebäude
              <select v-model="buildingId" @change="roomId = ''">
                <option value="">Kein Gebäude</option>
                <option v-for="building in workspace?.buildings" :key="building.id" :value="building.id">{{ building.name }}</option>
              </select>
            </label>
            <label>
              Raum
              <select v-model="roomId" :disabled="!buildingId">
                <option value="">Kein Raum</option>
                <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
              </select>
            </label>
          </div>
          </template>
          <div class="planning-menu-actions">
            <button type="button" class="secondary" @click="closeNewPlanningMenu">Abbrechen</button>
            <button type="submit">{{ planningStep === 'series' ? 'Reihe anlegen und Stunden planen' : planningStep === 'workshop' ? 'Workshop anlegen' : 'Stunde anlegen' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="quickCreateOpen" class="planning-menu-backdrop" @click.self="closeQuickCreate">
      <section class="planning-menu" role="dialog" aria-modal="true" aria-labelledby="quick-create-title">
        <header class="planning-menu-header">
          <div>
            <p class="eyebrow">Neu</p>
            <h2 id="quick-create-title">{{ quickCreateTone === 'choice' ? 'Erstellen' : quickCreateTone === 'term' ? 'Neuer Termin' : 'Neues TODO' }}</h2>
          </div>
          <button type="button" class="dialog-close" aria-label="Erstellung schließen" @click="closeQuickCreate">×</button>
        </header>

        <div v-if="quickCreateTone === 'choice'" class="planning-type-cards">
          <button type="button" class="planning-type-card" @click="chooseQuickCreate('term')">
            <span class="planning-type-icon">✦</span>
            <strong>Neuer Termin</strong>
            <small>Ein neuer Termin mit Datum direkt im Dashboard anlegen.</small>
            <em>Auswählen</em>
          </button>
          <button type="button" class="planning-type-card" @click="chooseQuickCreate('plan')">
            <span class="planning-type-icon">▧</span>
            <strong>Neuer Verlaufsplan</strong>
            <small>Direkt das Menü für eine neue Planung öffnen.</small>
            <em>Auswählen</em>
          </button>
          <button type="button" class="planning-type-card" @click="chooseQuickCreate('todo')">
            <span class="planning-type-icon">☑</span>
            <strong>Neues TODO</strong>
            <small>Eine Aufgabe mit Fälligkeitsdatum sofort erfassen.</small>
            <em>Auswählen</em>
          </button>
        </div>

        <form v-else class="single-planning-form" @submit.prevent="saveQuickTodo(quickCreateTone)">
          <button type="button" class="back-to-cards" @click="quickCreateTone = 'choice'">‹ Auswahl ändern</button>
          <label>
            Titel
            <input v-model="quickCreateTitle" autofocus :placeholder="quickCreateTone === 'term' ? 'z. B. Schulleitung informieren' : 'z. B. Arbeitsblätter drucken'" />
          </label>
          <label>
            Datum
            <input v-model="quickCreateDueDate" type="date" />
          </label>
          <label v-if="quickCreateTone === 'todo'">
            Priorität
            <select v-model="quickCreatePriorityId">
              <option v-for="priority in workspace?.priorities" :key="priority.id" :value="priority.id">{{ priority.icon }} {{ priority.label }}</option>
            </select>
          </label>
          <div class="planning-menu-actions">
            <button type="button" class="secondary" @click="closeQuickCreate">Abbrechen</button>
            <button type="submit">{{ quickCreateTone === 'term' ? 'Termin speichern' : 'TODO speichern' }}</button>
          </div>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.calendar-heading { align-items: center }
.calendar-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .25rem }
.calendar-actions button { padding: .32rem .48rem }
.calendar-actions .nav { min-width: 2rem; font-size: 1.25rem; line-height: 1 }
.calendar-view-switch { display: flex; overflow: hidden; border: 1px solid #aec3c6; border-radius: 5px }
.calendar-view-switch button { border: 0; border-radius: 0; background: #fff; color: #38545a }
.calendar-view-switch button + button { border-left: 1px solid #aec3c6 }
.calendar-view-switch button.active { color: #fff; background: #1d777f }
.month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); min-width: 560px; overflow: hidden; border: 1px solid #d4dfe1; border-radius: 7px }
.weekday { padding: .4rem; background: #eef4f4; border-bottom: 1px solid #d4dfe1; color: #587078; font-size: .75rem; font-weight: 800; text-align: center }
.month-day { min-height: 92px; padding: .35rem; overflow: hidden; border-right: 1px solid #e0e8e9; border-bottom: 1px solid #e0e8e9; cursor: pointer }
.month-day > strong { display: block; width: 1.6rem; height: 1.6rem; padding-top: .18rem; border-radius: 50%; text-align: center; font-size: .8rem }
.month-day.today > strong { color: #fff; background: #1d777f }
.month-day.muted { background: #f7f9f9; color: #94a4a8 }
.month-event, .all-day-event, .timed-event { display: block; width: 100%; overflow: hidden; border: 0; border-radius: 3px; text-align: left; text-overflow: ellipsis; white-space: nowrap; font-size: .72rem; margin-top: .2rem; padding: .17rem .3rem; color: #124f57; background: #dbeff1 }
.month-event.todo, .all-day-event.todo { color: #734d19; background: #f8e8c9 }
.month-event.school, .all-day-event.school { color: #24496d; background: #dbeafe }
.month-event.exception, .all-day-event.exception { color: #6c3d10; background: #ffefd2 }
.month-event.cancelled, .all-day-event.cancelled { color: #87322c; background: #fde2df; text-decoration: line-through }
.month-event.substitution, .all-day-event.substitution { color: #4d3979; background: #e9e2ff }
.month-event span { margin-right: .2rem; font-weight: 800 }
.time-scroll { overflow: auto; border: 1px solid #d4dfe1; border-radius: 7px }
.time-grid { display: grid; min-width: 340px; background: #fff }
.time-axis, .time-day { display: grid; grid-template-rows: 48px auto minmax(672px, 1fr); min-width: 0 }
.time-axis { color: #64787d; font-size: .7rem; border-right: 1px solid #dce5e6 }
.time-axis > span:first-child { display: grid; place-items: center; background: #eef4f4; font-weight: 800 }
.time-axis > span:not(:first-child) { height: 56px; padding: .25rem .35rem; border-top: 1px solid #e1e9ea; text-align: right }
.time-day { border-right: 1px solid #dce5e6; cursor: pointer }
.time-day > header { display: flex; justify-content: center; align-items: center; gap: .35rem; background: #eef4f4; border-bottom: 1px solid #d4dfe1; text-transform: uppercase; font-size: .72rem }
.time-day > header strong { display: grid; place-items: center; width: 1.65rem; height: 1.65rem; border-radius: 50%; font-size: .86rem }
.time-day.today > header strong { color: #fff; background: #1d777f }
.all-day { min-height: 28px; padding: .12rem; border-bottom: 1px solid #dce5e6 }
.slots { position: relative; min-height: 672px; background: repeating-linear-gradient(to bottom, transparent 0, transparent 55px, #e1e9ea 56px) }
.timed-event { position: absolute; z-index: 1; left: .18rem; right: .18rem; width: auto; min-height: 32px; white-space: normal; color: #fff; background: #1d777f; box-shadow: 0 1px 2px #16383c2b }
.timed-event.school { color: #fff; background: #3266b0 }
.timed-event.school.cancelled { color: #7f2924; background: #fde2df; box-shadow: inset 0 0 0 1px #e3a19a; text-decoration: line-through }
.timed-event.school.substitution { background: #6951a5 }
.timed-event strong, .timed-event small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.timed-event small { margin-top: .1rem; opacity: .9 }
.sequence-progress { display: grid; gap: .35rem; margin-top: .7rem; padding-top: .65rem; border-top: 1px solid #dce5e6 }
.sequence-progress p { display: grid; gap: .08rem; margin: 0; font-size: .78rem }
.sequence-progress span { color: #587078 }
@media (max-width: 760px) {
  .dashboard-grid .dashboard-widget { grid-column: var(--widget-grid-column) !important; grid-row: var(--widget-grid-row) !important }
  .calendar-heading { align-items: stretch; flex-direction: column }
  .calendar-actions { justify-content: flex-end }
  .month-grid { min-width: 510px }
  .month-day { min-height: 78px }
}
</style>
