<template>
	<div class="duration-input">
		<NcTextField
			:model-value="text"
			:disabled="disabled"
			label="Duration"
			placeholder="e.g. 1h30 or 1d"
			@update:model-value="onInput" />
		<div class="duration-input__presets">
			<NcButton
				v-for="preset in presets"
				:key="preset.minutes"
				variant="tertiary"
				:disabled="disabled"
				@click="choose(preset.minutes)">
				{{ preset.label }}
			</NcButton>
		</div>
	</div>
</template>

<script>
import NcButton from '@nextcloud/vue/components/NcButton'
import NcTextField from '@nextcloud/vue/components/NcTextField'
import { DURATION_PRESETS, formatDuration, parseDuration } from '../utils/duration.js'

export default {
	name: 'DurationInput',
	components: {
		NcButton,
		NcTextField,
	},
	props: {
		/** Duration in minutes, or null. */
		modelValue: {
			type: Number,
			default: null,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	emits: ['update:modelValue'],
	data() {
		return {
			presets: DURATION_PRESETS,
			text: formatDuration(this.modelValue),
		}
	},
	watch: {
		modelValue(value) {
			this.text = formatDuration(value)
		},
	},
	methods: {
		onInput(value) {
			this.text = value
			const minutes = parseDuration(value)
			if (minutes !== null) {
				this.$emit('update:modelValue', minutes)
			}
		},
		choose(minutes) {
			this.text = formatDuration(minutes)
			this.$emit('update:modelValue', minutes)
		},
	},
}
</script>

<style scoped>
.duration-input__presets {
	display: flex;
	gap: 4px;
	margin-top: 4px;
}
</style>
