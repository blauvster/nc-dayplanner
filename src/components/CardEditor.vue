<template>
	<NcAppSidebar
		v-if="entry"
		:name="entry.card.title"
		:subname="status"
		@close="$emit('close')">
		<NcAppSidebarTab id="details" name="Details" :order="0">
			<div class="card-editor">
				<NcCheckboxRadioSwitch :model-value="!!entry.card.done" @update:model-value="onToggleDone">
					Done
				</NcCheckboxRadioSwitch>

				<NcTextField
					:model-value="title"
					label="Title"
					@update:model-value="onTitleInput" />

				<div class="card-editor__dates">
					<NcDateTimePickerNative
						v-model="startLocal"
						type="datetime-local"
						label="Start"
						@update:model-value="onDatesChanged" />
					<NcDateTimePickerNative
						v-model="dueLocal"
						type="datetime-local"
						label="Due"
						@update:model-value="onDatesChanged" />
				</div>

				<DurationInput
					:model-value="durationMinutes"
					:disabled="!startLocal && !dueLocal"
					@update:model-value="onDurationChanged" />

				<div class="card-editor__description">
					<div class="card-editor__description-header">
						<h4>Description</h4>
						<NcButton variant="tertiary" @click="showDescriptionPreview = !showDescriptionPreview">
							{{ showDescriptionPreview ? 'Edit' : 'Preview' }}
						</NcButton>
					</div>
					<NcRichText
						v-if="showDescriptionPreview"
						class="card-editor__description-preview"
						:text="description || '*Nothing yet*'"
						use-markdown
						use-extended-markdown />
					<NcTextArea
						v-else
						:model-value="description"
						label="Description"
						hide-label
						@update:model-value="onDescriptionInput" />
				</div>

				<div v-if="boardLabels.length" class="card-editor__section">
					<h4>Labels</h4>
					<div class="card-editor__chips">
						<button
							v-for="label in boardLabels"
							:key="label.id"
							type="button"
							class="card-editor__chip"
							:class="{ 'card-editor__chip--active': hasLabel(label.id) }"
							:style="chipStyle(label.color, hasLabel(label.id))"
							@click="toggleLabel(label.id)">
							{{ label.title }}
						</button>
					</div>
				</div>

				<div v-if="boardUsers.length" class="card-editor__section">
					<h4>Assigned to</h4>
					<NcCheckboxRadioSwitch
						v-for="user in boardUsers"
						:key="user.uid"
						type="switch"
						:model-value="isAssigned(user.uid)"
						@update:model-value="(value) => toggleAssignee(user.uid, value)">
						{{ user.displayname }}
					</NcCheckboxRadioSwitch>
				</div>

				<div class="card-editor__section">
					<h4>Move</h4>
					<NcSelect
						v-model="selectedBoardId"
						:options="boardOptions"
						label="title"
						:reduce="(board) => board.id"
						:clearable="false"
						@update:model-value="onBoardChanged" />
					<NcSelect
						v-model="selectedStackId"
						:options="stackOptions"
						label="title"
						:reduce="(stack) => stack.id"
						:clearable="false"
						:disabled="stackOptions.length === 0"
						@update:model-value="onStackChanged" />
				</div>

				<div class="card-editor__actions">
					<NcButton :href="openInDeckUrl" target="_blank" rel="noopener">
						Open in Deck
					</NcButton>
					<NcButton variant="tertiary" @click="onArchive">
						{{ entry.card.archived ? 'Unarchive' : 'Archive' }}
					</NcButton>
					<NcButton variant="error" @click="onDelete">
						Delete
					</NcButton>
				</div>
			</div>
		</NcAppSidebarTab>

		<NcAppSidebarTab id="comments" name="Comments" :order="1">
			<CardComments :card-id="cardId" />
		</NcAppSidebarTab>

		<NcAppSidebarTab id="attachments" name="Attachments" :order="2">
			<CardAttachments :card-id="cardId" :board-id="entry.boardId" :stack-id="entry.stackId" />
		</NcAppSidebarTab>
	</NcAppSidebar>
</template>

<script>
import { generateUrl } from '@nextcloud/router'
import NcAppSidebar from '@nextcloud/vue/components/NcAppSidebar'
import NcAppSidebarTab from '@nextcloud/vue/components/NcAppSidebarTab'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import NcDateTimePickerNative from '@nextcloud/vue/components/NcDateTimePickerNative'
import NcRichText from '@nextcloud/vue/components/NcRichText'
import NcSelect from '@nextcloud/vue/components/NcSelect'
import NcTextArea from '@nextcloud/vue/components/NcTextArea'
import NcTextField from '@nextcloud/vue/components/NcTextField'
import CardAttachments from './CardAttachments.vue'
import CardComments from './CardComments.vue'
import DurationInput from './DurationInput.vue'
import { useBoardsStore } from '../store/boards.js'
import { useCardsStore } from '../store/cards.js'

const SAVE_DEBOUNCE_MS = 800

