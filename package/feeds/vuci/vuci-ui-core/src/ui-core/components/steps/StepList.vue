<template>
  <ul>
    <li
      v-for="(step, index) in ctx.stepNames.value"
      :key="step"
    >
      <button
        type="button"
        class="size-12 text-salmon rounded-full font-semibold"
        :class="ctx.isCurrent(step) ? 'bg-theme-bg-primary-1 text-theme-text-on-primary' : 'bg-theme-bg-secondary-1 text-theme-text-on-secondary'"
        @click="() => ctx.goTo(step)"
      >
        {{ index + 1 }}
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useStepsContext } from './use-steps-context'
const ctx = useStepsContext()
</script>
