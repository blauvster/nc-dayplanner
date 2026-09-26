<template>
	<div class="timeline">
		<FullCalendar ref="calendar" :options="calendarOptions" />
	</div>
</template>

<script>
import FullCalendar from '@fullcalendar/vue3'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useBoardsStore } from '../store/boards.js'
import { useCalendarsStore } from '../store/calendars.js'
import { useCardsStore } from '../store/cards.js'
import { usePreferencesStore } from '../store/preferences.js'

const DUE_MARKER_DISPLAY_MINUTES = 15
const CALENDAR_REFRESH_MS = 5 * 60 * 1000

export default {
	name: 'Timeline',
	components: {
		FullCalendar,
	},
	emits: ['select', 'select-calendar-event', 'quick-add'],
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
			visibleRange: null,
			refreshTimer: null,
		}
	},
	computed: {
		scheduledEvents() {
			return this.cardsStore.scheduledCards.map(({ card, boardId }) => ({
				id: String(card.id),
				title: card.title,
				start: card.startdate,
				end: card.duedate,
				backgroundColor: '#' + (this.boardsStore.boardById(boardId)?.color ?? '888888'),
				borderColor: 'transparent',
				classNames: card.done ? ['dayplanner-event--done'] : [],
				extendedProps: { cardId: card.id },
			}))
		},
		/** Cards with only a due date show a marker (plan.md section 1/2). */
		dueMarkerEvents() {
			return this.cardsStore.backlogCards
				.filter(({ card }) => card.duedate)
				.map(({ card, boardId }) => ({
					id: `due-${card.id}`,
					title: `${card.title} (due)`,
					start: card.duedate,
					end: new Date(new Date(card.duedate).getTime() + DUE_MARKER_DISPLAY_MINUTES * 60000).toISOString(),
					backgroundColor: 'transparent',
					borderColor: '#' + (this.boardsStore.boardById(boardId)?.color ?? '888888'),
					textColor: 'var(--color-main-text)',
					editable: false,
					classNames: ['dayplanner-event--due-marker'],
					extendedProps: { cardId: card.id },
				}))
		},
		/** Read-only calendar events, drawn distinctly from cards (plan.md "Calendar events"). */
		calendarEvents() {
			// allDaySlot is off (see calendarOptions) - an all-day event
			// would just be silently dropped by FullCalendar, so filter it
			// out here rather than pass along data that can never display.
			return this.calendarsStore.events
				.filter((event) => !event.allDay)
				.map((event) => ({
					id: `cal-${event.id}`,
					title: event.title,
					start: event.start,
					end: event.end,
					backgroundColor: 'transparent',
					borderColor: event.color,
					textColor: 'var(--color-main-text)',
					editable: false,
					startEditable: false,
					durationEditable: false,
					classNames: ['dayplanner-event--calendar'],
					extendedProps: { isCalendarEvent: true, event },
				}))
		},
		events() {
			return [...this.scheduledEvents, ...this.dueMarkerEvents, ...this.calendarEvents]
		},
		calendarOptions() {
			return {
				plugins: [timeGridPlugin, interactionPlugin],
				initialView: 'timeGridDay',
				headerToolbar: {
					left: 'prev,next today',
					center: 'title',
					right: 'timeGridDay,timeGridThreeDay,timeGridWeek',
				},
				views: {
					timeGridThreeDay: {
						type: 'timeGrid',
						duration: { days: 3 },
						buttonText: '3 days',
					},
				},
				// Off: FullCalendar's all-day row resists every attempt to
				// keep it sized to its content once events load (CSS
				// !important, JS-forced inline styles, a MutationObserver
				// reacting to its own DOM changes - all lost to whatever
				// async layout pass actually controls it) - see README's
				// Known Issues. All-day calendar events are simply not
				// shown for now rather than shipping a broken giant row.
				allDaySlot: false,
				nowIndicator: true,
				editable: true,
				droppable: true,
				selectable: true,
				// Read-only calendar events shouldn't be select/long-press
				// targets themselves (that's what eventClick's info dialog is
				// for) - only reject a selection landing on one of those, not
				// on top of a card (plan.md: cards can sit on calendar events).
				selectOverlap: (event) => !event.extendedProps.isCalendarEvent,
				// Lets you drag the top edge to change the start time
				// independently of dragging the whole card (bottom-edge
				// resize for the due/end time already worked).
				eventResizableFromStart: true,
				// Explicit rather than trusting FullCalendar's own default:
				// there's a code path where an unresolved (non-numeric) delay
				// skips the wait entirely and starts a touch drag/select on
				// the very first pixel of movement, which is indistinguishable
				// from a scroll swipe.
				longPressDelay: 1000,
				selectLongPressDelay: 1000,
				eventLongPressDelay: 1000,
				// '100%': now that the debug overlay confirmed the ambient
				// container chain gives .timeline a real bounded height, let
				// FullCalendar manage its own internal split - a sticky
				// header (prev/next/today, view switcher) with just the grid
				// body scrolling underneath. 'auto' rendered header+body as
				// one continuous block, so the outer scroller carried the
				// header away too and there was no dedicated scroll region
				// left to reach the rest of the grid.
				height: '100%',
				// Full day stays scrollable; working hours only decide where
				// it scrolls to on open (below), not what's reachable at all.
				slotMinTime: '00:00:00',
				slotMaxTime: '24:00:00',
				scrollTime: `${this.preferencesStore.workingHoursStart}:00`,
				snapDuration: { minutes: this.preferencesStore.snapStepMinutes },
				events: this.events,
				eventDrop: this.onEventDrop,
				eventResize: this.onEventResize,
				eventReceive: this.onEventReceive,
				eventClick: this.onEventClick,
				select: this.onSelect,
				datesSet: this.onDatesSet,
			}
		},
	},
	watch: {
		'calendarsStore.selectedUris': {
			deep: true,
			handler() {
				this.reloadCalendarEvents()
			},
		},
		'calendarsStore.hideAll'() {
			this.reloadCalendarEvents()
		},
	},
	mounted() {
		this.refreshTimer = setInterval(() => this.reloadCalendarEvents(), CALENDAR_REFRESH_MS)
	},
	beforeUnmount() {
		clearInterval(this.refreshTimer)
	},
	methods: {
		onEventDrop(info) {
			const cardId = info.event.extendedProps.cardId
			this.cardsStore.scheduleCard(cardId, info.event.start.toISOString(), info.event.end.toISOString())
				.catch(() => info.revert())
		},
		onEventResize(info) {
			const cardId = info.event.extendedProps.cardId
			this.cardsStore.scheduleCard(cardId, info.event.start.toISOString(), info.event.end.toISOString())
				.catch(() => info.revert())
		},
		onEventReceive(info) {
			const cardId = info.event.extendedProps.cardId
			// The store's reactive `events` list renders the real event once
			// scheduling succeeds; drop FullCalendar's own placeholder so we
			// don't end up with two.
			info.event.remove()
			this.cardsStore.scheduleFromBacklog(cardId, info.event.start.toISOString())
		},
		onEventClick(info) {
			if (info.event.extendedProps.isCalendarEvent) {
				this.$emit('select-calendar-event', info.event.extendedProps.event)
				return
			}
			this.$emit('select', info.event.extendedProps.cardId)
		},
		onSelect(info) {
			this.$refs.calendar.getApi().unselect()
			this.$emit('quick-add', { start: info.start, end: info.end })
		},
		onDatesSet(info) {
			this.visibleRange = { start: info.start, end: info.end }
			this.reloadCalendarEvents()
		},
		reloadCalendarEvents() {
			if (this.visibleRange) {
				this.calendarsStore.loadEvents(this.visibleRange.start, this.visibleRange.end)
			}
		},
	},
}
</script>

