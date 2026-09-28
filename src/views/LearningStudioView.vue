<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createId, richTextFromPlain } from '../domain/factories'
import type { DigitalLearningMaterial, LearningBlock, LearningBlockType, LearningConnection, RichTextDocument, RichTextNode, WorkshopPlan } from '../domain/types'
import RichTextEditor from '../components/editor/RichTextEditor.vue'
import { LearningMaterialRepository } from '../repositories/LearningMaterialRepository'
import { SqlitePlanRepository } from '../repositories/SqlitePlanRepository'
import type { PlanSummary } from '../repositories/PlanRepository'

const route = useRoute()
const router = useRouter()
const props = defineProps<{ planId?: string; embedded?: boolean }>()
const emit = defineEmits<{ exitPlan: [] }>()
const repository = new LearningMaterialRepository()
const planRepository = new SqlitePlanRepository()
const materials = ref<DigitalLearningMaterial[]>([])
const plans = ref<PlanSummary[]>([])
const linkedPlan = ref<WorkshopPlan>()
const material = ref<DigitalLearningMaterial>()
const error = ref('')
const status = ref('')
const activeTab = ref<'flow' | 'materials'>('flow')
const presentation = ref(false)
const presentationIndex = ref(0)
const liveSession = ref(false)
const remoteConflict = ref(false)
const dirty = ref(false)
const connectionFrom = ref<string>()
const presentationAnswer = ref('')
const composerOpen = ref(false)
const composerBlockId = ref('')
const composerSection = ref('Abschnitt 1')
const canvas = ref<HTMLElement>()
const dragging = ref<{ id: string; offsetX: number; offsetY: number }>()
let saveTimer: ReturnType<typeof setTimeout> | undefined
let liveTimer: ReturnType<typeof setInterval> | undefined
let lastRemoteUpdate = ''
let applyingRemote = false

const blockTypes: Array<{ type: LearningBlockType; title: string; icon: string; color: string }> = [
  { type: 'text', title: 'Text & Impuls', icon: 'T', color: 'teal' },
  { type: 'question', title: 'Frage', icon: '?', color: 'blue' },
  { type: 'mindmap', title: 'Mindmap', icon: '✳', color: 'violet' },
  { type: 'task', title: 'Arbeitsauftrag', icon: '✓', color: 'amber' },
  { type: 'media', title: 'Material / Link', icon: '▧', color: 'green' },
]
const kindLabels: Record<DigitalLearningMaterial['kind'], string> = {
  presentation: 'Präsentation', worksheet: 'Digitales Arbeitsblatt', mindmap: 'Mindmap', 'lesson-flow': 'Stundenablauf',
}
const emptyBlock: LearningBlock = { id: '', type: 'text', title: '', content: '', x: 0, y: 0, width: 0, height: 0 }
const currentBlock = computed(() => material.value?.blocks[presentationIndex.value] ?? emptyBlock)
const canvasWidth = computed(() => Math.max(1500, ...((material.value?.blocks ?? []).map((block) => block.x + block.width + 140))))
const canvasHeight = computed(() => Math.max(860, ...((material.value?.blocks ?? []).map((block) => block.y + block.height + 140))))
const sortedBlocks = computed(() => [...(material.value?.blocks ?? [])].sort((left, right) => left.y - right.y || left.x - right.x))
const flowBlocks = computed(() => sortedBlocks.value.filter((block) => block.type !== 'media'))
const resourceBlocks = computed(() => sortedBlocks.value.filter((block) => block.type === 'media'))
const composerBlock = computed(() => material.value?.blocks.find((block) => block.id === composerBlockId.value))
const composerSections = computed(() => [...new Set((material.value?.blocks ?? []).map((block) => block.section || 'Abschnitt 1'))])
const composerBlocks = computed(() => material.value?.blocks.filter((block) => material.value?.kind !== 'presentation' || (block.section || 'Abschnitt 1') === composerSection.value) ?? [])

function blockTone(block: LearningBlock, index: number): string {
  if (block.type === 'media') return 'resource'
  if (block.type === 'mindmap') return 'violet'
  if (block.type === 'question') return 'blue'
  if (block.type === 'task') return ['amber', 'violet', 'teal'][index % 3]
  return ['teal', 'blue', 'amber', 'violet'][index % 4]
}
function focusBlock(id: string): void {
  canvas.value?.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
}
const planPhases = computed(() => (linkedPlan.value?.schedule ?? []).filter((entry) => entry.type === 'phase'))
function phaseTitle(index: number, block: LearningBlock): string { return planPhases.value[index]?.phase ?? blockTypes.find((item) => item.type === block.type)?.title ?? 'Lernphase' }
function phaseDuration(index: number): string {
  const phase = planPhases.value[index]
  if (phase?.durationMinutes) return `${phase.durationMinutes} Min.`
  if (phase?.startTime && phase.endTime) return `${phase.startTime} - ${phase.endTime}`
  return 'Offen'
}

function makeBlock(type: LearningBlockType, index: number): LearningBlock {
  const preset = blockTypes.find((item) => item.type === type)!
  const defaults: Record<LearningBlockType, { title: string; content: string }> = {
    text: { title: 'Lernimpuls', content: 'Eine kurze Erklärung oder ein Einstieg für die Lernenden.' },
    question: { title: 'Denkfrage', content: 'Welche Beobachtung könnt ihr erklären?' },
    mindmap: { title: 'Gemeinsame Mindmap', content: 'Ideen hier sammeln und mit Pfeilen verbinden.' },
    task: { title: 'Arbeitsauftrag', content: 'Bearbeitet den Auftrag in Partnerarbeit.' },
    media: { title: 'Material', content: 'https:// oder Beschreibung des Materials' },
  }
  return { id: createId(), type, title: defaults[type].title, content: defaults[type].content, richContent: richTextFromPlain(defaults[type].content), section: 'Abschnitt 1', x: 80 + (index % 3) * 390, y: 90 + Math.floor(index / 3) * 310, width: 330, height: 240 }
}

function createMaterial(kind: DigitalLearningMaterial['kind']): DigitalLearningMaterial {
  const now = new Date().toISOString()
  const titles: Record<DigitalLearningMaterial['kind'], string> = {
    presentation: 'Neue Präsentation', worksheet: 'Neues Arbeitsblatt', mindmap: 'Neue Mindmap', 'lesson-flow': 'Neuer Stundenablauf',
  }
  const firstType: LearningBlockType = kind === 'mindmap' ? 'mindmap' : kind === 'lesson-flow' ? 'task' : 'text'
  const blocks = [makeBlock(firstType, 0)]
  if (kind === 'presentation') blocks.push(makeBlock('question', 1))
  return { id: createId(), title: titles[kind], description: '', kind, blocks, connections: [], createdAt: now, updatedAt: now }
}

async function openNew(kind: DigitalLearningMaterial['kind']): Promise<void> {
  const created = createMaterial(kind)
  created.planId = props.planId
  try {
    await repository.save(created)
    if (props.embedded) {
      material.value = created
      activeTab.value = 'flow'
      await loadCollection()
    } else {
      await router.push({ name: 'learning-material-edit', params: { id: created.id } })
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Material konnte nicht angelegt werden.'
  }
}

async function loadCollection(): Promise<void> {
  try {
    const savedMaterials = await repository.list()
    materials.value = props.embedded && props.planId ? savedMaterials.filter((item) => item.planId === props.planId) : savedMaterials
    plans.value = await planRepository.list()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Materialbibliothek konnte nicht geladen werden.'
  }
}

async function loadMaterial(): Promise<void> {
  const id = props.embedded ? String(route.query.digitalMaterial ?? '') : route.params.id ? String(route.params.id) : ''
  if (!id) {
    material.value = undefined
    await loadCollection()
    if (props.embedded && materials.value.length) {
      const firstMaterial = materials.value.find((item) => item.kind === 'lesson-flow') ?? materials.value[0]
      await openMaterial(firstMaterial)
    }
    return
  }
  try {
    const loaded = await repository.get(id)
    if (!loaded) {
      error.value = 'Dieses Lernmaterial wurde nicht gefunden.'
      material.value = undefined
      return
    }
    material.value = loaded
    linkedPlan.value = loaded.planId ? await planRepository.get(loaded.planId) : undefined
    if (presentation.value && loaded.activeBlockId) {
      const activeIndex = loaded.blocks.findIndex((block) => block.id === loaded.activeBlockId)
      if (activeIndex >= 0) presentationIndex.value = activeIndex
    }
    lastRemoteUpdate = loaded.updatedAt
    liveSession.value = !props.embedded && route.query.live === '1'
    await Promise.all([loadCollection()])
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Lernmaterial konnte nicht geladen werden.'
  }
}

function queueSave(): void {
  if (applyingRemote || !material.value) return
  dirty.value = true
  status.value = 'Änderungen ausstehend'
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void saveNow(), 500)
}

