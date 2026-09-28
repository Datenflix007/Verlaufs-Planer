import { z } from 'zod'
import type { WorkshopPlan } from '../domain/types'
import { CURRENT_SCHEMA_VERSION } from '../domain/types'

const RichTextNodeSchema: z.ZodType = z.lazy(() => z.object({
  type: z.string().min(1), text: z.string().optional(), attrs: z.record(z.string(), z.unknown()).optional(),
  marks: z.array(z.object({ type: z.string(), attrs: z.record(z.string(), z.unknown()).optional() })).optional(),
  content: z.array(RichTextNodeSchema).optional(),
}))
export const RichTextDocumentSchema = z.object({ type: z.literal('doc'), content: z.array(RichTextNodeSchema) })
const IdSchema = z.string().uuid()
const MindmapNodeSchema = z.object({
  id: IdSchema, parentId: IdSchema.nullable(), text: z.string(), level: z.number().int().nonnegative(), order: z.number().int().nonnegative(),
  x: z.number().optional(), y: z.number().optional(), collapsed: z.boolean().optional(),
  style: z.object({ backgroundColor: z.string().optional(), textColor: z.string().optional(), fontSize: z.number().positive().optional(), fontWeight: z.number().optional(), borderColor: z.string().optional(), borderWidth: z.number().nonnegative().optional(), borderRadius: z.number().nonnegative().optional(), branchColor: z.string().optional() }),
  image: z.object({ source: z.string(), fit: z.enum(['contain', 'cover', 'fill']) }).optional(),
})
const MindmapEdgeSchema = z.object({ id: IdSchema, sourceNodeId: IdSchema, targetNodeId: IdSchema, style: z.object({ color: z.string().optional(), width: z.number().positive().optional(), curve: z.enum(['smooth', 'straight']).optional() }) })
const MindmapWidgetSchema = z.object({
  id: IdSchema, rootNodeId: IdSchema, nodes: z.array(MindmapNodeSchema).min(1), edges: z.array(MindmapEdgeSchema),
  settings: z.object({ layout: z.enum(['horizontal', 'radial']), autoLayout: z.boolean(), spacingX: z.number().positive(), spacingY: z.number().positive(), branchColors: z.boolean(), design: z.enum(['schlicht', 'organisch', 'tafel', 'neon', 'pastell']) }),
}).superRefine((mindmap, ctx) => {
  const nodes = new Map(mindmap.nodes.map((node) => [node.id, node]))
  if (nodes.size !== mindmap.nodes.length || !nodes.has(mindmap.rootNodeId) || nodes.get(mindmap.rootNodeId)?.parentId !== null) ctx.addIssue({ code: 'custom', message: 'Ungültiger Mindmap-Wurzelknoten.' })
  for (const node of mindmap.nodes) {
    if (node.id !== mindmap.rootNodeId && (!node.parentId || !nodes.has(node.parentId))) ctx.addIssue({ code: 'custom', message: 'Mindmap-Knoten ohne gültigen Elternknoten.' })
    const visited = new Set<string>(); let current = node
    while (current.parentId) { if (visited.has(current.id)) { ctx.addIssue({ code: 'custom', message: 'Zyklus in der Mindmap.' }); break } visited.add(current.id); const parent = nodes.get(current.parentId); if (!parent) break; current = parent }
  }
  if (mindmap.edges.length !== mindmap.nodes.length - 1 || new Set(mindmap.edges.map((edge) => edge.id)).size !== mindmap.edges.length || new Set(mindmap.edges.map((edge) => edge.targetNodeId)).size !== mindmap.edges.length || mindmap.edges.some((edge) => nodes.get(edge.targetNodeId)?.parentId !== edge.sourceNodeId)) ctx.addIssue({ code: 'custom', message: 'Ungültige Mindmap-Verbindung.' })
})
const PresentationElementSchema = z.object({
  id: IdSchema, type: z.enum(['text', 'image', 'shape', 'icon', 'mindmap']), x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive(), rotation: z.number(), zIndex: z.number().int(),
  style: z.object({ color: z.string().optional(), backgroundColor: z.string().optional(), fontSize: z.number().positive().optional(), fontFamily: z.string().optional(), fontWeight: z.number().optional(), fontStyle: z.enum(['normal', 'italic']).optional(), textDecoration: z.enum(['none', 'underline']).optional(), textAlign: z.enum(['left', 'center', 'right']).optional(), lineHeight: z.number().positive().optional(), letterSpacing: z.number().optional(), opacity: z.number().min(0).max(1).optional(), borderRadius: z.number().nonnegative().optional(), stroke: z.string().optional(), strokeWidth: z.number().nonnegative().optional(), objectFit: z.enum(['contain', 'cover', 'fill']).optional(), locked: z.boolean().optional() }),
  content: z.object({ text: z.string().optional(), src: z.string().optional(), shape: z.enum(['rectangle', 'roundedRectangle', 'ellipse', 'line', 'arrow']).optional(), icon: z.string().optional(), mindmap: MindmapWidgetSchema.optional() }), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
}).superRefine((element, ctx) => { if (element.type === 'mindmap' && !element.content.mindmap) ctx.addIssue({ code: 'custom', message: 'Mindmap-Element ohne Datenmodell.' }) })
const PresentationSlideSchema = z.object({
  id: IdSchema, position: z.number().int().nonnegative(), title: z.string().optional(), layoutType: z.enum(['blank', 'title', 'titleContent', 'twoColumn', 'imageText', 'section', 'closing']), background: z.object({ color: z.string().optional(), imageUrl: z.string().optional(), imageFit: z.enum(['contain', 'cover', 'fill']).optional() }), notes: z.string(), transition: z.object({ type: z.enum(['none', 'fade', 'slide']), duration: z.union([z.literal(200), z.literal(400), z.literal(700)]) }), elements: z.array(PresentationElementSchema), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
})
const PresentationSchema = z.object({
  id: IdSchema, planId: IdSchema, title: z.string(), themeId: z.enum(['schlicht', 'tafelstil', 'neon', 'arbeitsblatt', 'natur']), templateId: z.string().optional(), slides: z.array(PresentationSlideSchema), recentColors: z.array(z.string()).max(12).optional(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
})
const PresentationEntryPointSchema = z.object({ id: IdSchema, slideId: IdSchema, label: z.string().optional(), createdAt: z.string().datetime() })

export const WorkshopPlanSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION), id: IdSchema,
  metadata: z.object({ title: z.string().min(1), subtitle: z.string().optional(), subject: z.string().optional(), targetGroup: z.string().optional(), institution: z.string().optional(), location: z.string().optional(), buildingId: z.string().uuid().optional(), roomId: z.string().uuid().optional(), authors: z.array(z.string()), description: z.string().optional() }),
  days: z.array(z.object({ id: IdSchema, date: z.string().date(), title: z.string().optional(), startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).optional() })).min(1),
  learningObjectives: z.array(z.object({ id: IdSchema, text: z.string(), level: z.string().optional(), competencyIds: z.array(z.string()) })),
  competencies: z.array(z.object({ id: IdSchema, catalogId: z.string(), competencyId: z.string(), note: z.string().optional() })),
  contentAnalysis: RichTextDocumentSchema, didacticAnalysis: RichTextDocumentSchema,
  schedule: z.array(z.object({ id: IdSchema, dayId: IdSchema, startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), durationMinutes: z.number().int().nonnegative().optional(), type: z.enum(['phase', 'break']), phase: z.string().optional(), title: z.string().optional(), content: RichTextDocumentSchema.optional(), objective: RichTextDocumentSchema.optional(), teacherActivity: RichTextDocumentSchema.optional(), participantActivity: RichTextDocumentSchema.optional(), method: z.string().optional(), socialForm: z.string().optional(), materialIds: z.array(IdSchema), notes: RichTextDocumentSchema.optional(), presentationEntryPoint: PresentationEntryPointSchema.optional() })),
  materials: z.array(z.object({ id: IdSchema, name: z.string().min(1), quantity: z.string().optional(), description: z.string().optional(), category: z.string().optional(), resourceType: z.enum(['physical', 'file', 'worksheet', 'link', 'interactive-html']), inventoryMaterialId: z.string().uuid().optional() })),
  presentation: PresentationSchema.optional(),
  settings: z.object({ scheduleLayoutId: z.string().min(1), timeDisplay: z.enum(['start', 'duration']).default('start'), phaseModelId: z.string().optional(), templateId: z.string().min(1).optional(), enabledCompetencyFrameworkIds: z.array(z.string().min(1)).default([]) }), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
})

