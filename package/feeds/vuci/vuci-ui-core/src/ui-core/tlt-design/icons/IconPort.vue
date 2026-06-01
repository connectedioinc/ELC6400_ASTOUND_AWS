<template>
  <svg
    v-if="props.type === 'eth'"
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="32"
    viewBox="0 0 40 32"
    fill="none"
  >
    <path
      :class="props.color"
      d="M26.286 0H13.714v3.429H9.143v5.714H0V32h40V9.143h-9.143V3.429h-4.571z"
    />
    <path
      stroke="#000"
      :stroke-opacity="pinFill"
      stroke-width="2"
      d="M6 23v9m3.988-9v9m3.989-9v9m3.988-9v9m3.985-9v9m3.988-9v9m3.988-9v9m3.988-9v9"
    />
  </svg>
  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="32"
    viewBox="0 0 40 32"
    fill="none"
  >
    <path
      :class="props.color"
      d="M30.857 0H9.143v9.143H0V32h40V9.143h-9.143z"
    />
    <path
      stroke="#000"
      :stroke-opacity="pinFill"
      stroke-width="2"
      d="M6 23v9m3.988-9v9m3.989-9v9m3.988-9v9m3.985-9v9m3.988-9v9m3.988-9v9m3.988-9v9"
    />
  </svg>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { portIconColors } from '@/plugins/ports'

export interface Props {
  color: (typeof portIconColors)[keyof typeof portIconColors]
  type: 'eth' | 'sfp'
  pins?: boolean
}
const props = defineProps<Props>()

const pinFill = computed(() => {
  return !props.pins ? '0' : '0.2'
})
</script>
