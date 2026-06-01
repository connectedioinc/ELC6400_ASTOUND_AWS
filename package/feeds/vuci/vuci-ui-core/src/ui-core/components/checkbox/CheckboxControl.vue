<template>
  <input
    ref="checkbox"
    v-model="checked"
    type="checkbox"
    class="selector"
    :name="props.name"
    :aria-checked="props.indeterminate ? 'mixed' : checked"
    :data-indeterminate="dataAttribute(props.indeterminate)"
    :disabled="optionalAttribute(props.disabled)"
    :readonly="optionalAttribute(props.readonly)"
  />
</template>

<script setup lang="ts" generic="T">
import { useTemplateRef, watch } from 'vue'
import { dataAttribute, optionalAttribute } from '@ui-core/utils/attributes'

export type Props = {
  readonly?: boolean
  disabled?: boolean
  indeterminate?: boolean
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  name: undefined,
  disabled: undefined,
  readonly: undefined,
  required: undefined,
  indeterminate: false
})

const checked = defineModel<boolean>({ default: false })
const control = useTemplateRef('checkbox')

watch(
  () => [control.value, props.indeterminate],
  () => {
    if (!control.value) return
    control.value.indeterminate = props.indeterminate
  },
  { flush: 'pre' }
)
</script>
