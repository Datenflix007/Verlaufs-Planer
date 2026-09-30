<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Presentation } from '../../domain/types'
import { orderedSlides } from '../presentation'
import SlideCanvas from './SlideCanvas.vue'
const props = defineProps<{ presentation: Presentation; initialSlideId?: string }>(); const emit = defineEmits<{ close: [] }>()
const slides = computed(() => orderedSlides(props.presentation)); const currentId = ref(props.initialSlideId && slides.value.some((slide) => slide.id === props.initialSlideId) ? props.initialSlideId : slides.value[0]?.id); const slide = computed(() => slides.value.find((item) => item.id === currentId.value)); const index = computed(() => slides.value.findIndex((item) => item.id === currentId.value))
function move(step: number): void { const next = slides.value[index.value + step]; if (next) currentId.value = next.id }
function key(event: KeyboardEvent): void { if (event.key === 'Escape') emit('close'); if (event.key === 'ArrowRight') move(1); if (event.key === 'ArrowLeft') move(-1) }
onMounted(() => window.addEventListener('keydown', key)); onBeforeUnmount(() => window.removeEventListener('keydown', key))
</script>
<template><section class="preview-overlay"><header><strong>Vorschau</strong><span>Folie {{ index + 1 }} von {{ slides.length }}</span><button type="button" @click="emit('close')">Schließen</button></header><SlideCanvas v-if="slide" :key="slide.id" :slide="slide" :theme-id="presentation.themeId" readonly /><footer><button type="button" :disabled="index <= 0" @click="move(-1)">←</button><button type="button" :disabled="index >= slides.length - 1" @click="move(1)">→</button></footer></section></template>
<style scoped>.preview-overlay{position:fixed;z-index:100;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;place-items:center;padding:1rem;background:#071317f2}.preview-overlay header,.preview-overlay footer{display:flex;align-items:center;gap:1rem;width:min(100%,1200px);color:#e8f6f5}.preview-overlay header span{margin-right:auto;color:#a7c2c2}.preview-overlay :deep(.slide-canvas){width:min(100%,calc(100vh * 1.78));max-height:calc(100vh - 150px)}.preview-overlay footer{justify-content:center}</style>
