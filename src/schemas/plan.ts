import { z } from 'zod'
import type { WorkshopPlan } from '../domain/types'
import { CURRENT_SCHEMA_VERSION } from '../domain/types'

const RichTextNodeSchema: z.ZodType = z.lazy(() => z.object({
  type: z.string().min(1), text: z.string().optional(), attrs: z.record(z.string(), z.unknown()).optional(),
  marks: z.array(z.object({ type: z.string(), attrs: z.record(z.string(), z.unknown()).optional() })).optional(),
  content: z.array(RichTextNodeSchema).optional(),
}))
export const RichTextDocumentSchema = z.object({ type: z.literal('doc'), content: z.array(RichTextNodeSchema) })
const IdSchema = z.string().uuid()

export const WorkshopPlanSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION), id: IdSchema,
  metadata: z.object({ title: z.string().min(1), subtitle: z.string().optional(), subject: z.string().optional(), targetGroup: z.string().optional(), institution: z.string().optional(), location: z.string().optional(), authors: z.array(z.string()), description: z.string().optional() }),
  days: z.array(z.object({ id: IdSchema, date: z.string().date(), title: z.string().optional(), startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).optional() })).min(1),
  learningObjectives: z.array(z.object({ id: IdSchema, text: z.string(), level: z.string().optional(), competencyIds: z.array(z.string()) })),
  competencies: z.array(z.object({ id: IdSchema, catalogId: z.string(), competencyId: z.string(), note: z.string().optional() })),
  contentAnalysis: RichTextDocumentSchema, didacticAnalysis: RichTextDocumentSchema,
  schedule: z.array(z.object({ id: IdSchema, dayId: IdSchema, startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), durationMinutes: z.number().int().nonnegative().optional(), type: z.enum(['phase', 'break']), phase: z.string().optional(), title: z.string().optional(), content: RichTextDocumentSchema.optional(), objective: RichTextDocumentSchema.optional(), teacherActivity: RichTextDocumentSchema.optional(), participantActivity: RichTextDocumentSchema.optional(), method: z.string().optional(), socialForm: z.string().optional(), materialIds: z.array(IdSchema), notes: RichTextDocumentSchema.optional() })),
  materials: z.array(z.object({ id: IdSchema, name: z.string().min(1), quantity: z.string().optional(), description: z.string().optional(), category: z.string().optional(), resourceType: z.enum(['physical', 'file', 'worksheet', 'link', 'interactive-html']) })),
  settings: z.object({ scheduleLayoutId: z.string().min(1), timeDisplay: z.enum(['start', 'duration']).default('start'), phaseModelId: z.string().optional(), templateId: z.string().min(1).optional(), enabledCompetencyFrameworkIds: z.array(z.string().min(1)).default([]) }), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
})

export function migratePlan(input: unknown): WorkshopPlan {
  if (!input || typeof input !== 'object') throw new Error('Die Datei enthält kein Planungsprojekt.')
  const version = (input as { schemaVersion?: unknown }).schemaVersion
  if (version === CURRENT_SCHEMA_VERSION) return WorkshopPlanSchema.parse(input) as WorkshopPlan
  if (version === 0 || version === undefined) {
    const legacy = input as Record<string, unknown>
    return WorkshopPlanSchema.parse({ ...legacy, schemaVersion: CURRENT_SCHEMA_VERSION, settings: { ...(legacy.settings as Record<string, unknown> | undefined), scheduleLayoutId: (legacy.settings as { scheduleLayoutId?: string } | undefined)?.scheduleLayoutId ?? 'workshop', enabledCompetencyFrameworkIds: (legacy.settings as { enabledCompetencyFrameworkIds?: string[] } | undefined)?.enabledCompetencyFrameworkIds ?? [] } }) as WorkshopPlan
  }
  throw new Error(`Schema-Version ${String(version)} wird noch nicht unterstützt.`)
}
