import { defineStore } from 'pinia'
import { fetchBoards } from '../services/deckApi.js'
import { getSelectedBoards, setSelectedBoards } from '../services/settingsApi.js'

export const useBoardsStore = defineStore('boards', {
	state: () => ({
		boards: [],
		selectedIds: [],
		loaded: false,
		loading: false,
	}),
	getters: {
		selectedBoards(state) {
			return state.boards.filter((board) => state.selectedIds.includes(board.id))
		},
		boardById(state) {
			return (boardId) => state.boards.find((board) => board.id === boardId)
		},
	},
	actions: {
		async load() {
			this.loading = true
			try {
				const [boards, selectedIds] = await Promise.all([
					fetchBoards(),
					getSelectedBoards(),
				])
				this.boards = boards.filter((board) => !board.archived)
				const validIds = new Set(this.boards.map((board) => board.id))
				this.selectedIds = selectedIds.filter((id) => validIds.has(id))
				this.loaded = true
			} finally {
				this.loading = false
			}
		},
		async toggleBoard(boardId) {
			const index = this.selectedIds.indexOf(boardId)
			if (index === -1) {
				this.selectedIds.push(boardId)
			} else {
				this.selectedIds.splice(index, 1)
			}
			await setSelectedBoards(this.selectedIds)
		},
	},
})
