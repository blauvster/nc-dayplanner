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
import { loadSessionState, saveSessionState } from '../services/sessionState.js'
import { useBoardsStore } from '../store/boards.js'
import { useCalendarsStore } from '../store/calendars.js'
import { useCardsStore } from '../store/cards.js'
import { usePreferencesStore } from '../store/preferences.js'
import { formatDuration } from '../utils/duration.js'

const DUE_MARKER_DISPLAY_MINUTES = 15
const CALENDAR_REFRESH_MS = 5 * 60 * 1000
const VIEW_OPTIONS = [
	{ value: 'timeGridDay', label: 'Day' },
	{ value: 'timeGridThreeDay', label: '3 days' },
	{ value: 'timeGridWeek', label: 'Week' },
]

/**
 * A translucent tint of the calendar's own color, so overlapping calendar
 * events (which FullCalendar fans into side-by-side columns like any
 * other event, but used to all look like the same grey diagonal-stripe
 * pattern) are distinguishable by hue instead of blurring into a single
 * crosshatched mass.
 */
function tintFromHex(hex, alpha) {
	const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex ?? '')
	if (!match) {
		return 'transparent'
	}
	const [, r, g, b] = match
	return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`
}

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
		const savedView = loadSessionState('timelineView', null)
		return {
			visibleRange: null,
			refreshTimer: null,
			// Explicit pixel height for FullCalendar, kept in sync with the
			// actual container size via ResizeObserver - see the comment on
			// `height` in calendarOptions for why this replaced '100%'.
			calendarHeight: null,
			resizeObserver: null,
			viewOptions: VIEW_OPTIONS,
			currentView: VIEW_OPTIONS.some((option) => option.value === savedView) ? savedView : VIEW_OPTIONS[0].value,
			// Only read once, at mount - initialDate is a one-time FullCalendar
			// init option, not something to keep reactively in sync.
			initialDate: loadSessionState('timelineDate', null) ?? undefined,
			// FullCalendar's own headerToolbar is off (see calendarOptions) -
			// its title is mirrored here from datesSet instead.
			title: '',
			// The scroller element currently being tracked for save-on-scroll
			// (see setupScrollTracking) - re-diffed on every datesSet since
			// FullCalendar can recreate it on a view change.
			scrollerEl: null,
			scrollSaveTimer: null,
			scrollRestored: false,
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
				backgroundColor: tintFromHex(event.color, 0.35),
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
				// One-time restore of the last-viewed date across reloads
				// (see data()) - undefined just means "today", FullCalendar's
				// own default.
				initialDate: this.initialDate,
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
				// No selectOverlap/selectAllow/eventAllow here on purpose:
				// each one, independently, was found (via a headless-browser
				// mouse-drag test) to silently break starting a NEW
				// drag-select entirely as soon as any event exists anywhere
				// on the calendar - a FullCalendar bug/quirk with these
				// constraint-callback props in this version, not a logic
				// problem in what they returned. All-day blocking and the
				// calendar-event-overlap rule are enforced after the fact
				// instead, in onSelect/onEventDrop/onEventResize/
				// onEventReceive below.
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
				eventContent: this.renderEventContent,
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
			// calendarOptions (and so FullCalendar's `height` option) only
			// actually changes, prompting a redraw, when calendarHeight's
			// VALUE changes - a width-only resize (e.g. the card editor
			// sidebar opening/closing) leaves it untouched, and FullCalendar
			// doesn't auto-detect a CSS-driven resize of its own container
			// the way it does a browser window resize. Nudge it explicitly
			// on every observed resize, not just ones that change height.
			this.$refs.calendar?.getApi()?.updateSize()
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
		this.scrollerEl?.removeEventListener('scroll', this.onTimelineScroll)
		clearTimeout(this.scrollSaveTimer)
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
		// Scheduled cards get "6:30 - 8:15 (1h 45m)" instead of FullCalendar's
		// default "6:30 - 8:15" - calendar events and due-date markers keep
		// the default rendering (returning true) since a duration isn't
		// meaningful for either. Rebuilds FullCalendar's own event DOM
		// structure (fc-event-main-frame/fc-event-time/fc-event-title) by
		// hand rather than just editing arg.timeText, since eventContent
		// replaces the whole content area, not just the time text.
		renderEventContent(arg) {
			const { event } = arg
			if (event.extendedProps.isCalendarEvent || event.id.startsWith('due-')) {
				return true
			}
			const minutes = event.start && event.end ? Math.round((event.end - event.start) / 60000) : null
			const duration = minutes ? formatDuration(minutes) : ''

			const mainFrame = document.createElement('div')
			mainFrame.className = 'fc-event-main-frame'

			if (arg.timeText) {
				const timeEl = document.createElement('div')
				timeEl.className = 'fc-event-time'
				timeEl.textContent = duration ? `${arg.timeText} (${duration})` : arg.timeText
				mainFrame.appendChild(timeEl)
			}

			const titleContainer = document.createElement('div')
			titleContainer.className = 'fc-event-title-container'
			const titleEl = document.createElement('div')
			titleEl.className = 'fc-event-title fc-sticky'
			titleEl.textContent = event.title
			titleContainer.appendChild(titleEl)
			mainFrame.appendChild(titleContainer)

			return { domNodes: [mainFrame] }
		},
		onEventDrop(info) {
			// Cards are scheduled by time range, which the all-day row can't
			// represent - checked here rather than via eventAllow (see the
			// comment on calendarOptions for why).
			if (info.event.allDay) {
				info.revert()
				return
			}
			const cardId = info.event.extendedProps.cardId
			this.cardsStore.scheduleCard(cardId, info.event.start.toISOString(), info.event.end.toISOString())
				.catch(() => info.revert())
		},
		onEventResize(info) {
			if (info.event.allDay) {
				info.revert()
				return
			}
			const cardId = info.event.extendedProps.cardId
			this.cardsStore.scheduleCard(cardId, info.event.start.toISOString(), info.event.end.toISOString())
				.catch(() => info.revert())
		},
		onEventReceive(info) {
			if (info.event.allDay) {
				info.event.remove()
				return
			}
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
			// Same reasoning as the drop/resize/receive guards above: this
			// used to be selectAllow, which broke drag-select entirely once
			// any event existed.
			if (info.allDay) {
				return
			}
			// A selection overlapping a calendar event used to be silently
			// rejected here (this used to be selectOverlap) - with no
			// feedback, that just looked like drag-select randomly not
			// working. Cards can already sit on top of calendar events once
			// scheduled, so let quick-add create one the same way.
			this.$emit('quick-add', { start: info.start, end: info.end })
		},
		onDatesSet(info) {
			this.visibleRange = { start: info.start, end: info.end }
			this.title = info.view.title
			this.currentView = info.view.type
			saveSessionState('timelineView', info.view.type)
			saveSessionState('timelineDate', info.start.toISOString())
			this.reloadCalendarEvents()
			this.$nextTick(() => requestAnimationFrame(() => this.syncAllDayRowHeight()))
			this.$nextTick(() => requestAnimationFrame(() => {
				this.setupScrollTracking()
				this.restoreScrollOnce()
			}))
		},
		reloadCalendarEvents() {
			if (this.visibleRange) {
				this.calendarsStore.loadEvents(this.visibleRange.start, this.visibleRange.end)
			}
		},
		// FullCalendar can recreate the scroller element on a view change, so
		// this re-diffs on every datesSet rather than attaching once in
		// mounted(). Save-on-scroll rather than only on unmount/navigation,
		// since the tab can just be closed without either of those firing.
		setupScrollTracking() {
			const scroller = this.$refs.root?.querySelector('.fc-scroller-liquid-absolute')
			if (!scroller || scroller === this.scrollerEl) {
				return
			}
			this.scrollerEl?.removeEventListener('scroll', this.onTimelineScroll)
			this.scrollerEl = scroller
			scroller.addEventListener('scroll', this.onTimelineScroll, { passive: true })
		},
		onTimelineScroll() {
			clearTimeout(this.scrollSaveTimer)
			this.scrollSaveTimer = setTimeout(() => {
				saveSessionState('timelineScroll', this.scrollerEl.scrollTop)
			}, 200)
		},
		// Once per page load, not once per datesSet - this restores where you
		// left off on reload, not on every date/view navigation afterward
		// (which would just fight your own scrolling).
		restoreScrollOnce() {
			if (this.scrollRestored) {
				return
			}
			this.scrollRestored = true
			const savedScroll = loadSessionState('timelineScroll', null)
			if (savedScroll !== null && this.scrollerEl) {
				this.scrollerEl.scrollTop = savedScroll
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

/* .fc-event.dayplanner-event--done (not just .dayplanner-event--done) is
   needed to outrank FullCalendar's own `a.fc-event { text-decoration:
   none }` and Nextcloud's global `a { text-decoration: none }` - both
   apply here since FullCalendar renders each event as an <a>, and both
   have higher specificity than a single class selector. The :hover
   variant needs the same treatment separately, to outrank FullCalendar's
   OWN `a.fc-event:hover { text-decoration: none }` (hovering was
   reverting the strike-through otherwise). */
.fc-event.dayplanner-event--done,
.fc-event.dayplanner-event--done:hover {
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
	/* The diagonal-stripe pattern this used to have (instead of a plain
	   fill) turned into unreadable crosshatch noise wherever two or more
	   calendar events overlapped - FullCalendar fans them into side-by-side
	   columns same as any other event, but every column had the identical
	   grey pattern layered on top of each other's, with no way to tell
	   which stripes belonged to which event. A solid, per-calendar-colored
	   tint (see tintFromHex, applied as backgroundColor above) reads
	   clearly at any number of overlaps instead. */
	/* Read-only: suppress the browser's default tap-highlight so a short
	   press doesn't visually look like it "selected" the event before
	   eventClick's info dialog opens. */
	-webkit-tap-highlight-color: transparent;
}
</style>
