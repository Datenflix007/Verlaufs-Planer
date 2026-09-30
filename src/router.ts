import { createRouter, createWebHistory } from 'vue-router'
export const router = createRouter({ history: createWebHistory(), routes: [
  { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
  { path: '/planungen', name: 'plan-overview', component: () => import('./views/PlanOverviewView.vue') },
  { path: '/materialien', name: 'learning-materials', component: () => import('./views/LearningStudioView.vue') },
  { path: '/materialien/:id', name: 'learning-material-edit', component: () => import('./views/LearningStudioView.vue') },
  { path: '/schuljahr', name: 'school-planning', component: () => import('./views/SchoolPlanningView.vue') },
  { path: '/einrichtung', name: 'school-onboarding', component: () => import('./views/OnboardingView.vue') },
  { path: '/stundenplan', name: 'timetable-settings', component: () => import('./views/TimetableSettingsView.vue') },
  { path: '/lehrplan', name: 'curriculum-viewer', component: () => import('./views/CurriculumViewerView.vue') },
  { path: '/reihen', name: 'sequence-planning', component: () => import('./views/SequencePlanningView.vue') },
  { path: '/plan/:id', name: 'editor', component: () => import('./views/EditorView.vue') },
  { path: '/plan/:id/preview', name: 'preview', component: () => import('./views/PreviewView.vue') },
  { path: '/plan/:id/presentation', name: 'presentation', component: () => import('./views/PresentationView.vue') },
  { path: '/plan/:id/presentation/presenter', name: 'presentation-presenter', component: () => import('./views/PresentationView.vue'), meta: { presenter: true } },
  { path: '/presentation/:presentationId/audience', name: 'presentation-audience', component: () => import('./presentation/components/AudienceView.vue') },
  { path: '/settings', component: () => import('./views/SettingsHubView.vue'), children: [
    { path: '', redirect: { name: 'workspace-settings' } },
    { path: 'workspace', name: 'workspace-settings', component: () => import('./views/WorkspaceSettingsView.vue') },
    { path: 'schedule-patterns', name: 'schedule-pattern-settings', component: () => import('./views/SchedulePatternSettingsView.vue') },
    { path: 'templates', name: 'template-settings', component: () => import('./views/TemplateSettingsView.vue') },
  ] },
] })
