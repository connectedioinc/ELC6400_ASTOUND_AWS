<template>
  <div
    data-testid="checkbox-item"
    :data-checked="isChecked"
  >
    <slot />
  </div>
</template>

<script lang="ts">
export type CheckboxItemContext = {
  name: Readonly<Ref<string>>
  controlId: Readonly<Ref<string>>
  labelId: Readonly<Ref<string>>
  disabled: Readonly<Ref<boolean | undefined>>
  readonly: Readonly<Ref<boolean | undefined>>
  isChecked: Readonly<Ref<boolean>>
  check: () => void
  uncheck: () => void
}
export const [provideCheckboxContext, injectCheckboxContext] = createContext<CheckboxItemContext>('checkbox-item')
</script>

<script setup lang="ts">
import type { Ref } from 'vue'
import { createContext } from '@ui-core/utils/create-context'
import { useGroupToggle } from '@ui-core/composables/use-group-toggle'
import { computed, ref, readonly as vueReadonly } from 'vue'
import { injectCheckboxGroupContext } from './CheckboxGroup.vue'
import { composeId, getId } from '@ui-core/utils/core-utils'

type CheckboxItemProps = {
  disabled?: boolean
  readonly?: boolean
  value: any
}

const props = withDefaults(defineProps<CheckboxItemProps>(), {
  disabled: undefined,
  readonly: undefined,
  required: undefined
})

const {
  select,
  deselect,
  isSelected,
  name: groupName,
  readonly: groupReadonly,
  disabled: groupDisabled
} = injectCheckboxGroupContext(() => {
  const { isSelected, select, deselect, model } = useGroupToggle()
  return {
    readonly: ref(false),
    disabled: ref(false),
    isSelected,
    select,
    deselect,
    modelValue: model,
    name: vueReadonly(ref(getId())),
    ids: {
      control: ref(''),
      label: ref(''),
      root: ref('')
    }
  }
}, true)

const isChecked = computed(() => isSelected(props.value))
const check = () => select(props.value)
const uncheck = () => deselect(props.value)

const controlId = computed(() => composeId(groupName.value, getId()))
const labelId = computed(() => composeId(controlId.value, 'label'))

provideCheckboxContext({
  name: groupName,
  controlId,
  labelId,
  check,
  uncheck,
  isChecked,
  disabled: computed(() => groupDisabled.value || props.disabled),
  readonly: computed(() => groupReadonly.value || props.readonly)
})
</script>
