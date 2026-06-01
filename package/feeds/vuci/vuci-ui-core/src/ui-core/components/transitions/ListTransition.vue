<template>
  <TransitionGroup
    enter-active-class="transition-all duration-500"
    leave-active-class="transition-all duration-500 absolute"
    move-class="transition-all duration-500"
    leave-to-class="opacity-0 translate-x-4 translate-y-0"
    enter-from-class="opacity-0 -translate-x-4 translate-y-0"
    :tag="props.tag"
  >
    <!-- v-bind="props" -->
    <slot />
  </TransitionGroup>
</template>

<script setup lang="ts">
import type { TransitionGroupProps } from 'vue'

type Props = Omit<TransitionGroupProps, 'name'>
const props = defineProps<Props>()
</script>
