import { z } from 'zod'
import type { PlanningTemplate } from '../domain/types'

const localisedText = z.object({ de: z.string().min(1), en: z.string().min(1).optional() })
const section = z.enum(['general', 'dates', 'objectives', 'competencies', 'content', 'didactics', 'schedule', 'materials'])
export const PlanningTemplateSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'Die Vorlagen-ID darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.'),
  name: localisedText, description: localisedText.optional(), discipline: z.string().optional(), subject: z.string().optional(), version: z.string().min(1),
  competencyFrameworkIds: z.array(z.string().min(1)).default([]), defaultCompetencyFrameworkId: z.string().optional(), highlightedCompetencyIds: z.array(z.string()).optional(),
  scheduleLayoutIds: z.array(z.string()).optional(), defaultScheduleLayoutId: z.string().optional(), enabledSections: z.array(section).optional(),
  suggestedPhases: z.array(z.string()).optional(), suggestedMethods: z.array(z.string()).optional(), suggestedMaterialTypes: z.array(z.enum(['physical', 'file', 'worksheet', 'link', 'interactive-html'])).optional(), tags: z.array(z.string()).optional(),
  source: z.object({ type: z.enum(['local', 'imported']), path: z.string().optional() }).default({ type: 'imported' }),
  organization: z.object({ name: z.string().min(1), url: z.string().url().optional() }).optional(), author: z.string().optional(),
}).superRefine((template, context) => {
  if (template.defaultCompetencyFrameworkId && !template.competencyFrameworkIds.includes(template.defaultCompetencyFrameworkId)) context.addIssue({ code: 'custom', path: ['defaultCompetencyFrameworkId'], message: 'Der Standard-Kompetenzrahmen muss in competencyFrameworkIds enthalten sein.' })
  if (template.defaultScheduleLayoutId && template.scheduleLayoutIds && !template.scheduleLayoutIds.includes(template.defaultScheduleLayoutId)) context.addIssue({ code: 'custom', path: ['defaultScheduleLayoutId'], message: 'Das Standardlayout muss in scheduleLayoutIds enthalten sein.' })
})

export const parsePlanningTemplate = (input: unknown): PlanningTemplate => PlanningTemplateSchema.parse(input) as PlanningTemplate
