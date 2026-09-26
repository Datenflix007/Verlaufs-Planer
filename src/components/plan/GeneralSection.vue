<script setup lang="ts">
import { computed } from 'vue'
import { getPlanningTemplate, getPlanningTemplates } from '../../data/templates/registry'
import type { WorkshopPlan } from '../../domain/types'

defineProps<{ plan: WorkshopPlan }>()
const emit = defineEmits<{ changed: [] }>()
const templates = computed(() => getPlanningTemplates())

function switchTemplate(plan: WorkshopPlan, event: Event): void {
  const template = getPlanningTemplate((event.target as HTMLSelectElement).value)
  if (!template) { plan.settings.templateId = undefined; emit('changed'); return }
  plan.settings.templateId = template.id
  plan.settings.enabledCompetencyFrameworkIds = [...new Set([...(plan.settings.enabledCompetencyFrameworkIds ?? []), ...template.competencyFrameworkIds])]
  emit('changed')
}
</script>

<template>
  <section class="section-card">
    <div class="section-heading"><p class="eyebrow">Dokument</p><h1>Allgemeine Angaben</h1><p>Der Rahmen fuer Ihre Planung und den spaeteren Export.</p></div>
    <div class="form-grid">
      <label class="full">Planungsvorlage<select :value="plan.settings.templateId ?? ''" @change="switchTemplate(plan, $event)"><option value="">Ohne Vorlage</option><option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name.de }}</option></select><small>Vorlagen sind lokale Benutzerinhalte. Der Wechsel ergaenzt Referenzen und Vorschlaege, ohne vorhandene Inhalte zu loeschen.</small></label>
      <label class="full">Titel<input v-model="plan.metadata.title" required @change="emit('changed')"></label><label class="full">Untertitel<input v-model="plan.metadata.subtitle" @change="emit('changed')"></label>
      <label>Fach / Thema<input v-model="plan.metadata.subject" @change="emit('changed')"></label><label>Zielgruppe<input v-model="plan.metadata.targetGroup" @change="emit('changed')"></label><label>Institution<input v-model="plan.metadata.institution" @change="emit('changed')"></label><label>Ort<input v-model="plan.metadata.location" @change="emit('changed')"></label>
      <label class="full">Autorinnen und Autoren <input :value="plan.metadata.authors.join(', ')" placeholder="Kommagetrennt" @change="plan.metadata.authors = ($event.target as HTMLInputElement).value.split(',').map((item) => item.trim()).filter(Boolean); emit('changed')"></label><label class="full">Kurzbeschreibung<textarea v-model="plan.metadata.description" rows="4" @change="emit('changed')" /></label>
    </div>
  </section>
</template>
