import './style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme.store'

Chart.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend)

const app = createApp(App)

app.use(createPinia())
app.use(router)

useThemeStore().init()

app.mount('#app')
