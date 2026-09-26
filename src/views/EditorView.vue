<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
import { registerLocalTemplate } from '../data/templates/registry'
import { useEditorStore } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import { SchedulePatternRepository } from '../repositories/SchedulePatternRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import type { SchedulePattern, WorkspaceSettings } from '../domain/types'

const route = useRoute(); const router = useRouter(); const project = useProjectStore(); const editor = useEditorStore(); const plan = computed(() => project.activePlan)
const patterns = ref<SchedulePattern[]>([])
const workspace = ref<WorkspaceSettings>()
const patternRepository = new SchedulePatternRepository()
onMounted(async () => { try { await Promise.all([project.open(String(route.params.id)), patternRepository.list().then((items) => { patterns.value = items }), new WorkspaceRepository().get().then((settings) => { workspace.value = settings })]) } catch { await router.replace({ name: 'home' }) } })
let timer: number | undefined
function changed(): void { window.clearTimeout(timer); timer = window.setTimeout(() => void project.save(), 350) }
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
</script>

<template>
  <main v-if="plan" class="editor-shell">
    <header class="editor-header">
      <button type="button" class="brand" title="Zur Projektübersicht" @click="router.push({ name: 'home' })">Verlaufsplaner</button>
      <span class="save-state" :class="project.saveStatus">{{ project.saveStatus === 'saving' ? 'Speichert ...' : project.saveStatus === 'error' ? 'SQLite-Speicherfehler' : 'In SQLite gespeichert' }}</span>
      <span class="header-spacer" />
      <button type="button" class="secondary" @click="saveAsTemplate">Als Vorlage speichern</button>
      <button type="button" class="secondary" @click="router.push({ name: 'preview', params: { id: plan.id } })">Vorschau</button>
      <button type="button" @click="editor.exportOpen = true">Export</button>
    </header>
    <div class="editor-body"><PlanSidebar :section="editor.section" :plan="plan" @select="editor.section = $event" /><div class="editor-content">
      <GeneralSection v-if="editor.section === 'general'" :plan="plan" :buildings="workspace?.buildings" :rooms="workspace?.rooms" @changed="changed" />
      <DatesSection v-else-if="editor.section === 'dates'" :plan="plan" @changed="changed" />
      <LearningObjectivesSection v-else-if="editor.section === 'objectives'" :plan="plan" @changed="changed" />
      <CompetenciesSection v-else-if="editor.section === 'competencies'" :plan="plan" @changed="changed" />
      <NarrativeSection v-else-if="editor.section === 'content'" :plan="plan" kind="content" @changed="changed" />
      <NarrativeSection v-else-if="editor.section === 'didactics'" :plan="plan" kind="didactics" @changed="changed" />
      <ScheduleSection v-else-if="editor.section === 'schedule'" :plan="plan" :patterns="patterns" @changed="changed" />
      <MaterialsSection v-else :plan="plan" :inventory="workspace?.inventoryMaterials" @changed="changed" />
    </div></div>
    <ExportDialog v-if="editor.exportOpen" :plan="plan" :layouts="patterns" @close="editor.exportOpen = false" />
  </main>
  <main v-else class="loading">Planung wird geöffnet ...</main>
</template>
