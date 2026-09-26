import type { DocumentExporter, ExportResult, WorkshopPlan } from '../domain/types'
import { migratePlan } from '../schemas/plan'

export class JsonExporter implements DocumentExporter {
  async export(plan: WorkshopPlan): Promise<ExportResult> { const valid = migratePlan(plan); return { filename: `${safeName(valid.metadata.title)}.json`, mimeType: 'application/json', content: JSON.stringify(valid, null, 2) } }
}
export const safeName = (value: string): string => value.trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'planung'
