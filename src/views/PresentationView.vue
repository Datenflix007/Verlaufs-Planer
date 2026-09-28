<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import PlanSidebar from "../components/plan/PlanSidebar.vue";
import type { PlanningSectionId } from "../domain/types";
import { ensurePresentation } from "../presentation/presentation";
import { reserveAudience } from "../presentation/audienceWindow";
import AudienceView from "../presentation/components/AudienceView.vue";
import PresentationEditor from "../presentation/components/PresentationEditor.vue";
import PresentationPreview from "../presentation/components/PresentationPreview.vue";
import PresenterConsole from "../presentation/components/PresenterConsole.vue";
import PresentationExportStage from "../presentation/components/PresentationExportStage.vue";
import { buildPresentationHtml, buildPresentationPdf, capturePresentation, presentationFilename } from "../presentation/presentationExport";
import { downloadBlob } from "../export/download";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";

const route = useRoute();
const router = useRouter();
const project = useProjectStore();
const editor = useEditorStore();
const plan = computed(() => project.activePlan);
const presenter = computed(() => route.meta.presenter === true);
const initialSlideId = computed(() =>
  typeof route.query.slide === "string" ? route.query.slide : undefined,
);
const previewSlideId = ref<string>();
const exporting = ref<'pdf' | 'html'>();
const exportError = ref('');
const exportHost = ref<HTMLElement>();
let timer: number | undefined;
onMounted(async () => {
  try {
    if (project.activePlanId !== String(route.params.id))
      await project.open(String(route.params.id));
    if (plan.value && !plan.value.presentation) {
      ensurePresentation(plan.value);
      await project.save();
    }
  } catch {
    await router.replace({ name: "home" });
  }
});
watch(
  () => route.params.id,
  async (id) => {
    if (id && id !== project.activePlanId) await project.open(String(id));
  },
);
function changed(): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void project.save(), 350);
}
async function exportPresentation(format: 'pdf' | 'html'): Promise<void> {
  if (exporting.value || !plan.value?.presentation) return;
  exporting.value = format;
  exportError.value = '';
  try {
    await nextTick();
    if (!exportHost.value) throw new Error('Die Exportansicht ist nicht verfügbar.');
    const presentation = plan.value.presentation;
    const slides = await capturePresentation(exportHost.value, presentation);
    const blob = format === 'pdf'
      ? new Blob([new Uint8Array(await buildPresentationPdf(presentation, slides))], { type: 'application/pdf' })
      : new Blob([buildPresentationHtml(presentation, slides)], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, presentationFilename(presentation, format));
  } catch (cause) {
    exportError.value = cause instanceof Error ? cause.message : 'Die Präsentation konnte nicht exportiert werden.';
  } finally {
    exporting.value = undefined;
  }
}
async function present(slideId: string): Promise<void> {
  if (!plan.value?.presentation) return;
  const prepared = reserveAudience(window, plan.value.presentation.id);
  await project.save();
  if (project.saveStatus === "error") {
    prepared.popup?.close();
    window.alert(
      "Die Präsentation konnte nicht gespeichert werden. Bitte den SQLite-Speicherfehler beheben.",
    );
    return;
  }
  await router.push({
    name: "presentation-presenter",
    params: { id: plan.value.id },
    query: { slide: slideId },
  });
}
async function back(): Promise<void> {
  window.clearTimeout(timer);
  await project.save();
  if (plan.value)
    await router.push({ name: "presentation", params: { id: plan.value.id } });
}
function select(section: PlanningSectionId): void {
  if (plan.value)
    void router.push({
      name: "editor",
      params: { id: plan.value.id },
      query: { section },
    });
}
</script>
<template>
  <AudienceView v-if="route.name === 'presentation-audience'" />
  <main v-else-if="plan && plan.presentation">
    <PresenterConsole
      v-if="presenter"
      :plan="plan"
      :presentation="plan.presentation"
      :initial-slide-id="initialSlideId"
      @changed="changed"
      @close="back"
    />
    <div v-else class="editor-shell presentation-shell">
      <header class="editor-header">
        <button
          type="button"
          class="brand"
          @click="router.push({ name: 'editor', params: { id: plan.id } })"
        >
          Verlaufsplaner</button
        ><span class="crumb">› Präsentation</span
        ><span class="save-state" :class="project.saveStatus">{{
          project.saveStatus === "saving"
            ? "Speichert …"
            : project.saveStatus === "error"
              ? "SQLite-Speicherfehler"
              : "Gespeichert"
        }}</span
        ><span class="header-spacer" />
        <span v-if="exporting" class="export-status" role="status">{{ exporting.toUpperCase() }} wird erstellt …</span>
        <span v-if="exportError" class="export-error" role="alert">Export fehlgeschlagen: {{ exportError }}</span>
      </header>
      <div class="editor-body">
        <PlanSidebar
          :section="editor.section"
          :plan="plan"
          presentation-active
          @select="select"
          @presentation="() => undefined"
        />
        <section class="presentation-content">
          <PresentationEditor
            :plan="plan"
            :initial-slide-id="initialSlideId"
            @changed="changed"
            @present="present"
            @preview="previewSlideId = $event"
            @export="exportPresentation"
          />
        </section>
      </div>
    </div>
    <PresentationPreview
      v-if="previewSlideId"
      :presentation="plan.presentation"
      :initial-slide-id="previewSlideId"
      @close="previewSlideId = undefined"
    />
    <div v-if="exporting" ref="exportHost"><PresentationExportStage :presentation="plan.presentation" /></div>
  </main>
  <main v-else class="loading">Präsentation wird geöffnet …</main>
</template>
<style scoped>
.presentation-shell {
  background: #102126;
}
.presentation-shell :deep(.editor-header) {
  min-height: 48px;
  padding: 0.45rem 0.9rem;
  color: #e7f4f3;
  background: #183238;
  border-color: #365259;
}
.presentation-shell :deep(.brand) {
  color: #f0fbfa;
}
.presentation-shell :deep(.save-state) {
  color: #9bc3c3;
  border-color: #446369;
}
.crumb {
  color: #b7d1d1;
  font-size: 0.82rem;
}
.export-status { color: #9ce8db; font-size: 0.8rem; }
.export-error { color: #ffb9a9; font-size: 0.8rem; }
.presentation-content {
  min-width: 0;
}
</style>
