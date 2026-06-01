<template>
  <label
    :id="ctx.labelId.value"
    :for="ctx.controlId.value"
  >
    <slot />
  </label>
</template>

<script setup lang="ts">
import { injectRadioContext } from './RadioItem.vue'
const ctx = injectRadioContext()
</script>

<style lang="" scoped></style>
