<template>
	<div class="card-attachments">
		<input ref="fileInput" type="file" hidden @change="onFileSelected">
		<NcButton :disabled="uploading" @click="$refs.fileInput.click()">
			{{ uploading ? 'Uploading…' : 'Upload file' }}
		</NcButton>

		<NcLoadingIcon v-if="loading" :size="20" />
		<NcEmptyContent v-else-if="attachments.length === 0" description="No attachments yet" />
		<ul v-else class="card-attachments__list">
			<li v-for="attachment in attachments" :key="attachment.id" class="card-attachments__item">
				<a :href="downloadUrl(attachment)" target="_blank" rel="noopener">{{ attachment.data }}</a>
				<span class="card-attachments__size">{{ formatSize(attachment.extendedData?.filesize) }}</span>
				<NcButton variant="tertiary" aria-label="Delete attachment" @click="remove(attachment)">
					Delete
				</NcButton>
			</li>
		</ul>
	</div>
</template>

<script>
import NcButton from '@nextcloud/vue/components/NcButton'
import NcEmptyContent from '@nextcloud/vue/components/NcEmptyContent'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'
import {
	attachmentDownloadUrl,
	deleteAttachment,
	fetchAttachments,
	uploadAttachment,
} from '../services/deckApi.js'

export default {
	name: 'CardAttachments',
	components: {
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
	},
	props: {
		cardId: {
			type: Number,
			required: true,
		},
		boardId: {
			type: Number,
			required: true,
		},
		stackId: {
			type: Number,
			required: true,
		},
	},
	data() {
		return {
			attachments: [],
			loading: false,
			uploading: false,
		}
	},
	watch: {
		cardId: {
			immediate: true,
			handler() {
				this.load()
			},
		},
	},
	methods: {
		async load() {
			this.loading = true
			try {
				this.attachments = await fetchAttachments(this.cardId)
			} finally {
				this.loading = false
			}
		},
		async onFileSelected(event) {
			const file = event.target.files[0]
			event.target.value = ''
			if (!file) {
				return
			}
			this.uploading = true
			try {
				const attachment = await uploadAttachment(this.cardId, file)
				this.attachments.push(attachment)
			} finally {
				this.uploading = false
			}
		},
		async remove(attachment) {
			await deleteAttachment(this.cardId, attachment.id, attachment.type)
			this.attachments = this.attachments.filter((a) => a.id !== attachment.id)
		},
		downloadUrl(attachment) {
			return attachmentDownloadUrl(this.boardId, this.stackId, this.cardId, attachment.id, attachment.type)
		},
		formatSize(bytes) {
			if (!bytes) {
				return ''
			}
			const units = ['B', 'KB', 'MB', 'GB']
			let value = bytes
			let unitIndex = 0
			while (value >= 1024 && unitIndex < units.length - 1) {
				value /= 1024
				unitIndex++
			}
			return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
		},
	},
}
</script>

<style scoped>
.card-attachments {
	padding: 12px;
}

.card-attachments__list {
	margin-top: 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.card-attachments__item {
	display: flex;
	align-items: center;
	gap: 8px;
}

.card-attachments__item a {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.card-attachments__size {
	color: var(--color-text-maxcontrast);
	font-size: 12px;
}
</style>
