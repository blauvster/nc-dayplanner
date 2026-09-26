<template>
	<ul class="board-list">
		<li v-if="boardsStore.loading" class="board-list__loading">
			<NcLoadingIcon :size="20" />
		</li>
		<li v-else-if="boardsStore.boards.length === 0" class="board-list__empty">
			No boards found.
		</li>
		<li v-for="board in boardsStore.boards" :key="board.id">
			<NcCheckboxRadioSwitch
				:model-value="boardsStore.selectedIds.includes(board.id)"
				@update:model-value="boardsStore.toggleBoard(board.id)">
				<span class="board-list__swatch" :style="{ backgroundColor: '#' + board.color }" />
				{{ board.title }}
			</NcCheckboxRadioSwitch>
		</li>
	</ul>
</template>

<script>
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'
import { useBoardsStore } from '../store/boards.js'

export default {
	name: 'BoardList',
	components: {
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
	},
	setup() {
		return { boardsStore: useBoardsStore() }
	},
}
</script>

<style scoped>
.board-list {
	padding: 8px;
}

.board-list__loading {
	display: flex;
	justify-content: center;
	padding: 12px;
}

.board-list__empty {
	padding: 8px 12px;
	color: var(--color-text-maxcontrast);
}

.board-list__swatch {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	margin-right: 6px;
}
</style>
