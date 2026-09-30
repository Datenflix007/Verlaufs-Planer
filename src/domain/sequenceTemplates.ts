import type { SequenceCompetency, SequenceCurriculumReference, SequenceLesson, TeachingSequence } from './schoolPlanning'

const STORAGE_KEY = 'verlaufsplaner.sequence-templates.v1'

export interface SequenceTemplateLesson {
  position: number; title: string; guidingQuestion?: string; lessonObjective?: string; contentSummary?: string; competenceFocus?: string; curriculumNodeId?: string; methodsSummary?: string; materialsSummary?: string; didacticNote?: string; differentiation?: string; digitalTools?: string; technicalRequirements?: string; fallbackPlan?: string; plannedDuration?: number
}
export interface SequenceTemplate {
  id: string; name: string; overarchingQuestion?: string; learningGoal?: string; description?: string; notes?: string; createdAt: string
  curriculumReferences: Array<Pick<SequenceCurriculumReference, 'curriculumNodeId' | 'nodeKind' | 'relationType'>>
  competencies: Array<Pick<SequenceCompetency, 'competencyId' | 'role'>>
  lessons: SequenceTemplateLesson[]
}

const storedTemplates = (): SequenceTemplate[] => typeof localStorage === 'undefined' ? [] : JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SequenceTemplate[]
const persist = (templates: SequenceTemplate[]): void => { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)) }

export const getSequenceTemplates = (): SequenceTemplate[] => storedTemplates().sort((left, right) => right.createdAt.localeCompare(left.createdAt))
export const saveSequenceTemplate = (template: SequenceTemplate): SequenceTemplate => { persist([...storedTemplates().filter((item) => item.id !== template.id), template]); return template }
export const createSequenceTemplate = (sequence: TeachingSequence, references: SequenceCurriculumReference[], competencies: SequenceCompetency[], lessons: SequenceLesson[]): SequenceTemplate => ({
  id: crypto.randomUUID(), name: sequence.title, overarchingQuestion: sequence.overarchingQuestion, learningGoal: sequence.learningGoal, description: sequence.description, notes: sequence.notes, createdAt: new Date().toISOString(),
  curriculumReferences: references.filter((item) => item.teachingSequenceId === sequence.id).map(({ curriculumNodeId, nodeKind, relationType }) => ({ curriculumNodeId, nodeKind, relationType })),
  competencies: competencies.filter((item) => item.teachingSequenceId === sequence.id).map(({ competencyId, role }) => ({ competencyId, role })),
  lessons: lessons.filter((item) => item.teachingSequenceId === sequence.id).map(({ position, title, guidingQuestion, lessonObjective, contentSummary, competenceFocus, curriculumNodeId, methodsSummary, materialsSummary, didacticNote, differentiation, digitalTools, technicalRequirements, fallbackPlan, plannedDuration }) => ({ position, title, guidingQuestion, lessonObjective, contentSummary, competenceFocus, curriculumNodeId, methodsSummary, materialsSummary, didacticNote, differentiation, digitalTools, technicalRequirements, fallbackPlan, plannedDuration })),
})
