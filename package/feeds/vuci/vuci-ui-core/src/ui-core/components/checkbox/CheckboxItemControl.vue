<template>
  <CheckboxControl
    :id="itemContext.controlId.value"
    v-model="modelValue"
    :name="itemContext.name.value"
    :disabled="isDisabled"
    :readonly="isReadonly"
    :intermediate="props.indeterminate"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CheckboxControl, { type Props as CheckboxControlProps } from './CheckboxControl.vue'
import { injectCheckboxContext } from './CheckboxItem.vue'

type Props = CheckboxControlProps

const props = defineProps<Props>()

const itemContext = injectCheckboxContext()

const isReadonly = computed(() => itemContext?.readonly.value || props.readonly)

const isDisabled = computed(() => itemContext?.disabled.value || props.disabled)

const canSetValue = computed(() => !isReadonly.value && !isDisabled.value)

const modelValue = computed({
  get() {
    return itemContext.isChecked.value
  },
  set(value: boolean) {
    if (!canSetValue.value) return
    if (value) itemContext.check()
    else itemContext.uncheck()
  }
})
</script>