export function migratePlan(input: unknown): WorkshopPlan {
  if (!input || typeof input !== 'object') throw new Error('Die Datei enthält kein Planungsprojekt.')
  const version = (input as { schemaVersion?: unknown }).schemaVersion
  if (version === CURRENT_SCHEMA_VERSION) return WorkshopPlanSchema.parse(input) as WorkshopPlan
  if (version === 0 || version === 1 || version === 2 || version === undefined) {
    const legacy = input as Record<string, unknown>
    const presentation = legacy.presentation as Record<string, unknown> | undefined
    const slides = Array.isArray(presentation?.slides) ? presentation.slides.map((item) => {
      const slide = item as Record<string, unknown>
      return { ...slide, layoutType: slide.layoutType === 'title' || slide.layoutType === 'blank' ? slide.layoutType : 'blank', background: { ...(slide.background as Record<string, unknown> | undefined), imageFit: (slide.background as { imageFit?: string } | undefined)?.imageFit ?? 'cover' }, transition: typeof slide.transition === 'string' ? { type: slide.transition, duration: 400 } : slide.transition ?? { type: 'fade', duration: 400 }, elements: Array.isArray(slide.elements) ? slide.elements.map((element) => { const value = element as Record<string, unknown>; const content = value.content as Record<string, unknown> | undefined; return { ...value, type: value.type ?? 'text', style: { ...(value.style as Record<string, unknown> | undefined), opacity: (value.style as { opacity?: number } | undefined)?.opacity ?? 1 }, content: { ...content, shape: content?.shape === 'circle' ? 'ellipse' : content?.shape } } }) : [] }
    }) : undefined
    return WorkshopPlanSchema.parse({ ...legacy, schemaVersion: CURRENT_SCHEMA_VERSION, presentation: presentation ? { ...presentation, slides } : undefined, settings: { ...(legacy.settings as Record<string, unknown> | undefined), scheduleLayoutId: (legacy.settings as { scheduleLayoutId?: string } | undefined)?.scheduleLayoutId ?? 'workshop', enabledCompetencyFrameworkIds: (legacy.settings as { enabledCompetencyFrameworkIds?: string[] } | undefined)?.enabledCompetencyFrameworkIds ?? [] } }) as WorkshopPlan
  }
  throw new Error(`Schema-Version ${String(version)} wird noch nicht unterstützt.`)
}
