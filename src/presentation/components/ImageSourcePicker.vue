<script setup lang="ts">
import { computed, ref } from "vue";
import type { Material } from "../../domain/types";

const props = withDefaults(
  defineProps<{
    materials?: Material[];
    planId?: string;
    mediaType?: "image" | "video";
  }>(),
  { materials: () => [], mediaType: "image" },
);
const emit = defineEmits<{ select: [source: string] }>();
const url = ref("");
const error = ref("");
const noun = computed(() => (props.mediaType === "video" ? "Video" : "Bild"));
const accept = computed(() => `${props.mediaType}/*`);

function dataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}
async function pickFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!file.type.startsWith(`${props.mediaType}/`)) {
    error.value = `Bitte eine ${noun.value.toLowerCase()}datei auswählen.`;
    return;
  }
  error.value = "";
  try {
    const data = await dataUrl(file);
    if (!props.planId) {
      emit("select", data);
      return;
    }
    const response = await fetch("/api/presentation-media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId: props.planId, name: file.name, data }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) throw new Error(payload.error || "Medium konnte nicht gespeichert werden.");
    emit("select", payload.url);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Medium konnte nicht gespeichert werden.";
  }
}
function pickUrl(): void {
  const source = url.value.trim();
  if (!/^https?:\/\//i.test(source)) {
    error.value = "Bitte eine vollständige http(s)-URL eingeben.";
    return;
  }
  error.value = "";
  url.value = "";
  emit("select", source);
}
</script>

<template>
  <div class="image-picker">
    <label class="upload"
      >{{ noun }}datei als Kopie speichern<input :aria-label="`${noun}datei als Kopie auswählen`" type="file" :accept="accept" @change="pickFile"
    /></label>
    <div class="url-source">
      <input v-model="url" type="url" :placeholder="`${noun}-URL (https://…)`" @keydown.enter.prevent="pickUrl" />
      <button type="button" @click="pickUrl">URL einfügen</button>
    </div>
    <button
      v-for="material in materials"
      :key="material.id"
      type="button"
      @click="emit('select', material.description!)"
    >
      {{ material.name }}
    </button>
    <small v-if="!materials.length">Lokale {{ noun.toLowerCase() }}datei oder URL wählen.</small>
    <small v-if="error" class="error" role="alert">{{ error }}</small>
  </div>
</template>

<style scoped>
.image-picker { display: grid; gap: 0.3rem; min-width: 210px; }
.upload { display: block; padding: 0.35rem 0.5rem; color: #e6f4f3; cursor: pointer; }
.upload:hover, .image-picker button:hover { background: #28535a; }
.upload input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.url-source { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.25rem; padding: 0.2rem 0.5rem; }
.url-source input { min-width: 0; color: #17363a; background: #fff; border: 1px solid #6f9a9a; border-radius: 3px; }
.image-picker button { padding: 0.35rem 0.5rem; color: #e6f4f3; background: transparent; border: 0; text-align: left; }
.url-source button { background: #17646a; border: 1px solid #4c9b9c; border-radius: 3px; }
.image-picker small { padding: 0.25rem 0.5rem; color: #a8c2c3; }.image-picker .error { color: #ffaaa9; }
</style>
