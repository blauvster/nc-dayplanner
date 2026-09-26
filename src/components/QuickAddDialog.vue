<template>
	<NcDialog
		:open="open"
		name="Quick add"
		:buttons="buttons"
		is-form
		@update:open="$emit('update:open', $event)"
		@submit.prevent="onConfirm">
		<div class="quick-add">
			<NcTextField
				ref="titleField"
				:model-value="title"
				label="Title"
				autofocus
				@update:model-value="title = $event" />
			<NcSelect
				v-model="selectedBoardId"
				:options="boardsStore.selectedBoards"
				label="title"
				:reduce="(board) => board.id"
				:clearable="false"
				placeholder="Board" />
			<NcSelect
				v-model="selectedStackId"
				:options="stackOptions"
				label="title"
				:reduce="(stack) => stack.id"
				:clearable="false"
				:disabled="stackOptions.length === 0"
				placeholder="List" />
			<DurationInput v-if="initialStart" v-model="durationMinutes" />
		</div>
	</NcDialog>
</template>

<script>
import NcDialog from '@nextcloud/vue/components/NcDialog'
import NcSelect from '@nextcloud/vue/components/NcSelect'
import NcTextField from '@nextcloud/vue/components/NcTextField'
import DurationInput from './DurationInput.vue'
import { useBoardsStore } from '../store/boards.js'
import { useCardsStore } from '../store/cards.js'
import { usePreferencesStore } from '../store/preferences.js'

export default {
	name: 'QuickAddDialog',
	components: {
		NcDialog,
		NcSelect,
		NcTextField,
		DurationInput,
	},
	props: {
		open: {
			type: Boolean,
			default: false,
		},
		initialStart: {
			type: Date,
			default: null,
		},
		initialEnd: {
			type: Date,
			default: null,
		},
	},
	emits: ['update:open', 'created'],
	setup() {
		return {
			boardsStore: useBoardsStore(),
			cardsStore: useCardsStore(),
			preferencesStore: usePreferencesStore(),
		}
	},
	data() {
		return {
			title: '',
			selectedBoardId: null,
			selectedStackId: null,
			durationMinutes: 30,
		}
	},
	computed: {
		stackOptions() {
			return this.cardsStore.stacksByBoard[this.selectedBoardId] ?? []
		},
		buttons() {
			return [
				{ label: 'Cancel', callback: () => this.$emit('update:open', false) },
				{ label: 'Add', variant: 'primary', callback: this.onConfirm },
			]
		},
	},
	watch: {
		open(isOpen) {
			if (isOpen) {
				this.reset()
			}
		},
		selectedBoardId(boardId) {
			const stacks = this.cardsStore.stacksByBoard[boardId] ?? []
			this.selectedStackId = stacks[0]?.id ?? null
		},
	},
	methods: {
		reset() {
			this.title = ''
			this.selectedBoardId = this.boardsStore.selectedBoards[0]?.id ?? null
			if (this.initialStart && this.initialEnd) {
				this.durationMinutes = Math.max(1, Math.round((this.initialEnd - this.initialStart) / 60000))
			} else {
				this.durationMinutes = this.preferencesStore.defaultDurationMinutes
			}
		},
		async onConfirm() {
			if (!this.title.trim() || !this.selectedBoardId || !this.selectedStackId) {
				return
			}
			const startdate = this.initialStart ? this.initialStart.toISOString() : null
			const duedate = this.initialStart
				? new Date(this.initialStart.getTime() + this.durationMinutes * 60000).toISOString()
				: null
			const card = await this.cardsStore.createCard(this.selectedBoardId, this.selectedStackId, {
				title: this.title.trim(),
				startdate,
				duedate,
			})
			this.$emit('created', card)
			this.$emit('update:open', false)
		},
	},
}
</script>

<style scoped>
.quick-add {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0 12px;
}
</style>
