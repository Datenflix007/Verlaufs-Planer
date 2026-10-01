import { expect, test } from '@playwright/test'
import { createPlan } from '../src/domain/factories'
import { copyFile, readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'

test.afterEach(async ({ request }) => {
  const [schoolPlanningResponse, plansResponse] = await Promise.all([
    request.get('/api/school-planning'),
    request.get('/api/plans'),
  ])
  const [schoolPlanning, plans] = await Promise.all([
    schoolPlanningResponse.json() as Promise<{ schoolYears: Array<{ id: string }> }>,
    plansResponse.json() as Promise<Array<{ id: string }>>,
  ])

  await Promise.all(plans.map((plan) => request.delete(`/api/plans/${plan.id}`)))
  await Promise.all(schoolPlanning.schoolYears.map((schoolYear) => request.delete(`/api/school-planning/school-years/${schoolYear.id}`)))
})

test('derives the curriculum status from completed scheduled lessons', async ({ page, request }) => {
  const stamp = new Date().toISOString(); const schoolYearId = randomUUID(); const classGroupId = randomUUID(); const assignmentId = randomUUID(); const sequenceId = randomUUID(); const lessonId = randomUUID(); const annotationId = randomUUID(); const referenceId = randomUUID(); const scheduledId = randomUUID()
  await request.put(`/api/school-planning/school-years/${schoolYearId}`, { data: { id: schoolYearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/class-groups/${classGroupId}`, { data: { id: classGroupId, schoolYearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId, schoolYearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/annotations/${annotationId}`, { data: { id: annotationId, classSubjectAssignmentId: assignmentId, curriculumNodeId: 'th-gym-history-2021-g7-french-revolution', nodeKind: 'content-point', status: 'rough-planned', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/sequences/${sequenceId}`, { data: { id: sequenceId, classSubjectAssignmentId: assignmentId, title: 'Französische Revolution', status: 'planned', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/sequence-curriculum-references/${referenceId}`, { data: { id: referenceId, teachingSequenceId: sequenceId, curriculumNodeId: 'th-gym-history-2021-g7-french-revolution', nodeKind: 'content-point', relationType: 'primary', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/sequence-lessons/${lessonId}`, { data: { id: lessonId, teachingSequenceId: sequenceId, position: 1, title: '1789', status: 'completed', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/scheduled-lessons/${scheduledId}`, { data: { id: scheduledId, classSubjectAssignmentId: assignmentId, sequenceLessonId: lessonId, date: '2026-10-08', status: 'completed', contextType: 'REGULAR_LESSON', createdAt: stamp, updatedAt: stamp } })

  await page.goto('/lehrplan')
  await page.locator('.assignment-picker select').selectOption(assignmentId)
  await expect(page.getByLabel(/Auf dem Weg in die Moderne.*Behandelt/)).toHaveAttribute('aria-pressed', 'true')
})

test('shows timetable cancellations, substitutions, and standalone exceptions on the dashboard', async ({ page, request }) => {
  const stamp = new Date().toISOString(); const schoolYearId = randomUUID(); const classGroupId = randomUUID(); const assignmentId = randomUUID(); const sequenceId = randomUUID(); const lessonId = randomUUID()
  const today = new Date().toISOString().slice(0, 10); const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  await request.put(`/api/school-planning/school-years/${schoolYearId}`, { data: { id: schoolYearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/class-groups/${classGroupId}`, { data: { id: classGroupId, schoolYearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId, schoolYearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/sequences/${sequenceId}`, { data: { id: sequenceId, classSubjectAssignmentId: assignmentId, title: 'Quellenarbeit', status: 'planned', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/sequence-lessons/${lessonId}`, { data: { id: lessonId, teachingSequenceId: sequenceId, position: 1, title: 'Quellenarbeit', status: 'planned', createdAt: stamp, updatedAt: stamp } })
  const cancelledLessonId = randomUUID()
  await request.put(`/api/school-planning/scheduled-lessons/${cancelledLessonId}`, { data: { id: cancelledLessonId, classSubjectAssignmentId: assignmentId, sequenceLessonId: lessonId, date: today, startTime: '08:00', endTime: '08:45', status: 'planned', contextType: 'REGULAR_LESSON', createdAt: stamp, updatedAt: stamp } })
  const substitutedLessonId = randomUUID()
  await request.put(`/api/school-planning/scheduled-lessons/${substitutedLessonId}`, { data: { id: substitutedLessonId, classSubjectAssignmentId: assignmentId, sequenceLessonId: lessonId, date: tomorrow, startTime: '08:00', endTime: '08:45', status: 'planned', contextType: 'REGULAR_LESSON', createdAt: stamp, updatedAt: stamp } })
  const cancellationId = randomUUID()
  await request.put(`/api/school-planning/calendar-exceptions/${cancellationId}`, { data: { id: cancellationId, schoolYearId, classSubjectAssignmentId: assignmentId, date: today, type: 'CANCELLATION', title: 'Klassenfahrt', createdAt: stamp, updatedAt: stamp } })
  const substitutionExceptionId = randomUUID()
  await request.put(`/api/school-planning/calendar-exceptions/${substitutionExceptionId}`, { data: { id: substitutionExceptionId, schoolYearId, classSubjectAssignmentId: assignmentId, date: tomorrow, type: 'SUBSTITUTION', title: 'Vertretung durch Frau Meyer', replacementStartTime: '09:00', replacementEndTime: '09:45', createdAt: stamp, updatedAt: stamp } })
  const standaloneId = randomUUID()
  await request.put(`/api/school-planning/calendar-exceptions/${standaloneId}`, { data: { id: standaloneId, schoolYearId, date: today, type: 'OTHER', title: 'Projekttag', createdAt: stamp, updatedAt: stamp } })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Unterricht & Planungen' })).toBeVisible()
  await expect(page.getByText('8a · Geschichte · Quellenarbeit')).toBeVisible()
  await expect(page.getByText('1 von 1 Sequenzstunden geplant')).toBeVisible()
  await expect(page.locator('.timed-event.school.cancelled', { hasText: 'Quellenarbeit' })).toBeVisible()
  await expect(page.locator('.timed-event.school.substitution', { hasText: '09:00' })).toBeVisible()
  await expect(page.locator('.all-day-event.exception', { hasText: 'Projekttag' })).toBeVisible()
  await page.locator('.timed-event.school.cancelled', { hasText: 'Quellenarbeit' }).click()
  await expect(page).toHaveURL(new RegExp(`/reihen\\?sequenceId=${sequenceId}`))
  await expect(page.locator('.sequence-timeline')).toBeVisible()
})

test('führt vom Dashboard durch die erste Schuljahreseinstellung', async ({ page, request }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Einrichtung' }).click(); await expect(page).toHaveURL(/\/einrichtung$/)
  await page.getByRole('button', { name: 'Weiter' }).click(); await page.getByLabel('Name').fill('8a'); await page.getByRole('button', { name: 'Weiter' }).click(); await expect(page.getByText('Verifiziert verfügbar')).toBeVisible(); await page.getByRole('button', { name: 'Weiter' }).click(); await page.getByRole('button', { name: 'Einrichtung abschließen' }).click()
  await expect(page.getByText(/sind eingerichtet/)).toBeVisible(); await expect.poll(async () => (await (await request.get('/api/school-planning')).json()).assignments.length).toBe(1)
  await page.getByRole('button', { name: 'Klassen & Fächer verwalten' }).click(); await expect(page).toHaveURL(/\/schuljahr$/)
  await page.getByLabel('Name').fill('8b'); await page.getByRole('button', { name: 'Klasse anlegen' }).click()
  await page.getByLabel('Klasse oder Kurs').selectOption({ label: '8b · Klassenstufe 8' }); await page.getByRole('button', { name: 'Fachlehrplan zuordnen' }).click()
  await expect.poll(async () => (await (await request.get('/api/school-planning')).json()).assignments.length).toBe(2)
  await page.locator('.class-row', { hasText: '8b' }).getByRole('button', { name: 'Reihen planen' }).click()
  await expect(page.getByText('Diese Reihen, Stunden und Lehrplanbezüge gehören nur zu diesem Planungsraum.')).toBeVisible()
  await expect(page.locator('.assignment-context')).toContainText('8b · Geschichte')
})

test('führt vom Dashboard durch Workshop, 8a Geschichte und die Reihe Vormärz', async ({ page, request }) => {
  const stamp = new Date().toISOString(); const yearId = randomUUID(); const groupId = randomUUID(); const assignmentId = randomUUID()
  await request.put(`/api/school-planning/school-years/${yearId}`, { data: { id: yearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/class-groups/${groupId}`, { data: { id: groupId, schoolYearId: yearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId: groupId, schoolYearId: yearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } })

  await page.goto('/')
  await page.getByRole('button', { name: 'Neue Planung' }).click()
  await page.getByRole('button', { name: 'Reihenplanung' }).click()
  await page.getByLabel('Klasse, Fach und Lehrplan').selectOption(assignmentId)
  await page.getByLabel('Titel der Reihe').fill('Vormärz')
  await page.getByRole('button', { name: 'Reihe anlegen und Stunden planen' }).click()
  await expect(page).toHaveURL(/\/reihen/)
  expect(new URL(page.url()).searchParams.get('assignmentId')).toBe(assignmentId)
  expect(new URL(page.url()).searchParams.get('sequenceId')).toBeTruthy()
  await expect(page.locator('.assignment-context')).toContainText('8a · Geschichte')
  await expect(page.getByText('Vormärz')).toBeVisible()

  await page.goto('/')
  await page.getByRole('button', { name: 'Neue Planung' }).click()
  await page.getByRole('button', { name: 'Unterrichtsstunde' }).click()
  await page.getByLabel('Klasse, Fach und Lehrplan').selectOption(assignmentId)
  await page.getByLabel('Titel der Planung').fill('Vormärz: Quellen untersuchen')
  await page.getByRole('button', { name: 'Stunde anlegen' }).click()
  await expect(page).toHaveURL(/\/plan\//)
  await expect(page.locator('.editor-school-context')).toContainText('8a · Geschichte')
  await expect(page.getByRole('button', { name: 'Zur Reihenplanung' })).toBeVisible()
  const schoolPlan = await (await request.get('/api/plans')).json() as Array<{ id: string }>
  const savedSchoolPlan = await (await request.get(`/api/plans/${schoolPlan[0]!.id}`)).json() as { metadata: { planningContext?: string; classSubjectAssignmentId?: string; targetGroup?: string; subject?: string } }
  expect(savedSchoolPlan.metadata).toMatchObject({ planningContext: 'school', classSubjectAssignmentId: assignmentId, targetGroup: '8a', subject: 'Geschichte' })

  await page.goto('/')
  await page.getByRole('button', { name: 'Neue Planung' }).click()
  await page.getByRole('button', { name: 'Workshop' }).click()
  await page.getByLabel('Workshop-Lerngruppe').fill('Fortbildung Geschichte')
  await page.getByLabel('Teilnehmende').fill('Ada, Ben\nCem')
  await page.getByLabel('Titel der Planung').fill('Quellenwerkstatt')
  await page.getByRole('button', { name: 'Workshop anlegen' }).click()
  await expect(page).toHaveURL(/\/plan\//)
  const workshopPlanId = new URL(page.url()).pathname.split('/').at(-1)!
  const savedWorkshopPlan = await (await request.get(`/api/plans/${workshopPlanId}`)).json() as { metadata: { planningContext?: string; targetGroup?: string; participants?: string[] } }
  expect(savedWorkshopPlan.metadata).toMatchObject({ planningContext: 'workshop', targetGroup: 'Fortbildung Geschichte', participants: ['Ada', 'Ben', 'Cem'] })
})

test('schließt eine Reihe mit persönlicher Reihenreflexion ab', async ({ page, request }) => {
  const stamp = new Date().toISOString(); const yearId = randomUUID(); const groupId = randomUUID(); const assignmentId = randomUUID(); const sequenceId = randomUUID()
  await request.put(`/api/school-planning/school-years/${yearId}`, { data: { id: yearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/class-groups/${groupId}`, { data: { id: groupId, schoolYearId: yearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId: groupId, schoolYearId: yearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequences/${sequenceId}`, { data: { id: sequenceId, classSubjectAssignmentId: assignmentId, title: 'Vormärz', status: 'planned', createdAt: stamp, updatedAt: stamp } })
  await page.goto('/reihen'); await page.getByRole('button', { name: 'Öffnen' }).click(); await page.getByLabel('Behandelte Inhalte').fill('Vormärz und nationale Einheit'); await page.getByLabel('Offene Inhalte').fill('Revolution 1848/49'); await page.getByLabel('Kompetenzen erneut aufgreifen').fill('Quellenkritik'); await page.getByLabel('Material im nächsten Schuljahr wiederverwenden').check(); await page.getByRole('button', { name: 'Reihenreflexion speichern und Reihe abschließen' }).click()
  await expect.poll(async () => (await (await request.get('/api/school-planning')).json()).sequenceReflections.find((reflection: { teachingSequenceId: string }) => reflection.teachingSequenceId === sequenceId)).toMatchObject({ openTopics: 'Revolution 1848/49', competenciesToRevisit: 'Quellenkritik', reuseMaterials: true })
  await expect.poll(async () => (await (await request.get('/api/school-planning')).json()).sequences.find((sequence: { id: string }) => sequence.id === sequenceId)?.status).toBe('completed')
})

test('speichert didaktische Hinweise an einer Sequenzstunde', async ({ page, request }) => {
  const stamp = new Date().toISOString(); const yearId = randomUUID(); const groupId = randomUUID(); const assignmentId = randomUUID(); const sequenceId = randomUUID(); const lessonId = randomUUID()
  await request.put(`/api/school-planning/school-years/${yearId}`, { data: { id: yearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/class-groups/${groupId}`, { data: { id: groupId, schoolYearId: yearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId: groupId, schoolYearId: yearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequences/${sequenceId}`, { data: { id: sequenceId, classSubjectAssignmentId: assignmentId, title: 'Vormärz', status: 'planned', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequence-lessons/${lessonId}`, { data: { id: lessonId, teachingSequenceId: sequenceId, position: 1, title: 'Historische Lieder', status: 'planned', createdAt: stamp, updatedAt: stamp } })
  await page.goto('/reihen'); await page.getByRole('button', { name: 'Öffnen' }).click(); await page.getByText('1. Historische Lieder').first().click(); await page.getByLabel('Digitale Werkzeuge').fill('Quellenboard'); await page.getByLabel('Technische Voraussetzungen').fill('Beamer und WLAN'); await page.getByLabel('Offline-Fallback').fill('Ausgedruckte Quellen'); await page.getByRole('button', { name: 'Didaktische Hinweise speichern' }).click()
  await expect.poll(async () => (await (await request.get('/api/school-planning')).json()).sequenceLessons.find((lesson: { id: string }) => lesson.id === lessonId)).toMatchObject({ digitalTools: 'Quellenboard', technicalRequirements: 'Beamer und WLAN', fallbackPlan: 'Ausgedruckte Quellen' })
})

test('zeigt den fehlenden Offline-Fallback als Didaktik-Hinweis', async ({ page, request }) => {
  const stamp = new Date().toISOString(); const yearId = randomUUID(); const groupId = randomUUID(); const assignmentId = randomUUID(); const sequenceId = randomUUID(); const lessonId = randomUUID(); const referenceId = randomUUID(); const competencyId = randomUUID()
  await request.put(`/api/school-planning/school-years/${yearId}`, { data: { id: yearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/class-groups/${groupId}`, { data: { id: groupId, schoolYearId: yearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId: groupId, schoolYearId: yearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequences/${sequenceId}`, { data: { id: sequenceId, classSubjectAssignmentId: assignmentId, title: 'Vormärz', status: 'planned', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequence-curriculum-references/${referenceId}`, { data: { id: referenceId, teachingSequenceId: sequenceId, curriculumNodeId: 'history-vormaerz', nodeKind: 'content-point', relationType: 'primary', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequence-competencies/${competencyId}`, { data: { id: competencyId, teachingSequenceId: sequenceId, competencyId: 'history-method', role: 'primary', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequence-lessons/${lessonId}`, { data: { id: lessonId, teachingSequenceId: sequenceId, position: 1, title: 'Historische Lieder', lessonObjective: 'Quellen einordnen', competenceFocus: 'Quellenkritik', digitalTools: 'Quellenboard', status: 'planned', createdAt: stamp, updatedAt: stamp } })
  await page.goto('/reihen'); await page.getByRole('button', { name: 'Öffnen' }).click(); await expect(page.getByText('Ein digitales Werkzeug hat noch keine Offline-Alternative.')).toBeVisible(); await page.getByText('1. Historische Lieder').first().click(); await page.getByLabel('Offline-Fallback').fill('Ausgedruckte Quellen'); await page.getByRole('button', { name: 'Didaktische Hinweise speichern' }).click(); await expect(page.getByText('Alle derzeit prüfbaren didaktischen Bezüge dieser Reihe sind dokumentiert.')).toBeVisible()
})

test('speichert und verwendet eine lokale Reihenvorlage ohne persönliche Termindaten', async ({ page, request }) => {
  const stamp = new Date().toISOString(); const yearId = randomUUID(); const groupId = randomUUID(); const assignmentId = randomUUID(); const sequenceId = randomUUID(); const lessonId = randomUUID()
  await request.put(`/api/school-planning/school-years/${yearId}`, { data: { id: yearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/class-groups/${groupId}`, { data: { id: groupId, schoolYearId: yearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId: groupId, schoolYearId: yearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequences/${sequenceId}`, { data: { id: sequenceId, classSubjectAssignmentId: assignmentId, title: 'Vormärz', status: 'planned', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequence-lessons/${lessonId}`, { data: { id: lessonId, teachingSequenceId: sequenceId, position: 1, title: 'Historische Lieder', digitalTools: 'Quellenboard', fallbackPlan: 'Ausdrucke', status: 'planned', createdAt: stamp, updatedAt: stamp } })
  await page.goto('/reihen'); await page.getByRole('button', { name: 'Öffnen' }).click(); await page.getByRole('button', { name: 'Reihe als Vorlage speichern' }).click(); await expect(page.getByText(/nur in diesem Browser gespeichert/)).toBeVisible(); await page.getByRole('button', { name: 'Vorlage verwenden' }).click()
  await expect.poll(async () => (await (await request.get('/api/school-planning')).json()).sequences.filter((sequence: { classSubjectAssignmentId: string; title: string }) => sequence.classSubjectAssignmentId === assignmentId && sequence.title === 'Vormärz').length).toBe(2)
  await expect.poll(async () => { const lesson = (await (await request.get('/api/school-planning')).json()).sequenceLessons.find((item: { teachingSequenceId: string; title: string; scheduledLessonId?: string; planId?: string; digitalTools?: string; fallbackPlan?: string }) => item.teachingSequenceId !== sequenceId && item.title === 'Historische Lieder'); return Boolean(lesson && lesson.scheduledLessonId === undefined && lesson.planId === undefined && lesson.digitalTools === 'Quellenboard' && lesson.fallbackPlan === 'Ausdrucke') }).toBe(true)
})

test('speichert strukturierte Stundenreflexionen', async ({ page, request }) => {
  const stamp = new Date().toISOString(); const yearId = randomUUID(); const groupId = randomUUID(); const assignmentId = randomUUID(); const sequenceId = randomUUID(); const lessonId = randomUUID()
  await request.put(`/api/school-planning/school-years/${yearId}`, { data: { id: yearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/class-groups/${groupId}`, { data: { id: groupId, schoolYearId: yearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId: groupId, schoolYearId: yearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequences/${sequenceId}`, { data: { id: sequenceId, classSubjectAssignmentId: assignmentId, title: 'Vormärz', status: 'planned', createdAt: stamp, updatedAt: stamp } }); await request.put(`/api/school-planning/sequence-lessons/${lessonId}`, { data: { id: lessonId, teachingSequenceId: sequenceId, position: 1, title: 'Historische Lieder', status: 'planned', createdAt: stamp, updatedAt: stamp } })
  const scheduledLessonId = randomUUID()
  await request.put(`/api/school-planning/scheduled-lessons/${scheduledLessonId}`, { data: { id: scheduledLessonId, classSubjectAssignmentId: assignmentId, sequenceLessonId: lessonId, date: '2026-10-08', status: 'planned', contextType: 'REGULAR_LESSON', createdAt: stamp, updatedAt: stamp } })
  await page.goto('/reihen'); await page.getByRole('button', { name: 'Öffnen' }).click(); await page.getByText('1. Historische Lieder').first().click(); await page.getByLabel('Ziele erreicht?').selectOption('false'); await page.getByLabel('Abweichungen').fill('Sicherung verkürzt.'); await page.getByLabel('Nächste Stunde anpassen').fill('Einstieg kürzen.')
  const sequenceUpdate = page.waitForResponse((response) => response.request().method() === 'PUT' && response.url().endsWith(`/api/school-planning/sequence-lessons/${lessonId}`))
  const scheduleUpdate = page.waitForResponse((response) => response.request().method() === 'PUT' && response.url().endsWith(`/api/school-planning/scheduled-lessons/${scheduledLessonId}`))
  await page.getByRole('button', { name: 'Durchführung speichern' }).click()
  expect((await sequenceUpdate).ok()).toBeTruthy()
  const scheduleResponse = await scheduleUpdate
  expect(scheduleResponse.ok()).toBeTruthy()
  await expect.poll(async () => (await (await request.get('/api/school-planning')).json()).lessonReflections[0]?.nextLessonAdjustment).toBe('Einstieg kürzen.')
  await expect.poll(async () => (await (await request.get('/api/school-planning')).json()).scheduledLessons.find((item: { sequenceLessonId: string }) => item.sequenceLessonId === lessonId)?.status).toBe('completed')
})

test('verwaltet Stundenplan-Slots und Kalenderausnahmen', async ({ page, request }) => {
  const stamp = new Date().toISOString(); const schoolYearId = randomUUID(); const classGroupId = randomUUID(); const assignmentId = randomUUID()
  await request.put(`/api/school-planning/school-years/${schoolYearId}`, { data: { id: schoolYearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/class-groups/${classGroupId}`, { data: { id: classGroupId, schoolYearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId, schoolYearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } })
  await page.goto('/stundenplan')
  await page.getByRole('button', { name: 'Version speichern' }).click()
  await page.getByRole('button', { name: 'Slot hinzufügen' }).click()
  await expect(page.getByText('Montag · 08:00–08:45')).toBeVisible()
  await page.getByLabel('Titel').fill('Herbstferien')
  await page.getByRole('button', { name: 'Ausnahme speichern' }).click()
  await expect(page.getByText('Herbstferien')).toBeVisible()
})

test('übernimmt Lehrplan- und Kompetenzbezüge beim Anlegen einer Reihe', async ({ page, request }) => {
  const stamp = new Date().toISOString()
  const schoolYearId = randomUUID()
  const classGroupId = randomUUID()
  const assignmentId = randomUUID()
  await request.put(`/api/school-planning/school-years/${schoolYearId}`, { data: { id: schoolYearId, name: '2026/27', federalState: 'TH', schoolType: 'Gymnasium', startDate: '2026-08-01', endDate: '2027-07-31', active: true, createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/class-groups/${classGroupId}`, { data: { id: classGroupId, schoolYearId, name: '8a', grade: 8, schoolType: 'Gymnasium', createdAt: stamp, updatedAt: stamp } })
  await request.put(`/api/school-planning/assignments/${assignmentId}`, { data: { id: assignmentId, classGroupId, schoolYearId, subjectId: 'subject-history', curriculumId: 'th-gym-history-2021', createdAt: stamp, updatedAt: stamp } })

  await page.goto('/lehrplan')
  await page.locator('.node-select').first().click()
  await expect(page.locator('.competency-choice')).toHaveCount(2)
  await page.getByRole('button', { name: 'Gespeicherte Reihe anlegen' }).click()
  await expect(page).toHaveURL(new RegExp(`/reihen\\?assignmentId=${assignmentId}`))
  await expect(page.locator('.reference-chip')).toContainText('Zentrale Inhalte Klassenstufen 7/8')
  await expect(page.locator('.competency-chip')).toHaveCount(2)
})

test('trennt Planungsablauf, Materialliste, digitalen Baukasten und Präsentation', async ({ page, request }) => {
  const plan = createPlan('Getrennte Arbeitsansichten')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}`)
  const navigation = page.getByRole('navigation', { name: 'Planungsabschnitte' })
  await expect(navigation.getByRole('button', { name: 'Verlaufsplan' })).toBeVisible()
  await expect(navigation.getByRole('button', { name: 'Material' })).toHaveCount(0)
  await expect(navigation.getByRole('button', { name: 'Präsentation' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Materialliste' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Digitaler Baukasten' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Präsentation' })).toBeVisible()
  await page.getByRole('button', { name: 'Digitaler Baukasten' }).click()
  await expect(page).toHaveURL(new RegExp(`/materialien\\?planId=${plan.id}`))
  await expect(page.getByRole('link', { name: '← Zum Verlaufsplan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Digitaler Baukasten für diese Planung' })).toBeVisible()
})

test('Mindmap bearbeiten, lokal speichern und auf dem Audience-Fenster zeigen', async ({ page, request, context }) => {
  const plan = createPlan('Mindmap Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)
  await expect(page.getByTitle('Mindmap')).toBeVisible()
  await page.getByTitle('Mindmap').click()
  await expect(page.locator('.map-node input')).toBeVisible()
  await page.locator('.map-node input').fill('Fotosynthese')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: '+ Unterast' }).click()
  await page.locator('.map-node input').fill('Voraussetzungen')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: '+ Geschwister' }).click()
  await page.locator('.map-node input').fill('Produkte')
  await page.locator('.map-node input').press('Enter')
  const mapNodePositions = await page.locator('.map-node').evaluateAll((nodes) => nodes.map((node) => ({
    root: node.classList.contains('root'),
    left: Number.parseFloat((node as HTMLElement).style.left),
  })))
  const rootPosition = mapNodePositions.find((node) => node.root)?.left ?? 50
  const branchPositions = mapNodePositions.filter((node) => !node.root).map((node) => node.left)
  expect(branchPositions.some((left) => left < rootPosition)).toBe(true)
  expect(branchPositions.some((left) => left > rootPosition)).toBe(true)
  await page.locator('.map-toolbar').getByRole('button', { name: '+', exact: true }).click()
  await expect(page.locator('.map-toolbar small')).toHaveText('110%')
  await page.getByRole('button', { name: 'Zentrieren' }).click()
  await expect(page.locator('.map-toolbar small')).toHaveText('100%')
  await page.getByRole('button', { name: 'Bearbeitung beenden' }).last().click()
  await page.getByRole('button', { name: '+ Folie' }).click()
  await page.locator('.thumb').first().click()
  await expect(page.locator('.map-node')).toContainText(['Fotosynthese', 'Voraussetzungen', 'Produkte'])
  await expect.poll(async () => {
    const response = await request.get(`/api/plans/${plan.id}`)
    const saved = await response.json()
    return saved.presentation?.slides?.[0]?.elements?.[0]?.content?.mindmap?.nodes?.length
  }).toBe(3)
  await page.reload()
  await expect(page.locator('.map-node')).toContainText(['Fotosynthese', 'Voraussetzungen', 'Produkte'])
  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Präsentieren' }).click()
  const audience = await popupPromise
  await expect(page.getByText('Presenter Console')).toBeVisible()
  await expect(page.locator('.speaker-notes')).toBeVisible()
  await expect(page.getByRole('toolbar', { name: 'Folienvorschau skalieren' })).toBeVisible()
  await expect(page.locator('.presenter-slide-stage .slide-design')).toHaveCSS('width', '1280px')
  await expect(page.locator('.presenter-slide-stage .slide-design')).toHaveCSS('height', '720px')
  await expect(audience.locator('.slide-design')).toHaveCSS('width', '1280px')
  await expect(audience.locator('.slide-design')).toHaveCSS('height', '720px')
  const presenterHeight = await page.evaluate(() => ({ client: document.documentElement.clientHeight, scroll: document.documentElement.scrollHeight }))
  expect(presenterHeight.scroll).toBeLessThanOrEqual(presenterHeight.client)
  const presenterStageBeforeScale = await page.locator('.presenter-slide-stage').boundingBox()
  await page.getByRole('button', { name: 'Folienvorschau verkleinern' }).click()
  const presenterStageAfterScale = await page.locator('.presenter-slide-stage').boundingBox()
  if (!presenterStageBeforeScale || !presenterStageAfterScale) throw new Error('Referenten-Folienvorschau ist nicht sichtbar')
  expect(presenterStageAfterScale.width).toBeLessThan(presenterStageBeforeScale.width)
  await expect(audience.locator('.map-node')).toContainText(['Fotosynthese', 'Voraussetzungen', 'Produkte'])
  await page.getByRole('button', { name: 'Mindmap bearbeiten' }).click()
  await expect(page.locator('.live-mindmap-panel .map-toolbar')).toBeVisible()
  await page.locator('.live-mindmap-panel').getByRole('button', { name: '+ Unterast' }).click()
  await page.locator('.live-mindmap-panel .map-node input').fill('Chlorophyll')
  await page.locator('.live-mindmap-panel .map-node input').press('Enter')
  await expect(audience.locator('.map-node')).toContainText(['Fotosynthese', 'Voraussetzungen', 'Produkte', 'Chlorophyll'])
  await page.getByRole('button', { name: 'Zur Folienvorschau' }).click()
  await page.getByRole('button', { name: 'Referentenansicht vergrößern' }).click()
  await page.getByRole('button', { name: 'Zoom im Plenum einschalten' }).click()
  await expect(audience.locator('.slide-content')).toHaveAttribute('style', /scale\(1\.25\)/)
  await page.locator('.presenter-slide-stage').hover()
  await page.mouse.wheel(0, -120)
  await expect(audience.locator('.slide-content')).toHaveAttribute('style', /scale\(1\.42\)/)
  await audience.locator('.audience-stage').hover()
  await audience.mouse.wheel(0, 120)
  await expect(page.locator('.presenter-slide-stage .slide-content')).toHaveAttribute('style', /scale\(1\.25\)/)
  await expect(page.getByRole('button', { name: 'Bildausschnitt nach links bewegen' })).toHaveCount(0)
  const panStage = await page.locator('.presenter-slide-stage').boundingBox()
  if (!panStage) throw new Error('Presenter-Folienfläche ist nicht sichtbar')
  await page.mouse.move(panStage.x + panStage.width * .45, panStage.y + panStage.height * .45)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(panStage.x + panStage.width * .67, panStage.y + panStage.height * .58, { steps: 8 })
  await page.mouse.up({ button: 'right' })
  await expect.poll(() => audience.locator('.slide-content').getAttribute('style')).not.toContain('translate(0%, 0%)')
  const presenterPanBeforeAudienceMove = await page.locator('.presenter-slide-stage .slide-content').getAttribute('style')
  const audiencePanStage = await audience.locator('.audience-stage').boundingBox()
  if (!audiencePanStage) throw new Error('Präsentationsfenster ist nicht sichtbar')
  await audience.mouse.move(audiencePanStage.x + audiencePanStage.width * .58, audiencePanStage.y + audiencePanStage.height * .55)
  await audience.mouse.down({ button: 'right' })
  await audience.mouse.move(audiencePanStage.x + audiencePanStage.width * .37, audiencePanStage.y + audiencePanStage.height * .43, { steps: 8 })
  await audience.mouse.up({ button: 'right' })
  await expect.poll(() => page.locator('.presenter-slide-stage .slide-content').getAttribute('style')).not.toBe(presenterPanBeforeAudienceMove)
  await page.getByRole('button', { name: 'Stift', exact: true }).click()
  const stage = await page.locator('.presenter-slide-stage').boundingBox()
  if (!stage) throw new Error('Presenter-Folienfläche ist nicht sichtbar')
  await page.mouse.move(stage.x + stage.width * 0.3, stage.y + stage.height * 0.35)
  await page.mouse.down()
  await page.mouse.move(stage.x + stage.width * 0.55, stage.y + stage.height * 0.45, { steps: 5 })
  await expect.poll(() => audience.locator('.presentation-ink-overlay path').count()).toBeGreaterThan(0)
  await page.mouse.up()
  console.log('Presenter ink paths:', await page.locator('.presentation-ink-overlay path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d'))))
  await expect.poll(() => audience.locator('.presentation-ink-overlay path').count()).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Leuchtstift' }).click()
  await page.getByLabel('Leuchtdauer in Sekunden').fill('1')
  await page.mouse.move(stage.x + stage.width * 0.35, stage.y + stage.height * 0.55)
  await page.mouse.down()
  await page.mouse.move(stage.x + stage.width * 0.6, stage.y + stage.height * 0.6, { steps: 5 })
  await page.mouse.up()
  await expect.poll(() => audience.locator('.presentation-ink-glow-segment').count()).toBeGreaterThan(0)
  await expect(audience.locator('.presentation-ink-overlay path')).toHaveCount(1, { timeout: 3000 })
  await page.getByRole('button', { name: 'Zoom im Plenum ausschalten' }).click()
  await expect(audience.locator('.slide-content')).toHaveAttribute('style', /scale\(1\)/)
  await expect.poll(async () => {
    const response = await request.get(`/api/plans/${plan.id}`)
    const saved = await response.json()
    return saved.presentation?.slides?.[0]?.elements?.[0]?.content?.mindmap?.nodes?.length
  }).toBe(4)
  await page.getByRole('button', { name: 'Nächste →' }).click()
  await expect(audience.getByText('Titel hinzufügen')).toBeVisible()
  await expect(audience.locator('.map-node')).toHaveCount(0)
  await page.getByRole('button', { name: '← Vorherige' }).click()
  await expect.poll(() => audience.locator('.presentation-ink-overlay path').count()).toBe(1)
  await page.getByRole('button', { name: 'Präsentationsfenster zeichnen: aus' }).click()
  await audience.getByRole('button', { name: 'Stift', exact: true }).click()
  const audienceStage = await audience.locator('.audience-stage').boundingBox()
  if (!audienceStage) throw new Error('Präsentationsfenster ist nicht sichtbar')
  await audience.mouse.move(audienceStage.x + audienceStage.width * 0.35, audienceStage.y + audienceStage.height * 0.3)
  await audience.mouse.down()
  await audience.mouse.move(audienceStage.x + audienceStage.width * 0.6, audienceStage.y + audienceStage.height * 0.4, { steps: 5 })
  await expect.poll(() => page.locator('.presentation-ink-overlay path').count()).toBe(2)
  await audience.mouse.up()
  await expect.poll(() => page.locator('.presentation-ink-overlay path').count()).toBe(2)
  await page.getByRole('button', { name: 'Zeichnungen dieser Folie löschen' }).click()
  await expect.poll(() => audience.locator('.presentation-ink-overlay path').count()).toBe(0)
  await page.getByRole('button', { name: 'Präsentation beenden' }).click()
  await expect(audience.getByText('Präsentation beendet.')).toBeVisible()
})

test('klappt Mindmap-Äste im Vortrag ein und synchronisiert sie live', async ({ page, request, context }) => {
  const plan = createPlan('Mindmap Collapse Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)
  await page.getByTitle('Mindmap').click()
  await page.locator('.map-node input').fill('Thema')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: '+ Unterast' }).click()
  await page.locator('.map-node input').fill('Ast')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: '+ Unterast' }).click()
  await page.locator('.map-node input').fill('Unterast')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: 'Bearbeitung beenden' }).last().click()

  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Präsentieren' }).click()
  const audience = await popupPromise
  await expect(audience.locator('.map-node')).toHaveCount(3)
  await page.getByRole('button', { name: 'Mindmap bearbeiten' }).click()
  const panel = page.locator('.live-mindmap-panel')
  await panel.getByRole('button', { name: 'Ast einklappen' }).last().click()
  await expect(audience.locator('.map-node')).toHaveCount(2)
  await expect.poll(async () => {
    const saved = await (await request.get(`/api/plans/${plan.id}`)).json()
    return saved.presentation.slides[0].elements[0].content.mindmap.nodes.find((node: { text: string }) => node.text === 'Ast')?.collapsed
  }).toBe(true)
  await panel.getByRole('button', { name: 'Ast aufklappen' }).click()
  await expect(audience.locator('.map-node')).toHaveCount(3)
})

test('kopiert Mindmap-Äste mit Unterästen und speichert neue Knoten-IDs', async ({ page, request }) => {
  const plan = createPlan('Mindmap Zwischenablage Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)
  await page.getByTitle('Mindmap').click()
  await page.locator('.map-node input').fill('Thema')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: '+ Unterast' }).click()
  await page.locator('.map-node input').fill('Quelle')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: '+ Unterast' }).click()
  await page.locator('.map-node input').fill('Autor')
  await page.locator('.map-node input').press('Enter')

  await page.locator('.map-node', { hasText: 'Quelle' }).click()
  await page.getByRole('button', { name: 'Ast kopieren' }).click()
  await page.locator('.map-node', { hasText: 'Thema' }).click()
  await page.getByRole('button', { name: 'Ast einfügen' }).click()
  await expect(page.locator('.map-node')).toHaveCount(5)
  await expect.poll(async () => {
    const saved = await (await request.get(`/api/plans/${plan.id}`)).json()
    const nodes = saved.presentation?.slides?.[0]?.elements?.[0]?.content?.mindmap?.nodes as Array<{ id: string; parentId: string | null; text: string }> | undefined
    if (!nodes) return undefined
    const root = nodes.find((node) => node.parentId === null)!
    return { unique: new Set(nodes.map((node) => node.id)).size === nodes.length, rootChildren: nodes.filter((node) => node.parentId === root.id).map((node) => node.text).sort(), nodeCount: nodes.length }
  }).toEqual({ unique: true, rootChildren: ['Quelle', 'Quelle'], nodeCount: 5 })
  await page.reload()
  await expect(page.locator('.map-node')).toHaveCount(5)
})

test('exportiert eine Mindmap als SVG, PNG und PDF', async ({ page, request }) => {
  const plan = createPlan('Mindmap Export Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)
  await page.getByTitle('Mindmap').click()

  const svgDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Mindmap als SVG exportieren' }).click()
  const svg = await svgDownload
  expect(svg.suggestedFilename()).toBe('Thema_Mindmap.svg')
  expect((await readFile((await svg.path())!)).toString('utf8')).toContain('<svg')

  const pngDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Mindmap als PNG exportieren' }).click()
  expect((await pngDownload).suggestedFilename()).toBe('Thema_Mindmap.png')

  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Mindmap als PDF exportieren' }).click()
  const pdf = await pdfDownload
  expect(pdf.suggestedFilename()).toBe('Thema_Mindmap.pdf')
  expect((await readFile((await pdf.path())!)).subarray(0, 5).toString()).toBe('%PDF-')
})

test('speichert Presenter-Zeichenpräferenzen im Präsentations-Payload', async ({ page, request, context }) => {
  const plan = createPlan('Presenter Einstellungen Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)
  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Präsentieren' }).click()
  await popupPromise

  await page.locator('input[type="color"][aria-label="Stiftfarbe"]').evaluate((input, value) => { const color = input as HTMLInputElement; color.value = value as string; color.dispatchEvent(new Event('input', { bubbles: true })); color.dispatchEvent(new Event('change', { bubbles: true })) }, '#1769d2')
  await page.getByLabel('Stiftbreite').evaluate((input, value) => { const width = input as HTMLInputElement; width.value = value as string; width.dispatchEvent(new Event('input', { bubbles: true })); width.dispatchEvent(new Event('change', { bubbles: true })) }, '11')
  await page.getByRole('button', { name: 'Leuchtstift' }).click()
  await page.getByLabel('Leuchtdauer in Sekunden').evaluate((input, value) => { const seconds = input as HTMLInputElement; seconds.value = value as string; seconds.dispatchEvent(new Event('input', { bubbles: true })); seconds.dispatchEvent(new Event('change', { bubbles: true })) }, '12')

  await expect.poll(async () => (await (await request.get(`/api/plans/${plan.id}`)).json()).presentation?.settings).toEqual({ inkColor: '#1769d2', penWidth: 11, highlighterSeconds: 12 })
})

test('legt eine Präsentationsvorlage sicher an und speichert ihre Folienstruktur', async ({ page, request, context }) => {
  const plan = createPlan('Vorlagen Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)

  await page.locator('.properties nav').getByRole('button', { name: 'Design' }).click()
  await page.getByRole('button', { name: 'Quellenarbeit starten' }).click()
  await expect(page.getByText('Vorlagen sind gesperrt, damit vorhandene Folien und Einstiegspunkte unverändert bleiben.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Quellenarbeit starten' })).toBeDisabled()
  await expect.poll(async () => {
    const saved = await (await request.get(`/api/plans/${plan.id}`)).json()
    return { templateId: saved.presentation?.templateId, themeId: saved.presentation?.themeId, titles: saved.presentation?.slides?.map((slide: { title: string }) => slide.title) }
  }).toEqual({ templateId: 'quellenarbeit', themeId: 'arbeitsblatt', titles: ['Quellenarbeit', 'Quelle im Fokus', 'Auswertung', 'Ertrag sichern'] })

  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Präsentieren' }).click()
  const audience = await popupPromise
  await expect(audience.getByText('Quellenarbeit')).toBeVisible()
})

test('erstellt einen Zeitstrahl, bearbeitet Ereignisse und zeigt ihn im Präsentationsfenster', async ({ page, request, context }) => {
  const plan = createPlan('Zeitstrahl Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)

  await page.getByTitle('Zeitstrahl').click()
  await expect(page.locator('.timeline-widget')).toBeVisible()
  await expect(page.locator('.timeline-edit-card')).toHaveCount(3)
  await page.locator('.timeline-tools').getByRole('button', { name: '+ Ereignis' }).click()
  await expect(page.locator('.timeline-edit-card')).toHaveCount(4)
  await page.locator('.timeline-title').nth(1).fill('Auftakt')
  await page.locator('.timeline-title').nth(1).press('Enter')
  await page.locator('.timeline-tools').getByRole('button', { name: 'Bearbeitung beenden' }).click()

  await expect.poll(async () => {
    const response = await request.get(`/api/plans/${plan.id}`)
    const saved = await response.json()
    return saved.presentation?.slides?.[0]?.elements?.[0]?.content?.timeline?.entries?.map((entry: { title: string }) => entry.title)
  }).toContain('Auftakt')
  await page.reload()
  await expect(page.locator('.timeline-widget')).toContainText('Auftakt')

  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Präsentieren' }).click()
  const audience = await popupPromise
  await expect(audience.locator('.timeline-widget')).toContainText('Auftakt')
  await page.getByRole('button', { name: 'Zeitstrahl bearbeiten' }).click()
  await expect(page.locator('.live-timeline-panel')).toBeVisible()
  await page.locator('.live-timeline-panel .timeline-date').first().fill('476 v. Chr.')
  await expect(audience.locator('.timeline-widget')).toContainText('476 v. Chr.')
  await page.locator('.live-timeline-panel .timeline-tools').getByRole('button', { name: '+ Ereignis' }).click()
  await expect(audience.locator('.timeline-entry')).toHaveCount(5)
})

test('speichert Widget-Vorlagen und Farbsets und rendert sie im Präsentationsfenster', async ({ page, request, context }) => {
  const plan = createPlan('Widget-Design Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)

  await page.getByTitle('Mindmap').click()
  await page.locator('.mindmap-properties').getByRole('button', { name: 'Tafel', exact: true }).click()
  await page.locator('.mindmap-properties').getByLabel('Farbset').selectOption('wald')
  await page.locator('.mindmap-properties').getByRole('button', { name: 'Bearbeitung beenden' }).click()

  await page.getByTitle('Zeitstrahl').click()
  await page.locator('.timeline-composer').getByRole('button', { name: 'Museum', exact: true }).click()
  await page.locator('.timeline-composer').getByLabel('Farbset Violett').click()
  await page.locator('.timeline-tools').getByRole('button', { name: 'Bearbeitung beenden' }).click()

  await page.getByTitle('Abstimmung').click()
  await page.locator('.poll-composer').getByRole('button', { name: 'Podium', exact: true }).click()
  await page.locator('.poll-composer').getByLabel('Farbset Sonnenuntergang').click()
  await page.locator('.poll-tools').getByRole('button', { name: 'Bearbeitung beenden' }).click()

  await expect.poll(async () => {
    const saved = await (await request.get(`/api/plans/${plan.id}`)).json()
    return saved.presentation.slides[0].elements.map((element: { type: string; content: { mindmap?: { settings: { design: string; colorSet: string } }; timeline?: { template: string; colorSet: string }; poll?: { template: string; colorSet: string } } }) => ({ type: element.type, settings: element.content.mindmap?.settings, template: element.content.timeline?.template ?? element.content.poll?.template, colorSet: element.content.timeline?.colorSet ?? element.content.poll?.colorSet }))
  }).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'mindmap', settings: expect.objectContaining({ design: 'tafel', colorSet: 'wald' }) }),
    { type: 'timeline', settings: undefined, template: 'museum', colorSet: 'violett' },
    { type: 'poll', settings: undefined, template: 'podium', colorSet: 'sonnenuntergang' },
  ]))

  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Präsentieren' }).click()
  const audience = await popupPromise
  await expect(audience.locator('.mindmap-widget.tafel')).toHaveCount(1)
  await expect(audience.locator('.timeline-widget.template-museum')).toHaveCount(1)
  await expect(audience.locator('.poll-widget.template-podium')).toHaveCount(1)
  await expect(audience.locator('.mindmap-widget')).toHaveCSS('--widget-accent', '#4e9a6a')
  await expect(audience.locator('.timeline-widget')).toHaveCSS('--widget-accent', '#8b6be8')
  await expect(audience.locator('.poll-widget')).toHaveCSS('--widget-accent', '#f06b4f')
})

test('speichert lokale Bild- und Videokopien in SQLite und akzeptiert externe Medien-URLs', async ({ page, request }) => {
  const plan = createPlan('Medien Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)

  await page.getByTitle('Bild').click()
  await page.getByPlaceholder('Bild-URL (https://…)').fill('https://example.test/wald.jpg')
  await page.getByRole('button', { name: 'URL einfügen' }).click()
  await expect(page.locator('.slide-element.image img')).toHaveAttribute('src', 'https://example.test/wald.jpg')
  await page.getByTitle('Bild').click()
  await page.locator('.toolbar .image-picker').getByLabel('Bilddatei als Kopie auswählen').setInputFiles({ name: 'wald.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) })
  await expect(page.locator('.slide-element.image img')).toHaveCount(2)
  const copiedImage = await page.locator('.slide-element.image img').last().getAttribute('src')
  expect(copiedImage).toMatch(/^\/api\/presentation-media\//)
  const copiedImageResponse = await request.get(copiedImage!)
  expect(copiedImageResponse.headers()['content-type']).toBe('image/png')
  expect(await copiedImageResponse.body()).toEqual(Buffer.from([137, 80, 78, 71]))

  await page.getByTitle('Video').click()
  await page.getByPlaceholder('Video-URL (https://…)').fill('https://example.test/erklaerung.mp4')
  await page.getByRole('button', { name: 'URL einfügen' }).click()
  await expect(page.locator('.slide-element.video video')).toHaveAttribute('src', 'https://example.test/erklaerung.mp4')
  await page.getByTitle('Video').click()
  await page.locator('.toolbar .image-picker').getByLabel('Videodatei als Kopie auswählen').setInputFiles({ name: 'erklaerung.mp4', mimeType: 'video/mp4', buffer: Buffer.from([0, 0, 0, 24]) })
  await expect(page.locator('.slide-element.video video')).toHaveCount(2)
  const copiedVideo = await page.locator('.slide-element.video video').last().getAttribute('src')
  expect(copiedVideo).toMatch(/^\/api\/presentation-media\//)
  expect((await request.get(copiedVideo!)).headers()['content-type']).toBe('video/mp4')
  await expect.poll(async () => (await (await request.get(`/api/plans/${plan.id}`)).json()).presentation.slides[0].elements.map((element: { type: string; content: { src?: string } }) => ({ type: element.type, src: element.content.src }))).toEqual(expect.arrayContaining([{ type: 'image', src: 'https://example.test/wald.jpg' }, { type: 'video', src: 'https://example.test/erklaerung.mp4' }, { type: 'image', src: copiedImage }, { type: 'video', src: copiedVideo }]))
})

test('sammelt Abstimmungs-Klicks im Plenum und zeigt das Ergebnis erst nach Freigabe', async ({ page, request, context }) => {
  const plan = createPlan('Abstimmung Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)
  await page.getByTitle('Abstimmung').click()
  await page.getByRole('button', { name: 'Bearbeitung beenden' }).click()
  await expect.poll(async () => (await (await request.get(`/api/plans/${plan.id}`)).json()).presentation?.slides?.[0]?.elements?.[0]?.type).toBe('poll')

  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Präsentieren' }).click()
  const audience = await popupPromise
  await audience.getByRole('button', { name: 'Ja' }).click()
  await expect(page.locator('.presenter-poll-preview')).toContainText('1 Stimme')
  await expect(page.locator('.presenter-poll-preview .presenter-poll-bar').first()).toContainText('1 Stimme · 100 %')
  await expect(page.locator('.presenter-poll-preview .presenter-poll-bar-track i').first()).toHaveAttribute('style', /width: 100%/)
  await expect(audience.locator('.vote-total')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ergebnis anzeigen' }).click()
  await expect(audience.locator('.vote-total')).toHaveText('1 Stimme')
  await expect(audience.locator('.poll-result').first()).toContainText('100 %')
})

test('exportiert alle Folien als selbstständiges HTML und als PDF', async ({ page, request, context }) => {
  test.setTimeout(60_000)
  const plan = createPlan('Export Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)
  await page.getByTitle('Mindmap').click()
  await page.locator('.map-node input').fill('Fotosynthese')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: 'Bearbeitung beenden' }).last().click()
  await page.getByRole('button', { name: '+ Folie' }).click()

  const htmlDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'HTML exportieren' }).click()
  const htmlFile = await htmlDownload
  expect(htmlFile.suggestedFilename()).toMatch(/\.html$/)
  const html = await readFile(await htmlFile.path(), 'utf8')
  expect(html).toContain('data:image/png;base64,')
  const htmlPage = await context.newPage()
  await htmlPage.setContent(html)
  await expect(htmlPage.getByText('Folie 1 / 2')).toBeVisible()
  await htmlPage.getByRole('button', { name: 'Nächste Folie' }).click()
  await expect(htmlPage.getByText('Folie 2 / 2')).toBeVisible()
  await htmlPage.close()

  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF exportieren' }).click()
  const pdfFile = await pdfDownload
  expect(pdfFile.suggestedFilename()).toMatch(/\.pdf$/)
  const pdfPath = await pdfFile.path()
  const pdf = await PDFDocument.load(await readFile(pdfPath))
  expect(pdf.getPageCount()).toBe(2)
  expect(pdf.getPage(0).getSize()).toMatchObject({ width: 960, height: 540 })
  await copyFile(pdfPath, 'test-results/presentation-export.pdf')
})
