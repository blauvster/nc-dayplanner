<template>
	<div ref="root" class="timeline">
		<div class="timeline__toolbar">
			<div class="timeline__toolbar-nav">
				<NcButton type="tertiary" aria-label="Previous" @click="goPrev">
					‹
				</NcButton>
				<NcButton type="tertiary" aria-label="Next" @click="goNext">
					›
				</NcButton>
				<NcButton type="secondary" @click="goToday">
					Today
				</NcButton>
				<NcActions :menu-name="currentViewLabel" force-menu>
					<NcActionButton
						v-for="option in viewOptions"
						:key="option.value"
						@click="changeView(option.value)">
						{{ option.label }}{{ currentView === option.value ? ' ✓' : '' }}
					</NcActionButton>
				</NcActions>
			</div>
			<div class="timeline__toolbar-title">
				{{ title }}
			</div>
		</div>
		<div ref="calendarWrapper" class="timeline__calendar">
			<FullCalendar v-if="calendarHeight" ref="calendar" :options="calendarOptions" />
		</div>
	</div>
</template>

<script>
import FullCalendar from '@fullcalendar/vue3'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import NcActionButton from '@nextcloud/vue/components/NcActionButton'
import NcActions from '@nextcloud/vue/components/NcActions'
import NcButton from '@nextcloud/vue/components/NcButton'
import { useBoardsStore } from '../store/boards.js'
import { useCalendarsStore } from '../store/calendars.js'
import { useCardsStore } from '../store/cards.js'
import { usePreferencesStore } from '../store/preferences.js'

const DUE_MARKER_DISPLAY_MINUTES = 15
const CALENDAR_REFRESH_MS = 5 * 60 * 1000
const VIEW_OPTIONS = [
	{ value: 'timeGridDay', label: 'Day' },
	{ value: 'timeGridThreeDay', label: '3 days' },
	{ value: 'timeGridWeek', label: 'Week' },
]

