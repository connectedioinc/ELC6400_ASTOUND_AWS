<template>
  <Primitive v-bind="primitiveProps">
    <slot />
  </Primitive>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import Primitive, { type PrimitiveProps } from '../primitive/Primitive.vue'
import { DATA_LISTBOX_ITEM } from './use-select'

defineOptions({
  inheritAttrs: false
})

type Props = PrimitiveProps
const props = withDefaults(defineProps<Props>(), {
  asChild: false,
  as: 'li'
})
const attrs = useAttrs()

const primitiveProps = computed(() => ({
  ...props,
  ...attrs,
  [DATA_LISTBOX_ITEM]: '',
  tabindex: -1
}))
</script>

<style lang="" scoped></style>
