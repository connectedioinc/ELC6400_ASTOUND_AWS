<template>
  <div
    class="accordion-item"
    :class="isExpanded && 'accordion-expanded'"
  >
    <slot
      :expanded="isExpanded"
      :toggle-value="toggleValue"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, toValue } from 'vue'
import { IS_EXPANDED, ITEM_ID, useAccordionContext } from './injects'

interface Props {
  value: string
}
const props = defineProps<Props>()

const { value: accordionValue, toggleValue } = useAccordionContext()
const isExpanded = computed(() => toValue(accordionValue).includes(props.value))

provide(ITEM_ID, props.value)
provide(IS_EXPANDED, isExpanded)
</script>
<style>
.accordion-content {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  visibility: hidden;
  transition-property: grid-template-rows visibility opacity;
  transition-duration: 0.3s;
  transition-timing-function: ease-out;
}
.accordion-expanded .accordion-content {
  opacity: 1;
  visibility: visible;
  grid-template-rows: 1fr;
}
</style>