export default {
	name: 'CardEditor',
	components: {
		NcAppSidebar,
		NcAppSidebarTab,
		NcButton,
		NcCheckboxRadioSwitch,
		NcDateTimePickerNative,
		NcRichText,
		NcSelect,
		NcTextArea,
		NcTextField,
		CardAttachments,
		CardComments,
		DurationInput,
	},
	props: {
		cardId: {
			type: Number,
			default: null,
		},
	},
	emits: ['close'],
	setup() {
		return {
			boardsStore: useBoardsStore(),
			cardsStore: useCardsStore(),
		}
	},
	data() {
		return {
			title: '',
			description: '',
			startLocal: null,
			dueLocal: null,
			status: '',
			saveTimer: null,
			selectedBoardId: null,
			selectedStackId: null,
			showDescriptionPreview: false,
		}
	},
	computed: {
		entry() {
			return this.cardId === null ? null : this.cardsStore.entries[this.cardId]
		},
		openInDeckUrl() {
			return this.cardId === null ? '' : generateUrl('/apps/deck/card/{cardId}', { cardId: this.cardId })
		},
		durationMinutes() {
			if (this.startLocal && this.dueLocal) {
				return Math.round((this.dueLocal.getTime() - this.startLocal.getTime()) / 60000)
			}
			return null
		},
		board() {
			return this.entry ? this.boardsStore.boardById(this.entry.boardId) : null
		},
		boardLabels() {
			return this.board?.labels ?? []
		},
		boardUsers() {
			return this.board?.users ?? []
		},
		boardOptions() {
			return this.boardsStore.selectedBoards
		},
		stackOptions() {
			return this.cardsStore.stacksByBoard[this.selectedBoardId] ?? []
		},
	},
	watch: {
		entry: {
			immediate: true,
			handler(entry) {
				if (!entry) {
					return
				}
				this.title = entry.card.title
				this.description = entry.card.description ?? ''
				this.startLocal = entry.card.startdate ? new Date(entry.card.startdate) : null
				this.dueLocal = entry.card.duedate ? new Date(entry.card.duedate) : null
				this.selectedBoardId = entry.boardId
				this.selectedStackId = entry.stackId
				this.showDescriptionPreview = false
			},
		},
	},
	beforeUnmount() {
		clearTimeout(this.saveTimer)
	},
	methods: {
		onTitleInput(value) {
			this.title = value
			this.scheduleSave({ title: value })
		},
		onDescriptionInput(value) {
			this.description = value
			this.scheduleSave({ description: value })
		},
		onDatesChanged() {
			this.scheduleSave({
				startdate: this.startLocal ? this.startLocal.toISOString() : null,
				duedate: this.dueLocal ? this.dueLocal.toISOString() : null,
			})
		},
		onDurationChanged(minutes) {
			if (minutes === null) {
				return
			}
			if (this.startLocal) {
				this.dueLocal = new Date(this.startLocal.getTime() + minutes * 60000)
			} else if (this.dueLocal) {
				this.startLocal = new Date(this.dueLocal.getTime() - minutes * 60000)
			} else {
				return
			}
			this.onDatesChanged()
		},
		async onToggleDone() {
			await this.cardsStore.toggleDone(this.cardId)
			this.status = 'Saved'
		},
		scheduleSave(changes) {
			clearTimeout(this.saveTimer)
			this.status = 'Saving…'
			this.saveTimer = setTimeout(async () => {
				await this.cardsStore.updateCard(this.cardId, changes)
				this.status = 'Saved'
			}, SAVE_DEBOUNCE_MS)
		},
		hasLabel(labelId) {
			return this.entry.card.labels?.some((label) => label.id === labelId) ?? false
		},
		async toggleLabel(labelId) {
			await this.cardsStore.toggleLabel(this.cardId, labelId, !this.hasLabel(labelId))
		},
		chipStyle(color, active) {
			return {
				borderColor: '#' + color,
				backgroundColor: active ? '#' + color : 'transparent',
			}
		},
		isAssigned(userId) {
			return this.entry.card.assignedUsers?.some((assignment) => assignment.participant?.uid === userId) ?? false
		},
		async toggleAssignee(userId, assign) {
			await this.cardsStore.toggleAssignee(this.cardId, userId, assign)
		},
		onBoardChanged(boardId) {
			const stacks = this.cardsStore.stacksByBoard[boardId] ?? []
			this.selectedStackId = stacks[0]?.id ?? null
			if (this.selectedStackId) {
				this.cardsStore.moveCard(this.cardId, boardId, this.selectedStackId)
			}
		},
		onStackChanged(stackId) {
			this.cardsStore.moveCard(this.cardId, this.selectedBoardId, stackId)
		},
		async onArchive() {
			await this.cardsStore.archiveCard(this.cardId, !this.entry.card.archived)
			this.$emit('close')
		},
		async onDelete() {
			await this.cardsStore.deleteCard(this.cardId)
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.card-editor {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 12px;
}

.card-editor__dates {
	display: flex;
	gap: 8px;
}

.card-editor__description-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.card-editor__description-header h4 {
	margin: 0;
	font-weight: bold;
}

.card-editor__description-preview {
	padding: 8px;
	min-height: 60px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
}

.card-editor__section h4 {
	margin: 0 0 6px;
	font-weight: bold;
}

.card-editor__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.card-editor__chip {
	border: 2px solid;
	border-radius: var(--border-radius-pill);
	padding: 2px 10px;
	background: transparent;
	cursor: pointer;
	font-size: 12px;
}

.card-editor__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
</style>
