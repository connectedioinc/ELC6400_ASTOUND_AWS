<template>
  <div :id="`accordion-${name}-group`">
    <slot> </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { createAccordionContext } from './injects'

type Props = {
  name: string
  singleOpen?: boolean
}
const props = defineProps<Props>()
const modelValue = defineModel<string[]>({ default: () => [] })

function toggleValue(value: string) {
  const valueIndex = modelValue.value.indexOf(value)
  if (valueIndex > -1) {
    const newArray = remove(modelValue.value, valueIndex)
    modelValue.value = newArray
  } else modelValue.value = props.singleOpen ? [value] : modelValue.value.concat([value])
}

function remove(arr: any[], index: number) {
  const copy = arr.slice(0)
  copy.splice(index, 1)
  return copy
}

createAccordionContext(
  computed(() => modelValue.value),
  toggleValue
)
</script>
