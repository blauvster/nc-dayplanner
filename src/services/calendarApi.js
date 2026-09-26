import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

export async function fetchCalendars() {
	const { data } = await axios.get(generateUrl('/apps/dayplanner/calendars'))
	return data
}

export async function fetchEvents(start, end, calendarUris = []) {
	const { data } = await axios.get(generateUrl('/apps/dayplanner/calendar-events'), {
		params: {
			start: start.toISOString(),
			end: end.toISOString(),
			calendars: calendarUris,
		},
	})
	return data
}
