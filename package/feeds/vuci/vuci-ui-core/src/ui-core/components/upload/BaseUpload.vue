<template>
  <UploadRoot
    v-model="fileValue"
    :disabled="isUploading"
    :max-size="props.maxSize"
    class="file-upload max-w-xs"
  >
    <UploadTrigger
      v-if="visualStage === VISUAL_STAGE.IDLE"
      as="div"
      class="file-upload__trigger"
    >
      <TextButton> Browse </TextButton>
      <span> {{ $t('or drag and drop your file here') }} </span>
    </UploadTrigger>
    <UploadDropzone
      v-else-if="visualStage === VISUAL_STAGE.DRAGGING"
      :class="['file-upload__dropzone', isDraggingFiles && 'file-upload__dropzone--active']"
    >
      {{ $t('Drag and drop your file here') }}
    </UploadDropzone>
    <div v-else-if="visualStage === VISUAL_STAGE.UPLOADING">
      <div class="file-upload__progress-info">
        <div class="loading-text">
          {{ isProcessing ? 'File is being processed' : 'Uploading' }}
        </div>
        <div>{{ progress }}%</div>
      </div>
      <div class="flex w-full justify-between h-5 items-center gap-1">
        <UploadProgressBar :progress="progress" />
        <button
          type="button"
          class="file-upload__cancel-trigger"
          aria-label="cancel upload"
          @click="cancel"
        >
          <TltIcon
            icon="x"
            class="size-5"
          />
        </button>
      </div>
    </div>
    <UploadItem
      v-else-if="visualStage === VISUAL_STAGE.SELECTED"
      class="file-upload__file"
      :file="fileValue!"
    >
      <UploadItemName class="file-upload__file__name" />
      <UploadItemSizeText
        v-slot="{ value, unit }"
        unit-system="binary"
        class="file-upload__file__size"
      >
        {{ '(%s %s)'.format(value.toFixed(1), unit) }}
      </UploadItemSizeText>
      <UploadItemDeleteTrigger class="file-upload__file__delete-trigger" />
    </UploadItem>
  </UploadRoot>
</template>
<script lang="ts">
/**
 * gets file value from given arguments
 */
function getFileValue(filename: string | undefined = undefined, size: number = 0): File | undefined {
  if (isString(filename) && filename.length > 0 && size > 0) {
    const file = new File([new Uint8Array(size)], filename, { type: 'application/octet-stream' })
    return file
  }
  return undefined
}

function defineFlag(file: File, flag: string, value: any) {
  Object.defineProperty(file, flag, {
    value,
    enumerable: true,
    configurable: true
  })
}

function markAsTemporary(file: File) {
  defineFlag(file, 'tmp', true)
}

let skipSync = false

function withSyncSkip<T extends (...args: any[]) => any>(cb: T) {
  async function wrapper(this: any, ...args: any[]) {
    if (skipSync) {
      skipSync = false
      return
    }
    skipSync = true
    await cb.apply(this, args)
    nextTick(() => {
      skipSync = false
    })
  }
  return wrapper as T
}
const STAGE = {
  /**
   * file not selected
   */
  NO_FILE: 0,
  /**
   * file selected but not uploaded
   */
  FILE_SELECTED: 1,
  /**
   * file uploaded but not permanent
   */
  FILE_TEMPORARY: 2,
  /**
   * file uploaded and permanent
   */
  FILE_PERMANENT: 3
} as const

type Stage = (typeof STAGE)[keyof typeof STAGE]

const VISUAL_STAGE = {
  IDLE: 0,
  DRAGGING: 1,
  SELECTED: 2,
  UPLOADING: 3
} as const

type VisualStage = (typeof VISUAL_STAGE)[keyof typeof VISUAL_STAGE]

const isFile = (value: unknown): value is File => value instanceof File
</script>

<script setup lang="ts">
import TextButton from '@components/button/TextButton.vue'
import { UploadDropzone, UploadItem, UploadItemDeleteTrigger, UploadItemName, UploadItemSizeText, UploadProgressBar, UploadRoot, UploadTrigger } from '@components/upload'
import { useGlobalFileDrag } from '@ui-core/composables/use-global-file-drag'
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'
import { isString } from '@ui-core/utils/inspect'
import { computed, nextTick, watch } from 'vue'
import { useFileUpload, type UploadResponse, type UseFileUploadOptions } from './use-file-upload'

type Props = {
  parseFileName?: (name: string) => string | undefined
  url: string
  name?: string
  maxSize?: number | string
  size?: number
} & UseFileUploadOptions

