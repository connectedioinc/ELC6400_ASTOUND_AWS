<template>
  <Primitive data-component="select-root">
    <slot
      :open="ctx.isOpen.value"
      :model-value="ctx.model.value"
    />
  </Primitive>
</template>

<script setup lang="ts" generic="T">
import { provideSelectContext } from './use-select-context'
import { type UseSelectProps, useSelect } from './use-select'
import { watch } from 'vue'
import { isArray } from '@ui-core/utils/inspect'
import Primitive from '../primitive/Primitive.vue'

export type Props<T> = UseSelectProps<T>

const props = withDefaults(defineProps<Props<T>>(), {
  multiple: false,
  options: () => [],
  required: false,
  disabled: false,
  readonly: false,
  id: undefined
})

const model = defineModel<T | T[]>({ default: undefined })
if (props.multiple) {
  if (!model.value) model.value = []
  else if (!isArray(model.value)) {
    throw new Error('[SelectRoot]: modelValue value must be an "array" when multiple is true. Received: ' + typeof model.value)
  }
}

const ctx = useSelect(model, props)
const emits = defineEmits<{
  open: []
  close: []
}>()

watch(
  () => ctx.isOpen.value,
  isOpen => {
    if (isOpen) emits('open')
    else emits('close')
  }
)

provideSelectContext(ctx)
</script>
