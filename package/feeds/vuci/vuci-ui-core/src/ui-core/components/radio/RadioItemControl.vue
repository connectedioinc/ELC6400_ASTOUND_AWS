<template>
  <input
    :id="ctx.controlId.value"
    :name="ctx.name.value"
    :checked="ctx.isChecked.value"
    class="selector"
    type="radio"
  />
</template>

<script setup lang="ts">
import { injectRadioContext } from './RadioItem.vue'

const ctx = injectRadioContext()
</script>