export default {
	name: 'Timeline',
	components: {
		FullCalendar,
		NcActionButton,
		NcActions,
		NcButton,
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
			// Explicit pixel height for FullCalendar, kept in sync with the
			// actual container size via ResizeObserver - see the comment on
			// `height` in calendarOptions for why this replaced '100%'.
			calendarHeight: null,
			resizeObserver: null,
			viewOptions: VIEW_OPTIONS,
			currentView: VIEW_OPTIONS[0].value,
			// FullCalendar's own headerToolbar is off (see calendarOptions) -
			// its title is mirrored here from datesSet instead.
			title: '',
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
			return this.calendarsStore.events.map((event) => ({
				id: `cal-${event.id}`,
				title: event.title,
				start: event.start,
				end: event.end,
				allDay: event.allDay,
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
		currentViewLabel() {
			return this.viewOptions.find((option) => option.value === this.currentView)?.label ?? ''
		},
		calendarOptions() {
			return {
				plugins: [timeGridPlugin, interactionPlugin],
				initialView: this.currentView,
				// Off: replaced by the toolbar in the template above, so the
				// view switcher can be a proper popup menu (NcActions) next
				// to Today instead of a row of buttons.
				headerToolbar: false,
				views: {
					timeGridThreeDay: {
						type: 'timeGrid',
						duration: { days: 3 },
						buttonText: '3 days',
						// Without this, prev/next would jump a full 3 days
						// (the view's duration) at a time; a single day is
						// the more useful step size for this view.
						dateIncrement: { days: 1 },
					},
				},
				// Re-enabled: the ballooning all-day row turned out to be a
				// symptom of `height: '100%'`'s self-referential layout, not
				// something wrong with the all-day row itself - see the
				// comment on `height` below.
				allDaySlot: true,
				nowIndicator: true,
				editable: true,
				droppable: true,
				selectable: true,
				// Read-only calendar events shouldn't be select/long-press
				// targets themselves (that's what eventClick's info dialog is
				// for) - only reject a selection landing on one of those, not
				// on top of a card (plan.md: cards can sit on calendar events).
				selectOverlap: (event) => !event.extendedProps.isCalendarEvent,
				// Cards are scheduled by time range (start/due), which the
				// all-day row can't represent - dropping/resizing one there
				// used to silently fail to persist and snap back on reload.
				// Block it up front instead (covers both dragging a backlog
				// card in and dragging/resizing an already-scheduled one).
				eventAllow: (dropInfo) => !dropInfo.allDay,
				selectAllow: (selectInfo) => !selectInfo.allDay,
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
				// A real pixel number (from ResizeObserver, see mounted()),
				// not '100%'. '100%' turned out to be the actual cause of
				// the persistent empty gap above the grid: it disabled
				// allDaySlot and even the day-header row and the gap stayed
				// put, which meant FullCalendar's own row-balancing pass -
				// not any specific row's content - was to blame. FullCalendar
				// sizes '100%'/'auto' by measuring its own rendered layout
				// and feeding that back into a ResizeObserver-driven
				// re-layout; inside a CSS-percentage/flex ancestor chain
				// (like Nextcloud's app-content, not a fixed-px container)
				// that measurement can overshoot and settle on a taller
				// header/body split than the container actually has, which
				// is exactly what an all-day-row or header-row CSS override
				// can't touch since it's not a row-height problem. Giving it
				// a real, externally-measured number sidesteps that
				// self-referential calculation entirely.
				height: this.calendarHeight,
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
		// contentRect is always the content box (padding/border already
		// excluded), so this is exactly the space available to FullCalendar
		// inside .timeline's own padding.
		this.resizeObserver = new ResizeObserver((entries) => {
			const height = entries[0]?.contentRect?.height
			if (height) {
				this.calendarHeight = Math.round(height)
			}
		})
		// The custom toolbar (prev/next/today/view menu) is a sibling that
		// takes its own space above the grid now - observing this wrapper
		// rather than .timeline itself means the measured height already
		// excludes it, instead of telling FullCalendar it has room it
		// doesn't (which would just push the grid's bottom off-screen by
		// the toolbar's height).
		this.resizeObserver.observe(this.$refs.calendarWrapper)
	},
	beforeUnmount() {
		clearInterval(this.refreshTimer)
		this.resizeObserver?.disconnect()
	},
	methods: {
		goPrev() {
			this.$refs.calendar.getApi().prev()
		},
		goNext() {
			this.$refs.calendar.getApi().next()
		},
		goToday() {
			this.$refs.calendar.getApi().today()
		},
		changeView(view) {
			this.currentView = view
			this.$refs.calendar.getApi().changeView(view)
		},
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
			this.title = info.view.title
			this.currentView = info.view.type
			this.reloadCalendarEvents()
			this.$nextTick(() => requestAnimationFrame(() => this.syncAllDayRowHeight()))
		},
		reloadCalendarEvents() {
			if (this.visibleRange) {
				this.calendarsStore.loadEvents(this.visibleRange.start, this.visibleRange.end)
			}
		},
		// Gives the all-day row a default height matching one hour of the
		// grid below (via a CSS var + min-height, so it can still grow past
		// that for more events) instead of FullCalendar's own
		// content-hugging default, which looks cramped with just one event.
		// Measuring a real rendered slot rather than hardcoding a pixel
		// value keeps this correct regardless of theme font size; the *2
		// assumes the default 30-minute slotDuration (never overridden in
		// calendarOptions).
		syncAllDayRowHeight() {
			const slot = this.$refs.root?.querySelector('.fc-timegrid-slot-lane')
			if (!slot) {
				return
			}
			const hourHeight = slot.getBoundingClientRect().height * 2
			// A 0 reading (layout not painted yet) would otherwise set the CSS
			// var to an explicit 0px, which - unlike leaving it unset - beats
			// the fallback in var(--hour-row-height, 3rem) and silently undoes
			// the whole fix.
			if (hourHeight > 0) {
				this.$refs.root.style.setProperty('--hour-row-height', `${hourHeight}px`)
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
	display: flex;
	flex-direction: column;
}

.timeline__calendar {
	flex: 1 1 auto;
	/* Without this a flex child won't shrink below its content's natural
	   size, so the calendar could still force the toolbar off-screen
	   instead of the reverse. */
	min-height: 0;
}

/* Default the all-day row to one hour-row's height (set as a CSS var by
   syncAllDayRowHeight()) rather than FullCalendar's own content-hugging
   default, which turned out to render around 1.5 hour-rows tall even for
   an EMPTY day. Found via a headless-browser inspection (Playwright) of
   the live DOM, since guessing at selectors from source reading alone
   had stalled out: the actual driver wasn't the day cell at all, it was
   the "all-day" axis label cell - forcing just the day-side smaller had
   no effect because a table row's height is the max of every cell in it,
   and that label cell's own natural size was the bigger one. On top of
   that, a `height`/`min-height` this specific ancestor chain (day-frame,
   day cell, row, table, the .fc-daygrid-body wrapper, and the whole axis
   label chain) all needed the same value set together - overriding any
   subset of them left the rest free to re-assert the bigger natural
   size. min-height/height together (not max-height) so it still grows
   for more events, confirmed by simulating a taller day cell and
   checking the row grows with it rather than clipping. */
.timeline .fc-daygrid-day-frame,
.timeline .fc-daygrid-day,
.timeline .fc-daygrid-body tr,
.timeline .fc-daygrid-body table,
.timeline .fc-daygrid-body,
.timeline .fc-timegrid-axis,
.timeline .fc-timegrid-axis-frame,
.timeline .fc-timegrid-axis-cushion {
	min-height: var(--hour-row-height, 3rem) !important;
	height: var(--hour-row-height, 3rem) !important;
}

/* Custom toolbar replacing FullCalendar's own (headerToolbar: false above). */
.timeline__toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 8px;
	padding-block-end: 8px;
}

.timeline__toolbar-nav {
	display: flex;
	align-items: center;
	gap: 4px;
}

.timeline__toolbar-title {
	font-size: 1.1rem;
	font-weight: bold;
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
