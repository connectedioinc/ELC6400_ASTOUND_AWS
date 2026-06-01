<template>
  <Primitive
    ref="trigger"
    v-bind="props"
    @click="onTriggerClick"
  >
    <slot />
  </Primitive>
</template>

<script setup lang="ts">
import { useTemplateRef, watchEffect } from 'vue'
import { injectUploadContext } from './UploadRoot.vue'
import Primitive, { type PrimitiveProps } from '@components/primitive/Primitive.vue'

type Props = PrimitiveProps
const props = defineProps<Props>()

const rootCtx = injectUploadContext()

const triggerRef = useTemplateRef('trigger')

watchEffect(() => {
  rootCtx.setTriggerRef(triggerRef.value?.$el)
})

function onTriggerClick(event: MouseEvent) {
  if (rootCtx.disabled.value) return
  const target = event.target as HTMLElement
  if (rootCtx.dropzoneRef.value && rootCtx.dropzoneRef.value.contains(target)) {
    event.stopPropagation()
  }
  rootCtx.openFilePicker()
}
</script>

<style lang="" scoped></style>
