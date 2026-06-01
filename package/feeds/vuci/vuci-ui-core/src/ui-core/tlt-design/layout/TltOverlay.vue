<template>
  <transition name="fade">
    <div
      v-if="open"
      ref="modal"
      class="overlay fixed inset-0 z-20"
      @click="$emit('click')"
    />
  </transition>
</template>
<script>
export default {
  props: {
    open: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click']
}
</script>
<style lang="css">
.overlay {
  background-color: rgba(0, 0, 0, 0.6);
}
</style>
