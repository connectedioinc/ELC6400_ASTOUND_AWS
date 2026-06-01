<template>
  <div
    ref="hoverable"
    class="flex items-center gap-2"
  >
    {{ normContent[0] ?? '-' }}
    <tlt-icon
      v-if="normContent.length > 1"
      icon="info"
      class="text-theme-text-info size-5 shrink-0"
    />
    <tlt-popover
      v-if="normContent.length > 1"
      v-bind="popoverOptions"
      :target="() => $refs.hoverable"
      :title="title"
    >
      <div
        v-for="item in popoverContent"
        :key="item"
      >
        <slot :item="item">{{ item }}</slot>
      </div>
    </tlt-popover>
  </div>
</template>

<script>
export default {
  props: {
    content: {
      type: [Array, String],
      required: true
    },
    title: {
      type: String,
      default: undefined
    },
    popoverOptions: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    /** @return {string[]} */
    normContent() {
      return Array.isArray(this.content) ? this.content : [this.content]
    },
    /** @return {string[]} */
    popoverContent() {
      return this.normContent.slice(1)
    }
  }
}
</script>
