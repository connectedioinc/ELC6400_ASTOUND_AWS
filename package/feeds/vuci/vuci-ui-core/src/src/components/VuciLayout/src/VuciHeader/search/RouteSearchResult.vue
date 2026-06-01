<!-- eslint-disable vue/no-v-html -->
<template>
  <BaseSearchResult
    v-bind="$props"
    is="router-link"
    :to="path"
  />
</template>

<script setup lang="ts">
import type { Props as BaseSearchResultProps } from './BaseSearchResult.vue'
import BaseSearchResult from './BaseSearchResult.vue'
import type { SearchItem } from '@/stores/search'

interface RouteSearchItem extends SearchItem {
  type: 'route'
  path: string
}

export interface Props extends BaseSearchResultProps, RouteSearchItem {}

defineProps<Props>()
</script>
