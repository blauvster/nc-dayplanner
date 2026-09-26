<template>
	<div class="card-comments">
		<form class="card-comments__form" @submit.prevent="submit">
			<NcTextField
				:model-value="draft"
				label="Add a comment"
				:disabled="posting"
				@update:model-value="draft = $event" />
			<NcButton type="submit" variant="primary" :disabled="posting || !draft.trim()">
				Post
			</NcButton>
		</form>

		<NcLoadingIcon v-if="loading" :size="20" />
		<NcEmptyContent v-else-if="comments.length === 0" description="No comments yet" />
		<ul v-else class="card-comments__list">
			<li v-for="comment in comments" :key="comment.id" class="card-comments__item">
				<div class="card-comments__meta">
					<strong>{{ comment.actorDisplayName }}</strong>
					<span>{{ formatDate(comment.creationDateTime) }}</span>
				</div>
				<p>{{ comment.message }}</p>
			</li>
		</ul>
	</div>
</template>

<script>
import NcButton from '@nextcloud/vue/components/NcButton'
import NcEmptyContent from '@nextcloud/vue/components/NcEmptyContent'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'
import NcTextField from '@nextcloud/vue/components/NcTextField'
import { createComment, fetchComments } from '../services/deckApi.js'

export default {
	name: 'CardComments',
	components: {
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		NcTextField,
	},
	props: {
		cardId: {
			type: Number,
			required: true,
		},
	},
	data() {
		return {
			comments: [],
			loading: false,
			posting: false,
			draft: '',
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
				this.comments = await fetchComments(this.cardId)
			} finally {
				this.loading = false
			}
		},
		async submit() {
			const message = this.draft.trim()
			if (!message) {
				return
			}
			this.posting = true
			try {
				const comment = await createComment(this.cardId, message)
				this.comments.push(comment)
				this.draft = ''
			} finally {
				this.posting = false
			}
		},
		formatDate(value) {
			return new Date(value).toLocaleString()
		},
	},
}
</script>

<style scoped>
.card-comments {
	padding: 12px;
}

.card-comments__form {
	display: flex;
	gap: 8px;
	align-items: flex-end;
	margin-bottom: 16px;
}

.card-comments__form :deep(.input-field) {
	flex: 1;
}

.card-comments__list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.card-comments__meta {
	display: flex;
	justify-content: space-between;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.card-comments__item p {
	margin: 4px 0 0;
}
</style>
