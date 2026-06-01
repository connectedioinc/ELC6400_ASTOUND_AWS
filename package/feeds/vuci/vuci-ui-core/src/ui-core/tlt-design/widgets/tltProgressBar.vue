<template>
  <div
    class="text-center flex justify-center items-center text-xs text-theme-text-primary"
    :class="{
      'flex-col gap-0.5': !inline,
      'flex-row-reverse gap-2': inline
    }"
  >
    <slot>
      <div v-if="!noHeader">
        {{ !name ? '%s%s'.format(progress.toFixed(2), '%') : '%s: (%s%s)'.format(name, progress.toFixed(2), '%') }}
      </div>
    </slot>
    <div class="shadow rounded-md h-1.75 overflow-hidden w-full min-w-24">
      <div
        class="h-full bg-theme-bg-primary-1 rounded-md"
        :style="{ width: progress.toFixed(2) + '%' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Props {
  progress: number
  name?: string
  noHeader?: boolean
  inline?: boolean
}

withDefaults(defineProps<Props>(), {
  name: ''
})
</script>

<style scoped>
@reference '@/theme.css';

.shadow {
  box-shadow: 0px 0px 5px --alpha(var(--color-theme-text-base) / 0.2);
}
</style>
