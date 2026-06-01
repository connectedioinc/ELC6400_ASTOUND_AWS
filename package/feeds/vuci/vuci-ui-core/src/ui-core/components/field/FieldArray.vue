<template>
  <fieldset v-bind="fieldApi.attrs.rootProps.value">
    <slot
      :rows="fieldApi.rows.value"
      :total-items="fieldApi.modelValue.value?.length || 0"
      :model-value="fieldApi.modelValue.value"
    />
  </fieldset>
</template>

<script setup lang="ts" generic="T extends AcceptableValue[] | AcceptableValue[][] = any[]">
import { useFieldArray } from './use-field-array'
import type { AcceptableValue, ArrayFieldProps } from './types'
import { injectFieldContext, provideFieldContext, provideFieldMetaContext } from './use-field-context'
import { injectFormContext } from '../form'

export type Props<T extends AcceptableValue[] | AcceptableValue[][] = any[]> = ArrayFieldProps<T> & { standalone?: boolean }
const props = defineProps<Props<T>>()

const fieldApi = props.standalone
  ? useFieldArray<T>(props)
  : useFieldArray<T>(
      props,
      injectFieldContext(() => injectFormContext(), true)
    )

provideFieldContext(fieldApi)
// TODO fix this ignore
provideFieldMetaContext(fieldApi as any)
</script>

<style lang="" scoped></style>
