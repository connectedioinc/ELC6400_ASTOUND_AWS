<template>
  <div
    ref="dropzone"
    role="button"
    aria-label="dropzone"
    tabindex="0"
    :data-over-dropzone="isOverDropzone"
    :aria-disabled="disabled"
    v-on="vOnHandlers"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, watchEffect } from 'vue'
import { injectUploadContext } from './UploadRoot.vue'
import { getFileEntries } from '@ui-core/utils/data-transfer'
import { isFileDragEvent } from './upload-utils'
import { computed } from 'vue'
import { ref } from 'vue'

type Props = {
  disabled?: boolean
}
const props = defineProps<Props>()
const rootCtx = injectUploadContext()

const counter = ref(0)
const isOverDropzone = computed(() => counter.value > 0)

const triggerRef = useTemplateRef('dropzone')
watchEffect(() => {
  rootCtx.setTriggerRef(triggerRef.value)
})

const disabled = computed(() => props.disabled || rootCtx.disabled.value)

const vOnHandlers = computed(() => {
  if (disabled.value) return {}
  return {
    dragenter: onDragEnter,
    dragover: onDragOver,
    drop: onDrop,
    dragleave: onDragLeave,
    click: onDropzoneClick,
    keydown: onKeydown
  }
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    rootCtx.openFilePicker()
  }
}

function onDropzoneClick(event: MouseEvent) {
  if (event.target !== event.currentTarget) return
  const target = event.currentTarget as HTMLElement
  // prevent opening the file dialog when clicking on the label (to avoid double opening)
  if (target.localName === 'label') {
    event.preventDefault()
  }
  rootCtx.openFilePicker()
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  try {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  } catch {
    // ignore
  }
}
function onDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  const isFilesDrag = isFileDragEvent(event)
  if (!isFilesDrag) return
  getFileEntries(event.dataTransfer.items).then(files => {
    rootCtx.onFileSelect(files)
    counter.value = 0
  })
}

function onDragLeave(event: DragEvent) {
  const currentTarget = event.currentTarget as HTMLElement
  if (currentTarget.contains(event.relatedTarget as HTMLElement)) return
  if (disabled.value) return
  counter.value--
}

function onDragEnter() {
  counter.value++
}
</script>

<style lang="" scoped></style>
