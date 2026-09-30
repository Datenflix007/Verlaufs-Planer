export type FederalStateCode = 'TH'
export type TeachingContextType = 'REGULAR_LESSON' | 'DOUBLE_LESSON' | 'SUBSTITUTION' | 'WORKSHOP' | 'PROJECT' | 'EXCURSION' | 'OTHER'
export type CurriculumAnnotationStatus = 'rough-planned' | 'scheduled' | 'completed' | 'needs-revisit'
export type TeachingSequenceStatus = 'draft' | 'planned' | 'active' | 'completed' | 'archived'
export type SequenceLessonStatus = 'draft' | 'planned' | 'completed' | 'partial' | 'cancelled' | 'needs-revisit'

export interface SchoolYear {
  id: string; name: string; federalState: FederalStateCode; schoolType: string
  startDate: string; endDate: string; schoolId?: string; active: boolean; createdAt: string; updatedAt: string
}
export interface ClassGroup {
  id: string; schoolYearId: string; name: string; grade: number; schoolType: string
  studentsCount?: number; notes?: string; accent?: string; createdAt: string; updatedAt: string
}
export interface ClassSubjectAssignment {
  id: string; classGroupId: string; subjectId: string; curriculumId: string; schoolYearId: string
  teacherId?: string; createdAt: string; updatedAt: string
}
export interface CurriculumAnnotation {
  id: string; classSubjectAssignmentId: string; curriculumNodeId: string; nodeKind: 'learning-area' | 'competency' | 'content-point'
  status: CurriculumAnnotationStatus; plannedWeek?: number; plannedStartDate?: string; plannedEndDate?: string
  teachingSequenceId?: string; scheduledLessonId?: string; priority?: 'low' | 'normal' | 'high'; createdAt: string; updatedAt: string
}
export interface CurriculumComment {
  id: string; classSubjectAssignmentId: string; curriculumNodeId: string; selectedText?: string; anchorStart?: number; anchorEnd?: number
  comment: string; resolved: boolean; createdAt: string; updatedAt: string
}
export interface TeachingSequence {
  id: string; classSubjectAssignmentId: string; title: string; description?: string; overarchingQuestion?: string; learningGoal?: string
  startDate?: string; endDate?: string; status: TeachingSequenceStatus; notes?: string; createdAt: string; updatedAt: string
}
export interface SequenceLesson {
  id: string; teachingSequenceId: string; position: number; scheduledLessonId?: string; planId?: string
  plannedDate?: string; plannedDuration?: number; title: string; guidingQuestion?: string; lessonObjective?: string
  contentSummary?: string; competenceFocus?: string; curriculumNodeId?: string; methodsSummary?: string
  materialsSummary?: string; didacticNote?: string; status: SequenceLessonStatus; createdAt: string; updatedAt: string
}
export interface ScheduledLesson {
  id: string; classSubjectAssignmentId: string; sequenceLessonId?: string; planId?: string; date: string
  startTime?: string; endTime?: string; status: SequenceLessonStatus; contextType: TeachingContextType; createdAt: string; updatedAt: string
}
export interface ExistingPlanContext {
  planId: string; contextType: TeachingContextType; createdAt: string; updatedAt: string
}

export interface SchoolPlanningSnapshot {
  schoolYears: SchoolYear[]; classGroups: ClassGroup[]; assignments: ClassSubjectAssignment[]; annotations: CurriculumAnnotation[]
  comments: CurriculumComment[]; sequences: TeachingSequence[]; sequenceLessons: SequenceLesson[]; scheduledLessons: ScheduledLesson[]; existingPlanContexts: ExistingPlanContext[]
}
