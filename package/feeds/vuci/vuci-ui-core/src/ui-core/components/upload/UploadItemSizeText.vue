<template>
  <Primitive
    :as="props.as"
    :as-child="props.asChild"
  >
    <slot v-bind="converted">{{ converted.value.toFixed(2) }} {{ converted.unit }}</slot>
  </Primitive>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { injectUploadItemContext } from './UploadItem.vue'
import { convertFileSize, type ConvertFileSizeOptions } from './upload-utils'
import Primitive, { type PrimitiveProps } from '@components/primitive/Primitive.vue'

type Props = ConvertFileSizeOptions & PrimitiveProps
const props = withDefaults(defineProps<Props>(), {
  unitSystem: 'binary',
  unit: 'auto'
})

const itemContext = injectUploadItemContext()

const converted = computed(() => {
  return convertFileSize(itemContext.file.value.size, {
    unit: props.unit,
    unitSystem: props.unitSystem
  })
})
</script>

<style lang="" scoped></style>
