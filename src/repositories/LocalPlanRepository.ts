import type { WorkshopPlan } from '../domain/types'
import { migratePlan } from '../schemas/plan'
import type { PlanRepository, PlanSummary } from './PlanRepository'

const INDEX_KEY = 'verlaufsplaner.plans.index.v1'
const planKey = (id: string): string => `verlaufsplaner.plan.${id}`
const dateRange = (plan: WorkshopPlan): string => plan.days.map((day) => day.date).sort().join(' – ')

export class LocalPlanRepository implements PlanRepository {
  async list(): Promise<PlanSummary[]> {
    const ids = JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as string[]
    return (await Promise.all(ids.map((id) => this.get(id)))).filter((plan): plan is WorkshopPlan => Boolean(plan)).map((plan) => ({ id: plan.id, title: plan.metadata.title, updatedAt: plan.updatedAt, dateRange: dateRange(plan) })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  async get(id: string): Promise<WorkshopPlan | undefined> {
    const raw = localStorage.getItem(planKey(id)); if (!raw) return undefined
    return migratePlan(JSON.parse(raw))
  }
  async save(plan: WorkshopPlan): Promise<void> {
    const valid = migratePlan(plan); localStorage.setItem(planKey(valid.id), JSON.stringify(valid))
    const ids = JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as string[]
    if (!ids.includes(valid.id)) localStorage.setItem(INDEX_KEY, JSON.stringify([...ids, valid.id]))
  }
  async remove(id: string): Promise<void> {
    localStorage.removeItem(planKey(id)); const ids = JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as string[]
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids.filter((storedId) => storedId !== id)))
  }
}
