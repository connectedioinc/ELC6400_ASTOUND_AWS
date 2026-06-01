<template>
  <div
    class="details-row"
    :test-id="`details-row-${testId}`"
  >
    <div
      class="details-column"
      :test-id="`details-column-${testId}`"
    >
      <div class="header w-full">
        <slot />
      </div>
      <div
        class="content break-words"
        :test-id="`content-${testId}`"
      >
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    testId: {
      type: String,
      default: 'overview-card-item'
    }
  }
}
</script>

<style scoped>
.details-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-theme-border-base);
  padding: 0.5em 0;
}
.details-row:last-of-type {
  display: flex;
  justify-content: space-between;
  padding: 0.5em 0;
  border: unset;
}

.details-column {
  width: 50%;
  flex-grow: 1;
}

.header {
  color: var(--color-theme-text-base);
  font-size: 1.1em;
  display: inline-block;
  margin-bottom: 0.3em;
}

.content {
  display: block;
  color: var(--color-theme-text-secondary-subtle);
  font-size: 0.9em;
}
</style>
