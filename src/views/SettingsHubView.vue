<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute(); const router = useRouter()
const sections = [
  { name: 'workspace-settings', icon: '▦', label: 'Arbeitsbereich', description: 'Dashboard, Aufgaben, Gebäude, Räume und Materialbestand' },
  { name: 'schedule-pattern-settings', icon: '▤', label: 'Verlaufsplan-Muster', description: 'Spalten und Markdown-Definitionen für Planungen' },
  { name: 'template-settings', icon: '◇', label: 'Eigene Vorlagen', description: 'Lokale Vorlagen und Referenzsysteme' },
] as const
const active = computed(() => sections.find((section) => section.name === route.name) ?? sections[0])
</script>

<template>
  <main class="settings-hub">
    <header class="settings-hub-header"><button type="button" class="brand" @click="router.push({ name: 'home' })">Verlaufsplaner</button><span class="header-spacer" /><button type="button" class="secondary" @click="router.push({ name: 'home' })">Dashboard</button></header>
    <div class="settings-hub-body"><aside class="settings-nav"><p class="eyebrow">Einstellungen</p><h1>Verwaltung</h1><nav><RouterLink v-for="section in sections" :key="section.name" :to="{ name: section.name }" :class="{ active: route.name === section.name }"><span>{{ section.icon }}</span><strong>{{ section.label }}</strong><small>{{ section.description }}</small></RouterLink></nav></aside><section class="settings-workspace"><header class="settings-workspace-header"><p class="eyebrow">{{ active.label }}</p><h2>{{ active.label }}</h2><p>{{ active.description }}</p></header><div class="settings-content"><RouterView /></div></section></div>
  </main>
</template>
