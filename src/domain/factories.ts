import type { PlanningTemplate, RichTextDocument, WorkshopPlan } from './types'
import { CURRENT_SCHEMA_VERSION } from './types'

export const createId = (): string => crypto.randomUUID()
export const emptyRichText = (): RichTextDocument => ({ type: 'doc', content: [{ type: 'paragraph' }] })
export const richTextFromPlain = (text: string): RichTextDocument => ({ type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] })

export function createPlan(title = 'Neue Planung', template?: PlanningTemplate): WorkshopPlan {
  const now = new Date().toISOString()
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION, id: createId(),
    metadata: { title, authors: [] }, days: [{ id: createId(), date: new Date().toISOString().slice(0, 10) }],
    learningObjectives: [], competencies: [], contentAnalysis: emptyRichText(), didacticAnalysis: emptyRichText(), schedule: [], materials: [],
    settings: { scheduleLayoutId: template?.defaultScheduleLayoutId ?? 'teaching', timeDisplay: 'start', templateId: template?.id, enabledCompetencyFrameworkIds: template?.competencyFrameworkIds ?? [] }, createdAt: now, updatedAt: now,
  }
}