<style>
.timeline {
	box-sizing: border-box;
	height: 100%;
	padding: 8px;
	/* Clears NcAppNavigation's collapse/expand toggle (absolutely positioned
	   over the top-left corner of the content area) horizontally rather than
	   with top padding - padding-top shrank FullCalendar's own measured
	   height by the same amount, silently cutting the last couple of hours
	   off the scrollable day. */
	padding-inline-start: calc(var(--default-clickable-area, 44px) + 8px);
}

/* FullCalendar's own internal scroll box (height:'100%' mode) - .timeline's
   padding sits outside it, so it doesn't give the last slot any breathing
   room. Without this the final hour can end up flush with (or just past)
   the scroller's own bottom edge. */
.timeline .fc-scroller {
	padding-bottom: 80px;
}

.dayplanner-event--done {
	opacity: 0.5;
	text-decoration: line-through;
}

.dayplanner-event--due-marker {
	border-width: 2px;
	border-style: dashed;
	font-style: italic;
}

.dayplanner-event--calendar {
	border-width: 2px;
	border-style: solid;
	background-image: repeating-linear-gradient(
		45deg,
		var(--color-background-hover),
		var(--color-background-hover) 4px,
		transparent 4px,
		transparent 8px
	);
	/* Read-only: suppress the browser's default tap-highlight so a short
	   press doesn't visually look like it "selected" the event before
	   eventClick's info dialog opens. */
	-webkit-tap-highlight-color: transparent;
}
</style>
