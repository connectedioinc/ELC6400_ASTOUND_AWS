import { readonly, ref, watchEffect } from 'vue'
import { addListener } from '@ui-core/utils/dom'
import { isFileDragEvent } from '@components/upload/upload-utils'

// the number of requested file drag listeners
let requestedCount = 0
const isDraggingFiles = ref(false)

let dragStopTimeout: ReturnType<typeof setTimeout> | undefined = undefined

function scheduleDragStop() {
  clearTimeout(dragStopTimeout)
  dragStopTimeout = setTimeout(() => {
    isDraggingFiles.value = false
  }, 10)
}

let removeListeners: (() => void)[] = []

const handleDrag = (event: DragEvent) => {
  if (isFileDragEvent(event)) {
    event.preventDefault()
    clearTimeout(dragStopTimeout)
    isDraggingFiles.value = true
  }
}

function addFileDragListeners() {
  removeListeners = [
    addListener(document.body, 'dragenter', handleDrag),
    addListener(document.body, 'dragover', handleDrag, { capture: true }),
    // in case the dragover event is stopped propagating in the dropzone we're using capturing
    addListener(
      document.body,
      'drop',
      () => {
        scheduleDragStop()
      },
      { capture: true }
    ),
    addListener(document.body, 'dragleave', (event: DragEvent) => {
      if (isFileDragEvent(event)) {
        scheduleDragStop()
      }
    })
  ]
}

function removeFileDragListeners() {
  removeListeners.forEach(removeListener => removeListener())
  removeListeners = []
}

/**
 * @returns a ref indicating whether a file is being dragged over the document.
 */
export const useGlobalFileDrag = () => {
  watchEffect(onCleanup => {
    if (requestedCount === 0) {
      addFileDragListeners()
    }
    requestedCount++
    onCleanup(() => {
      if (requestedCount === 1) {
        removeFileDragListeners()
      }
      requestedCount--
    })
  })

  return {
    isDraggingFiles: readonly(isDraggingFiles)
  }
}
