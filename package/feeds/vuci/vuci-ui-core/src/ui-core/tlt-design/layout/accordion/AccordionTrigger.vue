<template>
  <button
    :id="itemId!"
    :aria-expanded="isExpanded!"
    :aria-controls="`${itemId}-panel`"
    type="button"
    class="flex items-center outline-offset-2 focus-visible:outline-theme-border-primary"
    @click="toggleValue(itemId!)"
  >
    <slot name="before" />
    <tlt-icon
      icon="dropdown-arrow"
      :class="isExpanded && 'rotate-180'"
      class="transition-transform duration-300"
    />
    <slot name="after" />
  </button>
</template>

<script setup lang="ts">
import { useAccordionContext } from './injects'

const { isExpanded, itemId, toggleValue } = useAccordionContext()
</script>
