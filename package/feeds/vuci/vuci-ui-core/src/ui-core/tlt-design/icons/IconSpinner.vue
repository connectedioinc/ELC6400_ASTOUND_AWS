<template>
  <svg viewBox="0 0 24 24">
    <g :class="{ spinner: animate }">
      <circle
        class="bg-path"
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        stroke-opacity="0.2"
        stroke-width="2.5"
      ></circle>
      <circle
        :class="{ path: animate }"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        fill="none"
        stroke-width="2.5"
      ></circle>
    </g>
  </svg>
</template>

<script>
export default {
  props: {
    animate: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.spinner {
  animation: rotate 2s linear infinite;
  transform-origin: center;
  z-index: 2;
  position: relative;
  & .bg-path {
    stroke-linecap: round;
  }
  & .path {
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
  }
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 60;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 36, 60;
    stroke-dashoffset: -14;
  }
  100% {
    stroke-dasharray: 36, 60;
    stroke-dashoffset: -50;
  }
}
</style>
