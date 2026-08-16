import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
// apply the persisted theme (data-theme on <html>) before first paint
import './composables/useTheme'

createApp(App).mount('#app')
