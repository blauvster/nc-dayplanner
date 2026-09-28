/**
 * Small per-tab UI state (backlog filters, last quick-add destination) that
 * should survive a reload but isn't worth round-tripping to the server -
 * sessionStorage rather than the PreferencesService's persisted settings.
 */

const PREFIX = 'dayplanner.'

export function loadSessionState(key, fallback) {
	try {
		const raw = sessionStorage.getItem(PREFIX + key)
		return raw === null ? fallback : JSON.parse(raw)
	} catch (e) {
		return fallback
	}
}

export function saveSessionState(key, value) {
	try {
		sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
	} catch (e) {
		// Private browsing / storage full / disabled - losing this is fine.
	}
}
