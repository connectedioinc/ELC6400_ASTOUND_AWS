<template>
  <button
    ref="button"
    type="button"
    @mousedown.prevent="toggleFocus"
    @focus="onFocus"
    @blur="onBlur"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'

type Props = {
  modelValue?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

const emits = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const button = useTemplateRef('button')

function toggleFocus() {
  if (props.modelValue) {
    button.value?.blur()
  } else button.value?.focus()
}

function onFocus() {
  emits('update:modelValue', true)
}

function onBlur() {
  emits('update:modelValue', false)
}
</script>
