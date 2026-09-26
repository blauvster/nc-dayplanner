import { defineStore } from 'pinia'
import { getPreferences } from '../services/settingsApi.js'

/**
 * Read-only in the main app - these are edited on the personal settings
 * page (lib/Settings/Personal.php + src/settings-personal.js).
 */
export const usePreferencesStore = defineStore('preferences', {
	state: () => ({
		workingHoursStart: '09:00',
		workingHoursEnd: '18:00',
		snapStepMinutes: 15,
		defaultDurationMinutes: 30,
		loaded: false,
	}),
	actions: {
		async load() {
			const preferences = await getPreferences()
			Object.assign(this, preferences)
			this.loaded = true
		},
	},
})
