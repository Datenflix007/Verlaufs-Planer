<script setup lang="ts">
import RichTextEditor from '../editor/RichTextEditor.vue'
import type { RichTextDocument, WorkshopPlan } from '../../domain/types'
const props = defineProps<{ plan: WorkshopPlan; kind: 'content' | 'didactics' }>(); const emit = defineEmits<{ changed: [] }>()
const title = props.kind === 'content' ? 'Inhaltsanalyse' : 'Methodisch-didaktische Analyse'
const description = props.kind === 'content' ? 'Beschreiben Sie den fachwissenschaftlichen Gegenstand in einem frei strukturierten Text.' : 'Begründen Sie Ihre methodischen und didaktischen Entscheidungen ohne starres Formular.'
function update(value: RichTextDocument): void { if (props.kind === 'content') props.plan.contentAnalysis = value; else props.plan.didacticAnalysis = value; emit('changed') }
</script>
<template><section class="section-card narrative"><div class="section-heading"><p class="eyebrow">Kapitel</p><h1>{{ title }}</h1><p>{{ description }}</p></div><RichTextEditor :model-value="kind === 'content' ? plan.contentAnalysis : plan.didacticAnalysis" :label="title" @update:model-value="update" /></section></template>
