<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { bundledCompetencyCatalogs } from '../../data/competencies'
import { getPlanningTemplate } from '../../data/templates/registry'
import { createId } from '../../domain/factories'
import type { CompetencyCatalog, CompetencyCategory, CompetencyItem, WorkshopPlan } from '../../domain/types'

const props = defineProps<{ plan: WorkshopPlan }>()
const emit = defineEmits<{ changed: [] }>()
const importedCatalogs = ref<CompetencyCatalog[]>([])
const template = computed(() => getPlanningTemplate(props.plan.settings.templateId))
const activeCatalogIds = computed(() => [...new Set([...(template.value?.competencyFrameworkIds ?? []), ...(props.plan.settings.enabledCompetencyFrameworkIds ?? [])])])
const catalogs = computed(() => [...bundledCompetencyCatalogs, ...importedCatalogs.value].filter((catalog) => activeCatalogIds.value.includes(catalog.id)))
const catalogId = ref('')
const query = ref('')
const catalog = computed(() => catalogs.value.find((item) => item.id === catalogId.value))
const additionalCatalogs = computed(() => bundledCompetencyCatalogs.filter((catalog) => !activeCatalogIds.value.includes(catalog.id)))
watch(catalogs, (items) => { if (!items.some((item) => item.id === catalogId.value)) catalogId.value = items[0]?.id ?? '' }, { immediate: true })
function categories(items: CompetencyCategory[]): { category: string; competency: CompetencyItem }[] { return items.flatMap((category) => [...category.competencies.map((competency) => ({ category: category.title, competency })), ...categories(category.children ?? [])]) }
const matches = computed(() => !catalog.value ? [] : categories(catalog.value.categories).filter(({ category, competency }) => `${category} ${competency.title} ${competency.description ?? ''}`.toLocaleLowerCase('de').includes(query.value.toLocaleLowerCase('de'))))
function selected(item: CompetencyItem): boolean { return props.plan.competencies.some((reference) => reference.catalogId === catalogId.value && reference.competencyId === item.id) }
function recommended(item: CompetencyItem): boolean { return template.value?.highlightedCompetencyIds?.includes(item.id) ?? false }
function toggle(item: CompetencyItem): void { const index = props.plan.competencies.findIndex((reference) => reference.catalogId === catalogId.value && reference.competencyId === item.id); if (index >= 0) props.plan.competencies.splice(index, 1); else props.plan.competencies.push({ id: createId(), catalogId: catalogId.value, competencyId: item.id }); emit('changed') }
function label(catalogRef: string, competencyId: string): string { const found = [...bundledCompetencyCatalogs, ...importedCatalogs.value].find((item) => item.id === catalogRef); return found ? categories(found.categories).find((item) => item.competency.id === competencyId)?.competency.title ?? competencyId : competencyId }
function activateFramework(event: Event): void { const id = (event.target as HTMLSelectElement).value; if (!id) return; props.plan.settings.enabledCompetencyFrameworkIds = [...new Set([...(props.plan.settings.enabledCompetencyFrameworkIds ?? []), id])]; catalogId.value = id; (event.target as HTMLSelectElement).value = ''; emit('changed') }
function importCatalog(event: Event): void { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)) as CompetencyCatalog; if (!parsed.id || !parsed.name || !Array.isArray(parsed.categories)) throw new Error(); importedCatalogs.value.push(parsed); props.plan.settings.enabledCompetencyFrameworkIds = [...new Set([...(props.plan.settings.enabledCompetencyFrameworkIds ?? []), parsed.id])]; catalogId.value = parsed.id; emit('changed') } catch { window.alert('Die Datei ist kein gültiger Kompetenzkatalog.') } }; reader.readAsText(file) }
</script>

<template>
  <section class="section-card">
    <div class="section-heading"><p class="eyebrow">Bezug</p><h1>Kompetenzen</h1><p>Die Vorlage bestimmt die zunächst angebotenen Kompetenzrahmen. Weitere Rahmen können Sie jederzeit ergänzen.</p></div>
    <div class="catalog-tools"><label>Katalog<select v-model="catalogId"><option v-for="item in catalogs" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label v-if="additionalCatalogs.length">Weiteren Kompetenzrahmen hinzufügen<select @change="activateFramework"><option value="">Auswählen …</option><option v-for="item in additionalCatalogs" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label class="file-label">Katalog importieren<input type="file" accept="application/json,.json" @change="importCatalog"></label><label class="search">Suchen<input v-model="query" placeholder="Kompetenz suchen"></label></div>
    <p v-if="template?.highlightedCompetencyIds?.length" class="recommendation-note">Empfohlen für {{ template.name.de }}: hervorgehobene Kompetenzen sind eine fachliche Vorauswahl; alle Kompetenzen des Rahmens bleiben auswählbar.</p>
    <div v-if="catalog" class="competency-results"><label v-for="match in matches" :key="match.competency.id" :class="['competency-option', { recommended: recommended(match.competency) }]"><input type="checkbox" :checked="selected(match.competency)" @change="toggle(match.competency)"><span><small>{{ match.category }}</small>{{ match.competency.title }}<em v-if="recommended(match.competency)">Empfohlen für {{ template?.name.de }}</em><em v-else-if="match.competency.description">{{ match.competency.description }}</em></span></label></div>
    <p v-else class="empty-state">Aktivieren Sie einen Kompetenzrahmen oder wählen Sie eine Vorlage mit Kompetenzbezug.</p>
    <div class="chips" aria-label="Ausgewählte Kompetenzen"><span v-for="reference in plan.competencies" :key="reference.id" class="chip">{{ label(reference.catalogId, reference.competencyId) }}<button type="button" aria-label="Kompetenz entfernen" @click="plan.competencies = plan.competencies.filter((item) => item.id !== reference.id); emit('changed')">×</button></span></div>
  </section>
</template>
