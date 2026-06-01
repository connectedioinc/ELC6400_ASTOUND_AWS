<template>
  <tlt-button
    v-bind="props"
    :disabled="ctx.isLast.value"
    @click="ctx.goToNext"
  >
    <slot> {{ $t('Next') }} </slot>
  </tlt-button>
</template>

<script setup lang="ts">
import { useStepsContext } from './use-steps-context'

type Props = {
  color?: string
  size?: string
  type?: string
}
const props = defineProps<Props>()
const ctx = useStepsContext()
</script>
