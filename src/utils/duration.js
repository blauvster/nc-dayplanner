/**
 * Duration parsing/formatting per plan.md section 2: accepts "90m", "1h30",
 * "1:30" or "1.5h", plus a bare number of minutes. Returns whole minutes,
 * or null if the text doesn't parse or isn't greater than zero.
 */
export function parseDuration(input) {
	if (input === null || input === undefined) {
		return null
	}
	const text = String(input).trim().toLowerCase()
	if (text === '') {
		return null
	}

	let minutes = null

	let match = text.match(/^(\d+):([0-5]?\d)$/)
	if (match) {
		minutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
	}

	if (minutes === null) {
		match = text.match(/^(\d+(?:\.\d+)?)h\s*(\d{1,2})?m?$/)
		if (match) {
			minutes = Math.round(parseFloat(match[1]) * 60) + (match[2] ? parseInt(match[2], 10) : 0)
		}
	}

	if (minutes === null) {
		match = text.match(/^(\d+(?:\.\d+)?)m$/)
		if (match) {
			minutes = Math.round(parseFloat(match[1]))
		}
	}

	if (minutes === null) {
		match = text.match(/^(\d+(?:\.\d+)?)$/)
		if (match) {
			minutes = Math.round(parseFloat(match[1]))
		}
	}

	return minutes !== null && minutes > 0 ? minutes : null
}

export function formatDuration(minutes) {
	if (!minutes || minutes <= 0) {
		return ''
	}
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	if (hours === 0) {
		return `${mins}m`
	}
	if (mins === 0) {
		return `${hours}h`
	}
	return `${hours}h ${mins}m`
}

export const DURATION_PRESETS = [
	{ label: '15m', minutes: 15 },
	{ label: '30m', minutes: 30 },
	{ label: '1h', minutes: 60 },
	{ label: '2h', minutes: 120 },
]
