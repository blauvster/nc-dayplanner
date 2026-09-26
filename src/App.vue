<template>
	<NcContent app-name="dayplanner">
		<NcAppNavigation>
			<template #list>
				<Backlog @select="selectedCardId = $event" @quick-add="openQuickAdd()" />
				<BoardList />
				<CalendarList />
			</template>
		</NcAppNavigation>
		<NcAppContent>
			<NcEmptyContent
				v-if="boardsStore.loaded && boardsStore.selectedIds.length === 0"
				description="Pick a board on the left to see its timeline." />
			<Timeline
				v-else
				@select="selectedCardId = $event"
				@select-calendar-event="selectedCalendarEvent = $event"
				@quick-add="openQuickAdd" />
		</NcAppContent>
		<CardEditor :card-id="selectedCardId" @close="selectedCardId = null" />
		<QuickAddDialog
			v-model:open="quickAddOpen"
			:initial-start="quickAddStart"
			:initial-end="quickAddEnd"
			@created="selectedCardId = $event.id" />
		<CalendarEventDialog
			:open="selectedCalendarEvent !== null"
			:event="selectedCalendarEvent"
			@update:open="selectedCalendarEvent = null" />
	</NcContent>
</template>

<script>
import NcAppContent from '@nextcloud/vue/components/NcAppContent'
import NcAppNavigation from '@nextcloud/vue/components/NcAppNavigation'
import NcContent from '@nextcloud/vue/components/NcContent'
import NcEmptyContent from '@nextcloud/vue/components/NcEmptyContent'
import Backlog from './components/Backlog.vue'
import BoardList from './components/BoardList.vue'
import CalendarEventDialog from './components/CalendarEventDialog.vue'
import CalendarList from './components/CalendarList.vue'
import CardEditor from './components/CardEditor.vue'
import QuickAddDialog from './components/QuickAddDialog.vue'
import Timeline from './components/Timeline.vue'
import { useBoardsStore } from './store/boards.js'
import { useCalendarsStore } from './store/calendars.js'
import { useCardsStore } from './store/cards.js'
import { usePreferencesStore } from './store/preferences.js'

export default {
	name: 'App',
	components: {
		NcContent,
		NcAppNavigation,
		NcAppContent,
		NcEmptyContent,
		BoardList,
		CalendarList,
		Backlog,
		Timeline,
		CardEditor,
		QuickAddDialog,
		CalendarEventDialog,
	},
	setup() {
		return {
			boardsStore: useBoardsStore(),
			cardsStore: useCardsStore(),
			calendarsStore: useCalendarsStore(),
			preferencesStore: usePreferencesStore(),
		}
	},
	data() {
		return {
			selectedCardId: null,
			selectedCalendarEvent: null,
			quickAddOpen: false,
			quickAddStart: null,
			quickAddEnd: null,
		}
	},
	watch: {
		'boardsStore.selectedIds': {
			deep: true,
			handler() {
				this.cardsStore.load()
			},
		},
	},
	async mounted() {
		await Promise.all([
			this.boardsStore.load(),
			this.calendarsStore.load(),
			this.preferencesStore.load(),
		])
		await this.cardsStore.load()
	},
	methods: {
		openQuickAdd(range) {
			this.quickAddStart = range?.start ?? null
			this.quickAddEnd = range?.end ?? null
			this.quickAddOpen = true
		},
	},
}
</script>
