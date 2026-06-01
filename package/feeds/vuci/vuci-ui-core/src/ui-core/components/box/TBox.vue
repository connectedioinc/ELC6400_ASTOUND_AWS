<template>
  <div
    class="box"
    :class="resolvedVariant"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Props = {
  variant?: 'info' | 'success' | 'error' | 'warning'
}
const props = withDefaults(defineProps<Props>(), {
  variant: 'info'
})
const variants = {
  info: 'box__info',
  success: 'box__success',
  error: 'box__error',
  warning: 'box__warning'
}
const resolvedVariant = computed(() => variants[props.variant])
</script>

<style scoped>
@reference '@/theme.css';

.box {
  @apply py-4 px-3.5 border rounded-lg overflow-auto;
}
.box__info {
  @apply bg-theme-bg-info-subtle border border-theme-border-info;
}
.box__success {
  @apply bg-theme-bg-success-subtle;
}
.box__error {
  @apply bg-theme-bg-danger-subtle border border-theme-border-danger-subtle;
}
.box__warning {
  @apply bg-theme-bg-warning-subtle border border-theme-border-warning-subtle;
}
</style>
