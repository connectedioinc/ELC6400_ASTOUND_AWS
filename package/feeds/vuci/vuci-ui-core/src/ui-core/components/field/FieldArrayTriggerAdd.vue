<template>
  <button
    type="button"
    aria-label="add item"
    :readonly="arrayContext.readonly.value"
    class="h-max w-max"
    @click="arrayContext.onValueAdd(props.index)"
  >
    <slot>
      <TltIcon
        icon="add-circle"
        class="text-theme-text-primary hover:text-theme-text-primary-hover transition-colors"
      />
    </slot>
  </button>
</template>

<script setup lang="ts">
import { injectFieldContext } from './use-field-context'
import { assertContextIsFieldArray } from './use-field-array'

type Props = {
  /**
   * value will be added after the provided index. if nothing is passed, will be added at the end
   */
  index?: number
}

const props = defineProps<Props>()

const arrayContext = injectFieldContext()

if (!assertContextIsFieldArray(arrayContext)) {
  throw new Error('FieldArrayTriggerAdd must be used within a FieldArray')
}
</script>

<style lang="" scoped></style>
