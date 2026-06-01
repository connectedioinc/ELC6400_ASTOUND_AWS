<template>
  <Slot v-bind="props.dontAttachAttrs ? {} : slotProps">
    <slot
      v-bind="omit(slotProps, ['onUpdate:modelValue'])"
      :update-model-value="setModelValue"
    />
  </Slot>
</template>

<script setup lang="ts">
import { Slot } from '@components/primitive/Slot'
import { injectFieldMetaContext } from './use-field-context'
import { computed } from 'vue'
import { omit } from '@ui-core/utils/object'

type Props = {
  /**
   * when true, the control won't attach any attributes to the slotted element, they will be passed as arguments to the slot
   * @default false
   */
  dontAttachAttrs?: boolean
}

const props = defineProps<Props>()

const {
  attrs: { controlProps },
  setModelValue,
  modelValue,
  metaState
} = injectFieldMetaContext()

const slotProps = computed(() => {
  return {
    modelValue: modelValue.value,
    'onUpdate:modelValue': setModelValue,
    state: metaState.value,
    ...controlProps.value
  }
})
</script>
