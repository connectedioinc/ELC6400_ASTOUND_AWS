<template>
  <card-cell class="lg:grow-0! lg:shrink-0! lg:w-[14%]! lg:basis-auto!">
    <!-- cell row truncate is off, since name-cell handles it without showing index -->
    <cell-row
      only-mobile-label
      :truncate="false"
    >
      <template #label>{{ $t('Name') }}:</template>
      <template #value>
        <div class="flex min-w-0 lg:text-body-main">
          <div
            v-if="index !== null"
            class="card-row-indicator"
          >
            {{ index }}
          </div>
          <tlt-overflow-hint class="lg:text-theme-text-primary">{{ value }}</tlt-overflow-hint>
          <slot name="status" />
        </div>
      </template>
    </cell-row>
  </card-cell>
</template>

<script>
export default {
  props: {
    value: {
      type: String,
      default: null
    },
    index: {
      type: Number,
      default: null
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.card-row-indicator {
  @apply empty:hidden border-theme-border-base lg:border-r lg:pr-2 mr-2;
}
@media not all and (min-width: theme(--breakpoint-lg)) {
  .card-row-indicator::after {
    content: '.';
  }
}
</style>
