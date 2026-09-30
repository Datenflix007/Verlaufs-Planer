import type { CalendarException, ClassGroup, ClassSubjectAssignment, CurriculumAnnotation, CurriculumComment, LessonReflection, ScheduledLesson, SchoolPlanningSnapshot, SchoolYear, SequenceCompetency, SequenceCurriculumReference, SequenceLesson, SequenceReflection, TeachingSequence, TimetableSlot, TimetableVersion } from '../domain/schoolPlanning'

type Resource = 'school-years' | 'class-groups' | 'assignments' | 'annotations' | 'comments' | 'sequences' | 'sequence-curriculum-references' | 'sequence-competencies' | 'sequence-lessons' | 'scheduled-lessons' | 'timetable-versions' | 'timetable-slots' | 'calendar-exceptions'
const request = async <T>(path = '', init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api/school-planning${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  if (!response.ok) throw new Error((await response.text()) || `Schuljahresplanung konnte nicht gespeichert werden (${response.status}).`)
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export class SchoolPlanningRepository {
  get(): Promise<SchoolPlanningSnapshot> { return request<SchoolPlanningSnapshot>() }
  saveSchoolYear(value: SchoolYear): Promise<SchoolYear> { return request<SchoolYear>(`/school-years/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveClassGroup(value: ClassGroup): Promise<ClassGroup> { return request<ClassGroup>(`/class-groups/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveAssignment(value: ClassSubjectAssignment): Promise<ClassSubjectAssignment> { return request<ClassSubjectAssignment>(`/assignments/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveAnnotation(value: CurriculumAnnotation): Promise<CurriculumAnnotation> { return request<CurriculumAnnotation>(`/annotations/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveComment(value: CurriculumComment): Promise<CurriculumComment> { return request<CurriculumComment>(`/comments/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveSequence(value: TeachingSequence): Promise<TeachingSequence> { return request<TeachingSequence>(`/sequences/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveSequenceCurriculumReference(value: SequenceCurriculumReference): Promise<SequenceCurriculumReference> { return request<SequenceCurriculumReference>(`/sequence-curriculum-references/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveSequenceCompetency(value: SequenceCompetency): Promise<SequenceCompetency> { return request<SequenceCompetency>(`/sequence-competencies/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveSequenceLesson(value: SequenceLesson): Promise<SequenceLesson> { return request<SequenceLesson>(`/sequence-lessons/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveScheduledLesson(value: ScheduledLesson): Promise<ScheduledLesson> { return request<ScheduledLesson>(`/scheduled-lessons/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveTimetableVersion(value: TimetableVersion): Promise<TimetableVersion> { return request<TimetableVersion>(`/timetable-versions/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveTimetableSlot(value: TimetableSlot): Promise<TimetableSlot> { return request<TimetableSlot>(`/timetable-slots/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveCalendarException(value: CalendarException): Promise<CalendarException> { return request<CalendarException>(`/calendar-exceptions/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveLessonReflection(value: LessonReflection): Promise<LessonReflection> { return request<LessonReflection>(`/lesson-reflections/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveSequenceReflection(value: SequenceReflection): Promise<SequenceReflection> { return request<SequenceReflection>(`/sequence-reflections/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  remove(resource: Resource, id: string): Promise<void> { return request<void>(`/${resource}/${id}`, { method: 'DELETE' }) }
}
