<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExportDialog from '../components/export/ExportDialog.vue'
import MaterialsSection from '../components/materials/MaterialsSection.vue'
import CompetenciesSection from '../components/plan/CompetenciesSection.vue'
import DatesSection from '../components/plan/DatesSection.vue'
import GeneralSection from '../components/plan/GeneralSection.vue'
import LearningObjectivesSection from '../components/plan/LearningObjectivesSection.vue'
import NarrativeSection from '../components/plan/NarrativeSection.vue'
import PlanSidebar from '../components/plan/PlanSidebar.vue'
import ScheduleSection from '../components/schedule/ScheduleSection.vue'
import { getPlanningTemplate, registerLocalTemplate } from '../data/templates/registry'
import { useEditorStore } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import { SchedulePatternRepository } from '../repositories/SchedulePatternRepository'
import { SchoolPlanningRepository } from '../repositories/SchoolPlanningRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import { getCurriculum } from '../data/curricula/registry'
import type { PlanningSectionId, SchedulePattern, WorkspaceSettings } from '../domain/types'
import type { SchoolPlanningSnapshot } from '../domain/schoolPlanning'
import { ensurePresentation } from '../presentation/presentation'

const route = useRoute(); const router = useRouter(); const project = useProjectStore(); const editor = useEditorStore(); const plan = computed(() => project.activePlan)
const patterns = ref<SchedulePattern[]>([])
const workspace = ref<WorkspaceSettings>()
const schoolPlanning = ref<SchoolPlanningSnapshot>()
const documentScrollArea = ref<HTMLElement>()
const patternRepository = new SchedulePatternRepository()
const documentSectionIds: Exclude<PlanningSectionId, 'materials'>[] = ['general', 'dates', 'objectives', 'competencies', 'content', 'didactics', 'schedule']
const visibleDocumentSections = computed(() => {
  const enabledSections = plan.value?.settings.templateId ? getPlanningTemplate(plan.value.settings.templateId)?.enabledSections : undefined
  return enabledSections?.length ? documentSectionIds.filter((section) => enabledSections.includes(section)) : documentSectionIds
})
const schoolContext = computed(() => {
  const assignmentId = plan.value?.metadata.classSubjectAssignmentId
  const assignment = schoolPlanning.value?.assignments.find((item) => item.id === assignmentId)
  const group = schoolPlanning.value?.classGroups.find((item) => item.id === assignment?.classGroupId)
  const subject = assignment && getCurriculum(assignment.curriculumId)?.subject.name.de
  return assignment && group && subject ? { assignmentId: assignment.id, label: `${group.name} · ${subject}` } : undefined
})
onMounted(async () => { try { await Promise.all([project.open(String(route.params.id)), patternRepository.list().then((items) => { patterns.value = items }), new WorkspaceRepository().get().then((settings) => { workspace.value = settings }), new SchoolPlanningRepository().get().then((snapshot) => { schoolPlanning.value = snapshot })]); if (route.query.section === 'schedule') editor.section = 'schedule' } catch { await router.replace({ name: 'home' }) } })
let timer: number | undefined
function changed(): void { window.clearTimeout(timer); timer = window.setTimeout(() => void project.save(), 350) }
let removeDocumentScrollListener: (() => void) | undefined
function syncActiveDocumentSection(): void {
  const scrollArea = documentScrollArea.value
  if (!scrollArea || editor.section === 'materials') return
  const scrollAreaTop = scrollArea.getBoundingClientRect().top
  const readingLine = scrollAreaTop + Math.min(scrollArea.clientHeight * .3, 220)
  let currentSection = visibleDocumentSections.value[0]
  for (const section of visibleDocumentSections.value) {
    const element = scrollArea.querySelector<HTMLElement>(`#planning-section-${section}`)
    if (element && element.getBoundingClientRect().top <= readingLine) currentSection = section
  }
  if (currentSection && editor.section !== currentSection) editor.section = currentSection
}
function connectDocumentScrollTracking(): void {
  removeDocumentScrollListener?.()
  const scrollArea = documentScrollArea.value
  if (!scrollArea) return
  const onScroll = (): void => syncActiveDocumentSection()
  scrollArea.addEventListener('scroll', onScroll, { passive: true })
  removeDocumentScrollListener = () => scrollArea.removeEventListener('scroll', onScroll)
  syncActiveDocumentSection()
}
function selectDocumentSection(section: PlanningSectionId): void {
  if (section === 'materials') return
  editor.section = section
  void nextTick(() => {
    const scrollArea = documentScrollArea.value
    const target = scrollArea?.querySelector<HTMLElement>(`#planning-section-${section}`)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  })
}
async function openPresentation(slideId?: string): Promise<void> {
  if (!plan.value) return
  ensurePresentation(plan.value)
  await project.save()
  await router.push({ name: 'presentation', params: { id: plan.value.id }, query: slideId ? { slide: slideId } : undefined })
}
function openDigitalStudio(): void {
  if (!plan.value) return
  void router.push({ name: 'learning-materials', query: { planId: plan.value.id } })
}
function saveAsTemplate(): void {
  if (!plan.value) return
  const name = window.prompt('Name der neuen Vorlage:')?.trim()
  if (!name) return
  const current = plan.value
  try {
    registerLocalTemplate({ schemaVersion: 1, id: `custom-${crypto.randomUUID().slice(0, 8)}`, name: { de: name }, subject: current.metadata.subject, version: '1.0.0', competencyFrameworkIds: [...new Set([...(current.settings.enabledCompetencyFrameworkIds ?? []), ...current.competencies.map((reference) => reference.catalogId)])], highlightedCompetencyIds: current.competencies.map((reference) => reference.competencyId), scheduleLayoutIds: [current.settings.scheduleLayoutId], defaultScheduleLayoutId: current.settings.scheduleLayoutId, enabledSections: ['general', 'dates', 'objectives', 'competencies', 'content', 'didactics', 'schedule', 'materials'], source: { type: 'local' } })
    window.alert('Eigene Vorlage gespeichert.')
  } catch (error) { window.alert(error instanceof Error ? error.message : 'Die Vorlage konnte nicht gespeichert werden.') }
}
watch(() => route.params.id, async (id) => { if (id && id !== project.activePlanId) await project.open(String(id)) })
watch(() => route.query.section, (section) => { if (section === 'schedule') selectDocumentSection('schedule') })
watch(plan, async (currentPlan) => { if (!currentPlan) return; await nextTick(); connectDocumentScrollTracking(); if (route.query.section === 'schedule') selectDocumentSection('schedule') })
watch(visibleDocumentSections, async () => { await nextTick(); connectDocumentScrollTracking() })
onBeforeUnmount(() => removeDocumentScrollListener?.())
</script>

