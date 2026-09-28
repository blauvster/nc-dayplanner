/**
 * Duration parsing/formatting per plan.md section 2: accepts "90m", "1h30",
 * "1:30" or "1.5h", plus days ("1d", "1d2h", "1d 2h 30m", "1.5d") and a bare
 * number of minutes. Returns whole minutes, or null if the text doesn't
 * parse or isn't greater than zero.
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
		match = text.match(/^(?:(\d+(?:\.\d+)?)d)?\s*(?:(\d+(?:\.\d+)?)h)?\s*(\d{1,2})?m?$/)
		if (match && (match[1] || match[2] || match[3])) {
			const days = match[1] ? parseFloat(match[1]) : 0
			const hours = match[2] ? parseFloat(match[2]) : 0
			const mins = match[3] ? parseInt(match[3], 10) : 0
			minutes = Math.round(days * 24 * 60 + hours * 60 + mins)
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
	const days = Math.floor(minutes / 1440)
	const hours = Math.floor((minutes % 1440) / 60)
	const mins = minutes % 60
	const parts = []
	if (days) {
		parts.push(`${days}d`)
	}
	if (hours) {
		parts.push(`${hours}h`)
	}
	if (mins) {
		parts.push(`${mins}m`)
	}
	return parts.join(' ')
}

export const DURATION_PRESETS = [
	{ label: '15m', minutes: 15 },
	{ label: '30m', minutes: 30 },
	{ label: '1h', minutes: 60 },
	{ label: '2h', minutes: 120 },
]
