<!-- eslint-disable vue/no-v-html -->
<template>
  <component
    :is="is"
    tabindex="-1"
    class="text-inherit! no-underline rounded-lg w-full px-3 py-2 h-16 flex flex-col justify-between text-left overflow-clip"
    :class="{ 'bg-theme-bg-hover': selected }"
    :data-selected="selected"
  >
    <slot
      :title="title"
      :query="query"
      :highlighted="highlighted"
    >
      <span
        class="text-base font-semibold truncate"
        v-html="highlighted"
      />
    </slot>
    <slot name="subtitle">
      <div
        v-if="crumbs?.length"
        class="text-sm"
      >
        <TltBreadcrumbs
          :crumbs="crumbs"
          :interactable="false"
        >
          <template #name="{ crumb }">
            <span
              class="text-inherit"
              v-html="highlight($t(crumb.name), query)"
            />
          </template>
        </TltBreadcrumbs>
      </div>
    </slot>
  </component>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { highlight } from '@ui-core/utils/search'
import TltBreadcrumbs from '../../TltBreadcrumbs.vue'
import type { SearchItem } from '@/stores/search'

export interface Props extends SearchItem {
  is?: string | Component
  query: string
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  is: 'button'
})

const highlighted = computed(() => highlight(props.title!, props.query))
</script>
