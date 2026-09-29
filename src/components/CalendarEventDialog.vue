<template>
	<NcDialog
		:open="open"
		:name="event ? event.title : ''"
		:buttons="buttons"
		size="small"
		@update:open="$emit('update:open', $event)">
		<div v-if="event" class="calendar-event">
			<p>{{ timeRange }}</p>
			<p v-if="event.location">{{ event.location }}</p>
		</div>
	</NcDialog>
</template>

<script>
import { generateUrl } from '@nextcloud/router'
import NcDialog from '@nextcloud/vue/components/NcDialog'

export default {
	name: 'CalendarEventDialog',
	components: {
		NcDialog,
	},
	props: {
		open: {
			type: Boolean,
			default: false,
		},
		event: {
			type: Object,
			default: null,
		},
	},
	emits: ['update:open', 'duplicate'],
	computed: {
		timeRange() {
			if (!this.event) {
				return ''
			}
			const start = new Date(this.event.start)
			const end = new Date(this.event.end)
			if (this.event.allDay) {
				return start.toLocaleDateString()
			}
			const dateFormat = { dateStyle: 'medium' }
			const timeFormat = { timeStyle: 'short' }
			return `${start.toLocaleDateString(undefined, dateFormat)} `
				+ `${start.toLocaleTimeString(undefined, timeFormat)} - ${end.toLocaleTimeString(undefined, timeFormat)}`
		},
		buttons() {
			// No explicit "Close" button - the dialog's own × already covers
			// that, and adding one back here just fights "Open in Calendar"
			// and "Duplicate as card" for space on narrow screens (with 3
			// buttons in the footer, all three ended up visually truncated).
			const buttons = []
			if (this.event && window.OC?.appswebroots?.calendar) {
				// objectId/recurrenceId (from CalendarController) jump straight
				// to this event's own editor via Calendar's "direct edit" route;
				// fall back to just the day view if either is missing for some
				// reason (defensive - every backend we've tested provides them).
				const url = (this.event.objectId && this.event.recurrenceId)
					? generateUrl('/apps/calendar/edit/{objectId}/{recurrenceId}', {
						objectId: this.event.objectId,
						recurrenceId: this.event.recurrenceId,
					})
					: generateUrl('/apps/calendar/timeGridDay/{day}', {
						day: new Date(this.event.start).toISOString().slice(0, 10),
					})
				buttons.push({
					label: 'Open in Calendar',
					callback: () => window.open(url, '_blank'),
				})
			}
			if (this.event) {
				buttons.push({
					label: 'Duplicate as card',
					variant: 'primary',
					callback: () => this.$emit('duplicate', this.event),
				})
			}
			return buttons
		},
	},
}
</script>

<style scoped>
.calendar-event p {
	margin: 4px 0;
}
</style>
