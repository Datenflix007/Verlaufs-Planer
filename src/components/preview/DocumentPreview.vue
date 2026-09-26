<script setup lang="ts">
import { ref, watch } from 'vue'
import type { WorkshopPlan } from '../../domain/types'
import { HtmlExporter } from '../../export/HtmlExporter'
const props = defineProps<{ plan: WorkshopPlan }>()
const source = ref('')
async function render(): Promise<void> { source.value = (await new HtmlExporter().export(props.plan)).content }
watch(() => props.plan, render, { deep: true, immediate: true })
</script>
<template><iframe class="document-preview" title="Dokumentvorschau" :srcdoc="source" /></template>
