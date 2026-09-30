import type { CurriculumAnnotation, CurriculumAnnotationStatus, ScheduledLesson, SequenceCurriculumReference, SequenceLesson, TeachingSequence } from './schoolPlanning'

/**
 * Projects an annotation's visible status from personal planning records without
 * mutating its manually saved annual-planning marker.
 */
export const deriveCurriculumAnnotationStatus = (
  annotation: CurriculumAnnotation,
  sequences: TeachingSequence[],
  curriculumReferences: SequenceCurriculumReference[],
  sequenceLessons: SequenceLesson[],
  scheduledLessons: ScheduledLesson[],
): CurriculumAnnotationStatus => {
  const relatedSequenceIds = new Set(
    sequences
      .filter((sequence) => sequence.classSubjectAssignmentId === annotation.classSubjectAssignmentId)
      .filter((sequence) => sequence.id === annotation.teachingSequenceId || curriculumReferences.some((reference) => reference.teachingSequenceId === sequence.id && reference.curriculumNodeId === annotation.curriculumNodeId))
      .map((sequence) => sequence.id),
  )
  if (!relatedSequenceIds.size) return annotation.status

  const relatedLessons = sequenceLessons.filter((lesson) => relatedSequenceIds.has(lesson.teachingSequenceId))
  const relatedLessonIds = new Set(relatedLessons.map((lesson) => lesson.id))
  const relatedSchedules = scheduledLessons.filter((lesson) => relatedLessonIds.has(lesson.sequenceLessonId ?? ''))
  const statuses = [...relatedLessons.map((lesson) => lesson.status), ...relatedSchedules.map((lesson) => lesson.status)]

  if (statuses.includes('needs-revisit')) return 'needs-revisit'
  if (statuses.includes('completed')) return 'completed'
  if (relatedSchedules.length || relatedLessons.some((lesson) => Boolean(lesson.plannedDate || lesson.scheduledLessonId))) return 'scheduled'
  return annotation.status
}
