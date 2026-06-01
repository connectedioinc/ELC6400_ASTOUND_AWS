<template>
  <Primitive
    ref="labelRef"
    v-bind="attrs.labelProps.value"
  >
    <slot />
    <span
      v-if="required"
      aria-hidden="true"
      class="text-theme-text-danger"
      >{{ props.requiredIndicator }}</span
    >
  </Primitive>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue'
import { injectFieldMetaContext } from './use-field-context'
import Primitive from '../primitive/Primitive.vue'

export type Props = {
  /**
   * what indicator should be shown if the field is required
   * @default '*'
   */
  requiredIndicator?: string
}
const props = withDefaults(defineProps<Props>(), {
  requiredIndicator: '*'
})

const { attrs, required, label } = injectFieldMetaContext()

const labelRef = useTemplateRef('labelRef')

function updateLabel() {
  const labelElement = labelRef.value?.$el
  if (!labelElement) return
  label.value = required?.value && props.requiredIndicator ? labelElement.innerText.slice(0, -1).trim() : labelElement.innerText
}

onMounted(updateLabel)

watch(labelRef, updateLabel)
</script>
