<template>
  <span class="text-center font-sans text-caption">
    <span>
      {{ isMobile ? $t('Click') : $t('Drag') }}
      {{ ' ' }}
    </span>
    <span v-if="isMobile">
      <span class="text-theme-text-primary">
        {{ $t('Down') }}
      </span>
      <tlt-icon
        icon="arrow-down"
        class="inline size-3 text-theme-text-primary shrink-0"
      />
      /
      <span class="text-theme-text-primary">
        {{ $t('Up') }}
      </span>
      <tlt-icon
        icon="arrow-up"
        class="inline size-3 text-theme-text-primary shrink-0"
      />
    </span>
    <span
      v-else
      class="inline-block align-middle text-center bg-theme-bg-secondary-1/30 rounded-sm p-1"
    >
      <tlt-icon
        icon="drag-anywhere"
        class="text-theme-text-primary size-3"
      />
    </span>
    {{ ' ' }}
    <span>{{ $t('to re-order. Top %s have higher priority.').format(elementName) }}</span>
  </span>
</template>

<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

export interface Props {
  elementName: string
}

defineProps<Props>()

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')
</script>
