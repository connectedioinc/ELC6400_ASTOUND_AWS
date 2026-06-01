<template>
  <button
    :class="['text-button', `text-button--color-${props.color}`]"
    :type="type"
    :disabled="props.disabled"
    @click="!props.disabled && emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
export type Color = 'primary' | 'error' | 'warning'

type Props = {
  disabled?: boolean
  /**
   * @default 'button'
   */
  type?: 'reset' | 'submit' | 'button' | undefined
  color?: Color
}

const props = withDefaults(defineProps<Props>(), {
  block: false,
  disabled: undefined,
  type: 'button',
  color: 'primary'
})

const emit = defineEmits<{
  click: [MouseEvent]
}>()
</script>

<style scoped>
@reference '@/style.css';

.text-button {
  @apply font-sans font-semibold flex items-center justify-center space-x-2 shrink-0 transition-colors
  focus-visible:focus-token h-max;
}

.text-button:disabled {
  @apply text-theme-text-on-secondary !cursor-default;
}

.text-button--color-primary {
  @apply text-theme-text-primary hover:text-theme-text-primary-hover active:text-theme-text-primary-active;
}

.text-button--color-warning {
  @apply text-theme-text-warning hover:text-theme-bg-warning-hover active:text-theme-bg-warning-active;
}
.text-button--color-error {
  @apply text-theme-text-danger hover:text-theme-bg-danger-hover active:text-theme-bg-danger-active;
}
</style>
