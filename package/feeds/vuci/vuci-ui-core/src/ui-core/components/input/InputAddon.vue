<template>
  <Primitive
    v-bind="props"
    class="field__addon"
  >
    <slot />
  </Primitive>
</template>

<script setup lang="ts">
import Primitive, { type PrimitiveProps } from '../primitive/Primitive.vue'

type Props = PrimitiveProps
const props = defineProps<Props>()
</script>

<style lang="" scoped></style>
