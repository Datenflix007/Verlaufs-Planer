<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ScheduleLayout, WorkshopPlan } from '../../domain/types'
import { HtmlExporter } from '../../export/HtmlExporter'
const props = defineProps<{ plan: WorkshopPlan; layouts?: ScheduleLayout[] }>()
const source = ref('')
async function render(): Promise<void> { source.value = (await new HtmlExporter(props.layouts).export(props.plan)).content }
watch(() => [props.plan, props.layouts], render, { deep: true, immediate: true })
</script>
<template><iframe class="document-preview" title="Dokumentvorschau" :srcdoc="source" /></template>