<template>
  <main v-if="plan" class="editor-shell">
    <header class="editor-header">
      <button type="button" class="brand" title="Zur Projektübersicht" @click="router.push({ name: 'home' })">Verlaufsplaner</button>
      <span class="save-state" :class="project.saveStatus">{{ project.saveStatus === 'saving' ? 'Speichert ...' : project.saveStatus === 'error' ? 'SQLite-Speicherfehler' : 'In SQLite gespeichert' }}</span>
      <span class="header-spacer" />
      <button type="button" class="secondary" @click="saveAsTemplate">Als Vorlage speichern</button>
      <button type="button" class="secondary" :class="{ active: editor.section === 'materials' }" @click="editor.section = 'materials'">Materialliste</button>
      <button type="button" class="secondary" @click="openDigitalStudio">Digitaler Baukasten</button>
      <button type="button" class="secondary" @click="router.push({ name: 'preview', params: { id: plan.id } })">Vorschau</button>
      <button type="button" class="secondary" @click="openPresentation()">Präsentation</button><button type="button" @click="editor.exportOpen = true">Export</button>
    </header>
    <div class="editor-workspace">
      <section v-if="schoolContext" class="editor-school-context"><strong>{{ schoolContext.label }}</strong><span>Diese Stunde ist mit dem Fachlehrplan verknüpft.</span><button type="button" class="secondary" @click="router.push({ name: 'sequence-planning', query: { assignmentId: schoolContext.assignmentId } })">Zur Reihenplanung</button><button type="button" class="secondary" @click="router.push({ name: 'curriculum-viewer', query: { assignmentId: schoolContext.assignmentId } })">Fachlehrplan öffnen</button></section>
      <div class="editor-body"><PlanSidebar :section="editor.section" :plan="plan" @select="selectDocumentSection" /><div ref="documentScrollArea" class="editor-content" tabindex="-1">
        <div v-if="editor.section !== 'materials'" class="planning-document" aria-label="Durchscrollbares Planungsdokument">
          <header class="planning-document-header"><p class="eyebrow">Arbeitsdokument</p><h1>{{ plan.metadata.title || 'Unbenannte Planung' }}</h1><p>{{ plan.metadata.subtitle || 'Bearbeiten Sie die Planung wie ein zusammenhängendes Dokument. Die Sprungmarken links führen direkt zum jeweiligen Kapitel.' }}</p></header>
          <div v-if="visibleDocumentSections.includes('general')" id="planning-section-general" class="planning-document-section"><GeneralSection :plan="plan" :buildings="workspace?.buildings" :rooms="workspace?.rooms" :priorities="workspace?.priorities" @changed="changed" /></div>
          <div v-if="visibleDocumentSections.includes('dates')" id="planning-section-dates" class="planning-document-section"><DatesSection :plan="plan" @changed="changed" /></div>
          <div v-if="visibleDocumentSections.includes('objectives')" id="planning-section-objectives" class="planning-document-section"><LearningObjectivesSection :plan="plan" @changed="changed" /></div>
          <div v-if="visibleDocumentSections.includes('competencies')" id="planning-section-competencies" class="planning-document-section"><CompetenciesSection :plan="plan" @changed="changed" /></div>
          <div v-if="visibleDocumentSections.includes('content')" id="planning-section-content" class="planning-document-section"><NarrativeSection :plan="plan" kind="content" @changed="changed" /></div>
          <div v-if="visibleDocumentSections.includes('didactics')" id="planning-section-didactics" class="planning-document-section"><NarrativeSection :plan="plan" kind="didactics" @changed="changed" /></div>
          <div v-if="visibleDocumentSections.includes('schedule')" id="planning-section-schedule" class="planning-document-section"><ScheduleSection :plan="plan" :patterns="patterns" @changed="changed" @open-presentation="openPresentation" /></div>
        </div>
        <MaterialsSection v-else :plan="plan" :inventory="workspace?.inventoryMaterials" @changed="changed" />
      </div></div>
    </div>
    <ExportDialog v-if="editor.exportOpen" :plan="plan" :layouts="patterns" @close="editor.exportOpen = false" />
  </main>
  <main v-else class="loading">Planung wird geöffnet ...</main>
</template>

<style scoped>
.editor-workspace { display: grid; min-height: 0; grid-template-rows: auto minmax(0, 1fr) }
.editor-school-context { display: flex; flex-wrap: wrap; align-items: center; gap: .55rem; padding: .65rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); background: var(--accent-soft) }
.editor-school-context strong { color: var(--accent-strong) }
.editor-school-context span { margin-right: auto; font-size: .88rem }
.editor-school-context button { padding: .35rem .55rem; font-size: .82rem }
</style>
