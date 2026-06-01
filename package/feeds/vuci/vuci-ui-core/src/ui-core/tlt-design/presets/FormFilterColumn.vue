<template>
  <FormUniqueValues
    v-if="filter.type === 'uniqueValues'"
    ref="formUniqueValues"
    v-model:selected="filter.selected"
    :values="shownValues"
    :search-value="search"
    @apply="$emit('apply', $event)"
  >
    <template #footer>
      <Empty />
    </template>
  </FormUniqueValues>
  <FormRange
    v-else-if="filter.type === 'range'"
    ref="formRange"
    v-model:selected="filter.selected"
    @apply="$emit('apply', $event)"
  >
    <template #footer>
      <Empty />
    </template>
  </FormRange>
</template>

<script setup lang="ts">
import FormUniqueValues from './FormUniqueValues.vue'
import FormRange from './FormRange.vue'
import type { FilterOptions, FilterRange, FilterUniqueValues } from '@ui-core/components/table/types'
import { useTemplateRef } from 'vue'

export interface Props {
  shownValues?: Record<string, number>
  search?: string
}

defineProps<Props>()

defineEmits<{
  apply: [FilterUniqueValues | FilterRange]
}>()

const filter = defineModel<FilterOptions>('filter', { required: true })

const formUniqueValues = useTemplateRef('formUniqueValues')
const formRange = useTemplateRef('formRange')

function onSubmit() {
  switch (filter.value.type) {
    case 'uniqueValues':
      formUniqueValues.value?.onSubmit()
      break
    case 'range':
      formRange.value?.onSubmit()
      break
  }
}

function onReset() {
  switch (filter.value.type) {
    case 'uniqueValues':
      formUniqueValues.value?.onReset()
      break
    case 'range':
      formRange.value?.onReset()
      break
  }
}

defineExpose({
  onSubmit,
  onReset
})
</script>
