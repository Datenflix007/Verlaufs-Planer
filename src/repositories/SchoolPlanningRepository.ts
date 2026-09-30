import type { ClassGroup, ClassSubjectAssignment, CurriculumAnnotation, CurriculumComment, ScheduledLesson, SchoolPlanningSnapshot, SchoolYear, SequenceLesson, TeachingSequence } from '../domain/schoolPlanning'

type Resource = 'school-years' | 'class-groups' | 'assignments' | 'annotations' | 'comments' | 'sequences' | 'sequence-lessons' | 'scheduled-lessons'
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
  saveSequenceLesson(value: SequenceLesson): Promise<SequenceLesson> { return request<SequenceLesson>(`/sequence-lessons/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  saveScheduledLesson(value: ScheduledLesson): Promise<ScheduledLesson> { return request<ScheduledLesson>(`/scheduled-lessons/${value.id}`, { method: 'PUT', body: JSON.stringify(value) }) }
  remove(resource: Resource, id: string): Promise<void> { return request<void>(`/${resource}/${id}`, { method: 'DELETE' }) }
}
