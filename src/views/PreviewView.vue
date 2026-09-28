<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DocumentPreview from '../components/preview/DocumentPreview.vue'
import type { SchedulePattern } from '../domain/types'
import { SchedulePatternRepository } from '../repositories/SchedulePatternRepository'
import { useProjectStore } from '../stores/projectStore'

const route = useRoute(); const router = useRouter(); const project = useProjectStore()
const patterns = ref<SchedulePattern[]>([])
onMounted(async () => { try { await Promise.all([project.open(String(route.params.id)), new SchedulePatternRepository().list().then((items) => { patterns.value = items })]) } catch { await router.replace({ name: 'home' }) } })
const print = (): void => window.print()
</script>
<template><main v-if="project.activePlan" class="preview-shell"><header><button type="button" class="secondary" @click="router.push({ name: 'editor', params: { id: project.activePlan.id } })">← Zurück zum Editor</button><h1>Dokumentvorschau</h1><button type="button" @click="print">Drucken / PDF</button></header><DocumentPreview :plan="project.activePlan" :layouts="patterns" /></main></template>
