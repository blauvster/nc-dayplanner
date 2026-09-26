import axios from '@nextcloud/axios'
import { generateOcsUrl, generateUrl } from '@nextcloud/router'

/** Comments and attachments go through Deck's OCS-style routes, which need
 * this header/param pair and return the standard OCS {ocs: {data}} envelope. */
const OCS_CONFIG = { headers: { 'OCS-APIREQUEST': 'true' }, params: { format: 'json' } }

/**
 * Thin wrapper around Deck's own REST API (/apps/deck/api/v1.0/...), called
 * directly from the browser using the logged-in session - see plan.md
 * section 3. No data is proxied through our own backend.
 */

export async function fetchBoards() {
	const { data } = await axios.get(generateUrl('/apps/deck/api/v1.0/boards'))
	return data
}

export async function fetchStacks(boardId) {
	const { data } = await axios.get(
		generateUrl('/apps/deck/api/v1.0/boards/{boardId}/stacks', { boardId }),
	)
	return data
}

export async function fetchCard(boardId, stackId, cardId) {
	const { data } = await axios.get(
		generateUrl('/apps/deck/api/v1.0/boards/{boardId}/stacks/{stackId}/cards/{cardId}', {
			boardId, stackId, cardId,
		}),
	)
	return data
}

/**
 * Deck's card update endpoint replaces the whole card, so we always send
 * the full writable field set, merging in whatever changed.
 */
export async function updateCard(boardId, stackId, card, changes = {}) {
	const payload = {
		title: card.title,
		type: card.type,
		owner: card.owner?.uid ?? card.owner,
		description: card.description ?? '',
		order: card.order ?? 0,
		duedate: card.duedate,
		startdate: card.startdate,
		archived: card.archived ?? false,
		color: card.color ?? null,
		...changes,
	}
	const { data } = await axios.put(
		generateUrl('/apps/deck/api/v1.0/boards/{boardId}/stacks/{stackId}/cards/{cardId}', {
			boardId, stackId, cardId: card.id,
		}),
		payload,
	)
	return data
}

export async function createCard(boardId, stackId, { title, startdate = null, duedate = null }) {
	const { data } = await axios.post(
		generateUrl('/apps/deck/api/v1.0/boards/{boardId}/stacks/{stackId}/cards', { boardId, stackId }),
		{ title, startdate, duedate },
	)
	return data
}

export async function deleteCard(boardId, stackId, cardId) {
	await axios.delete(
		generateUrl('/apps/deck/api/v1.0/boards/{boardId}/stacks/{stackId}/cards/{cardId}', {
			boardId, stackId, cardId,
		}),
	)
}

export async function assignLabel(boardId, stackId, cardId, labelId) {
	const { data } = await axios.put(
		generateUrl('/apps/deck/api/v1.0/boards/{boardId}/stacks/{stackId}/cards/{cardId}/assignLabel', {
			boardId, stackId, cardId,
		}),
		{ labelId },
	)
	return data
}

export async function removeLabel(boardId, stackId, cardId, labelId) {
	const { data } = await axios.put(
		generateUrl('/apps/deck/api/v1.0/boards/{boardId}/stacks/{stackId}/cards/{cardId}/removeLabel', {
			boardId, stackId, cardId,
		}),
		{ labelId },
	)
	return data
}

export async function assignUser(boardId, stackId, cardId, userId) {
	const { data } = await axios.put(
		generateUrl('/apps/deck/api/v1.0/boards/{boardId}/stacks/{stackId}/cards/{cardId}/assignUser', {
			boardId, stackId, cardId,
		}),
		{ userId, type: 0 },
	)
	return data
}

export async function unassignUser(boardId, stackId, cardId, userId) {
	const { data } = await axios.put(
		generateUrl('/apps/deck/api/v1.0/boards/{boardId}/stacks/{stackId}/cards/{cardId}/unassignUser', {
			boardId, stackId, cardId,
		}),
		{ userId, type: 0 },
	)
	return data
}

export async function fetchComments(cardId) {
	const { data } = await axios.get(
		generateOcsUrl('/apps/deck/api/v1.0/cards/{cardId}/comments', { cardId }), OCS_CONFIG)
	return data.ocs.data
}

export async function createComment(cardId, message) {
	const { data } = await axios.post(
		generateOcsUrl('/apps/deck/api/v1.0/cards/{cardId}/comments', { cardId }), { message }, OCS_CONFIG)
	return data.ocs.data
}

export async function deleteComment(cardId, commentId) {
	await axios.delete(
		generateOcsUrl('/apps/deck/api/v1.0/cards/{cardId}/comments/{commentId}', { cardId, commentId }), OCS_CONFIG)
}

export async function fetchAttachments(cardId) {
	const { data } = await axios.get(
		generateOcsUrl('/apps/deck/api/v1.0/cards/{cardId}/attachments', { cardId }), OCS_CONFIG)
	return data.ocs.data
}

export async function uploadAttachment(cardId, file) {
	const formData = new FormData()
	formData.append('type', 'deck_file')
	formData.append('file', file)
	const { data } = await axios.post(
		generateOcsUrl('/apps/deck/api/v1.0/cards/{cardId}/attachment', { cardId }), formData, OCS_CONFIG)
	return data.ocs.data
}

export async function deleteAttachment(cardId, attachmentId, type = 'deck_file') {
	await axios.delete(
		generateOcsUrl('/apps/deck/api/v1.0/cards/{cardId}/attachments/{type}:{attachmentId}', {
			cardId, type, attachmentId,
		}),
		OCS_CONFIG,
	)
}

/** Deck has no OCS download route; this one still needs board/stack context. */
export function attachmentDownloadUrl(boardId, stackId, cardId, attachmentId, type = 'deck_file') {
	return generateUrl(
		'/apps/deck/api/v1.1/boards/{boardId}/stacks/{stackId}/cards/{cardId}/attachments/{type}/{attachmentId}',
		{ boardId, stackId, cardId, type, attachmentId },
	)
}
