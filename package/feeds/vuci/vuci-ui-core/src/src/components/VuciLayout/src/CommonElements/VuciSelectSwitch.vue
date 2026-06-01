<template>
  <div
    class="select-switch"
    :class="{ disabled }"
    :test-id="`select-${elementId}`"
  >
    <div
      class="slider"
      :style="currentStyle"
    >
      <div class="slider-inner" />
    </div>
    <button
      v-for="option in options"
      :key="option[1]"
      ref="selectOptions"
      :test-id="`selectoption-${String(option[0])}${option[0] === modelValue ? ' selected' : ''}`"
      :class="{ selected: option[0] === modelValue }"
      class="option"
      @click="onClick(option[0])"
    >
      {{ option[1] }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends boolean | number | string | symbol">
import { ref, computed } from 'vue'
import { useMounted, useResizeObserver } from '@vueuse/core'

export interface Props<T> {
  options: [T, string][]
  disabled?: boolean
  elementId: string
}

const props = defineProps<Props<T>>()
const modelValue = defineModel<T>()

const mounted = useMounted()

const selectOptions = ref<HTMLElement[] | null>(null)
const valElement = computed(() => {
  const index = props.options.findIndex(option => option[0] === modelValue.value)
  if (!mounted.value || index < 0) return
  return selectOptions.value?.[index]
})

const currentStyle = ref({ left: '0', width: '0' })
useResizeObserver(valElement, entries => {
  const entry = entries[0]
  if (!(entry?.target instanceof HTMLElement)) return {}
  if (entry?.target.offsetWidth === 0) return {}
  currentStyle.value = { left: `${entry?.target.offsetLeft}px`, width: `${entry.target.offsetWidth}px` }
})

function onClick(newVal: T) {
  if (props.disabled || newVal === modelValue.value) return
  modelValue.value = newVal
}
</script>

<style scoped>
.select-switch {
  border-radius: 0.5rem;
  display: flex;
  justify-content: center;
  position: relative;
  background: var(--color-theme-bg-secondary-subtle);
  height: 2rem;
  &.disabled {
    .option {
      color: var(--color-theme-text-subtle);
      &:not(.selected) {
        cursor: not-allowed;
      }
    }
  }
  .option {
    color: var(--color-theme-text-primary);
    font-size: var(--text-body-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    position: relative;
    z-index: 2;
    flex-grow: 1;
    flex-basis: 0;
    padding: 0 0.25rem;
    height: 100%;
    cursor: default;
    &:not(.selected) {
      cursor: pointer;
    }
  }
  .slider {
    transition:
      left linear 0.2s,
      width linear 0.2s;
    position: absolute;
    cursor: pointer;
    z-index: 1;
    top: 0;
    bottom: 0;
    .slider-inner {
      border-radius: 0.5rem;
      background-color: var(--color-theme-bg-surface);
      margin: 0.125rem;
      width: calc(100% - 0.25rem);
      height: calc(100% - 0.25rem);
      box-shadow: 0style 0.125rem 0.25rem rgba(0, 0, 0, 0.1);
    }
  }
}
</style>
