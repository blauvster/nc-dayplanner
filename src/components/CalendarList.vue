<template>
	<div v-if="calendarsStore.calendars.length" class="calendar-list">
		<h3 class="calendar-list__title">Calendars</h3>
		<NcCheckboxRadioSwitch
			type="switch"
			:model-value="calendarsStore.hideAll"
			@update:model-value="calendarsStore.setHideAll">
			Hide all events
		</NcCheckboxRadioSwitch>
		<ul v-if="!calendarsStore.hideAll">
			<li v-for="calendar in calendarsStore.calendars" :key="calendar.uri">
				<NcCheckboxRadioSwitch
					:model-value="calendarsStore.selectedUris.includes(calendar.uri)"
					@update:model-value="calendarsStore.toggleCalendar(calendar.uri)">
					<span class="calendar-list__swatch" :style="{ backgroundColor: calendar.color }" />
					{{ calendar.displayName }}
				</NcCheckboxRadioSwitch>
			</li>
		</ul>
	</div>
</template>

<script>
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import { useCalendarsStore } from '../store/calendars.js'

export default {
	name: 'CalendarList',
	components: {
		NcCheckboxRadioSwitch,
	},
	setup() {
		return { calendarsStore: useCalendarsStore() }
	},
}
</script>

<style scoped>
.calendar-list {
	padding: 8px;
}

.calendar-list__title {
	font-weight: bold;
	margin: 8px 0;
}

.calendar-list__swatch {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	margin-right: 6px;
}
</style>
