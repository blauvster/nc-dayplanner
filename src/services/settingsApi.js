import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

export async function getSelectedBoards() {
	const { data } = await axios.get(generateUrl('/apps/dayplanner/settings/boards'))
	return data.boardIds
}

export async function setSelectedBoards(boardIds) {
	const { data } = await axios.put(generateUrl('/apps/dayplanner/settings/boards'), { boardIds })
	return data.boardIds
}

export async function getPreferences() {
	const { data } = await axios.get(generateUrl('/apps/dayplanner/settings/preferences'))
	return data
}

export async function getCalendarSettings() {
	const { data } = await axios.get(generateUrl('/apps/dayplanner/settings/calendars'))
	return data
}

export async function setCalendarSettings(calendarUris, hideAll) {
	const { data } = await axios.put(generateUrl('/apps/dayplanner/settings/calendars'), { calendarUris, hideAll })
	return data
}
