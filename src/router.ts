import { createRouter, createWebHistory } from 'vue-router'
export const router = createRouter({ history: createWebHistory(), routes: [
  { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
  { path: '/plan/:id', name: 'editor', component: () => import('./views/EditorView.vue') },
  { path: '/plan/:id/preview', name: 'preview', component: () => import('./views/PreviewView.vue') },
  { path: '/settings/templates', name: 'template-settings', component: () => import('./views/TemplateSettingsView.vue') },
  { path: '/settings/schedule-patterns', name: 'schedule-pattern-settings', component: () => import('./views/SchedulePatternSettingsView.vue') },
] })
