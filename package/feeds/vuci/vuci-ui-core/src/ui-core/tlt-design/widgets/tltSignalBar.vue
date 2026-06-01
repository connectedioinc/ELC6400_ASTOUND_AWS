<template>
  <div
    class="inline-flex items-center justify-center"
    :class="{ 'text-theme-text-primary': !disabled, 'text-theme-text-subtle': disabled }"
  >
    <tlt-icon
      :icon="wireless ? 'signal-wifi' : 'signal'"
      class="size-5!"
      :class="iconClass"
      :strength="wireless ? wifiStrength(signal) : singalStrength(signal)"
    />
    <div
      v-if="showtext"
      class="text-caption font-sans normal-case ml-1"
    >
      {{ isNaN(signal) ? '-' : signal }} {{ wireless ? '%' : 'dBm' }}
    </div>
  </div>
</template>
<script>
export default {
  props: {
    signal: {
      type: Number,
      default: 0
    },
    iconClass: {
      type: String,
      default: ''
    },
    showtext: {
      type: Boolean,
      default: true
    },
    wireless: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    singalStrength(signal) {
      if (this.disabled || isNaN(signal)) return -1
      if (!signal || signal <= -112) return 0
      if (signal < -97) return 1
      if (signal < -82) return 2
      if (signal < -67) return 3
      return 4
    },
    wifiStrength(q) {
      if (this.disabled) return -1
      else if (q <= 0) return 0
      else if (q < 25) return 1
      else if (q < 50) return 2
      else if (q < 80) return 3
      return 4
    }
  }
}
</script>
