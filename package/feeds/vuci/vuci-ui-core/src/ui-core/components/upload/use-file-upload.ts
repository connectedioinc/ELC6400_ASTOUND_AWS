import { computed, ref } from 'vue'
import { createFormData, createUploadController, type UploadController } from './upload-utils'

export type UseFileUploadOptions = {
  /**
   * @default `createUploadController()`
   */
  controller?: UploadController
}

type UploadPayload = {
  file: File
  [key: string]: any
}

export type UploadResponse = {
  data: {
    path: string
  }
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { controller: _c = createUploadController() } = options
  const { cancel, execute, isCancelled, controller } = _c
  const progress = ref(0)
  const isUploading = ref(false)
  const isProcessing = computed(() => isUploading.value && progress.value === 100)

  const onUploadStart = () => {
    cancel()
    progress.value = 0
    isUploading.value = true
  }

  const onUploadDone = () => {
    isUploading.value = false
    progress.value = 0
  }

  const onProgress = (event: { progress: number }) => {
    progress.value = event.progress
  }

  const upload = async (url: string, payload: UploadPayload): Promise<UploadResponse> => {
    onUploadStart()
    const formData = createFormData(payload)
    return execute({ url, data: formData, onProgress }).finally(onUploadDone)
  }
  /**
   * removes the file
   */
  async function remove() {
    // TODO: implement file removal logic
  }
  return {
    upload,
    /**
     * removes the file
     */
    remove,
    cancel,
    controller,
    /**
     * current progress of the file upload.
     */
    progress,
    isCancelled,
    /**
     * indicates whether the file is being uploaded.
     */
    isUploading,
    /**
     * indicates whether the file is being processed. This is a derived state when:
     * - The upload progress is at 100%
     * - the upload promise is still not resolved
     */
    isProcessing
  }
}
