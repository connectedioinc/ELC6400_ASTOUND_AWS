<template>
  <div class="flex flex-row justify-between flex-nowrap bg-theme-bg-surface p-1 rounded-sm cursor-default border border-theme-border-base w-[70px]">
    <tlt-icon
      icon="signal-wifi"
      :strength="Math.round(percents / 25)"
      class="text-theme-text-primary size-5"
    />
    {{ percents }} %
  </div>
</template>
<script>
export default {
  props: {
    signal: {
      type: String,
      default: ''
    },
    float: {
      type: String,
      default: 'left'
    },
    percents: {
      type: Number,
      default: 0
    }
  }
}
</script>
