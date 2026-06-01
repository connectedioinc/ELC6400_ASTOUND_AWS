<template>
  <Primitive
    :as="props.as"
    :as-child="props.asChild"
    v-bind="fieldApi.attrs.rootProps.value"
  >
    <slot v-bind="fieldApi">
      {{ fieldApi.modelValue.value }}
    </slot>
  </Primitive>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import Primitive, { type PrimitiveProps } from '@components/primitive/Primitive.vue'
import { useField } from './use-field'
import type { AcceptableValue, FieldOptions, FieldProps } from './types'
import { injectFieldContext, provideFieldMetaContext } from './use-field-context'
import { injectFormContext } from '@components/form/use-form-context'
import { watch, nextTick, ref, toRefs, onMounted } from 'vue'
import type { Ref } from 'vue'

export type Props<T extends AcceptableValue = any> = FieldProps<T> &
  PrimitiveProps & {
    standalone?: boolean
    modelValue?: T
  }

const props = defineProps<Props<T>>()
const emit = defineEmits<{
  'update:modelValue': [value: T | undefined]
  change: [value: T | undefined]
}>()

const defaultValue = ref(props.modelValue ?? props.defaultValue) as Ref<T | undefined>

watch(
  () => props.defaultValue,
  () => (defaultValue.value = props.defaultValue)
)

const { disabled, name, readonly, required, rules, warnings, srLabel } = toRefs(props)

const fProps: Required<FieldOptions<T>> = {
  defaultValue,
  srLabel,
  disabled,
  name,
  readonly,
  required,
  rules,
  warnings
}

const fieldApi = props.standalone
  ? useField<T>(fProps)
  : useField<T>(
      fProps,
      injectFieldContext(() => injectFormContext(), true)
    )

onMounted(() => {
  // check if field has label
  if (import.meta.env.DEV) {
    if (fieldApi.controlLabel.value || fieldApi.label.value) return
    const el = document.querySelector(`#${fieldApi.id}`)
    const exampleComponent = `<FieldRoot>
  <FieldLabel>
    Label Text
  </FieldLabel>
  ...
</FieldRoot>`
    const exampleSrLabel = `<FieldRoot sr-label="Label Text">
  ...
</FieldRoot>`
    console.error(
      `Field:`,
      el,
      `has no label!
Please provide it via the "sr-label" prop:

${exampleSrLabel}

or use the label component:

${exampleComponent}
`
    )
  }
})

let isUpdating = false
watch(
  () => props.modelValue,
  value => {
    if (isUpdating) return
    isUpdating = true
    fieldApi.setModelValue(value)
    nextTick(() => (isUpdating = false))
  }
)

watch(
  () => fieldApi.modelValue.value,
  value => {
    if (isUpdating || value === props.modelValue) return
    isUpdating = true
    emit('update:modelValue', value)
    nextTick(() => (isUpdating = false))
  },
  {
    immediate: true
  }
)

provideFieldMetaContext(fieldApi)

watch(
  () => fieldApi.modelValue.value,
  value => {
    emit('change', value)
  }
)
</script>
