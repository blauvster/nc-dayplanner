import { defineStore } from 'pinia'
import {
	fetchStacks,
	fetchCard,
	updateCard as apiUpdateCard,
	createCard as apiCreateCard,
	deleteCard as apiDeleteCard,
	assignLabel as apiAssignLabel,
	removeLabel as apiRemoveLabel,
	assignUser as apiAssignUser,
	unassignUser as apiUnassignUser,
} from '../services/deckApi.js'
import { useBoardsStore } from './boards.js'
import { usePreferencesStore } from './preferences.js'

/**
 * Cards are keyed by id, each entry remembering which board/stack it came
 * from since Deck's update endpoint needs both to address a card.
 */
export const useCardsStore = defineStore('cards', {
	state: () => ({
		entries: {},
		/** boardId -> [{ id, title }] - for list pickers and backlog filters. */
		stacksByBoard: {},
		loading: false,
	}),
	getters: {
		allCards(state) {
			return Object.values(state.entries).filter((entry) => !entry.card.archived)
		},
		scheduledCards() {
			return this.allCards.filter((entry) => entry.card.startdate)
		},
		backlogCards() {
			return this.allCards.filter((entry) => !entry.card.startdate)
		},
	},
	actions: {
		async load() {
			const boardsStore = useBoardsStore()
			this.loading = true
			try {
				const entries = {}
				const stacksByBoard = {}
				await Promise.all(boardsStore.selectedIds.map(async (boardId) => {
					const stacks = await fetchStacks(boardId)
					stacksByBoard[boardId] = stacks.map((stack) => ({ id: stack.id, title: stack.title }))
					for (const stack of stacks) {
						for (const card of stack.cards ?? []) {
							entries[card.id] = { card, boardId, stackId: stack.id }
						}
					}
				}))
				this.entries = entries
				this.stacksByBoard = stacksByBoard
			} finally {
				this.loading = false
			}
		},

		async updateCard(cardId, changes) {
			const entry = this.entries[cardId]
			if (!entry) {
				return
			}
			const updated = await apiUpdateCard(entry.boardId, entry.stackId, entry.card, changes)
			this.entries[cardId] = { ...entry, card: updated }
		},

		/** Move or resize a block: sets both dates together (plan.md section 2). */
		async scheduleCard(cardId, startdate, duedate) {
			return this.updateCard(cardId, { startdate, duedate })
		},

		/** Drag a backlog card onto the timeline. */
		async scheduleFromBacklog(cardId, startdate, durationMinutes = null) {
			const entry = this.entries[cardId]
			if (!entry) {
				return
			}
			durationMinutes ??= usePreferencesStore().defaultDurationMinutes
			const start = new Date(startdate)
			let due
			if (entry.card.duedate && new Date(entry.card.duedate) > start) {
				due = entry.card.duedate
			} else {
				due = new Date(start.getTime() + durationMinutes * 60000).toISOString()
			}
			return this.updateCard(cardId, { startdate: start.toISOString(), duedate: due })
		},

		async unschedule(cardId) {
			return this.updateCard(cardId, { startdate: null })
		},

		async toggleDone(cardId) {
			const entry = this.entries[cardId]
			if (!entry) {
				return
			}
			return this.updateCard(cardId, { done: entry.card.done ? null : new Date().toISOString() })
		},

		async createCard(boardId, stackId, { title, startdate = null, duedate = null }) {
			const card = await apiCreateCard(boardId, stackId, { title, startdate, duedate })
			this.entries[card.id] = { card, boardId, stackId }
			return card
		},

		/** Move a card to another list, on the same board or a different one. */
		async moveCard(cardId, targetBoardId, targetStackId) {
			const entry = this.entries[cardId]
			if (!entry) {
				return
			}
			const updated = await apiUpdateCard(targetBoardId, targetStackId, entry.card)
			this.entries[cardId] = { card: updated, boardId: targetBoardId, stackId: targetStackId }
		},

		async archiveCard(cardId, archived = true) {
			return this.updateCard(cardId, { archived })
		},

		async deleteCard(cardId) {
			const entry = this.entries[cardId]
			if (!entry) {
				return
			}
			await apiDeleteCard(entry.boardId, entry.stackId, cardId)
			delete this.entries[cardId]
		},

		async toggleLabel(cardId, labelId, assign) {
			const entry = this.entries[cardId]
			if (!entry) {
				return
			}
			const updated = assign
				? await apiAssignLabel(entry.boardId, entry.stackId, cardId, labelId)
				: await apiRemoveLabel(entry.boardId, entry.stackId, cardId, labelId)
			this.entries[cardId] = { ...entry, card: updated }
		},

		async toggleAssignee(cardId, userId, assign) {
			const entry = this.entries[cardId]
			if (!entry) {
				return
			}
			// assignUser/unassignUser return the Assignment record, not the
			// card, so re-fetch to get the authoritative assignedUsers list.
			if (assign) {
				await apiAssignUser(entry.boardId, entry.stackId, cardId, userId)
			} else {
				await apiUnassignUser(entry.boardId, entry.stackId, cardId, userId)
			}
			const updated = await fetchCard(entry.boardId, entry.stackId, cardId)
			this.entries[cardId] = { ...entry, card: updated }
		},
	},
})
