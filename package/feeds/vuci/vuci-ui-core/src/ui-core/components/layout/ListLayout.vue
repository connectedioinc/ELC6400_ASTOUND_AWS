<template>
  <div
    class="list-layout"
    :class="{ 'list-layout--bordered': bordered }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  gap?: keyof typeof gapSizes
  bordered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  gap: 'lg'
})

const gapSizes = {
  none: '0',
  xs: '0.5rem',
  sm: '1rem',
  /** Form item spacing */
  md: '1.5rem',
  /** Page elements spacing (mostly between TltCard components) */
  lg: '2rem',
  xl: '2.5rem'
} as const

const gapSize = computed(() => gapSizes[props.gap])
</script>

<style scoped>
@reference '@/theme.css';

.list-layout {
  --gap-size: v-bind('gapSize');
}

.list-layout:not(.list-layout--bordered) {
  display: flex;
  flex-direction: column;
  gap: var(--gap-size);
}

.list-layout--bordered > :not([style*='display: none'], .hidden, .hidden\!) ~ :is(.list-layout, .grid-layout, .collapsable-card) {
  border-top: 1px solid var(--color-theme-border-base);
}

.list-layout--bordered > :not([style*='display: none'], .hidden, .hidden\!) ~ :is(.list-layout, .grid-layout, .collapsable-card) {
  padding-top: var(--gap-size);
}

.list-layout--bordered > :not(:last-child, [style*='display: none'], .hidden, .collapsable-card):has(~ :not([style*='display: none'], .hidden, .hidden\!)) {
  padding-bottom: var(--gap-size);
}

.list-layout--bordered > .collapsable-card:not(:last-child, [style*='display: none'], .hidden, .hidden\!) > .card-content {
  padding-bottom: var(--gap-size);

  @media (min-width: theme(--breakpoint-md)) {
    padding-bottom: calc(var(--gap-size) + 2rem);
  }
}
</style>
