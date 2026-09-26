import type { WorkshopPlan } from '../domain/types'

export interface PlanSummary { id: string; title: string; updatedAt: string; dateRange: string }
export interface PlanRepository {
  list(): Promise<PlanSummary[]>
  get(id: string): Promise<WorkshopPlan | undefined>
  save(plan: WorkshopPlan): Promise<void>
  remove(id: string): Promise<void>
}
