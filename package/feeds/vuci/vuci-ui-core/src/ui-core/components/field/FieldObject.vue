<template>
  <fieldset v-bind="fieldApi.attrs.rootProps.value">
    <slot />
  </fieldset>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import { useFieldObject } from './use-field-object'
import type { ObjectFieldProps } from './types'
import { injectFieldContext, provideFieldContext, provideFieldMetaContext } from './use-field-context'
import { injectFormContext } from '../form'

export type Props<T extends Record<string, any>> = ObjectFieldProps<T> & { standalone?: boolean }
const props = defineProps<Props<T>>()

const fieldApi = props.standalone
  ? useFieldObject(props)
  : useFieldObject(
      props,
      injectFieldContext(() => injectFormContext(), true)
    )

provideFieldContext(fieldApi)
provideFieldMetaContext(fieldApi as any)
</script>

<style lang="" scoped></style>
