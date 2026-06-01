<template>
  <button
    type="button"
    class="h-max w-max"
    :readonly="arrayContext.readonly.value"
    @click="arrayContext.onValueRemove(props.index)"
  >
    <slot>
      <TltIcon
        icon="remove-circle"
        class="text-theme-bg-danger hover:text-theme-bg-danger-hover transition-colors"
      />
    </slot>
  </button>
</template>

<script setup lang="ts">
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'
import { injectFieldContext } from './use-field-context'
import { assertContextIsFieldArray } from './use-field-array'

type Props = {
  /**
   * Removes item at the provided index. If `index` is not passed, will remove the last item
   */
  index?: number
}

const props = defineProps<Props>()

const arrayContext = injectFieldContext()

if (!assertContextIsFieldArray(arrayContext)) {
  throw new Error('FieldArrayTriggerRemove must be used within a FieldArray')
}
</script>

<style lang="" scoped></style>
