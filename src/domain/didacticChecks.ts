import type { SequenceCompetency, SequenceCurriculumReference, SequenceLesson, TeachingSequence } from './schoolPlanning'

export interface DidacticCheck {
  id: 'missing-curriculum-reference' | 'missing-competency-reference' | 'missing-lesson-objective' | 'unconcretized-competency' | 'missing-offline-fallback'
  severity: 'attention' | 'hint'
  message: string
}

/** Provides planning prompts only; it deliberately does not score teaching quality. */
export const didacticChecksForSequence = (
  sequence: TeachingSequence,
  lessons: SequenceLesson[],
  curriculumReferences: SequenceCurriculumReference[],
  competencies: SequenceCompetency[],
): DidacticCheck[] => {
  const checks: DidacticCheck[] = []
  if (!curriculumReferences.some((item) => item.teachingSequenceId === sequence.id)) checks.push({ id: 'missing-curriculum-reference', severity: 'attention', message: 'Der Reihe fehlt noch ein dokumentierter Lehrplanbezug.' })
  if (!competencies.some((item) => item.teachingSequenceId === sequence.id)) checks.push({ id: 'missing-competency-reference', severity: 'hint', message: 'Für die Reihe ist noch keine Kompetenz als Bezug hinterlegt.' })
  const sequenceLessons = lessons.filter((item) => item.teachingSequenceId === sequence.id)
  if (sequenceLessons.some((item) => !item.lessonObjective?.trim())) checks.push({ id: 'missing-lesson-objective', severity: 'attention', message: 'Mindestens eine Sequenzstunde hat noch kein konkretes Lernziel.' })
  if (competencies.some((item) => item.teachingSequenceId === sequence.id) && sequenceLessons.every((item) => !item.competenceFocus?.trim())) checks.push({ id: 'unconcretized-competency', severity: 'hint', message: 'Kompetenzbezüge sind ausgewählt, aber noch keiner Stunde konkret zugeordnet.' })
  if (sequenceLessons.some((item) => item.digitalTools?.trim() && !item.fallbackPlan?.trim())) checks.push({ id: 'missing-offline-fallback', severity: 'attention', message: 'Ein digitales Werkzeug hat noch keine Offline-Alternative.' })
  return checks
}
