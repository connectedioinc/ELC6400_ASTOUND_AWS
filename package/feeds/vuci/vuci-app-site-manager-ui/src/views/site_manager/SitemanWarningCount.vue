<template>
  <div class="warning-count">
    <span class="warning-count-text">{{ displayCount }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  count: {
    type: [Number, String],
    required: true
  }
})

const displayCount = computed(() => {
  const num = Number(props.count)
  return num > 3 ? '3+' : num
})
</script>

<style scoped>
.warning-count {
  background-color: currentColor;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
  letter-spacing: -0.5px;
}

.warning-count-text {
  color: var(--color-theme-text-on-primary, #ffffff);
}
</style>
