<template>
	<NcDashboardWidget
		:items="items"
		:loading="loading"
		empty-content-message="Nothing scheduled for today" />
</template>

<script>
import { generateUrl } from '@nextcloud/router'
import NcDashboardWidget from '@nextcloud/vue/components/NcDashboardWidget'
import { useBoardsStore } from '../store/boards.js'
import { useCardsStore } from '../store/cards.js'

export default {
	name: 'DashboardWidget',
	components: {
		NcDashboardWidget,
	},
	setup() {
		return {
			boardsStore: useBoardsStore(),
			cardsStore: useCardsStore(),
		}
	},
	data() {
		return {
			loading: true,
		}
	},
	computed: {
		items() {
			const now = new Date()
			const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
			const endOfDay = new Date(startOfDay.getTime() + 24 * 3600000)

			return this.cardsStore.scheduledCards
				.filter(({ card }) => {
					const start = new Date(card.startdate)
					return start >= startOfDay && start < endOfDay
				})
				.sort((a, b) => new Date(a.card.startdate) - new Date(b.card.startdate))
				.map(({ card, boardId }) => ({
					id: card.id,
					targetUrl: generateUrl('/apps/dayplanner/'),
					mainText: card.title,
					subText: `${this.formatTime(card.startdate)} · ${this.boardsStore.boardById(boardId)?.title ?? ''}`,
				}))
		},
	},
	async mounted() {
		await this.boardsStore.load()
		await this.cardsStore.load()
		this.loading = false
	},
	methods: {
		formatTime(value) {
			return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
		},
	},
}
</script>
