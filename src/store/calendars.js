import { defineStore } from 'pinia'
import { fetchCalendars, fetchEvents } from '../services/calendarApi.js'
import { getCalendarSettings, setCalendarSettings } from '../services/settingsApi.js'

export const useCalendarsStore = defineStore('calendars', {
	state: () => ({
		calendars: [],
		selectedUris: [],
		hideAll: false,
		events: [],
		loaded: false,
		loading: false,
	}),
	getters: {
		calendarByUri(state) {
			return (uri) => state.calendars.find((calendar) => calendar.uri === uri)
		},
	},
	actions: {
		async load() {
			this.loading = true
			try {
				const [calendars, settings] = await Promise.all([
					fetchCalendars(),
					getCalendarSettings(),
				])
				this.calendars = calendars
				const validUris = new Set(calendars.map((calendar) => calendar.uri))
				this.selectedUris = settings.calendarUris.filter((uri) => validUris.has(uri))
				this.hideAll = settings.hideAll
				this.loaded = true
			} finally {
				this.loading = false
			}
		},

		async toggleCalendar(uri) {
			const index = this.selectedUris.indexOf(uri)
			if (index === -1) {
				this.selectedUris.push(uri)
			} else {
				this.selectedUris.splice(index, 1)
			}
			await setCalendarSettings(this.selectedUris, this.hideAll)
		},

		async setHideAll(hideAll) {
			this.hideAll = hideAll
			await setCalendarSettings(this.selectedUris, hideAll)
		},

		/** Reload events for the timeline's currently visible date range. */
		async loadEvents(start, end) {
			if (this.hideAll || this.selectedUris.length === 0) {
				this.events = []
				return
			}
			this.events = await fetchEvents(start, end, this.selectedUris)
		},
	},
})
