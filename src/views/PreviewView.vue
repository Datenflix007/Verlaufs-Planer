<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DocumentPreview from '../components/preview/DocumentPreview.vue'
import { useProjectStore } from '../stores/projectStore'
const route = useRoute(); const router = useRouter(); const project = useProjectStore()
onMounted(async () => { try { await project.open(String(route.params.id)) } catch { await router.replace({ name: 'home' }) } })
const print = (): void => window.print()
</script>
<template><main v-if="project.activePlan" class="preview-shell"><header><button type="button" class="secondary" @click="router.push({ name: 'editor', params: { id: project.activePlan.id } })">← Zurück zum Editor</button><h1>Dokumentvorschau</h1><button type="button" @click="print">Drucken / PDF</button></header><DocumentPreview :plan="project.activePlan" /></main></template>
