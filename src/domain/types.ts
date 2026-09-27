export const CURRENT_SCHEMA_VERSION = 1 as const

export type RichTextMark = { type: string; attrs?: Record<string, unknown> }
export interface RichTextNode { type: string; text?: string; attrs?: Record<string, unknown>; marks?: RichTextMark[]; content?: RichTextNode[] }
export interface RichTextDocument { type: 'doc'; content: RichTextNode[] }

export interface WorkshopDay { id: string; date: string; title?: string; startTime?: string; endTime?: string }
export interface LearningObjective { id: string; text: string; level?: string; competencyIds: string[] }
export interface CompetencyReference { id: string; catalogId: string; competencyId: string; note?: string }
export type MaterialResourceType = 'physical' | 'file' | 'worksheet' | 'link' | 'interactive-html'
export interface Material { id: string; name: string; quantity?: string; description?: string; category?: string; resourceType: MaterialResourceType; inventoryMaterialId?: string }
export interface ScheduleEntry {
  id: string; dayId: string; startTime?: string; endTime?: string; durationMinutes?: number
  type: 'phase' | 'break'; phase?: string; title?: string; content?: RichTextDocument; objective?: RichTextDocument
  teacherActivity?: RichTextDocument; participantActivity?: RichTextDocument; method?: string; socialForm?: string
  materialIds: string[]; notes?: RichTextDocument
}
export type ScheduleField = 'time' | 'phase' | 'title' | 'objective' | 'content' | 'teacherActivity' | 'participantActivity' | 'method' | 'socialForm' | 'materials' | 'notes'
export interface ScheduleColumn { id: string; label: string; field: ScheduleField }
export interface ScheduleLayout { id: string; name: string; columns: ScheduleColumn[] }
/** A locally persisted, Markdown-described schedule layout. */
export interface SchedulePattern extends ScheduleLayout {
  markdown: string
  createdAt: string
  updatedAt: string
  isBuiltIn: boolean
}
export type PlanningSectionId = 'general' | 'dates' | 'objectives' | 'competencies' | 'content' | 'didactics' | 'schedule' | 'materials'
export interface LocalizedText { de: string; en?: string }
export interface PlanningTemplate {
  schemaVersion: number; id: string; name: LocalizedText; description?: LocalizedText
  discipline?: string; subject?: string; version: string
  competencyFrameworkIds: string[]; defaultCompetencyFrameworkId?: string; highlightedCompetencyIds?: string[]
  scheduleLayoutIds?: string[]; defaultScheduleLayoutId?: string; enabledSections?: PlanningSectionId[]
  suggestedPhases?: string[]; suggestedMethods?: string[]; suggestedMaterialTypes?: MaterialResourceType[]; tags?: string[]
  source: { type: 'local' | 'imported'; path?: string }; organization?: { name: string; url?: string }; author?: string
}
export type SubjectCategory = 'language' | 'social-science' | 'natural-science' | 'mathematics' | 'computer-science' | 'arts' | 'religion-ethics' | 'sport' | 'interdisciplinary' | 'other'
export interface SubjectReference { id: string; name: LocalizedText; aliases?: string[]; category?: SubjectCategory }
export interface CurriculumSourceReference { sourceId: string; page?: number; section?: string; heading?: string; table?: string; note?: string }
export interface CurriculumSource { id: string; publisher: string; title: string; publicationYear?: number; version?: string; sourceUrl: string; retrievedAt: string; sha256?: string; license?: { name?: string; url?: string; redistribution?: boolean; notes?: string } }
export interface CurriculumApplicability { schoolYearFrom?: string; schoolYearTo?: string; grades: number[]; phase?: 'planned' | 'trial' | 'active' | 'transition' | 'expired'; courseType?: string }
export interface GradeRange { from: number; to: number }
export interface CompetencyDomain { id: string; title: string; order: number; sourceRef: CurriculumSourceReference }
export interface CurriculumCompetency { id: string; curriculumId: string; domainId?: string; learningAreaId?: string; gradeRange?: GradeRange; text: string; normalizedLabel?: string; order: number; mandatory?: boolean; sourceRef: CurriculumSourceReference; reviewStatus: 'verified' | 'machine-extracted' | 'needs-review'; tags?: string[] }
export interface CurriculumContentPoint { id: string; curriculumId: string; learningAreaId: string; title: string; description?: string; order: number; mandatory?: boolean; kind?: 'core-content' | 'content-focus' | 'example' | 'optional' | 'regional-reference' | 'cross-curricular'; sourceRef: CurriculumSourceReference; reviewStatus: 'verified' | 'machine-extracted' | 'needs-review' }
export interface CurriculumLearningArea { id: string; curriculumId: string; parentId?: string; gradeRange: GradeRange; title: string; description?: string; order: number; competencyIds: string[]; contentPointIds: string[]; sourceRef: CurriculumSourceReference }
export interface CurriculumRelation { id: string; fromId: string; toId: string; type: 'develops' | 'applies-to' | 'belongs-to' | 'requires' | 'suggested-with' | 'cross-reference' }
export interface Curriculum { id: string; jurisdiction: 'TH'; schoolType: 'gymnasium'; subject: SubjectReference; title: string; version: string; publicationYear?: number; sourceId: string; applicability: CurriculumApplicability[]; competencyDomains: CompetencyDomain[]; competencies: CurriculumCompetency[]; learningAreas: CurriculumLearningArea[]; contentPoints: CurriculumContentPoint[]; relations: CurriculumRelation[] }
export type CurriculumProgressStatus = 'not-started' | 'planned' | 'in-progress' | 'covered' | 'needs-revision' | 'completed'
export interface TeachingContext { id: string; schoolYear: string; state: 'TH'; schoolType: 'gymnasium'; subjectId: string; grade: number; className?: string; curriculumId: string }
export interface CurriculumProgressEntry { id: string; teachingContextId: string; curriculumNodeId: string; status: CurriculumProgressStatus; firstTaughtAt?: string; lastTaughtAt?: string; lessonPlanIds?: string[]; notes?: string }
export interface WorkshopPlan {
  schemaVersion: number; id: string
  metadata: { title: string; subtitle?: string; subject?: string; targetGroup?: string; institution?: string; location?: string; buildingId?: string; roomId?: string; priorityId?: string; authors: string[]; description?: string }
  days: WorkshopDay[]; learningObjectives: LearningObjective[]; competencies: CompetencyReference[]
  contentAnalysis: RichTextDocument; didacticAnalysis: RichTextDocument; schedule: ScheduleEntry[]; materials: Material[]
  settings: { scheduleLayoutId: string; timeDisplay: 'start' | 'duration'; phaseModelId?: string; templateId?: string; enabledCompetencyFrameworkIds?: string[] }; createdAt: string; updatedAt: string
}
export interface CompetencyItem { id: string; title: string; description?: string }
export interface CompetencyCategory { id: string; title: string; competencies: CompetencyItem[]; children?: CompetencyCategory[] }
export interface CompetencyCatalog { id: string; name: string; subject?: string; region?: string; schoolType?: string; version?: string; source?: string; categories: CompetencyCategory[] }
export interface ExportResult { filename: string; mimeType: string; content: string }
export interface DocumentExporter { export(plan: WorkshopPlan): Promise<ExportResult> }
export interface Building { id: string; name: string }
export interface Room { id: string; buildingId: string; name: string }
export type InventoryScope = 'personal' | 'building' | 'room'
export interface InventoryMaterial extends Material { scope: InventoryScope; buildingId?: string; roomId?: string }
export interface PriorityDefinition { id: string; label: string; order: number; icon: '⚡' | '↑' | '●' | '○' }
export interface PlannerTodo { id: string; title: string; dueDate?: string; planId?: string; priorityId?: string; completed: boolean; notes?: string }
export type DashboardWidgetId = 'calendar' | 'upcoming-plans' | 'upcoming-todos' | 'next-day-materials'
export type DashboardWidgetWidth = 'half' | 'wide' | 'full'
export type DashboardWidgetHeight = 'compact' | 'standard' | 'tall'
/**
 * Grid units are the single persisted source of truth for both dashboard and editor.
 * The optional legacy fields are read only while migrating former list-based layouts.
 */
export interface DashboardWidget {
  id: DashboardWidgetId; enabled: boolean; x: number; y: number; w: number; h: number
  calendarView?: 'day' | 'week' | 'month'; limit?: number
  order?: number; width?: DashboardWidgetWidth; height?: DashboardWidgetHeight
}
export interface WorkspaceSettings { schemaVersion: 1; buildings: Building[]; rooms: Room[]; inventoryMaterials: InventoryMaterial[]; todos: PlannerTodo[]; priorities: PriorityDefinition[]; dashboard: DashboardWidget[] }
