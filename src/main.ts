import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles.css'
import './templates.css'
import { router } from './router'
import App from './App.vue'
createApp(App).use(createPinia()).use(router).mount('#app')
