import { createPinia } from 'pinia'
import { createApp } from 'vue'
import DashboardWidget from './components/DashboardWidget.vue'

document.addEventListener('DOMContentLoaded', () => {
	window.OCA.Dashboard.register('dayplanner-today', (el) => {
		const app = createApp(DashboardWidget)
		app.use(createPinia())
		app.mount(el)
	})
})
