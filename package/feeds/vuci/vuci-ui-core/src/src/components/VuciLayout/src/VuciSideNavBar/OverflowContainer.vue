<template>
  <tlt-hint :hints="hints">
    <div
      ref="text"
      class="text"
      :class="textClass"
      v-text="text"
    />
  </tlt-hint>
</template>

<script>
export default {
  props: {
    text: {
      type: [String, Number],
      required: true
    },
    textClass: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      hasOverflow: false,
      resizeObserver: new ResizeObserver(this._setOverflow)
    }
  },
  computed: {
    hints() {
      return this.hasOverflow ? [{ info: this.text }] : []
    }
  },
  mounted() {
    this.resizeObserver.observe(this.$refs.text)
  },
  beforeUnmount() {
    this.resizeObserver.disconnect()
  },
  methods: {
    _setOverflow() {
      const element = this.$refs.text
      this.hasOverflow = element.offsetWidth < element.scrollWidth
    }
  }
}
</script>

<style scoped>
.text {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  white-space: nowrap;
}
</style>
