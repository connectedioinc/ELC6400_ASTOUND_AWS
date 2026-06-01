<template>
  <label
    :id="labelId"
    :for="controlId"
  >
    <slot />
  </label>
</template>

<script setup lang="ts">
import { injectCheckboxContext } from './CheckboxItem.vue'

const { labelId, controlId } = injectCheckboxContext()
</script>

<style lang="" scoped></style>
