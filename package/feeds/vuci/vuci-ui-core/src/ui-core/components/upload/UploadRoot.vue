<template>
  <Primitive v-bind="omit(props, ['id', 'multiple'])">
    <slot :files="filesValue" />
    <input
      :id="hiddenInputId"
      ref="hiddenInput"
      type="file"
      class="hidden"
      :multiple="props.multiple ? true : undefined"
      @click="onInputClick"
      @input="onInput"
    />
  </Primitive>
</template>

<script lang="ts">
type ReadonlyRef<T> = Readonly<Ref<T>>

export type UploadRootContext = {
  ids: {
    dropzone: ReadonlyRef<string>
    input: ReadonlyRef<string>
    trigger: ReadonlyRef<string>
  }
  setDropzoneRef: (el: HTMLElement | null) => void
  dropzoneRef: ReadonlyRef<HTMLElement | null>
  setTriggerRef: (el: HTMLElement | null) => void
  triggerRef: ReadonlyRef<HTMLElement | null>
  readonly: ReadonlyRef<boolean>
  disabled: ReadonlyRef<boolean>
  required: ReadonlyRef<boolean>
  remove: (file: File) => void
  files: ReadonlyRef<File[]>
  openFilePicker: () => void
  onFileSelect: (files: File[]) => void
}

export const [provideUploadContext, injectUploadContext] = createContext<UploadRootContext>('file-upload')
</script>

<script setup lang="ts">
import Primitive, { type PrimitiveProps } from '@components/primitive/Primitive.vue'
import { isArray, isNonNullable, isNumber, isString } from '@ui-core/utils/inspect'
import { createContext } from '@ui-core/utils/create-context'
import { composeId, getId } from '@ui-core/utils/core-utils'
import { computed, useTemplateRef, toRef, ref, onMounted } from 'vue'
import type { Ref } from 'vue'
import { omit } from '@ui-core/utils/object'
import { convertStringToBytes } from './upload-utils'

type Props = PrimitiveProps & {
  id?: string
  maxSize?: string | number
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  multiple?: boolean
}

type FileUploadFileError = 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL'

const props = defineProps<Props>()
const emits = defineEmits<{
  'file-rejected': [files: File, reason: FileUploadFileError]
}>()

const maxAllowedSize = computed(() => {
  // when 0, '', or undefined, allow any size
  if (!props.maxSize) return Infinity
  if (isString(props.maxSize)) return convertStringToBytes(props.maxSize)
  return props.maxSize
})

const model = defineModel<File | File[] | undefined>({ default: undefined })

const filesValue = computed<File[]>(() => (isArray(model.value) ? model.value : [model.value].filter(isNonNullable)))

if (props.multiple) {
  model.value ??= []
  if (model.value && !isArray(model.value)) throw new Error('[UploadRoot] modelValue must be an array or undefined when multiple is true')
} else if (!props.multiple && isArray(model.value)) {
  throw new Error('[UploadRoot] modelValue must be a File or undefined when multiple is false')
}
// add files to the input element on mount
onMounted(() => {
  setInputFiles(filesValue.value)
})

function onInputClick(event: Event) {
  event.stopPropagation()
  // allow for re-selection of the same file
  ;(event.currentTarget as HTMLInputElement).value = ''
}

function validateWithEmit(file: File) {
  if (file.size === 0) {
    emits('file-rejected', file, 'FILE_TOO_SMALL')
    return false
  }
  if (file.size > maxAllowedSize.value) {
    emits('file-rejected', file, 'FILE_TOO_LARGE')
    return false
  }
  return true
}

function onInput(event: InputEvent) {
  if (props.disabled || props.readonly) return
  const { files } = event.currentTarget as HTMLInputElement
  onFileSelect(files ? [...files] : [])
}

const hiddenInputRef = useTemplateRef('hiddenInput')

const stableId = getId()

const hiddenInputId = computed(() => props.id || stableId)
const dropzoneId = ref(composeId(hiddenInputId.value, 'dropzone'))
const triggerId = ref(composeId(hiddenInputId.value, 'trigger'))

function setInputFiles(files: File[]) {
  if (!hiddenInputRef.value) return
  const dataTransfer = new DataTransfer()
  files.forEach(file => dataTransfer.items.add(file))
  hiddenInputRef.value.files = dataTransfer.files
  hiddenInputRef.value.dispatchEvent(new Event('change', { bubbles: true }))
}

function onFileSelect(values: File[]) {
  const validFiles = values.filter(validateWithEmit)
  if (props.multiple) {
    if (!isArray(model.value)) throw new Error('[UploadRoot] when multiple is true, modelValue must be an array')
    model.value = [...model.value, ...validFiles]
    setInputFiles(model.value)
    return
  }
  model.value = validFiles[0]
  setInputFiles(validFiles[0] ? [validFiles[0]] : [])
}
function remove(file: File) {
  if (props.multiple && isArray(model.value)) {
    model.value = model.value.filter(f => f !== file)
    setInputFiles(model.value)
  } else {
    model.value = undefined
    setInputFiles([])
  }
}

const triggerRef = ref<HTMLElement | null>(null)
const dropzoneRef = ref<HTMLElement | null>(null)

const setDropzoneRef = (el: HTMLElement | null) => {
  dropzoneRef.value = el
}

const setTriggerRef = (el: HTMLElement | null) => {
  triggerRef.value = el
}

provideUploadContext({
  ids: {
    dropzone: dropzoneId,
    trigger: triggerId,
    input: hiddenInputId
  },
  readonly: toRef(props, 'readonly'),
  disabled: toRef(props, 'disabled'),
  required: toRef(props, 'required'),
  files: filesValue,
  remove,
  triggerRef,
  dropzoneRef,
  setDropzoneRef,
  setTriggerRef,
  openFilePicker: () => {
    if (!hiddenInputRef.value) return
    hiddenInputRef.value.click()
  },
  onFileSelect
})
</script>

<style lang="scss" scoped></style>
