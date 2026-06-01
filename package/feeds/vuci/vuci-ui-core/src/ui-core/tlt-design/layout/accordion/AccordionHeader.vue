<template>
  <component
    :is="tag"
    :id="`${itemId}-header`"
    class="font-semibold text-fish"
  >
    <slot></slot>
  </component>
</template>

<script setup lang="ts">
import { useAccordionContext } from './injects'

type Props = {
  tag: string
}
withDefaults(defineProps<Partial<Props>>(), {
  tag: 'h3'
})
const { itemId } = useAccordionContext()
</script>
