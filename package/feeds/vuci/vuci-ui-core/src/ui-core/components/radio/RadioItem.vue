<template>
  <div
    :data-checked="isChecked"
    @input="onInput"
  >
    <slot />
  </div>
</template>
<script lang="ts">
type RadioItemContext = {
  controlId: ComputedRef<string>
  labelId: ComputedRef<string>
  isChecked: ComputedRef<boolean>
  name: Readonly<Ref<string>>
  select: (value: any) => void
  readonly: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
}

export const [provideRadioContext, injectRadioContext] = createContext<RadioItemContext>('radio')
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { injectRadioGroupContext } from './RadioGroup.vue'
import { composeId, getId } from '@ui-core/utils/core-utils'
import { createContext } from '@ui-core/utils/create-context'
import type { ComputedRef, Ref } from 'vue'

type Props = {
  value: any
  disabled?: boolean
  readonly?: boolean
}

const props = defineProps<Props>()

const stableId = getId()
const groupCtx = injectRadioGroupContext()
const isChecked = computed(() => groupCtx.modelValue.value === props.value)
const controlId = computed(() => composeId(groupCtx.name.value, stableId))
const labelId = computed(() => composeId(controlId.value, 'label'))

function onInput() {
  groupCtx.select(props.value)
}

provideRadioContext({
  controlId,
  labelId,
  isChecked,
  name: groupCtx.name,
  select: groupCtx.select,
  readonly: computed(() => groupCtx.readonly.value || props.readonly),
  disabled: computed(() => groupCtx.disabled.value || props.disabled)
})
</script>
