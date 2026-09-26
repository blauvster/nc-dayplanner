<template>
	<NcSettingsSection
		name="Day Planner"
		description="Defaults used by the Day Planner timeline.">
		<div class="dayplanner-settings__field">
			<NcDateTimePickerNative v-model="workingHoursStart" type="time" label="Working hours start" />
			<NcDateTimePickerNative v-model="workingHoursEnd" type="time" label="Working hours end" />
		</div>

		<NcTextField
			class="dayplanner-settings__field"
			type="number"
			label="Snap step (minutes)"
			:model-value="String(form.snapStepMinutes)"
			@update:model-value="(value) => form.snapStepMinutes = Number(value)" />

		<NcTextField
			class="dayplanner-settings__field"
			type="number"
			label="Default duration (minutes)"
			:model-value="String(form.defaultDurationMinutes)"
			@update:model-value="(value) => form.defaultDurationMinutes = Number(value)" />

		<NcButton variant="primary" :disabled="saving" @click="save">
			{{ saving ? 'Saving…' : 'Save' }}
		</NcButton>
		<span v-if="saved" class="dayplanner-settings__saved">Saved</span>
	</NcSettingsSection>
</template>

<script>
import axios from '@nextcloud/axios'
import { loadState } from '@nextcloud/initial-state'
import { generateUrl } from '@nextcloud/router'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcDateTimePickerNative from '@nextcloud/vue/components/NcDateTimePickerNative'
import NcSettingsSection from '@nextcloud/vue/components/NcSettingsSection'
import NcTextField from '@nextcloud/vue/components/NcTextField'

/** "HH:MM" <-> Date, since NcDateTimePickerNative always binds a full Date. */
function timeStringToDate(value) {
	const [hours, minutes] = value.split(':').map(Number)
	const date = new Date()
	date.setHours(hours, minutes, 0, 0)
	return date
}

function dateToTimeString(date) {
	return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default {
	name: 'SettingsPersonal',
	components: {
		NcButton,
		NcDateTimePickerNative,
		NcSettingsSection,
		NcTextField,
	},
	data() {
		return {
			form: loadState('dayplanner', 'preferences'),
			saving: false,
			saved: false,
		}
	},
	computed: {
		workingHoursStart: {
			get() {
				return timeStringToDate(this.form.workingHoursStart)
			},
			set(date) {
				this.form.workingHoursStart = dateToTimeString(date)
			},
		},
		workingHoursEnd: {
			get() {
				return timeStringToDate(this.form.workingHoursEnd)
			},
			set(date) {
				this.form.workingHoursEnd = dateToTimeString(date)
			},
		},
	},
	methods: {
		async save() {
			this.saving = true
			this.saved = false
			try {
				const { data } = await axios.put(generateUrl('/apps/dayplanner/settings/preferences'), this.form)
				this.form = data
				this.saved = true
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.dayplanner-settings__field {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
	max-width: 300px;
}

.dayplanner-settings__saved {
	margin-left: 8px;
	color: var(--color-success);
}
</style>
