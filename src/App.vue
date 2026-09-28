<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppearanceStore } from './stores/appearanceStore'

const appearance = useAppearanceStore()
onMounted(() => void appearance.load())
</script>

<template><RouterView /></template>
