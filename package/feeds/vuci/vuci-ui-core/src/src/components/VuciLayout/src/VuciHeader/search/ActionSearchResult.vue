<!-- eslint-disable vue/no-v-html -->
<template>
  <BaseSearchResult
    v-bind="$props"
    is="button"
    type="button"
    @click="callback"
  />
</template>

<script setup lang="ts">
import type { Props as BaseSearchResultProps } from './BaseSearchResult.vue'
import BaseSearchResult from './BaseSearchResult.vue'
import type { SearchItem } from '@/stores/search'

interface ActionSearchItem extends SearchItem {
  type: 'action'
  callback: () => void
  condition?: boolean
}

export interface Props extends BaseSearchResultProps, ActionSearchItem {}

defineProps<Props>()
</script>
