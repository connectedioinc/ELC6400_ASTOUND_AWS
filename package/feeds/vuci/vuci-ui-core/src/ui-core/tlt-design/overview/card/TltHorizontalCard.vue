<template>
  <div
    class="rounded-lg border-theme-border-base border flex flex-col lg:flex-row relative text-body-secondary bg-theme-bg-surface horizontal-card max-lg:w-full"
    :class="{ 'with-drag': draggable }"
  >
    <div
      v-if="draggable"
      class="lg:table-cell w-0! max-w-0! hidden"
    >
      <div
        class="absolute top-0 left-0 p-1 border-b border-r rounded-br-lg rounded-tl-lg hover:text-theme-text-primary active:text-theme-text-on-primary active:bg-theme-text-primary transition-colors hover:cursor-grab active:cursor-grabbing"
        test-id="drag-anywhere"
        @mousedown="$emit('drag-start', $event)"
      >
        <tlt-icon
          icon="drag-anywhere"
          class="size-5 m-auto"
        />
      </div>
    </div>
    <slot :props="cardProps"></slot>
    <card-cell
      v-if="draggable"
      class="lg:hidden!"
    >
      <cell-row :label="$t('Move')">
        <template #value>
          <div class="flex">
            <tlt-button
              type="text"
              icon-left="arrow-up"
              class="mr-6"
              :disabled="isFirst"
              @mousedown.prevent.stop="$emit('swap-prev')"
              >{{ $t('Up') }}</tlt-button
            >
            <tlt-button
              type="text"
              icon-left="arrow-down"
              :disabled="isLast"
              @mousedown.prevent.stop="$emit('swap-next')"
              >{{ $t('Down') }}</tlt-button
            >
          </div>
        </template>
      </cell-row>
    </card-cell>
  </div>
</template>

<script>
export default {
  props: {
    draggable: {
      type: Boolean,
      default: false
    },
    cardProps: {
      type: [Array, Object],
      default: null
    },
    isFirst: {
      type: Boolean,
      default: false
    },
    isLast: {
      type: Boolean,
      default: false
    }
  },
  emits: ['drag-start', 'swap-prev', 'swap-next']
}
</script>

<style scoped>
@reference '@/theme.css';

:deep(.cell) {
  @apply lg:flex-1 lg:overflow-hidden flex flex-col border-b last:border-b-0 py-3 px-6 lg:justify-center lg:border-b-0 lg:border-r lg:last:border-r-0 lg:py-4 lg:flex-wrap min-w-0 max-xs:gap-y-1;
}
:deep(.cell.action-cell) {
  @apply lg:w-max px-6 grow lg:grow-0 shrink-0 basis-auto;
}
.with-drag:deep(.cell):nth-last-child(2) {
  @apply lg:border-r-0;
}
</style>
