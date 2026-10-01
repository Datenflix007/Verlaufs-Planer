<script setup lang="ts">
import { computed } from 'vue'
import { getPlanningTemplate } from '../../data/templates/registry'
import type { PlanningSectionId, WorkshopPlan } from '../../domain/types'

const props = defineProps<{ section: PlanningSectionId; plan: WorkshopPlan; presentationActive?: boolean }>()
const emit = defineEmits<{ select: [section: PlanningSectionId] }>()
const items: { id: Exclude<PlanningSectionId, 'materials'>; label: string }[] = [{ id: 'general', label: 'Allgemeines' }, { id: 'dates', label: 'Termine' }, { id: 'objectives', label: 'Lernziele' }, { id: 'competencies', label: 'Kompetenzen' }, { id: 'content', label: 'Inhaltsanalyse' }, { id: 'didactics', label: 'Didaktik' }, { id: 'schedule', label: 'Verlaufsplan' }]
const visibleItems = computed(() => { const sections = getPlanningTemplate(props.plan.settings.templateId)?.enabledSections; return sections?.length ? items.filter((item) => sections.includes(item.id)) : items })
</script>
<template><nav class="plan-sidebar" :aria-label="props.presentationActive ? 'Planungsabschnitte' : 'Sprungmarken im Planungsdokument'"><p>{{ props.presentationActive ? 'Planungsablauf' : 'Im Dokument' }}</p><button v-for="item in visibleItems" :key="item.id" type="button" :class="{ active: props.section === item.id }" :aria-current="props.section === item.id ? 'step' : undefined" :aria-controls="props.presentationActive ? undefined : `planning-section-${item.id}`" @click="emit('select', item.id)">{{ item.label }}</button></nav></template>

<style scoped>
.plan-sidebar > p { margin: .2rem .6rem .75rem; color: var(--muted); font-size: .7rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase }
</style>
