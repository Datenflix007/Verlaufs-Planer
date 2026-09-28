<script setup lang="ts">
import { computed } from 'vue'
import { getPlanningTemplate } from '../../data/templates/registry'
import type { PlanningSectionId, WorkshopPlan } from '../../domain/types'

const props = defineProps<{ section: PlanningSectionId; plan: WorkshopPlan; presentationActive?: boolean }>()
const emit = defineEmits<{ select: [section: PlanningSectionId]; presentation: [] }>()
const items: { id: PlanningSectionId; label: string }[] = [{ id: 'general', label: 'Allgemeines' }, { id: 'dates', label: 'Termine' }, { id: 'objectives', label: 'Lernziele' }, { id: 'competencies', label: 'Kompetenzen' }, { id: 'content', label: 'Inhaltsanalyse' }, { id: 'didactics', label: 'Didaktik' }, { id: 'schedule', label: 'Verlaufsplan' }, { id: 'materials', label: 'Material' }]
const visibleItems = computed(() => { const sections = getPlanningTemplate(props.plan.settings.templateId)?.enabledSections; return sections?.length ? items.filter((item) => sections.includes(item.id)) : items })
</script>
<template><nav class="plan-sidebar" aria-label="Dokumentgliederung"><button v-for="item in visibleItems" :key="item.id" type="button" :class="{ active: props.section === item.id }" @click="emit('select', item.id)">{{ item.label }}</button><button type="button" :class="{ active: props.presentationActive }" @click="emit('presentation')">Präsentation</button></nav></template>
