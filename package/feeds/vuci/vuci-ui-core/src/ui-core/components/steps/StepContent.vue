<template>
  <div v-show="ctx.current.value === props.value">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useStepsContext } from './use-steps-context'
type Props = {
  value: string
}
const ctx = useStepsContext()
const props = defineProps<Props>()
</script>
