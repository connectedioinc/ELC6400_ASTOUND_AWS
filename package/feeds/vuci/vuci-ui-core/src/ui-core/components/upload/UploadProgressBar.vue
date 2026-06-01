<template>
  <div
    class="progress-bar"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="progress"
  >
    <div
      role="presentation"
      class="progress-bar__inner"
      :style="{ width: `${progress}%` }"
    ></div>
  </div>
</template>

<script setup lang="ts">
type Props = {
  /**
   * a number between 0 and 100
   */
  progress: number
}
defineProps<Props>()
</script>

<style scoped>
@reference '@/theme.css';

.progress-bar {
  --height: --spacing(2);
  --padding: 0.5px;
  --radius: var(--radius-2xl);
  background-color: var(--theme-bg-subtle-active);
  padding: var(--padding);
  overflow: hidden;
  height: var(--height);
  border-radius: var(--radius);
  width: 100%;
}

.progress-bar__inner {
  height: 100%;
  border-radius: var(--radius);
  background-color: var(--color-theme-bg-primary-1);
  /* min width is set to make a perfect circle, when progress is 1% */
  min-width: calc(var(--height) - calc(var(--padding) * 2));
  max-width: 100%;
  /*box-shadow: var(--shadow-s);*/
  will-change: width;
  transition: width 0.3s ease-in-out;
}
</style>
