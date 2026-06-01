<template>
  <slot />
</template>

<script lang="ts">
export type CheckboxGroupRootContext<T> = {
  name: Ref<string>
  readonly: Ref<boolean>
  disabled: Ref<boolean>
  ids: {
    root: Ref<string>
    control: Ref<string>
    label: Ref<string>
  }
  select: (value: T) => void
  deselect: (value: T) => void
  isSelected: (value: T) => boolean
  modelValue: Ref<T[] | undefined>
}

export const [provideCheckboxGroupContext, injectCheckboxGroupContext] = createContext<CheckboxGroupRootContext<any>>('checkbox-group-root')
</script>

<script setup lang="ts" generic="T">
import { createContext } from '@ui-core/utils/create-context'
import type { Ref } from 'vue'
import { useGroupToggle } from '@ui-core/composables/use-group-toggle'
import { composeId, getId } from '@ui-core/utils/core-utils'
import { computed, toRef } from 'vue'

defineOptions({
  inheritAttrs: false
})

type Props = {
  name?: string
  disabled?: boolean
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  name: getId()
})

const modelValue = defineModel<T[]>({ default: () => [] })
const controlId = computed(() => composeId(props.name, 'control'))
const labelId = computed(() => composeId(props.name, 'label'))

const { model, ...rest } = useGroupToggle<T>(modelValue)

provideCheckboxGroupContext({
  name: toRef(props, 'name'),
  readonly: toRef(props, 'readonly'),
  disabled: toRef(props, 'disabled'),
  ids: {
    control: controlId,
    label: labelId,
    root: toRef(props, 'name')
  },
  modelValue: model,
  ...rest
})
</script>
