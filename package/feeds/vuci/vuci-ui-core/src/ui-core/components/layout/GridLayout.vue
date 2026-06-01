<template>
  <div
    class="grid-layout"
    :class="{
      'gap-4': !borders,
      'overflow-hidden': borders,
      'grid-layout--borders': borders === true,
      'grid-layout--borders-row': borders === 'row',
      'grid-layout--borders-column': borders === 'column'
    }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  gap?: keyof typeof gapSizes
  borders?: boolean | 'row' | 'column'
}

const props = withDefaults(defineProps<Props>(), {
  gap: 'lg',
  borders: undefined
})

const gapSizes = {
  none: '0',
  xs: '0.5rem',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '2.5rem'
} as const

const gapSize = computed(() => gapSizes[props.gap])
</script>

<style scoped>
.grid-layout {
  --gap-size: v-bind('gapSize');

  display: grid;
  gap: var(--gap-size);
}

.grid-layout--borders {
  gap: 1px;
}
.grid-layout--borders > * {
  outline: 1px solid var(--color-theme-border-base);
  padding: calc(var(--gap-size) / 2);
}

.grid-layout--borders-row {
  row-gap: calc(var(--gap-size) * 2);
  column-gap: var(--gap-size);
  & > * {
    margin-top: -1px;
  }
}
.grid-layout--borders-column {
  row-gap: var(--gap-size);
  column-gap: calc(var(--gap-size) * 2);
}

.grid-layout--borders-row > *,
.grid-layout--borders-column > * {
  position: relative;
}

.grid-layout--borders-row > ::before {
  content: '';
  position: absolute;
  background-color: var(--color-theme-border-base);
  width: 100%;
  height: 1px;
  top: calc(var(--gap-size) * -1);
  left: 0;
}

.grid-layout--borders-column > ::before {
  content: '';
  position: absolute;
  background-color: var(--color-theme-border-base);
  width: 1px;
  height: 100%;
  top: 0;
  left: calc(var(--gap-size) * -1);
}
</style>
