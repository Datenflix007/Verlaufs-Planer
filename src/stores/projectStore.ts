import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createPlan } from '../domain/factories'
import type { PlanningTemplate, WorkshopPlan } from '../domain/types'
import { LocalPlanRepository } from '../repositories/LocalPlanRepository'
import type { PlanSummary } from '../repositories/PlanRepository'
import { SqlitePlanRepository } from '../repositories/SqlitePlanRepository'
import { migratePlan } from '../schemas/plan'

const repository = new SqlitePlanRepository()
const legacyRepository = new LocalPlanRepository()
export const useProjectStore = defineStore('projects', () => {
  const plans = ref<PlanSummary[]>([]); const activePlan = ref<WorkshopPlan>(); const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle'); const error = ref<string>(); const migrationNotice = ref<string>(); let migrated = false
  const activePlanId = computed(() => activePlan.value?.id)
  async function refresh(): Promise<void> {
    plans.value = await repository.list()
    if (!migrated && plans.value.length === 0) {
      migrated = true
      const browserPlans = await legacyRepository.list()
      for (const summary of browserPlans) { const plan = await legacyRepository.get(summary.id); if (plan) await repository.save(plan) }
      if (browserPlans.length) { plans.value = await repository.list(); migrationNotice.value = `${browserPlans.length} Planung(en) aus dem Browser-Speicher in SQLite übertragen.` }
    }
  }
  async function open(id: string): Promise<void> { const plan = await repository.get(id); if (!plan) throw new Error('Planung wurde nicht gefunden.'); activePlan.value = plan }
  async function create(title?: string, template?: PlanningTemplate): Promise<WorkshopPlan> { const plan = createPlan(title, template); activePlan.value = plan; await save(); return plan }
  async function save(): Promise<void> { if (!activePlan.value) return; saveStatus.value = 'saving'; error.value = undefined; try { activePlan.value.updatedAt = new Date().toISOString(); await repository.save(activePlan.value); await refresh(); saveStatus.value = 'saved' } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Speichern fehlgeschlagen.'; saveStatus.value = 'error' } }
  async function remove(id: string): Promise<void> { await repository.remove(id); if (activePlan.value?.id === id) activePlan.value = undefined; await refresh() }
  async function duplicate(id: string): Promise<WorkshopPlan> { await open(id); const clone = structuredClone(activePlan.value!); clone.id = crypto.randomUUID(); clone.metadata.title = `${clone.metadata.title} (Kopie)`; clone.createdAt = new Date().toISOString(); clone.updatedAt = clone.createdAt; activePlan.value = clone; await save(); return clone }
  async function importProject(input: unknown): Promise<WorkshopPlan> { const plan = migratePlan(input); activePlan.value = plan; await save(); return plan }
  async function loadJenaChatSample(): Promise<WorkshopPlan> { const plan = await repository.loadSample(); activePlan.value = plan; await save(); return plan }
  return { plans, activePlan, activePlanId, saveStatus, error, migrationNotice, refresh, open, create, save, remove, duplicate, importProject, loadJenaChatSample }
})
