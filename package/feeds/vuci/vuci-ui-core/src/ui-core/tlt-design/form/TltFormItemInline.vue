<template>
  <tlt-form-item-template
    v-bind="$props"
    :class="{ 'with-headers items-start!': hasHeaders }"
  >
    <ContextProvider :inline-form="true">
      <div class="flex gap-2 w-full">
        <div class="max-w-xs w-full flex flex-col md:flex-row gap-2 items-stretch inline-wrapper ml-2 md:ml-0">
          <slot />
        </div>
        <slot name="trailing"></slot>
      </div>
    </ContextProvider>
  </tlt-form-item-template>
</template>

<script>
import ContextProvider from '@ui-core/components/ContextProvider.vue'
import { makeProps } from '@ui-core/utils/props'
export default {
  components: {
    ContextProvider
  },
  props: makeProps({
    label: [String, ''],
    help: [String, ''],
    required: [Boolean, false],
    hasHeaders: [Boolean, false]
  })
}
</script>

<style scoped>
@reference '@/theme.css';

.inline-wrapper :deep(> *) {
  @apply md:min-w-0 grow;
}

@media (min-width: theme(--breakpoint-md)) {
  .with-headers :deep(.form-item-label:not(.form-item-control .form-item-label)) {
    @apply mt-[1.625rem];
  }
}
</style>
