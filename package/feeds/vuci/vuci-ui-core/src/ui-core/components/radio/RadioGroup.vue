<template>
  <slot />
</template>
<script lang="ts">
export type Props = {
  /**
   * name that will be added to each of the radio item's name attribute. Used to track item's value
   */
  name?: string
  disabled?: boolean
  readonly?: boolean
}

export type RadioGroupContext = {
  disabled: Ref<boolean>
  readonly: Ref<boolean>
  modelValue: Ref<any>
  name: Ref<string>
  select: (value: any) => void
}
export const [provideRadioGroupContext, injectRadioGroupContext] = createContext<RadioGroupContext>('radio-group')
</script>

<script setup lang="ts">
import { getId } from '@ui-core/utils/core-utils'
import { createContext } from '@ui-core/utils/create-context'
import { toRef, type Ref } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<Props>(), {
  name: getId(),
  disabled: false,
  readonly: false
})

const model = defineModel<unknown>()

provideRadioGroupContext({
  modelValue: model,
  name: toRef(props, 'name'),
  disabled: toRef(props, 'disabled'),
  readonly: toRef(props, 'readonly'),
  select: (value: any) => {
    model.value = value
  }
})
</script>
