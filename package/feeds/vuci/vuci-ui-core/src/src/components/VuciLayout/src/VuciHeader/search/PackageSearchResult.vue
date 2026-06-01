<!-- eslint-disable vue/no-v-html -->
<template>
  <BaseSearchResult
    v-bind="$props"
    is="router-link"
    v-slot="{ highlighted }"
    :to="path"
  >
    <div class="flex justify-between items-center">
      <span
        class="text-base font-semibold truncate"
        v-html="highlighted"
      />
      <TltBadge
        size="sm"
        custom-color="bg-theme-bg-secondary-2 text-theme-text-on-secondary"
      >
        {{ $t('Package') }}
      </TltBadge>
    </div>
  </BaseSearchResult>
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