type Emits = {
  'before-upload': [payload: { file: File; option: string }]
  uploaded: [UploadResponse]
  'upload-error': [error: any, file: File]
}

const props = withDefaults(defineProps<Props>(), {
  handleUploadError: () => {},
  parseFileName: (name: string) => name,
  size: 0,
  maxSize: undefined,
  name: ''
})
const emits = defineEmits<Emits>()

const modelValue = defineModel<string | undefined>({ default: undefined })
const fileValue = defineModel<File | undefined>('fileValue', { default: undefined, validator: value => isFile(value) && value.size > 0 })

const { isDraggingFiles } = useGlobalFileDrag()

const { upload, isUploading, progress, cancel, remove } = useFileUpload({ controller: props.controller })

if (!fileValue.value) {
  const name = props.parseFileName(modelValue.value || '')
  fileValue.value = getFileValue(name, props.size)
}

const isProcessing = computed(() => {
  return isUploading.value && progress.value === 100
})

// Ugly hack to prevent unwanted syncronization, pause/resume did not seem to work as expected
// vueUse syncRef does not accept syncs between different types.
watch(
  () => fileValue.value,
  withSyncSkip(async value => {
    cancel()
    let nextValue: string | undefined = ''
    if (value) {
      nextValue = await handleUpload(value)
    } else {
      if (stage.value === STAGE.FILE_TEMPORARY) {
        // this must be done based on stage the input is
        await remove()
      }
    }
    modelValue.value = nextValue
  })
)
watch(
  () => modelValue.value,
  withSyncSkip(value => {
    const name = value ? props.parseFileName(value) : value
    fileValue.value = getFileValue(name, props.size)
  })
)

/**
 * The stage the file is at:
 *
 * * `0`: file not selected
 * * `1`: file selected
 * * `2`: file temporarily uploaded
 * * `3`: file permanently uploaded
 */
const stage = computed<Stage>(() => {
  const file = fileValue.value
  if (!file) {
    return STAGE.NO_FILE
  }

  if (modelValue.value && (props.size ?? 0) > 0) {
    return STAGE.FILE_PERMANENT
  }

  if (file) {
    if ('tmp' in file && file.tmp === true) {
      return STAGE.FILE_TEMPORARY
    }
    return STAGE.FILE_SELECTED
  }
  return STAGE.NO_FILE
})

const visualStage = computed<VisualStage>(() => {
  if (isUploading.value) {
    return VISUAL_STAGE.UPLOADING
  }
  if (fileValue.value) {
    return VISUAL_STAGE.SELECTED
  }
  if (isDraggingFiles.value) {
    return VISUAL_STAGE.DRAGGING
  }
  return VISUAL_STAGE.IDLE
})

async function handleUpload(file: File) {
  const payload = { file, option: props.name || '' }
  emits('before-upload', payload)
  try {
    const result = await upload(props.url, payload)
    markAsTemporary(file)
    emits('uploaded', result)
    return result.data.path
  } catch (error) {
    emits('upload-error', error, file)
    return undefined
  }
}
</script>
<style scoped>
@reference '@/theme.css';

/*might need to update style in the near future */
.file-upload {
  @apply w-xs;
}

.file-upload__trigger {
  @apply flex gap-4 text-body-secondary items-center;
}

.file-upload__dropzone {
  @apply px-3 py-2.5 items-center rounded-xl transition duration-300 outline-theme-border-info text-theme-text-primary;
}

.file-upload__dropzone--active {
  @apply bg-theme-bg-info-subtle outline;
}
.file-upload__dropzone[data-over-dropzone='true'] {
  @apply outline-theme-border-primary text-theme-text-primary-active;
}

.file-upload__progress-info {
  @apply flex w-full justify-between text-caption;
}

.file-upload__cancel-trigger {
  @apply text-theme-bg-secondary-2 hover:text-theme-bg-secondary-3;
}

.file-upload__file {
  @apply flex min-w-0 gap-2 items-center text-body-secondary;
}

.file-upload__file__name {
  @apply truncate;
}
.file-upload__file__size {
  @apply whitespace-nowrap;
}

.file-upload__file__size {
  @apply whitespace-nowrap;
}

.file-upload__file__delete-trigger {
  @apply cursor-pointer p-1 -m-1;
}

.loading-text:after {
  content: '';
  display: inline-block;
  animation: ellipsis 1.75s linear infinite;
}

@keyframes ellipsis {
  0% {
    content: '';
  }
  33% {
    content: '.';
  }
  67% {
    content: '..';
  }
  100% {
    content: '...';
  }
}
</style>