async function saveNow(): Promise<void> {
  if (!material.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = undefined
  const snapshot = structuredClone(material.value)
  try {
    await repository.save(snapshot)
    const saved = await repository.get(snapshot.id)
    if (saved && material.value?.id === snapshot.id) {
      material.value.updatedAt = saved.updatedAt
      lastRemoteUpdate = saved.updatedAt
    }
    dirty.value = false
    remoteConflict.value = false
    status.value = 'Gespeichert'
    if (props.embedded || !route.params.id) await loadCollection()
  } catch (cause) {
    status.value = cause instanceof Error ? cause.message : 'Speichern fehlgeschlagen.'
  }
}

function addBlock(type: LearningBlockType): void {
  if (!material.value) return
  const block = makeBlock(type, material.value.blocks.length)
  if (material.value.kind === 'presentation') block.section = composerSection.value
  material.value.blocks.push(block)
  queueSave()
}

function plainText(document: RichTextDocument): string {
  const parts: string[] = []
  const visit = (node: RichTextNode): void => { if (node.text) parts.push(node.text); node.content?.forEach((child) => visit(child)) }
  visit(document)
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
function openComposer(blockId?: string): void {
  if (!material.value) return
  material.value.blocks.forEach((block) => { block.richContent ??= richTextFromPlain(block.content); block.section ??= 'Abschnitt 1' })
  composerBlockId.value = blockId ?? material.value.blocks[0]?.id ?? ''
  composerSection.value = material.value.blocks.find((block) => block.id === composerBlockId.value)?.section ?? 'Abschnitt 1'
  composerOpen.value = true
}
function selectComposerBlock(block: LearningBlock): void { composerBlockId.value = block.id; composerSection.value = block.section ?? 'Abschnitt 1' }
function addComposerBlock(): void {
  if (!material.value) return
  const type: LearningBlockType = material.value.kind === 'mindmap' ? 'mindmap' : material.value.kind === 'worksheet' ? 'question' : 'text'
  addBlock(type)
  const created = material.value.blocks.at(-1)
  if (created) selectComposerBlock(created)
}
function addComposerSection(): void {
  const next = `Abschnitt ${composerSections.value.length + 1}`
  composerSection.value = next
  addComposerBlock()
}
function updateComposerContent(value: RichTextDocument): void {
  if (!composerBlock.value) return
  composerBlock.value.richContent = value
  composerBlock.value.content = plainText(value) || composerBlock.value.content
  queueSave()
}
function moveComposerBlock(direction: number): void {
  if (!material.value || !composerBlock.value) return
  const index = material.value.blocks.findIndex((block) => block.id === composerBlock.value?.id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= material.value.blocks.length) return
  const [block] = material.value.blocks.splice(index, 1)
  material.value.blocks.splice(target, 0, block)
  queueSave()
}
function removeComposerBlock(): void {
  if (!composerBlock.value || !material.value || material.value.blocks.length === 1) return
  const next = material.value.blocks.find((block) => block.id !== composerBlock.value?.id)
  removeBlock(composerBlock.value.id)
  if (next) selectComposerBlock(next)
}

function removeBlock(id: string): void {
  if (!material.value) return
  material.value.blocks = material.value.blocks.filter((block) => block.id !== id)
  material.value.connections = material.value.connections.filter((edge) => edge.from !== id && edge.to !== id)
  if (connectionFrom.value === id) connectionFrom.value = undefined
  queueSave()
}

function connectBlock(id: string): void {
  if (!material.value) return
  if (!connectionFrom.value) {
    connectionFrom.value = id
    status.value = 'Jetzt Zielblock anklicken'
    return
  }
  if (connectionFrom.value !== id && !material.value.connections.some((edge) => edge.from === connectionFrom.value && edge.to === id)) {
    material.value.connections.push({ id: createId(), from: connectionFrom.value, to: id })
    queueSave()
  }
  connectionFrom.value = undefined
  status.value = ''
}

function connectionPath(edge: LearningConnection): string {
  const from = material.value?.blocks.find((block) => block.id === edge.from)
  const to = material.value?.blocks.find((block) => block.id === edge.to)
  if (!from || !to) return ''
  const x1 = from.x + from.width
  const y1 = from.y + 54
  const x2 = to.x
  const y2 = to.y + 54
  const bend = Math.max(60, Math.abs(x2 - x1) * .45)
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`
}

function startDrag(event: PointerEvent, block: LearningBlock): void {
  if (!canvas.value) return
  const bounds = canvas.value.getBoundingClientRect()
  dragging.value = { id: block.id, offsetX: event.clientX - bounds.left - block.x + canvas.value.scrollLeft, offsetY: event.clientY - bounds.top - block.y + canvas.value.scrollTop }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function moveDrag(event: PointerEvent): void {
  if (!dragging.value || !material.value || !canvas.value) return
  const bounds = canvas.value.getBoundingClientRect()
  const block = material.value.blocks.find((item) => item.id === dragging.value!.id)
  if (!block) return
  block.x = Math.max(16, Math.round((event.clientX - bounds.left + canvas.value.scrollLeft - dragging.value.offsetX) / 10) * 10)
  block.y = Math.max(16, Math.round((event.clientY - bounds.top + canvas.value.scrollTop - dragging.value.offsetY) / 10) * 10)
}
function endDrag(): void {
  if (!dragging.value) return
  dragging.value = undefined
  queueSave()
}

async function duplicate(materialToCopy: DigitalLearningMaterial): Promise<void> {
  const copy = structuredClone(materialToCopy)
  const oldIds = new Map(copy.blocks.map((block) => [block.id, createId()]))
  copy.id = createId()
  copy.title = `${copy.title} (Kopie)`
  copy.planId = props.planId ?? copy.planId
  copy.createdAt = new Date().toISOString()
  copy.updatedAt = copy.createdAt
  copy.blocks = copy.blocks.map((block) => ({ ...block, id: oldIds.get(block.id)! }))
  copy.connections = copy.connections.map((edge) => ({ ...edge, id: createId(), from: oldIds.get(edge.from)!, to: oldIds.get(edge.to)! }))
  try {
    await repository.save(copy)
    if (props.embedded) {
      material.value = copy
      await loadCollection()
    } else {
      await router.push({ name: 'learning-material-edit', params: { id: copy.id } })
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Kopie konnte nicht angelegt werden.'
  }
}

async function removeMaterial(item: DigitalLearningMaterial): Promise<void> {
  if (!window.confirm(`„${item.title}“ wirklich löschen?`)) return
  try {
    await repository.remove(item.id)
    materials.value = materials.value.filter((saved) => saved.id !== item.id)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Material konnte nicht gelöscht werden.'
  }
}

async function openMaterial(item: DigitalLearningMaterial): Promise<void> {
  if (!props.embedded) {
    await router.push({ name: 'learning-material-edit', params: { id: item.id } })
    return
  }
  material.value = item
  linkedPlan.value = item.planId ? await planRepository.get(item.planId) : undefined
  activeTab.value = 'flow'
}
function backToLibrary(): void {
  material.value = undefined
  status.value = ''
  void loadCollection()
}
async function openLessonFlow(): Promise<void> {
  if (!props.embedded) { activeTab.value = 'flow'; return }
  const lessonFlow = materials.value.find((item) => item.kind === 'lesson-flow') ?? materials.value[0]
  if (lessonFlow) await openMaterial(lessonFlow)
}
function exitPlanMaterials(): void {
  if (props.embedded) emit('exitPlan')
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}
function exportHtml(): void {
  if (!material.value) return
  const nodes = material.value.blocks.map((block, index) => `<article class="block"><small>${index + 1} · ${escapeHtml(blockTypes.find((item) => item.type === block.type)?.title ?? 'Baustein')}</small><h2>${escapeHtml(block.title)}</h2><p>${escapeHtml(block.content).replace(/\n/g, '<br>')}</p>${block.type === 'question' ? '<textarea aria-label="Antwort" placeholder="Deine Antwort"></textarea>' : block.type === 'mindmap' ? '<textarea aria-label="Mindmap-Beitrag" placeholder="Idee beitragen …"></textarea>' : ''}</article>`).join('\n')
  const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(material.value.title)}</title><style>body{max-width:850px;margin:3rem auto;padding:0 1.25rem;color:#172a32;font:17px/1.6 system-ui,sans-serif}h1{font-size:2rem}.block{margin:1.2rem 0;padding:1.2rem;border:1px solid #c5d7d9;border-radius:10px;break-inside:avoid}.block small{color:#177980;font-weight:700}textarea{display:block;width:100%;min-height:100px;margin-top:1rem;border:1px solid #b9c8cc;border-radius:6px;padding:.7rem;font:inherit}</style><h1>${escapeHtml(material.value.title)}</h1><p>${escapeHtml(material.value.description)}</p>${nodes}</html>`
  downloadFile(`${material.value.title}.html`, html, 'text/html;charset=utf-8')
}
function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.replace(/[<>:"/\\|?*]+/g, '-').trim()
  anchor.click()
  URL.revokeObjectURL(url)
}
function printPdf(): void {
  if (!material.value) return
  const nodes = material.value.blocks.map((block, index) => `<article><small>${index + 1} · ${escapeHtml(blockTypes.find((item) => item.type === block.type)?.title ?? 'Baustein')}</small><h2>${escapeHtml(block.title)}</h2><p>${escapeHtml(block.content).replace(/\n/g, '<br>')}</p><hr><p>Antwort / Notizen:</p><div style="height:110px"></div></article>`).join('')
  const preview = window.open('', '_blank')
  if (!preview) { error.value = 'Pop-ups sind blockiert. Bitte Pop-ups für den PDF-Druck erlauben.'; return }
  preview.document.write(`<!doctype html><html lang="de"><meta charset="utf-8"><title>${escapeHtml(material.value.title)}</title><style>body{max-width:800px;margin:2rem auto;font:16px/1.55 system-ui;color:#172a32}article{padding:1rem 0;break-inside:avoid}article+article{border-top:1px solid #ccd9da}small{color:#177980;font-weight:bold}@media print{body{margin:0 auto}}</style><h1>${escapeHtml(material.value.title)}</h1><p>${escapeHtml(material.value.description)}</p>${nodes}<script>window.onload=()=>window.print()<\/script></html>`)
  preview.document.close()
}

async function toggleLiveSession(): Promise<void> {
  if (!material.value) return
  liveSession.value = !liveSession.value
  if (!props.embedded) await router.replace({ name: 'learning-material-edit', params: { id: material.value.id }, query: liveSession.value ? { live: '1' } : {} })
  if (liveSession.value) {
    const shareUrl = new URL(window.location.href)
    if (props.embedded) shareUrl.pathname = `/materialien/${material.value.id}`
    shareUrl.searchParams.set('live', '1')
    shareUrl.searchParams.set('present', '1')
    await navigator.clipboard?.writeText(shareUrl.toString()).catch(() => undefined)
    status.value = 'Live-Link kopiert'
  }
}
async function pollLiveMaterial(): Promise<void> {
  if (!liveSession.value || !material.value) return
  try {
    const remote = await repository.get(material.value.id)
    if (!remote || remote.updatedAt <= lastRemoteUpdate) return
    if (dirty.value) { remoteConflict.value = true; return }
    applyingRemote = true
    material.value = remote
    if (presentation.value && remote.activeBlockId) {
      const activeIndex = remote.blocks.findIndex((block) => block.id === remote.activeBlockId)
      if (activeIndex >= 0) presentationIndex.value = activeIndex
    }
    lastRemoteUpdate = remote.updatedAt
    applyingRemote = false
    status.value = 'Live aktualisiert'
  } catch {
    status.value = 'Live-Verbindung unterbrochen'
  }
}
function startPresentation(): void {
  if (!material.value) return
  if (!material.value.blocks.length) addBlock(material.value.kind === 'mindmap' ? 'mindmap' : 'text')
  presentationIndex.value = Math.max(0, material.value.blocks.findIndex((block) => block.id === material.value?.activeBlockId))
  material.value.activeBlockId = material.value.blocks[presentationIndex.value]?.id
  queueSave()
  presentation.value = true
}
function changeSlide(direction: number): void {
  presentationIndex.value = Math.max(0, Math.min((material.value?.blocks.length ?? 1) - 1, presentationIndex.value + direction))
  if (material.value) {
    material.value.activeBlockId = material.value.blocks[presentationIndex.value]?.id
    queueSave()
  }
}
function shareMindmapIdea(): void {
  const idea = presentationAnswer.value.trim()
  if (!idea || !material.value || currentBlock.value.type !== 'mindmap') return
  currentBlock.value.ideas ??= []
  currentBlock.value.ideas.push(idea)
  presentationAnswer.value = ''
  queueSave()
  status.value = 'Mindmap-Beitrag geteilt'
}
function submitAnswer(): void {
  const answer = presentationAnswer.value.trim()
  if (!answer || !material.value || currentBlock.value.type !== 'question') return
  currentBlock.value.responses ??= []
  currentBlock.value.responses.push(answer)
  presentationAnswer.value = ''
  queueSave()
  status.value = 'Antwort gespeichert'
}
function onPresentationKey(event: KeyboardEvent): void {
  if (!presentation.value) return
  if (event.key === 'ArrowRight' || event.key === ' ') changeSlide(1)
  if (event.key === 'ArrowLeft') changeSlide(-1)
  if (event.key === 'Escape') presentation.value = false
}

watch(() => [route.params.id, route.query.digitalMaterial], () => void loadMaterial())
watch(() => route.query.live, (value) => {
  liveSession.value = value === '1'
  if (liveTimer) clearInterval(liveTimer)
  if (liveSession.value) liveTimer = setInterval(() => void pollLiveMaterial(), 1200)
})
watch(() => route.query.present, (value) => {
  presentation.value = value === '1'
  if (presentation.value && material.value?.activeBlockId) {
    const activeIndex = material.value.blocks.findIndex((block) => block.id === material.value?.activeBlockId)
    if (activeIndex >= 0) presentationIndex.value = activeIndex
  }
})
onMounted(async () => {
  await Promise.all([loadMaterial(), planRepository.list().then((items) => { plans.value = items }).catch(() => undefined)])
  liveSession.value = !props.embedded && route.query.live === '1'
  presentation.value = route.query.present === '1'
  if (presentation.value && material.value?.activeBlockId) {
    const activeIndex = material.value.blocks.findIndex((block) => block.id === material.value?.activeBlockId)
    if (activeIndex >= 0) presentationIndex.value = activeIndex
  }
  if (liveSession.value) liveTimer = setInterval(() => void pollLiveMaterial(), 1200)
  window.addEventListener('keydown', onPresentationKey)
})
onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (liveTimer) clearInterval(liveTimer)
  window.removeEventListener('keydown', onPresentationKey)
})
</script>

<template>
  <main class="learning-studio" :class="{ presenting: presentation, embedded: props.embedded }">
    <header v-if="!presentation" class="studio-topbar" :class="{ embedded: props.embedded }">
      <button v-if="props.embedded" type="button" class="studio-brand" @click="exitPlanMaterials"><span aria-hidden="true">◇</span> Verlaufsplaner</button>
      <RouterLink v-else class="studio-brand" :to="{ name: 'home' }"><span aria-hidden="true">◇</span> Lernstudio</RouterLink>
      <span class="studio-spacer" />
      <span v-if="material" class="studio-status" :class="{ live: liveSession }"><i />{{ liveSession ? 'Live geteilt' : status || 'Entwurf' }}</span>
      <button v-if="material" type="button" class="studio-quiet" @click="toggleLiveSession">{{ liveSession ? 'Link beenden' : 'Live teilen' }}</button>
      <button v-if="material" type="button" class="studio-quiet" @click="exportHtml">HTML</button>
      <button v-if="material" type="button" class="studio-quiet" @click="printPdf">PDF</button>
      <button v-if="material" type="button" class="studio-quiet" @click="duplicate(material)">Duplizieren</button>
      <button v-if="material && material.kind !== 'lesson-flow'" type="button" class="studio-quiet" @click="openComposer()">Material bearbeiten</button>
      <button v-if="material" type="button" class="studio-save" @click="saveNow">Speichern</button>
      <button v-if="material" type="button" class="studio-present" @click="startPresentation">Präsentieren</button>
    </header>

    <p v-if="error" class="studio-alert">{{ error }}</p>
    <template v-if="!material && !presentation">
      <section class="library-header">
        <div><p class="studio-kicker">Bibliothek · wiederverwendbare Bausteine</p><h1>Digitale Lernmaterialien</h1><p>Erstellen, erneut einsetzen, anpassen und gemeinsam präsentieren.</p></div>
        <div class="library-create-actions">
          <button type="button" @click="openNew('presentation')">+ Präsentation</button>
          <button type="button" @click="openNew('worksheet')">+ Arbeitsblatt</button>
          <button type="button" @click="openNew('mindmap')">+ Mindmap</button>
          <button type="button" class="secondary" @click="openNew('lesson-flow')">+ Stundenablauf</button>
        </div>
      </section>
      <section v-if="materials.length" class="material-library-grid">
        <article v-for="item in materials" :key="item.id" class="material-library-card">
          <div class="library-card-topline"><span>{{ kindLabels[item.kind] }}</span><button type="button" class="library-menu" :aria-label="`${item.title} duplizieren`" title="Duplizieren" @click="duplicate(item)">⧉</button></div>
          <h2>{{ item.title }}</h2><p>{{ item.description || `${item.blocks.length} Bausteine · zuletzt bearbeitet ${new Date(item.updatedAt).toLocaleString('de-DE')}` }}</p>
          <div class="library-tags"><span>{{ item.blocks.length }} Bausteine</span><span>{{ item.connections.length }} Verbindungen</span><span v-if="item.planId">Mit Stunde verknüpft</span></div>
          <footer><button type="button" class="material-open" @click="openMaterial(item)">Öffnen</button><button type="button" class="library-delete" @click="removeMaterial(item)">Löschen</button></footer>
        </article>
      </section>
      <section v-else class="library-empty"><span>✳</span><h2>Der Baukasten ist bereit.</h2><p>Lege eine Präsentation, ein Arbeitsblatt oder eine gemeinsame Mindmap an. Die Materialien bleiben hier für spätere Stunden verfügbar.</p></section>
    </template>

    <template v-else-if="material && !presentation">
      <section v-if="!props.embedded" class="studio-document-head">
        <div class="studio-document-title"><select v-if="!props.embedded" v-model="material.kind" aria-label="Materialtyp" @change="queueSave"><option v-for="(label, kind) in kindLabels" :key="kind" :value="kind">{{ label }}</option></select><input v-if="!props.embedded" v-model="material.title" aria-label="Titel" @input="queueSave" /><input v-if="!props.embedded" v-model="material.description" aria-label="Kurzbeschreibung" placeholder="Beschreibung für Lernende" @input="queueSave" /></div>
        <label v-if="!props.embedded" class="lesson-link">Zur Stunde<select v-model="material.planId" @change="queueSave"><option value="">Nicht verknüpft</option><option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.title }}</option></select></label>
      </section>
      <div v-if="remoteConflict" class="studio-conflict"><span>Eine andere Person hat Änderungen gespeichert.</span><button type="button" @click="void loadMaterial()">Remote-Version laden</button><button type="button" class="secondary" @click="remoteConflict = false; queueSave()">Meine Version behalten</button></div>
      <div class="studio-workspace">
        <section class="studio-main-area">
          <div class="studio-embedded-heading"><span class="embedded-heading-icon">⌘</span><h1>Stundenablauf & Arbeitsmaterial</h1><div class="material-create-actions"><button type="button" @click="openNew('presentation')">+ Präsentation</button><button type="button" @click="openNew('worksheet')">+ Arbeitsblatt</button><button type="button" @click="openNew('mindmap')">+ Mindmap</button></div></div>
          <div ref="canvas" class="node-canvas" @pointermove="moveDrag" @pointerup="endDrag" @pointercancel="endDrag">
            <div class="canvas-ruler-x" /><div class="canvas-ruler-y" />
            <svg class="lesson-spine" :width="canvasWidth" :height="canvasHeight" :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"><line x1="105" y1="110" x2="105" :y2="canvasHeight - 80" class="timeline-line" /><g v-for="(block, index) in flowBlocks" :key="`phase-${block.id}`"><line x1="105" :y1="block.y + 26" :x2="block.x" :y2="block.y + 26" class="timeline-branch" :class="`tone-${blockTone(block, index)}`" /><circle cx="105" :cy="block.y + 26" r="10" class="timeline-dot" :class="`tone-${blockTone(block, index)}`" /></g></svg>
            <svg class="connection-layer" :width="canvasWidth" :height="canvasHeight" :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"><defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" /></marker></defs><path v-for="edge in material.connections" :key="edge.id" :d="connectionPath(edge)" marker-end="url(#arrowhead)" @dblclick="material.connections = material.connections.filter((item) => item.id !== edge.id); queueSave()" /></svg>
            <article v-for="(block, index) in flowBlocks" :key="block.id" class="learning-node phase-card" :class="[`node-${block.type}`, `tone-${blockTone(block, index)}`, { connecting: connectionFrom === block.id, 'connect-target': connectionFrom && connectionFrom !== block.id }]" :data-block-id="block.id" :style="{ left: `${block.x}px`, top: `${block.y}px`, width: `${block.width}px`, minHeight: `${block.height}px` }" @click="connectionFrom && connectionFrom !== block.id ? connectBlock(block.id) : undefined">
              <header class="node-header" @pointerdown="startDrag($event, block)"><span class="node-index">{{ index + 1 }}</span><span>{{ phaseTitle(index, block) }}</span><small>{{ phaseDuration(index) }}</small><button type="button" aria-label="Phase entfernen" @pointerdown.stop @click="removeBlock(block.id)">⋮</button></header>
              <div class="node-content"><input v-model="block.title" aria-label="Phasentitel" @input="queueSave" /><textarea v-model="block.content" aria-label="Phasenbeschreibung" @input="queueSave" /></div>
              <footer class="node-footer"><span>{{ block.type === 'question' ? 'Antwortfeld' : block.type === 'mindmap' ? 'Live-Mindmap' : block.type === 'task' ? 'Arbeitsauftrag' : 'Lernimpuls' }}</span><button type="button" @click="connectBlock(block.id)">{{ connectionFrom === block.id ? 'Ziel wählen' : '↗ Verbinden' }}</button></footer>
            </article>
            <article v-for="(block, index) in resourceBlocks" :key="block.id" class="learning-node resource-card" :class="{ connecting: connectionFrom === block.id, 'connect-target': connectionFrom && connectionFrom !== block.id }" :data-block-id="block.id" :style="{ left: `${block.x}px`, top: `${block.y}px`, width: `${block.width}px`, minHeight: `${block.height}px` }" @click="connectionFrom && connectionFrom !== block.id ? connectBlock(block.id) : undefined">
              <header class="resource-header" @pointerdown="startDrag($event, block)"><span class="resource-icon">▧</span><strong>{{ block.title }}</strong><button type="button" aria-label="Material entfernen" @pointerdown.stop @click="removeBlock(block.id)">⋮</button></header>
              <div class="resource-card-body"><div class="resource-preview" :class="`resource-preview-${index % 4}`"><span>{{ ['▤', '▧', '✳', '◉'][index % 4] }}</span><i /><i /><i /></div><div class="resource-description"><small>{{ ['Präsentation', 'Arbeitsblatt', 'Mindmap', 'Tafelbild'][index % 4] }}</small><input v-model="block.title" aria-label="Materialtitel" @input="queueSave" /><textarea v-model="block.content" aria-label="Materialbeschreibung" @input="queueSave" /></div></div>
              <footer class="resource-footer"><span>{{ ['Impulsbilder', 'Aufgaben', 'Kollaborativ', 'Übersicht'][index % 4] }}</span><span><button v-if="material.kind !== 'lesson-flow'" type="button" @click.stop="openComposer(block.id)">Bearbeiten</button><button type="button" @click="connectBlock(block.id)">{{ connectionFrom === block.id ? 'Ziel wählen' : '↗ Verbinden' }}</button></span></footer>
            </article>
            <button v-if="!material.blocks.length" type="button" class="canvas-empty" @click="addBlock('text')">+ Ersten Lernbaustein einfügen</button>
          </div>
        </section>
      </div>
      <p class="studio-footnote">Blöcke ziehen · Verbinden wählen und zwei Blöcke anklicken · Doppelklick auf Pfeil entfernt Verbindung</p>
    </template>

    <section v-if="composerOpen && material" class="material-composer-backdrop" @click.self="composerOpen = false">
      <section class="material-composer" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <header><div><p class="studio-kicker">{{ kindLabels[material.kind] }}</p><h1 id="composer-title">{{ material.title }} bearbeiten</h1></div><button type="button" aria-label="Editor schließen" @click="composerOpen = false">×</button></header>
        <div class="composer-layout">
          <aside class="composer-navigation">
            <div class="composer-actions"><button v-if="material.kind === 'presentation'" type="button" @click="addComposerSection">+ Abschnitt</button><button type="button" @click="addComposerBlock">+ {{ material.kind === 'presentation' ? 'Folie' : material.kind === 'worksheet' ? 'Seite' : 'Knoten' }}</button></div>
            <template v-if="material.kind === 'presentation'"><section v-for="section in composerSections" :key="section" class="composer-section"><button type="button" :class="{ active: composerSection === section }" @click="composerSection = section">{{ section }}</button><button v-for="(block, index) in material.blocks.filter((item) => (item.section || 'Abschnitt 1') === section)" :key="block.id" type="button" class="composer-item" :class="{ active: composerBlockId === block.id }" @click="selectComposerBlock(block)"><span>{{ index + 1 }}</span>{{ block.title || 'Unbenannte Folie' }}</button></section></template>
            <template v-else><button v-for="(block, index) in material.blocks" :key="block.id" type="button" class="composer-item" :class="{ active: composerBlockId === block.id }" @click="selectComposerBlock(block)"><span>{{ index + 1 }}</span>{{ block.title || (material.kind === 'mindmap' ? 'Neuer Knoten' : 'Unbenannte Seite') }}</button></template>
          </aside>
          <main v-if="composerBlock" class="composer-page">
            <div class="composer-page-toolbar"><label v-if="material.kind === 'presentation'">Abschnitt<select v-model="composerBlock.section" @change="composerSection = composerBlock.section || 'Abschnitt 1'; queueSave()"><option v-for="section in composerSections" :key="section" :value="section">{{ section }}</option></select></label><span /><button type="button" :disabled="material.blocks.indexOf(composerBlock) === 0" @click="moveComposerBlock(-1)">↑</button><button type="button" :disabled="material.blocks.indexOf(composerBlock) === material.blocks.length - 1" @click="moveComposerBlock(1)">↓</button><button type="button" class="danger" :disabled="material.blocks.length === 1" @click="removeComposerBlock">Entfernen</button></div>
            <input v-model="composerBlock.title" class="composer-title-input" :placeholder="material.kind === 'presentation' ? 'Folientitel' : material.kind === 'worksheet' ? 'Seitentitel' : 'Knotentitel'" @input="queueSave">
            <RichTextEditor :model-value="composerBlock.richContent ?? richTextFromPlain(composerBlock.content)" :label="`${kindLabels[material.kind]}: ${composerBlock.title || 'Inhalt'}`" @update:model-value="updateComposerContent" />
            <p v-if="material.kind === 'mindmap'" class="composer-hint">Der Knoten wird gleichzeitig auf der Canvas dargestellt. Ziehe ihn dort an die gewünschte Position und verbinde ihn über „Verbinden“ mit anderen Knoten.</p>
          </main>
        </div>
      </section>
    </section>

    <section v-if="presentation && material && currentBlock" class="presentation-stage">
      <header><span>{{ kindLabels[material.kind] }}</span><span>{{ presentationIndex + 1 }} / {{ material.blocks.length }}</span><button type="button" @click="presentation = false">× Beenden</button></header>
      <main class="presentation-slide" :class="`node-${currentBlock.type}`"><p class="studio-kicker">{{ blockTypes.find((item) => item.type === currentBlock.type)?.title }}</p><h1>{{ currentBlock.title }}</h1><p class="presentation-copy">{{ currentBlock.content }}</p><div v-if="currentBlock.type === 'mindmap'" class="mindmap-live-board"><span class="mindmap-center">{{ currentBlock.title }}</span><span v-for="(idea, index) in currentBlock.ideas ?? []" :key="`${index}-${idea}`" class="mindmap-idea" :style="{ '--idea-index': index }">{{ idea }}</span></div><textarea v-if="currentBlock.type === 'question' || currentBlock.type === 'mindmap'" v-model="presentationAnswer" :placeholder="currentBlock.type === 'mindmap' ? 'Idee zur gemeinsamen Mindmap beitragen …' : 'Antwort notieren …'" /><button v-if="currentBlock.type === 'mindmap'" type="button" class="mindmap-submit" @click="shareMindmapIdea">Idee zur Mindmap hinzufügen</button><button v-if="currentBlock.type === 'question'" type="button" class="mindmap-submit" @click="submitAnswer">Antwort abgeben</button><ol v-if="currentBlock.responses?.length" class="answer-list"><li v-for="(response, index) in currentBlock.responses" :key="`${index}-${response}`"><strong>Antwort {{ index + 1 }}</strong>{{ response }}</li></ol></main>
      <footer><button type="button" :disabled="presentationIndex === 0" @click="changeSlide(-1)">← Zurück</button><small>Mit Pfeiltasten navigieren · {{ currentBlock.type === 'mindmap' ? 'Beiträge werden live geteilt' : 'Präsentationsmodus' }}</small><button type="button" :disabled="presentationIndex >= material.blocks.length - 1" @click="changeSlide(1)">Weiter →</button></footer>
    </section>
  </main>
