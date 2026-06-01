<template>
  <Primitive
    :as="props.as"
    :as-child="props.asChild"
  >
    <slot />
  </Primitive>
</template>

<script lang="ts">
export type UploadItemContext = {
  file: Readonly<Ref<File>>
  remove: () => void
}
export const [provideUploadItemContext, injectUploadItemContext] = createContext<UploadItemContext>('upload-item')
</script>

<script setup lang="ts">
import { createContext } from '@ui-core/utils/create-context'
import type { Ref } from 'vue'
import { toRef } from 'vue'
import { injectUploadContext } from './UploadRoot.vue'
import Primitive, { type PrimitiveProps } from '@components/primitive/Primitive.vue'

type Props = PrimitiveProps & {
  file: File
}
const rootContext = injectUploadContext()
const props = defineProps<Props>()

provideUploadItemContext({
  file: toRef(() => props.file),
  remove: () => rootContext.remove(props.file)
})
</script>
