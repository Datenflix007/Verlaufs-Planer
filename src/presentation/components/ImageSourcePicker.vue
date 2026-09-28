<script setup lang="ts">
import type { Material } from "../../domain/types";

defineProps<{ materials: Material[] }>();
const emit = defineEmits<{ select: [source: string] }>();

function pickFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file?.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") emit("select", reader.result);
  };
  reader.readAsDataURL(file);
  input.value = "";
}
</script>

<template>
  <div class="image-picker">
    <label class="upload"
      >Bilddatei wählen<input type="file" accept="image/*" @change="pickFile"
    /></label>
    <button
      v-for="material in materials"
      :key="material.id"
      type="button"
      @click="emit('select', material.description!)"
    >
      {{ material.name }}
    </button>
    <small v-if="!materials.length">Keine Bilddatei im Planmaterial.</small>
  </div>
</template>

<style scoped>
.image-picker {
  display: grid;
  gap: 0.3rem;
  min-width: 170px;
}
.upload {
  display: block;
  padding: 0.35rem 0.5rem;
  color: #e6f4f3;
  cursor: pointer;
}
.upload:hover,
.image-picker button:hover {
  background: #28535a;
}
.upload input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.image-picker button {
  padding: 0.35rem 0.5rem;
  color: #e6f4f3;
  background: transparent;
  border: 0;
  text-align: left;
}
.image-picker small {
  padding: 0.25rem 0.5rem;
  color: #a8c2c3;
}
</style>