</template>

<style scoped>
.learning-studio { min-height: 100vh; color: #dce8ec; background: #0d1722; font: 15px/1.45 Inter, ui-sans-serif, system-ui, sans-serif }
.learning-studio.embedded { min-height: 620px; border: 1px solid #2a414d; border-radius: 7px; overflow: hidden }
.learning-studio.embedded .studio-workspace { min-height: 620px }
.learning-studio.embedded .studio-main-area { grid-template-rows: 54px minmax(520px, 1fr) }
.learning-studio.embedded .library-header { align-items: start; padding: 1.4rem }
.learning-studio.embedded .material-library-grid { padding: .5rem 1.4rem 1.5rem }
.studio-topbar { position: sticky; z-index: 15; top: 0; display: flex; align-items: center; gap: .55rem; min-height: 58px; padding: .55rem 1rem; border-bottom: 1px solid #263849; background: #111d29 }
.studio-brand { display: inline-flex; align-items: center; gap: .6rem; padding: 0 .9rem 0 .35rem; color: #e7eff0; font-size: 1rem; font-weight: 800; text-decoration: none }
.studio-brand span { color: #43d5c3; font-size: 1.6rem }
.studio-nav { display: flex; align-items: center; gap: .2rem; height: 100% }
.studio-nav a, .studio-nav button, .studio-quiet { padding: .48rem .7rem; border: 1px solid transparent; border-radius: 6px; color: #afc0cc; background: transparent; font-size: .84rem; text-decoration: none }
.studio-nav a.active, .studio-nav a:hover, .studio-nav button.active, .studio-nav button:hover, .studio-quiet:hover { color: #53dfca; border-color: #345061; background: #1a2a37 }
.studio-current-material { padding-left: .6rem; color: #6c8997; font-size: .74rem }
.studio-spacer { flex: 1 }
.studio-status { display: flex; align-items: center; gap: .45rem; color: #92a9b7; font-size: .78rem }
.studio-status i { width: 7px; height: 7px; border-radius: 50%; background: #8999a2 }
.studio-status.live { color: #73e4c6 }
.studio-status.live i { background: #32d4a2; box-shadow: 0 0 12px #32d4a2 }
.studio-save, .studio-present { padding: .48rem .8rem; border: 1px solid #267d79; border-radius: 6px; color: #e8fffc; background: #117a78; font-size: .84rem }
.studio-present { color: #10262b; border-color: #44ddc5; background: #44ddc5; font-weight: 700 }
.studio-alert { margin: .7rem 1rem; padding: .65rem .9rem; border: 1px solid #7f3e49; border-radius: 6px; color: #ffdbe0; background: #381f2a }
.library-header { display: flex; justify-content: space-between; gap: 2rem; align-items: end; max-width: 1420px; margin: auto; padding: 3rem 2rem 2rem }
.library-header h1 { margin-bottom: .3rem; color: #eff8fa; font-size: 2rem }
.library-header p:not(.studio-kicker) { margin: 0; color: #91a5b0 }
.studio-kicker { margin: 0 0 .45rem; color: #53d8c7; font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em }
.library-create-actions { display: flex; flex-wrap: wrap; gap: .45rem }
.library-create-actions button { padding: .6rem .8rem; border: 1px solid #245763; border-radius: 6px; color: #bfeee8; background: #152a37 }
.library-create-actions button:hover { border-color: #45cebf; background: #1b3b47 }
.library-create-actions button.secondary { color: #c5d1d8; border-color: #3a4a58; background: #19232e }
.material-library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(275px, 1fr)); gap: .8rem; max-width: 1420px; margin: auto; padding: .4rem 2rem 3rem }
.material-library-card { display: flex; flex-direction: column; min-height: 230px; padding: 1rem; border: 1px solid #2b414f; border-radius: 8px; background: #15212d; box-shadow: 0 10px 30px #060c1233 }
.library-card-topline { display: flex; justify-content: space-between; align-items: center; color: #59d7c5; font-size: .73rem; font-weight: 700 }
.library-menu { width: 32px; height: 32px; padding: 0; border: 1px solid #334c5b; border-radius: 5px; color: #adc4ce; background: #172a37 }
.material-library-card h2 { margin: .9rem 0 .4rem; color: #f0f6f7; font-size: 1.2rem }
.material-library-card p { color: #9bb0bb; font-size: .88rem }
.library-tags { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: auto; padding: .7rem 0 }
.library-tags span { padding: .2rem .45rem; border: 1px solid #2f4652; border-radius: 4px; color: #adc0ca; background: #192936; font-size: .68rem }
.material-library-card footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #2a3c48; padding-top: .7rem }
.material-open { color: #55d9c5; font-weight: 700; text-decoration: none }
.material-open:hover { text-decoration: underline }
.library-delete { border: 0; color: #de9da4; background: transparent; font-size: .8rem }
.library-empty { display: grid; justify-items: center; max-width: 540px; margin: 8vh auto; padding: 2rem; text-align: center }
.library-empty > span { display: grid; place-items: center; width: 64px; height: 64px; border: 1px solid #26585c; border-radius: 50%; color: #58ddca; background: #163239; font-size: 2rem }
.library-empty h2 { margin: 1.2rem 0 .3rem; color: #e3f1f3 }
.library-empty p { color: #9bb0bb }
.studio-document-head { display: flex; justify-content: space-between; align-items: end; gap: 1rem; padding: .85rem 1rem; border-bottom: 1px solid #273745; background: #121e2a }
.studio-document-title { display: grid; grid-template-columns: 190px minmax(250px, 600px); gap: .45rem .65rem; align-items: center; min-width: 0 }
.studio-document-title select, .studio-document-title input, .lesson-link select { min-width: 0; padding: .5rem .6rem; border: 1px solid #334956; border-radius: 5px; color: #e6eff2; background: #172631 }
.studio-document-title input:nth-child(2) { border: 0; color: #f2f7f8; background: transparent; font-size: 1.25rem; font-weight: 700 }
.studio-document-title input:nth-child(3) { grid-column: 2; color: #a7b8c2; font-size: .82rem }
.lesson-link { display: flex; align-items: center; gap: .5rem; color: #a8bbc5; font-size: .78rem }
.lesson-link select { min-width: 190px }
.studio-conflict { display: flex; align-items: center; gap: .65rem; padding: .55rem 1rem; color: #ffe8ad; background: #463719 }
.studio-conflict button { padding: .3rem .5rem; border: 1px solid #8d7337; border-radius: 4px; color: #fff0bb; background: #5b4820 }
.studio-conflict button.secondary { color: #f7e9c2; background: transparent }
.studio-workspace { display: grid; grid-template-columns: 238px minmax(0, 1fr); grid-template-rows: auto minmax(600px, 1fr); min-height: calc(100vh - 155px) }
.lesson-outline { grid-column: 1; grid-row: 1 / span 2; display: flex; flex-direction: column; min-width: 0; padding: 1rem .85rem; border-right: 1px solid #263b48; background: #111d28 }
.outline-back { margin: 0 0 1rem; color: #a9bdc7; font-size: .76rem; text-decoration: none }
.outline-back:hover { color: #57dccc }
.lesson-outline h2 { margin: 0 0 .7rem; color: #eef7f8; font-size: 1rem; line-height: 1.35 }
.outline-meta { display: grid; gap: .5rem; color: #a8b9c3; font-size: .76rem }
.outline-objective { margin: 1.1rem 0 1.3rem; padding: .7rem; border: 1px solid #2c4655; border-radius: 7px; background: #162631 }
.outline-objective strong { color: #59dccb; font-size: .76rem }
.outline-objective p { margin: .4rem 0 0; color: #c0cdd3; font-size: .75rem; line-height: 1.5 }
.outline-phase-list { position: relative; display: grid; gap: .4rem; padding: 0; margin: .4rem 0 1rem; list-style: none }
.outline-phase-list::before { position: absolute; top: 20px; bottom: 20px; left: 15px; width: 2px; content: ''; background: linear-gradient(#28d3c2, #29a9ed 34%, #f4ad32 68%, #ac68e8) }
.outline-phase-list button { position: relative; display: flex; align-items: center; gap: .65rem; width: 100%; padding: .45rem .25rem; border: 0; color: #dce8ec; background: transparent; text-align: left }
.outline-phase-list button:hover { background: #1a2d39 }
.outline-step { z-index: 1; display: grid; place-items: center; width: 30px; height: 30px; flex: 0 0 30px; border: 3px solid #2bd0c1; border-radius: 50%; color: #e9ffff; background: #11232c; font-size: .72rem; font-weight: 800 }
.outline-blue .outline-step { border-color: #27a8ed }.outline-amber .outline-step { border-color: #f0a82e }.outline-violet .outline-step { border-color: #b260e5 }
.outline-phase-list button > span:last-child { display: grid; gap: .12rem; min-width: 0 }
.outline-phase-list strong { overflow: hidden; font-size: .79rem; text-overflow: ellipsis; white-space: nowrap }
.outline-phase-list small { color: #9db0bb; font-size: .69rem }
.outline-add-phase { display: flex; align-items: center; gap: .5rem; margin-top: auto; padding: .55rem .65rem; border: 1px solid #314a59; border-radius: 6px; color: #bad0d8; background: #172833; text-align: left }
.studio-tool-rail { grid-column: 2; grid-row: 1; display: flex; flex-direction: row; align-items: center; gap: .4rem; min-width: 0; padding: .4rem .65rem; overflow-x: auto; border-bottom: 1px solid #293c49; background: #111d28 }
.studio-tool-rail .studio-kicker { margin: 0 .35rem 0 0; white-space: nowrap; font-size: .65rem }
.block-tool { display: flex; align-items: center; gap: .4rem; width: auto; min-width: max-content; min-height: 36px; padding: .3rem .5rem; border: 1px solid #344956; border-radius: 6px; color: #bdd0d8; background: #1a2a36; cursor: pointer }
.block-tool:hover, .block-tool.selected { border-color: #49d8c5; color: #70edda; background: #1b3a42 }
.block-tool span { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 5px; background: #1b5960; font-weight: 800 }
.block-tool.blue span { background: #1a5680 }.block-tool.violet span { background: #593b83 }.block-tool.amber span { background: #78511c }.block-tool.green span { background: #28624d }
.block-tool small { max-width: 120px; overflow: hidden; color: #a7b8c0; font-size: .68rem; text-overflow: ellipsis; white-space: nowrap }
.rail-divider { height: 25px; margin: 0 .25rem; border-left: 1px solid #344753 }
.connect-tool span { color: #5ce3ce; background: #193f45 !important }
.studio-main-area { grid-column: 2; grid-row: 2; display: grid; grid-template-rows: 42px minmax(600px, 1fr); min-width: 0 }
.studio-embedded-heading { display: flex; align-items: center; gap: .75rem; min-width: 0; padding: 0 1rem; background: #101b26 }
.studio-embedded-heading h1 { flex: 1; min-width: 0; margin: 0; overflow: hidden; color: #e8f0f3; font-size: 1.22rem; text-overflow: ellipsis; white-space: nowrap }
.material-create-actions { display: flex; gap: .35rem }.material-create-actions button { padding: .35rem .5rem; border: 1px solid #315662; border-radius: 5px; color: #91e8dd; background: #17313b; font-size: .72rem }.material-create-actions button:hover { color: #efffff; border-color: #53dacb; background: #1c4b52 }
.embedded-heading-icon { color: #27d0c1; font-size: 1.35rem }
.embedded-view-switch { display: inline-flex; overflow: hidden; border: 1px solid #334a57; border-radius: 6px; background: #14222d }
.studio-embedded-heading .embedded-view-switch button { min-width: 88px; padding: .4rem .65rem; border: 0; border-radius: 0; color: #a9bac4; background: transparent; font-size: .76rem }
.studio-embedded-heading .embedded-view-switch button.active { color: #55dfce; background: #1a343d }
.studio-embedded-heading .embedded-view-switch button + button { border-left: 1px solid #334a57 }
.studio-view-tabs { display: flex; align-items: center; gap: .25rem; padding: .3rem .65rem; border-bottom: 1px solid #293c49; background: #14212c }
.studio-view-tabs button { height: 31px; padding: .3rem .65rem; border: 1px solid transparent; border-radius: 5px; color: #9eb1bc; background: transparent; font-size: .8rem }
.studio-view-tabs button.active { color: #65e2d0; border-color: #315660; background: #1a343d }
.studio-view-tabs small { color: #8399a5; font-size: .7rem }
.node-canvas { position: relative; min-width: 0; min-height: 860px; overflow: auto; background-color: #111d29; background-image: linear-gradient(#8ba4af12 1px, transparent 1px), linear-gradient(90deg, #8ba4af12 1px, transparent 1px); background-size: 28px 28px }
.canvas-ruler-x, .canvas-ruler-y { position: absolute; z-index: 1; pointer-events: none; opacity: .22 }
.canvas-ruler-x { top: 0; right: 0; left: 0; height: 22px; border-bottom: 1px solid #647782; background: repeating-linear-gradient(90deg, transparent 0 49px, #7d939e 50px 51px) }
.canvas-ruler-y { top: 0; bottom: 0; left: 0; width: 22px; border-right: 1px solid #647782; background: repeating-linear-gradient(0deg, transparent 0 49px, #7d939e 50px 51px) }
.connection-layer { position: absolute; z-index: 2; inset: 0; overflow: visible; pointer-events: none }
.connection-layer path { fill: none; stroke: #28bdb7; stroke-width: 3; pointer-events: stroke; cursor: pointer }
.connection-layer marker path { fill: #28bdb7; stroke: none }
.lesson-spine { position: absolute; z-index: 1; inset: 0; overflow: visible; pointer-events: none }
.timeline-line { stroke: #60727b; stroke-width: 2; stroke-dasharray: 3 4 }
.timeline-branch { stroke-width: 2; opacity: .8 }
.timeline-dot { stroke: #e1f6f5; stroke-width: 3 }
.tone-teal { stroke: #28d3c2; fill: #28d3c2 }.tone-blue { stroke: #29a9ed; fill: #29a9ed }.tone-amber { stroke: #f4ad32; fill: #f4ad32 }.tone-violet { stroke: #ac68e8; fill: #ac68e8 }
.learning-node { position: absolute; z-index: 3; overflow: hidden; border: 1px solid #38606d; border-radius: 8px; color: #dce9ed; background: #172631; box-shadow: 0 12px 28px #050b11aa }
.phase-card.tone-teal { border-color: #00bfae; box-shadow: 0 8px 24px #001b1e88 }
.phase-card.tone-teal .node-header { border-top: 4px solid #00c8b7 }
.phase-card.tone-blue { border-color: #159fe5 }.phase-card.tone-blue .node-header { border-top: 4px solid #159fe5 }
.phase-card.tone-amber { border-color: #df920d }.phase-card.tone-amber .node-header { border-top: 4px solid #efa400 }
.phase-card.tone-violet { border-color: #b454e4 }.phase-card.tone-violet .node-header { border-top: 4px solid #b454e4 }
.node-header { display: flex; align-items: center; gap: .55rem; min-height: 42px; padding: .35rem .55rem; border-bottom: 1px solid #344955; color: #ecf5f6; background: #1b2d39; cursor: grab; touch-action: none; user-select: none }
.node-header:active { cursor: grabbing }
.node-index { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #052d33; background: #52dbcc; font-size: .72rem; font-weight: 800 }
.node-header > span:nth-child(2) { flex: 1; font-size: .77rem; font-weight: 700 }
.node-header > button { width: 26px; height: 26px; border: 0; color: #a9bdc5; background: transparent; font-size: 1.2rem }
.node-content { display: grid; gap: .5rem; padding: .65rem }
.node-content input { padding: .35rem .4rem; border: 1px solid transparent; border-radius: 4px; color: #eaf1f3; background: transparent; font-weight: 700 }
.node-content input:focus { border-color: #3e7980; background: #1d323e }
.node-content textarea { width: 100%; min-height: 104px; resize: vertical; padding: .4rem; border: 1px solid #314653; border-radius: 5px; color: #bacbd1; background: #14222d; font-size: .8rem }
.node-footer { display: flex; justify-content: space-between; align-items: center; gap: .35rem; padding: .3rem .6rem .55rem; color: #8198a4; font-size: .65rem }
.node-footer button { padding: .25rem .4rem; border: 1px solid #355965; border-radius: 4px; color: #70ddcf; background: #18323a; font-size: .65rem }
.learning-node.node-question { border-color: #2476a5 }.node-question .node-index { background: #35a9e8 }.node-question .node-footer button { color: #71c9f4; border-color: #28628a }
.learning-node.node-mindmap { border-color: #7851a8 }.node-mindmap .node-index { color: #fff; background: #986be0 }.node-mindmap .node-footer button { color: #c2a3fa; border-color: #604486 }
.learning-node.node-task { border-color: #9b6e2c }.node-task .node-index { background: #f1b342 }.node-task .node-footer button { color: #f2bf66; border-color: #70552d }
.learning-node.node-media { border-color: #357f61 }.node-media .node-index { background: #4abe8a }
.resource-card { border-color: #375667; background: #172531; box-shadow: 0 10px 24px #050b11a8 }
.resource-header { display: flex; align-items: center; gap: .55rem; min-height: 40px; padding: .35rem .5rem; border-bottom: 1px solid #334955; background: #1b2c38; cursor: grab; touch-action: none; user-select: none }
.resource-icon { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 5px; color: #71e4d5; background: #16464d; font-weight: 800 }
.resource-header strong { flex: 1; overflow: hidden; color: #e9f3f5; font-size: .78rem; text-overflow: ellipsis; white-space: nowrap }
.resource-header button { border: 0; color: #a9bdc5; background: transparent; font-size: 1.1rem }
.resource-card-body { display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: .55rem; padding: .55rem }
.resource-preview { display: grid; align-content: center; justify-items: center; gap: .25rem; min-height: 78px; padding: .35rem; border: 1px solid #405966; border-radius: 5px; color: #b8f3d7; background: linear-gradient(140deg, #426d39, #172d27 70%) }
.resource-preview span { font-size: 1.7rem; text-shadow: 0 1px 6px #071410 }
.resource-preview i { width: 70%; height: 3px; border-radius: 3px; background: #d8e8df8a }
.resource-preview-1 { color: #b9e0f9; background: linear-gradient(145deg, #f4f7f7, #b8cad0); border-color: #94a9ae }
.resource-preview-1 span { color: #398996; text-shadow: none }
.resource-preview-1 i { background: #829ca5 }
.resource-preview-2 { color: #8ce8d5; background: radial-gradient(circle at center, #236c67, #122832 75%) }
.resource-preview-3 { color: #ffca6d; background: linear-gradient(145deg, #163a45, #172632) }
.resource-description { display: grid; align-content: start; gap: .15rem; min-width: 0 }
.resource-description small { color: #65d9cc; font-size: .6rem }
.resource-description input { width: 100%; min-width: 0; padding: .12rem; border: 0; color: #e8f0f2; background: transparent; font-size: .7rem; font-weight: 700 }
.resource-description textarea { width: 100%; min-width: 0; min-height: 42px; resize: none; padding: .12rem; border: 0; color: #aabdc5; background: transparent; font-size: .63rem }
.resource-footer { display: flex; justify-content: space-between; align-items: center; padding: .1rem .55rem .45rem; color: #a9bac1; font-size: .58rem }
.resource-footer span { padding: .15rem .35rem; border-radius: 4px; background: #273946 }
.resource-footer button { border: 0; color: #72ddd0; background: transparent; font-size: .62rem }
.learning-node.connecting { outline: 2px solid #58e3d0; box-shadow: 0 0 0 5px #58e3d033, 0 12px 28px #050b11aa }
.learning-node.connect-target { cursor: crosshair }
.canvas-empty { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); padding: .8rem 1.1rem; border: 1px dashed #4c7079; border-radius: 7px; color: #79dccc; background: #173039 }
.materials-board { padding: 1.1rem; overflow: auto; background: #101b26 }
.materials-board-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem }
.materials-board-heading h2 { margin: 0; color: #e5f0f2 }
.materials-board-heading button, .add-material-row { padding: .45rem .65rem; border: 1px solid #315662; border-radius: 5px; color: #75dfd1; background: #182c38 }
.materials-row { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; gap: .7rem; align-items: center; max-width: 1050px; margin-bottom: .55rem; padding: .7rem; border: 1px solid #2b4452; border-left: 3px solid #35bfb5; border-radius: 6px; background: #172531 }
.materials-row.node-question { border-left-color: #35a9e8 }.materials-row.node-mindmap { border-left-color: #986be0 }.materials-row.node-task { border-left-color: #f1b342 }.materials-row.node-media { border-left-color: #4abe8a }
.materials-row-number { color: #61d9cb; font-size: .85rem; font-weight: 800 }
.materials-row small { color: #70cfc2; font-size: .67rem }
.materials-row h3 { margin: .1rem 0; color: #e7eff1; font-size: .95rem }
.materials-row p { margin: 0; color: #9fb3bd; font-size: .8rem; white-space: pre-wrap }
.materials-row > button { padding: .35rem .5rem; border: 1px solid #3b5967; border-radius: 4px; color: #bdcdd2; background: #1b2c37; font-size: .72rem }
.add-material-row { margin-top: .25rem }
.linked-material-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: .7rem; padding: 1rem; background: #101b26 }
.linked-material-card { position: relative; display: grid; grid-template-columns: 76px minmax(0,1fr); gap: .65rem; min-height: 150px; padding: .65rem; border: 1px solid #354b58; border-radius: 7px; background: #172531; box-shadow: 0 8px 20px #050b1188 }
.linked-material-preview { display: grid; align-content: center; justify-items: center; gap: .25rem; min-height: 95px; border: 1px solid #465c63; border-radius: 5px; color: #d9f0e5; background: linear-gradient(145deg,#436a3e,#182e29) }
.linked-material-preview span { font-size: 1.8rem }
.linked-material-preview i { width: 70%; height: 3px; border-radius: 3px; background: #d7e9df88 }
.linked-resource-1 .linked-material-preview { color: #247283; background: linear-gradient(145deg,#f5f8f8,#b9cdd2) }
.linked-resource-2 .linked-material-preview { color: #a9e8dc; background: radial-gradient(circle,#245f63,#172631 75%) }
.linked-resource-3 .linked-material-preview { color: #ffd077; background: linear-gradient(145deg,#254b5b,#172631) }
.linked-material-copy { display: grid; align-content: start; gap: .16rem; min-width: 0 }
.linked-material-copy small { color: #58d8ca; font-size: .62rem }
.linked-material-copy h3 { margin: 0; overflow: hidden; color: #edf5f6; font-size: .8rem; text-overflow: ellipsis; white-space: nowrap }
.linked-material-copy p { margin: 0; color: #a9bac3; font-size: .66rem; line-height: 1.4 }
.linked-material-copy button, .linked-material-duplicate { justify-self: start; margin-top: .25rem; padding: .23rem .4rem; border: 1px solid #3a5965; border-radius: 4px; color: #70dfd0; background: #1a303a; font-size: .64rem }
.linked-material-duplicate { position: absolute; top: .35rem; right: .35rem; width: 26px; height: 26px; padding: 0; color: #b4c7ce }
.materials-empty { padding: 1rem; color: #98abb5 }
.studio-footnote { margin: 0; padding: .35rem .8rem; border-top: 1px solid #253744; color: #7f96a2; background: #101b26; font-size: .68rem }
.material-composer-backdrop { position: fixed; z-index: 90; inset: 0; display: grid; place-items: center; padding: 1.25rem; background: #071019cc }
.material-composer { display: grid; grid-template-rows: auto minmax(0, 1fr); width: min(1220px, 96vw); height: min(820px, 92vh); overflow: hidden; border: 1px solid #3a5964; border-radius: 10px; background: #101d28; box-shadow: 0 28px 80px #000a }
.material-composer > header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .85rem 1rem; border-bottom: 1px solid #2c4654; background: #142430 }.material-composer h1 { margin: .12rem 0 0; color: #edf7f8; font-size: 1.15rem }.material-composer > header > button { width: 30px; height: 30px; border: 0; border-radius: 5px; color: #c9d9dc; background: #263b47; font-size: 1.25rem }
.composer-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); min-height: 0 }.composer-navigation { overflow: auto; padding: .75rem; border-right: 1px solid #2c4654; background: #111e29 }.composer-actions { display: grid; gap: .45rem; margin-bottom: .85rem }.composer-actions button, .composer-page-toolbar button { padding: .4rem .55rem; border: 1px solid #365766; border-radius: 5px; color: #bfe5e3; background: #19323d; text-align: left }.composer-section { display: grid; gap: .2rem; margin-bottom: .7rem }.composer-section > button:first-child { padding: .36rem .45rem; border: 0; color: #61dcca; background: transparent; font-weight: 800; text-align: left }.composer-section > button:first-child.active { color: #eafffc; background: #1b4850 }.composer-item { display: flex; align-items: center; gap: .4rem; width: 100%; padding: .4rem .5rem; border: 0; color: #bacbd2; background: transparent; text-align: left }.composer-item span { display: grid; place-items: center; width: 21px; height: 21px; border-radius: 4px; color: #9db6be; background: #253b47; font-size: .7rem }.composer-item.active { color: #efffff; background: #1c5660 }.composer-item.active span { color: #08272d; background: #5bdacb }
.composer-page { min-width: 0; overflow: auto; padding: 1rem 1.25rem 1.5rem; background: #eaf0f1 }.composer-page-toolbar { display: flex; align-items: center; gap: .4rem; margin-bottom: .7rem }.composer-page-toolbar label { display: flex; align-items: center; gap: .4rem; color: #425d67; font-size: .8rem }.composer-page-toolbar select { padding: .3rem; border: 1px solid #adbec3; border-radius: 4px; color: #183039; background: #fff }.composer-page-toolbar span { flex: 1 }.composer-page-toolbar button { color: #264550; background: #fff; text-align: center }.composer-page-toolbar button:disabled { opacity: .45 }.composer-title-input { width: 100%; box-sizing: border-box; margin-bottom: .75rem; padding: .55rem .65rem; border: 1px solid #b1c4c9; border-radius: 5px; color: #172c34; background: #fff; font: 700 1.15rem/1.35 Inter, sans-serif }.composer-page :deep(.rich-editor) { border: 1px solid #b6c9ce; border-radius: 6px; overflow: hidden; background: #fff }.composer-page :deep(.editor-toolbar) { border-bottom-color: #c6d6da; background: #f4f8f8 }.composer-page :deep(.editor-page) { min-height: 390px; color: #172c34; background: #fff }.composer-hint { margin: .75rem 0 0; color: #45626a; font-size: .82rem }
.presentation-stage { position: fixed; z-index: 100; inset: 0; display: grid; grid-template-rows: 52px 1fr 66px; color: #e9f3f4; background: #0b141d }
.presentation-stage > header, .presentation-stage > footer { display: flex; align-items: center; gap: 1rem; padding: 0 1.25rem; color: #a4b7c0; background: #121e29 }
.presentation-stage > header { justify-content: space-between; border-bottom: 1px solid #2e404c }
.presentation-stage > header button, .presentation-stage > footer button { padding: .5rem .75rem; border: 1px solid #3c5964; border-radius: 5px; color: #d9e7eb; background: #1b2d39 }
.presentation-stage > footer { justify-content: space-between; border-top: 1px solid #2e404c }
.presentation-slide { display: flex; flex-direction: column; justify-content: center; width: min(100%, 1050px); margin: auto; padding: clamp(2rem, 7vw, 6rem); border-left: 4px solid #4ad6c5 }
.presentation-slide h1 { margin: .4rem 0 1rem; color: #f0f7f8; font-size: clamp(2.2rem, 6vw, 4.5rem) }
.presentation-copy { color: #bfd0d6; font-size: clamp(1.2rem, 2.3vw, 1.8rem); line-height: 1.5; white-space: pre-wrap }
.presentation-slide textarea { max-width: 650px; min-height: 110px; margin-top: 1.5rem; padding: .8rem; border: 1px solid #46626d; border-radius: 6px; color: #edf7f7; background: #172833; font: inherit }
.mindmap-submit { align-self: flex-start; margin-top: .65rem; padding: .6rem .85rem; border: 1px solid #53c7ba; border-radius: 5px; color: #062c31; background: #53d9c7; font-weight: 700 }
.mindmap-live-board { position: relative; display: flex; flex-wrap: wrap; justify-content: center; gap: .55rem; max-width: 750px; min-height: 95px; margin: .6rem 0; padding: 1rem; border: 1px solid #3b6470; border-radius: 10px; background: radial-gradient(ellipse at center, #153640, #101d28 75%) }
.mindmap-center, .mindmap-idea { display: inline-flex; align-items: center; justify-content: center; min-height: 34px; padding: .4rem .65rem; border: 1px solid #318c8d; border-radius: 20px; color: #d9fffb; background: #16464e; font-size: .82rem }
.mindmap-center { border-color: #52d9c8; background: #18736e; font-weight: 800 }
.mindmap-idea { border-color: #386986; color: #d8efff; background: #1a3c52 }
.answer-list { display: grid; gap: .45rem; max-width: 750px; padding-left: 1.4rem; color: #cedde2 }
.answer-list li { padding: .55rem .7rem; border: 1px solid #334b58; border-radius: 5px; background: #14232e }
.answer-list strong { margin-right: .5rem; color: #61dcca }
.studio-conflict button:hover, .studio-view-tabs button:hover, .studio-quiet:hover { transition: background .15s ease }
@media (max-width: 850px) {
  .studio-topbar { flex-wrap: wrap; gap: .3rem; padding: .4rem }
  .studio-brand { flex: 1 }
  .studio-nav { order: 2; width: 100% }
  .studio-document-head, .library-header { align-items: stretch; flex-direction: column; padding: 1rem }
  .studio-document-title { grid-template-columns: 1fr }
  .studio-document-title input:nth-child(3) { grid-column: 1 }
  .lesson-link { align-items: stretch; flex-direction: column }
  .studio-workspace { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(600px, 1fr) }
  .lesson-outline { grid-column: 1; grid-row: 1; border-right: 0; border-bottom: 1px solid #293c49 }
  .lesson-outline h2, .outline-objective { display: none }
  .outline-meta { display: flex; flex-wrap: wrap; gap: .5rem .8rem }
  .outline-phase-list { display: flex; overflow-x: auto; margin-bottom: .5rem }
  .outline-phase-list::before { display: none }
  .outline-phase-list li { min-width: 150px }
  .outline-add-phase { align-self: flex-start; margin-top: .2rem }
  .studio-tool-rail { grid-column: 1; grid-row: 2 }
  .studio-main-area { grid-column: 1; grid-row: 3 }
  .material-create-actions { overflow-x: auto; max-width: 55% }
  .studio-tool-rail .studio-kicker { writing-mode: horizontal-tb; transform: none }
  .block-tool { width: auto; min-width: max-content }
  .library-create-actions { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)) }
  .material-library-grid { padding: .4rem 1rem 2rem }
  .materials-row { grid-template-columns: 34px minmax(0,1fr) }
  .materials-row > button { grid-column: 2; justify-self: start }
  .composer-layout { grid-template-columns: 185px minmax(0, 1fr) }.material-composer-backdrop { padding: .5rem }
}
</style>

<style scoped>
/* The canvas stays the central workspace after removing duplicate controls. */
.studio-workspace { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(600px, 1fr); }
.studio-main-area { grid-column: 1; grid-row: 1; grid-template-rows: 54px minmax(600px, 1fr); }
@media (max-width: 850px) { .studio-workspace { grid-template-rows: minmax(600px, 1fr); } .studio-main-area { grid-column: 1; grid-row: 1; } }
</style>
