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
	emits: ['update:open'],
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
			const buttons = [{ label: 'Close', callback: () => this.$emit('update:open', false) }]
			if (this.event && window.OC?.appswebroots?.calendar) {
				const day = new Date(this.event.start).toISOString().slice(0, 10)
				buttons.push({
					label: 'Open in Calendar',
					callback: () => {
						window.open(generateUrl('/apps/calendar/timeGridDay/{day}', { day }), '_blank')
					},
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
