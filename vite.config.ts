import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { SqliteDigitalLearningMaterials, SqlitePlans, SqlitePresentationMedia, SqliteSchedulePatterns, SqliteWorkspaceSettings } from './server/sqlitePlans'
import { SqliteSchoolPlanning } from './server/schoolPlanning'
import { CalendarExceptionSchema, ClassGroupSchema, ClassSubjectAssignmentSchema, CurriculumAnnotationSchema, CurriculumCommentSchema, LessonReflectionSchema, ScheduledLessonSchema, SchoolYearSchema, SequenceLessonSchema, TeachingSequenceSchema, TimetableSlotSchema, TimetableVersionSchema } from './src/schemas/schoolPlanning'

const json = (response: ServerResponse, status: number, body?: unknown): void => {
  response.statusCode = status
  if (body === undefined) { response.end(); return }
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

const readBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const decodeMediaData = (data: unknown): { mimeType: string; content: Buffer } => {
  if (typeof data !== 'string') throw new Error('Mediendaten fehlen.')
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i.exec(data)
  if (!match) throw new Error('Ungültige Mediendaten.')
  const content = Buffer.from(match[2]!, 'base64')
  if (!content.length || content.byteLength > 50 * 1024 * 1024) throw new Error('Mediendatei muss zwischen 1 Byte und 50 MB groß sein.')
  return { mimeType: match[1]!, content }
}

const sqliteApi = () => ({
  name: 'verlaufsplaner-sqlite-api',
  configureServer(server: { middlewares: { use: (path: string, handler: (request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) => void) => void } }) {
    const plans = new SqlitePlans()
    const presentationMedia = new SqlitePresentationMedia()
    const learningMaterials = new SqliteDigitalLearningMaterials()
    const schedulePatterns = new SqliteSchedulePatterns()
    const workspace = new SqliteWorkspaceSettings()
    const schoolPlanning = new SqliteSchoolPlanning()
    server.middlewares.use('/api/plans', (request, response, next) => {
      void (async () => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        const id = path === '/' ? undefined : decodeURIComponent(path.slice(1))
        if (request.method === 'GET' && !id) return json(response, 200, plans.list())
        if (request.method === 'GET' && id) { const plan = plans.get(id); return plan ? json(response, 200, plan) : json(response, 404, { error: 'Planung nicht gefunden.' }) }
        if (request.method === 'PUT' && id) { plans.save(await readBody(request)); return json(response, 204) }
        if (request.method === 'DELETE' && id) {
          if (!plans.remove(id)) return json(response, 404)
          presentationMedia.removeForPlan(id)
          return json(response, 204)
        }
        return json(response, 405, { error: 'Methode nicht erlaubt.' })
      })().catch((error: unknown) => {
        if (error instanceof SyntaxError) return json(response, 400, { error: 'Ungueltiges JSON.' })
        next(error instanceof Error ? error : new Error(String(error)))
      })
    })
    server.middlewares.use('/api/presentation-media', (request, response, next) => {
      void (async () => {
        const url = new URL(request.url ?? '/', 'http://localhost')
        const id = url.pathname === '/' ? undefined : decodeURIComponent(url.pathname.slice(1))
        if (request.method === 'GET' && !id) {
          const planId = url.searchParams.get('planId')
          return planId ? json(response, 200, presentationMedia.list(planId).map((media) => ({ ...media, url: `/api/presentation-media/${media.id}` }))) : json(response, 400, { error: 'Plan-ID fehlt.' })
        }
        if (request.method === 'GET' && id) {
          const media = presentationMedia.get(id)
          if (!media) return json(response, 404, { error: 'Medium nicht gefunden.' })
          response.statusCode = 200
          response.setHeader('content-type', media.mimeType)
          response.setHeader('content-length', media.content.byteLength)
          response.setHeader('cache-control', 'private, max-age=31536000, immutable')
          response.end(media.content)
          return
        }
        if (request.method === 'POST' && !id) {
          const body = await readBody(request) as { planId?: unknown; name?: unknown; data?: unknown }
          if (typeof body.planId !== 'string' || !plans.get(body.planId)) return json(response, 404, { error: 'Planung nicht gefunden.' })
          if (typeof body.name !== 'string') return json(response, 400, { error: 'Dateiname fehlt.' })
          const decoded = decodeMediaData(body.data)
          if (!decoded.mimeType.startsWith('image/') && !decoded.mimeType.startsWith('video/')) return json(response, 400, { error: 'Nur Bild- und Videodateien sind erlaubt.' })
          const media = presentationMedia.save({ planId: body.planId, name: body.name, ...decoded })
          return json(response, 201, { ...media, url: `/api/presentation-media/${media.id}` })
        }
        if (request.method === 'DELETE' && id) return json(response, presentationMedia.remove(id) ? 204 : 404)
        return json(response, 405, { error: 'Methode nicht erlaubt.' })
      })().catch((error: unknown) => {
        if (error instanceof SyntaxError || error instanceof Error) return json(response, 400, { error: error.message || 'Ungültige Medienanfrage.' })
        next(new Error(String(error)))
      })
    })
    server.middlewares.use('/api/learning-materials', (request, response, next) => {
      void (async () => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        const id = path === '/' ? undefined : decodeURIComponent(path.slice(1))
        if (request.method === 'GET' && !id) return json(response, 200, learningMaterials.list())
        if (request.method === 'GET' && id) { const material = learningMaterials.get(id); return material ? json(response, 200, material) : json(response, 404, { error: 'Lernmaterial nicht gefunden.' }) }
        if (request.method === 'PUT' && id) { const body = await readBody(request) as { id?: string }; if (body.id !== id) return json(response, 400, { error: 'Material-ID stimmt nicht mit der Adresse überein.' }); learningMaterials.save(body as never); return json(response, 204) }
        if (request.method === 'DELETE' && id) return json(response, learningMaterials.remove(id) ? 204 : 404)
        return json(response, 405, { error: 'Methode nicht erlaubt.' })
      })().catch((error: unknown) => {
        if (error instanceof SyntaxError) return json(response, 400, { error: 'Ungültiges JSON.' })
        next(error instanceof Error ? error : new Error(String(error)))
      })
    })
    server.middlewares.use('/api/schedule-patterns', (request, response, next) => {
      void (async () => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        const id = path === '/' ? undefined : decodeURIComponent(path.slice(1))
        if (request.method === 'GET' && !id) return json(response, 200, schedulePatterns.list())
        if (request.method === 'GET' && id) { const pattern = schedulePatterns.get(id); return pattern ? json(response, 200, pattern) : json(response, 404, { error: 'Verlaufsplan-Muster nicht gefunden.' }) }
        if (request.method === 'PUT' && id) { const body = await readBody(request) as { id?: string }; if (body.id !== id) return json(response, 400, { error: 'Muster-ID stimmt nicht mit der Adresse überein.' }); schedulePatterns.save(body as never); return json(response, 204) }
        if (request.method === 'DELETE' && id) return json(response, schedulePatterns.remove(id) ? 204 : 404)
        return json(response, 405, { error: 'Methode nicht erlaubt.' })
      })().catch((error: unknown) => {
        if (error instanceof SyntaxError) return json(response, 400, { error: 'Ungültiges JSON.' })
        if (error instanceof Error && error.message.includes('mitgelieferten')) return json(response, 409, { error: error.message })
        next(error instanceof Error ? error : new Error(String(error)))
      })
    })
    server.middlewares.use('/api/workspace', (request, response, next) => {
      void (async () => {
        if (request.method === 'GET') return json(response, 200, workspace.get())
        if (request.method === 'PUT') return json(response, 200, workspace.save(await readBody(request) as never))
        return json(response, 405, { error: 'Methode nicht erlaubt.' })
      })().catch((error: unknown) => {
        if (error instanceof SyntaxError) return json(response, 400, { error: 'Ungültiges JSON.' })
        next(error instanceof Error ? error : new Error(String(error)))
      })
    })
    server.middlewares.use('/api/school-planning', (request, response, next) => {
      void (async () => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        const [resource, id] = path.split('/').filter(Boolean)
        if (request.method === 'GET' && !resource) return json(response, 200, schoolPlanning.snapshot())
        if (request.method === 'PUT' && id) {
          const body = await readBody(request)
          const saved = resource === 'school-years' ? schoolPlanning.saveSchoolYear(SchoolYearSchema.parse(body))
            : resource === 'class-groups' ? schoolPlanning.saveClassGroup(ClassGroupSchema.parse(body))
              : resource === 'assignments' ? schoolPlanning.saveAssignment(ClassSubjectAssignmentSchema.parse(body))
                : resource === 'annotations' ? schoolPlanning.saveAnnotation(CurriculumAnnotationSchema.parse(body))
                  : resource === 'comments' ? schoolPlanning.saveComment(CurriculumCommentSchema.parse(body))
                    : resource === 'sequences' ? schoolPlanning.saveSequence(TeachingSequenceSchema.parse(body))
                      : resource === 'sequence-lessons' ? schoolPlanning.saveSequenceLesson(SequenceLessonSchema.parse(body))
                        : resource === 'scheduled-lessons' ? schoolPlanning.saveScheduledLesson(ScheduledLessonSchema.parse(body))
                          : resource === 'timetable-versions' ? schoolPlanning.saveTimetableVersion(TimetableVersionSchema.parse(body))
                            : resource === 'timetable-slots' ? schoolPlanning.saveTimetableSlot(TimetableSlotSchema.parse(body))
                              : resource === 'calendar-exceptions' ? schoolPlanning.saveCalendarException(CalendarExceptionSchema.parse(body))
                                : resource === 'lesson-reflections' ? schoolPlanning.saveLessonReflection(LessonReflectionSchema.parse(body)) : undefined
          return saved ? json(response, 200, saved) : json(response, 404, { error: 'Unbekannte Planungsressource.' })
        }
        const table = resource === 'school-years' ? 'school_years' : resource === 'class-groups' ? 'class_groups' : resource === 'assignments' ? 'class_subject_assignments' : resource === 'annotations' ? 'curriculum_annotations' : resource === 'comments' ? 'curriculum_comments' : resource === 'sequences' ? 'teaching_sequences' : resource === 'sequence-lessons' ? 'sequence_lessons' : resource === 'scheduled-lessons' ? 'scheduled_lessons' : resource === 'timetable-versions' ? 'timetable_versions' : resource === 'timetable-slots' ? 'timetable_slots' : resource === 'calendar-exceptions' ? 'calendar_exceptions' : undefined
        if (request.method === 'DELETE' && id && table) return json(response, schoolPlanning.remove(table, id) ? 204 : 404)
        return json(response, 405, { error: 'Methode nicht erlaubt.' })
      })().catch((error: unknown) => {
        if (error instanceof SyntaxError || error instanceof Error) return json(response, 400, { error: error.message || 'Ungültige Planungsdaten.' })
        next(new Error(String(error)))
      })
    })
  },
})

export default defineConfig({
  plugins: [vue(), sqliteApi()],
})
