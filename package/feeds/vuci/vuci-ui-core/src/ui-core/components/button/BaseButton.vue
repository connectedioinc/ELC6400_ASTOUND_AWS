<template>
  <button
    :class="['button', sizeClass, `button--color-${color}`, props.block && `button--block`]"
    :type="type"
    :disabled="props.disabled"
    @click="!props.disabled && emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type Variant = 'button' | 'icon'
export type Color = 'primary' | 'secondary' | 'tertiary' | 'error' | 'warning'
export type Size = 'sm' | 'md'

export interface Props {
  block?: boolean
  disabled?: boolean
  /**
   * @default 'md'
   */
  size?: Size
  color?: Color
  /**
   * @default 'button'
   */
  variant?: Variant
  /**
   * @default 'button'
   */
  type?: 'reset' | 'submit' | 'button' | undefined
}

const props = withDefaults(defineProps<Props>(), {
  block: false,
  disabled: undefined,
  type: 'button',
  size: 'md',
  color: 'primary',
  variant: 'button'
})

const emit = defineEmits<{
  click: [MouseEvent]
}>()

const sizeClass = computed(() => (props.variant === 'button' ? `button--size-${props.size}` : `icon-button--size-${props.size}`))
</script>

<style scoped>
@reference '@/style.css';
.button {
  @apply font-sans font-semibold flex items-center justify-center shrink-0 transition-colors
  focus-visible:focus-token outline-none w-max h-max rounded  text-white gap-2 cursor-pointer text-body-secondary;
}

.button.button--block {
  @apply w-full;
}

.button--size-md {
  @apply py-1.5 px-4;
}

.button--size-sm {
  @apply px-4 py-1.5;
}

.icon-button--size-md {
  @apply p-2;
}

.icon-button--size-sm {
  @apply p-1.5;
}

/*DefaultButton and IconButton colors*/
.button--color-primary {
  @apply bg-theme-bg-primary-1 hover:bg-theme-bg-primary-2 active:bg-theme-bg-primary-2;
}

.button--color-secondary {
  @apply bg-theme-bg-primary-subtle hover:bg-theme-bg-primary-subtle-hover active:bg-theme-bg-primary-subtle-active text-theme-text-primary;
}

.button--color-tertiary {
  @apply text-theme-text-primary bg-theme-bg-surface hover:bg-theme-bg-hover active:bg-theme-bg-active;
}

.button--color-error {
  @apply bg-theme-bg-danger hover:bg-theme-bg-danger-hover active:bg-theme-bg-danger-active;
}

.button--color-warning {
  @apply bg-theme-bg-warning hover:bg-theme-bg-warning-hover active:bg-theme-bg-warning-active;
}
.button:disabled {
  @apply bg-theme-bg-secondary-subtle text-theme-text-on-secondary !cursor-default;
}
.button--color-tertiary:disabled {
  @apply bg-theme-bg-surface;
}
</style>
