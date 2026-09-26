import { scheduleLayouts } from '../layouts'
import { bundledCompetencyCatalogs } from '../competencies'
import { committedCurricula } from '../curricula/registry'
import type { PlanningTemplate } from '../../domain/types'
import { parsePlanningTemplate } from '../../schemas/planningTemplate'

const STORAGE_KEY = 'verlaufsplaner.planning-templates.v1'
export interface TemplateReferenceOption { id: string; name: string; kind: 'competency-framework' | 'curriculum' }
export const getTemplateReferenceOptions = (): TemplateReferenceOption[] => [
  ...bundledCompetencyCatalogs.map((catalog) => ({ id: catalog.id, name: catalog.name, kind: 'competency-framework' as const })),
  ...committedCurricula.map((curriculum) => ({ id: curriculum.id, name: `Thueringen · Gymnasium · ${curriculum.subject.name.de} (${curriculum.version})`, kind: 'curriculum' as const })),
]
const localTemplates = (): PlanningTemplate[] => typeof localStorage === 'undefined' ? [] : JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as PlanningTemplate[]
const saveLocalTemplates = (templates: PlanningTemplate[]): void => { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)) }
const ensureReferences = (template: PlanningTemplate): PlanningTemplate => {
  const frameworkIds = new Set([...bundledCompetencyCatalogs.map((catalog) => catalog.id), ...committedCurricula.map((curriculum) => curriculum.id)])
  const layoutIds = new Set(scheduleLayouts.map((layout) => layout.id))
  const unknownFramework = template.competencyFrameworkIds.find((id) => !frameworkIds.has(id))
  if (unknownFramework) throw new Error(`Die Vorlage verweist auf den unbekannten Kompetenzrahmen „${unknownFramework}“.`)
  const unknownLayout = template.scheduleLayoutIds?.find((id) => !layoutIds.has(id))
  if (unknownLayout) throw new Error(`Die Vorlage verweist auf das unbekannte Verlaufsplanlayout „${unknownLayout}“.`)
  return template
}
export const getPlanningTemplates = (): PlanningTemplate[] => localTemplates()
export const getPlanningTemplate = (id?: string): PlanningTemplate | undefined => localTemplates().find((template) => template.id === id)
export const registerLocalTemplate = (input: unknown): PlanningTemplate => {
  const parsed = ensureReferences(parsePlanningTemplate(input))
  const template: PlanningTemplate = { ...parsed, source: { type: parsed.source.type === 'imported' ? 'imported' : 'local' } }
  saveLocalTemplates([...localTemplates().filter((item) => item.id !== template.id), template])
  return template
}
export const removeLocalTemplate = (id: string): void => saveLocalTemplates(localTemplates().filter((template) => template.id !== id))
