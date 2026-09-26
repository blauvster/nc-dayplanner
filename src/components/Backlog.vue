<template>
	<div class="backlog">
		<div class="backlog__header">
			<h3 class="backlog__title">Backlog</h3>
			<NcButton variant="tertiary" @click="$emit('quick-add')">
				+ Add
			</NcButton>
		</div>

		<div ref="listEl" class="backlog__list-wrapper">
			<NcLoadingIcon v-if="cardsStore.loading" :size="20" />
			<NcEmptyContent v-else-if="filteredCards.length === 0" description="Nothing to schedule" />
			<ul v-else class="backlog__list">
				<li
					v-for="entry in filteredCards"
					:key="entry.card.id"
					class="backlog-card"
					:data-event="eventData(entry)"
					:style="{ borderLeftColor: '#' + boardColor(entry.boardId) }"
					@click="$emit('select', entry.card.id)">
					{{ entry.card.title }}
				</li>
			</ul>
		</div>

		<div class="backlog__filters">
			<NcSelect
				v-model="stackFilter"
				:options="stackOptions"
				label="label"
				:reduce="(option) => option.value"
				placeholder="All lists" />
			<NcSelect
				v-model="labelFilter"
				:options="labelOptions"
				label="label"
				:reduce="(option) => option.value"
				placeholder="All labels" />
			<NcCheckboxRadioSwitch type="switch" :model-value="assignedToMeOnly" @update:model-value="assignedToMeOnly = $event">
				Assigned to me
			</NcCheckboxRadioSwitch>
			<NcCheckboxRadioSwitch type="switch" :model-value="dueSoonOnly" @update:model-value="dueSoonOnly = $event">
				Due soon
			</NcCheckboxRadioSwitch>
		</div>
	</div>
</template>

<script>
import { Draggable } from '@fullcalendar/interaction'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import NcEmptyContent from '@nextcloud/vue/components/NcEmptyContent'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'
import NcSelect from '@nextcloud/vue/components/NcSelect'
import { useBoardsStore } from '../store/boards.js'
import { useCardsStore } from '../store/cards.js'

const DUE_SOON_HOURS = 48

export default {
	name: 'Backlog',
	components: {
		NcButton,
		NcCheckboxRadioSwitch,
		NcEmptyContent,
		NcLoadingIcon,
		NcSelect,
	},
	emits: ['select', 'quick-add'],
	setup() {
		return {
			boardsStore: useBoardsStore(),
			cardsStore: useCardsStore(),
		}
	},
	data() {
		return {
			stackFilter: null,
			labelFilter: null,
			assignedToMeOnly: false,
			dueSoonOnly: false,
		}
	},
	computed: {
		stackOptions() {
			const options = []
			for (const board of this.boardsStore.selectedBoards) {
				for (const stack of this.cardsStore.stacksByBoard[board.id] ?? []) {
					options.push({ value: stack.id, label: `${board.title} / ${stack.title}` })
				}
			}
			return options
		},
		labelOptions() {
			const options = []
			for (const board of this.boardsStore.selectedBoards) {
				for (const label of board.labels ?? []) {
					options.push({ value: label.id, label: `${board.title} / ${label.title}` })
				}
			}
			return options
		},
		currentUserId() {
			return window.OC?.getCurrentUser?.()?.uid ?? null
		},
		filteredCards() {
			const now = Date.now()
			const dueSoonCutoff = now + DUE_SOON_HOURS * 3600000
			return this.cardsStore.backlogCards.filter(({ card, stackId }) => {
				if (this.stackFilter !== null && stackId !== this.stackFilter) {
					return false
				}
				if (this.labelFilter !== null && !card.labels?.some((label) => label.id === this.labelFilter)) {
					return false
				}
				if (this.assignedToMeOnly && !card.assignedUsers?.some((a) => a.participant?.uid === this.currentUserId)) {
					return false
				}
				if (this.dueSoonOnly) {
					if (!card.duedate) {
						return false
					}
					const due = new Date(card.duedate).getTime()
					if (due > dueSoonCutoff) {
						return false
					}
				}
				return true
			})
		},
	},
	mounted() {
		this.draggable = new Draggable(this.$refs.listEl, {
			itemSelector: '.backlog-card',
			eventData: (el) => JSON.parse(el.dataset.event),
		})
	},
	beforeUnmount() {
		this.draggable?.destroy()
	},
	methods: {
		boardColor(boardId) {
			return this.boardsStore.boardById(boardId)?.color ?? '888888'
		},
		eventData(entry) {
			return JSON.stringify({
				title: entry.card.title,
				duration: '00:30',
				backgroundColor: '#' + this.boardColor(entry.boardId),
				extendedProps: { cardId: entry.card.id },
			})
		},
	},
}
</script>

<style scoped>
.backlog {
	padding: 8px;
}

.backlog__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.backlog__title {
	font-weight: bold;
	margin: 8px 0;
}

.backlog__filters {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-top: 12px;
}

.backlog__list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.backlog-card {
	padding: 6px 8px;
	border-left: 3px solid;
	background-color: var(--color-background-hover);
	border-radius: var(--border-radius);
	cursor: grab;
	font-size: 13px;
}

.backlog-card:hover {
	background-color: var(--color-background-dark);
}
</style>
