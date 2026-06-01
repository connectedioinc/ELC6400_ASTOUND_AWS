<template>
  <div
    :id="`${itemId}-panel`"
    :aria-labelledby="`${itemId}-header`"
    class="accordion-content"
    role="region"
  >
    <div class="overflow-hidden">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAccordionContext } from './injects'

const { itemId } = useAccordionContext()
</script>
