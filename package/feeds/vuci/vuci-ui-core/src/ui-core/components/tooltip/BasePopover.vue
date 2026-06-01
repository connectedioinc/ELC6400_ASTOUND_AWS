<template>
  <div
    ref="element"
    role="tooltip"
    class="w-full text-body-secondary min-w-40 max-w-[min(20rem,95vw)] sm:max-w-88 p-4 rounded-lg"
    :class="resolvedVariant"
  >
    <h3
      v-if="$slots.title || props.title"
      class="font-bold mb-2"
    >
      <slot name="title">
        {{ props.title }}
      </slot>
    </h3>
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-if="rawhtml"
      v-html="props.content"
    />
    <div v-else>
      <slot>
        {{ props.content }}
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type Props = {
  title?: string
  content?: string
  rawhtml?: boolean
  variant?: 'error' | 'default' | 'warning' | 'inherit'
}
const props = withDefaults(defineProps<Props>(), {
  title: '',
  content: '',
  variant: 'default'
})

const variantClasses = {
  default: 'bg-theme-bg-floating border border-theme-border-subtle shadow-md shadow-theme-bg-secondary-3/20 [&+*]:bg-theme-bg-floating [&+*]:border-theme-border-subtle',
  error: 'bg-theme-bg-danger-subtle border border-theme-border-danger-subtle text-theme-text-danger [&+*]:bg-theme-bg-danger-subtle [&+*]:border-theme-border-danger-subtle',
  warning: 'bg-theme-bg-warning-subtle border border-theme-border-warning-subtle text-theme-text-warning [&+*]:bg-theme-bg-warning-subtle [&+*]:border-theme-border-warning-subtle',
  inherit: 'bg-inherit text-inherit'
}

const resolvedVariant = computed(() => variantClasses[props.variant])
</script>
