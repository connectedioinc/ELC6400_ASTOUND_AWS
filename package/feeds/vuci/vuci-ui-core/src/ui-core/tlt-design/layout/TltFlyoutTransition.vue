<template>
  <transition
    v-bind="{ ...$attrs }"
    name="flyout"
  >
    <slot></slot>
  </transition>
</template>

<style scoped>
.flyout-enter-active {
  transition-property: transform, opacity, scale;
  transition-duration: 200ms;
  transition-timing-function: ease-in-out;
}
.flyout-leave-active {
  transition:
    transform 150ms ease,
    opacity 150ms ease,
    scale 150ms ease;
}
.flyout-enter-to {
  transform: translate(0rem, 0rem);
  opacity: 1;
  scale: 1;
}
.flyout-enter-from,
.flyout-leave-to {
  opacity: 0;
  scale: 0.95;
}
</style>
