<template>
  <div
    class="flex shrink w-full items-center gap-1 max-w-xs"
    :class="{ 'upload-wrapper': instant, 'text-theme-text-danger': !valid }"
  >
    <template v-if="instant">
      <div
        v-if="uploading"
        class="upload-overlay"
      />
      <div
        id="upload"
        class="flex items-center w-full"
      >
        <template v-if="uploadPercentage == 0">
          <template v-if="!activeDrag">
            <tlt-button
              :button-id="name"
              type="text"
              size="md"
              :disabled="uploadPercentage > 0 || readOnly"
              @click="_fileSelect"
            >
              {{ $t('Browse') }}
            </tlt-button>
            <div class="ml-2">{{ $t('or drag and drop your file here') }}</div>
          </template>
          <template v-else-if="activeDrag && !readOnly">
            <p
              :class="{ 'active-drag': activeDrag }"
              v-on="!readOnly ? fileDragListeners : {}"
            >
              {{ $t('Drag and drop your file here') }}
            </p>
          </template>
        </template>
        <div
          v-else
          class="bar-wrapper mr-1"
        >
          <div class="file-placeholder">
            <span v-if="!error">{{ displayName }}...</span>
            <span
              v-else
              class="error"
              >{{ $t('Unsuccessful upload') }}</span
            >
            <span>{{ uploadPercentage }} %</span>
          </div>
          <div
            class="background-bar"
            :class="{ 'bg-error-light': error }"
          >
            <div
              class="progress-bar"
              :class="{ 'bg-error': error }"
              :style="{ maxWidth: uploadPercentage + '%' }"
            />
          </div>
          <slot
            class="error"
            name="error"
            :error="errorMessage"
          >
            <!-- eslint-disable -->
            <span
              v-if="error"
              v-html="$xss(errorMessage)"
              class="error"
            />
          </slot>
        </div>
        <div
          v-if="uploadPercentage > 0"
          class="self-start mt-3 delete-wrapper"
        >
          <tlt-button
            v-show="uploading || error"
            :test-id="`upload-delete-${name}`"
            color="secondary"
            type="text"
            :disabled="false"
            icon="x"
            @click="removeFile"
          />
        </div>
        <input
          :ref="inputRef"
          :test-id="`upload-input-${name}`"
          type="file"
          class="hidden"
          @change="_uploadFile"
        />
      </div>
    </template>
    <template v-else>
      <template v-if="!activeDrag">
        <label
          class="flex gap-2 w-full! items-center"
          :for="inputRef"
          @click="_handleFileSelect"
        >
          <div
            :id="itemId || null"
            class="flex min-w-0 gap-1"
          >
            <tlt-button
              v-if="!fileSelected"
              class="inline!"
              type="text"
              size="md"
              :disabled="readOnly"
              @click="$refs[inputRef].click()"
            >
              {{ $t('Browse') }}
            </tlt-button>
            <div
              v-if="modelValue.name !== ''"
              class="flex items-center gap-2 min-w-0"
            >
              <slot name="before" />
              <tlt-overflow-hint
                class="file-name"
                :data-state="inputState"
                :test-id="`upload-file-${name}`"
                middle-truncate
              >
                <slot
                  name="fileName"
                  :file-name="fileDisplayText"
                >
                  {{ fileDisplayText }}
                </slot>
              </tlt-overflow-hint>
              <span
                v-if="sizeBytes"
                class="text-nowrap"
              >
                ({{ size }})
              </span>
              <slot name="after" />
            </div>
            <template v-else>{{ $t('or drag and drop your file here') }}</template>
          </div>
          <input
            :ref="inputRef"
            :id="inputRef"
            :test-id="`upload-input-${name}`"
            class="hidden"
            type="file"
            @change="_handleFile"
          />
          <tlt-button
            v-if="fileSelected"
            class="delete-wrapper"
            :test-id="`upload-delete-${name}`"
            type="text"
            color="secondary"
            icon="x"
            :disabled="readOnly"
            @click="removeFile"
          />
        </label>
      </template>
      <template v-else-if="!readOnly && activeDrag">
        <p
          class="m-0"
          :class="{ 'active-drag': activeDrag && !readOnly }"
          v-on="!readOnly ? fileDragListeners : {}"
        >
          {{ $t('Drag and drop your file here') }}
        </p>
      </template>
    </template>
    <tlt-icon
      v-if="uploading && !error && uploadPercentage === 100"
      icon="spinner"
      class="text-theme-text-primary size-6"
      animate
    />
  </div>
</template>
<script>
import axios from 'axios'
import { useCommonInjects as useInputInjects } from './_shared/useCommonInjects'
import { formBus } from '@ui-core/vuci-form'
import { isEmpty } from '@ui-core/utils/inspect'

export default {
  inject: {
    itemId: {
      default: null
    }
  },
  props: {
    valid: {
      type: Boolean,
      default: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    maxSize: {
      type: [Number, String],
      default: 104857600, // default size changed to 100MB due to general crashing when RAM is full https://git.teltonika.lt/teltonika/rutx_open/-/issues/9099#note_693074
      validator: v => typeof v === 'number' || ['KB', 'MB', 'GB'].some(size => v.includes(size))
    },
    path: {
      type: String,
      default: ''
    },
    modelValue: {
      type: [String, File],
      default: ''
    },
    action: {
      type: String,
      required: true
    },
    beforeUpload: {
      type: Function,
      default: () => {}
    },
    customUpload: {
      type: Function,
      default: null
    },
    customRemove: {
      type: Function,
      default: null
    },
    readonly: {
      type: Boolean,
      default: false
    },
    instant: {
      type: Boolean,
      default: false
    },
    name: {
      type: String,
      required: true
    },
    onError: {
      type: Function,
      default: null
    },
    option: {
      type: String,
      default: ''
    },
    errors: {
      type: [Object, Function],
      default: () => {}
    }
  },
  emits: ['uploaded', 'update:modelValue', 'reset'],
  setup() {
    return useInputInjects()
  },
  data() {
    return {
      uploadPercentage: 0,
      displayName: this.$t('No file selected'),
      uploading: false,
      dragOverTimeout: undefined,
      source: axios.CancelToken.source(),
      activeDrag: false,
      fileDragListeners: {
        dragover: this.preventDefault,
        dragend: this._handleDragEnd,
        drop: this._handleDrop,
        dragenter: this._handleDragEnter
      },
      error: false,
      errorMessage: ''
    }
  },
  computed: {
    _maxSize() {
      if (typeof this.maxSize === 'number') return this.maxSize
      const units = ['KB', 'MB', 'GB']
      const power = units.findIndex(unit => this.maxSize.includes(unit)) + 1
      return parseInt(this.maxSize) * Math.pow(1024, power)
    },
    sizeBytes() {
      return this.modelValue?.size || this.fileSize
    },
    size() {
      return this._formatBytes(this.sizeBytes)
    },
    inputRef() {
      return this.option ? `file_input_${this.option}` : `file_input_${this.name}_${this.$.uid}`
    },
    readOnly() {
      return this.$store.readOnlyPage || this.readonly
    },
    fileDisplayText() {
      if (isEmpty(this.modelValue.name)) return

      return this.modelValue.name
    },
    fileSelected() {
      return this.instant ? this.modelValue !== '' : this.modelValue.name !== ''
    }
  },

  watch: {
    readOnly: {
      immediate: true,
      handler(readonly) {
        if (!readonly) {
          document.addEventListener('dragleave', this._handleDragLeave)
          document.addEventListener('dragover', this._handleGlobalDragover)
          document.addEventListener('drop', this._handeleGlobalDrop)
        } else {
          document.removeEventListener('dragleave', this._handleDragLeave)
          document.removeEventListener('dragover', this._handleGlobalDragover)
          document.removeEventListener('drop', this._handeleGlobalDrop)
        }
      }
    },
    uploading(value) {
      this.$store.$patch(state => {
        if (value) state.uploading++
        else if (state.uploading > 0) state.uploading--
        state.readOnlyPage = !!value
      })
    },
    uploadPercentage(value) {
      if (value < 100) {
        this.displayName = this.$t('Uploading')
      } else {
        setTimeout(() => {
          this.displayName = this.$t('File is being processed')
        }, 100)
      }
    }
  },
  mounted() {
    formBus.on('set-active-drag', () => {
      if (this.fileSelected === false) {
        this.activeDrag = true
      }
    })
    formBus.on('set-drag-timeout', () => {
      this.dragOverTimeout = setTimeout(() => {
        this._handleDragEnd()
      }, 750)
    })
    formBus.on('clear-drag-timeout', () => {
      clearTimeout(this.dragOverTimeout)
    })

    formBus.on('remove-active-drag', () => {
      this.activeDrag = false
    })

    if (this.instant || !this.fileSize) return
    this.uploadPercentage = 100
    const fileName = this.path.split('/').at(-1)
    if (!fileName) {
      const defaultFileName = this.path.split('.')
      this.displayName = `${defaultFileName.at(-1)} (${this.size})`
    } else {
      this.displayName = `${fileName} (${this.size})`
    }
  },
  unmounted() {
    document.removeEventListener('dragleave', this._handleDragLeave)
    document.removeEventListener('dragover', this._handleGlobalDragover)
    document.removeEventListener('drop', this._handeleGlobalDrop)
  },
  methods: {
    _handleGlobalDragover() {
      this.clearDragTimeout()
      formBus.emit('set-drag-timeout')
      formBus.emit('set-active-drag')
    },
    clearDragTimeout() {
      formBus.emit('clear-drag-timeout')
    },
    _handeleGlobalDrop() {
      this._handleDragEnd()
    },
    _handleUploadErr(err) {
      this.error = true
      const code = err?.response?.data?.errors?.[0]?.code || 'default'
      this.errorMessage = typeof this.errors === 'function' ? this.errors(code, err) : this.errors[code]
    },

    _handleFileSelect(e) {
      if (this.fileSelected || this.readOnly || this.disabled) this.preventDefault(e)
    },
    /**
     * @param {Event} e - Event with type change is change event.
     */
    _handleFile(e) {
      if (e.target.files.length && !this.fileSelected && this._validateSize(e.target.files[0])) this.$emit('update:modelValue', e.target.files[0])
    },
    /**
     * @param {DragEvent} e
     */
    _handleDraggedFile(e) {
      this._handleDragEnd()
      const dt = e.dataTransfer
      const file = dt.files?.[0] || dt.items?.[0]?.getAsFile()
      if (file && this._validateSize(file)) {
        if (this.instant) this._uploadFile(dt, true)
        else this.$emit('update:modelValue', file)
      }
    },

    preventDefault(e) {
      if (!e) return
      e.preventDefault()
      e.stopPropagation()
    },
    /**
     * @param {DragEvent} e
     */
    _handleDragEnd() {
      formBus.emit('remove-active-drag')
    },

    _handleDrop(e) {
      this.preventDefault(e)
      if (!this.fileSelected) this._handleDraggedFile(e)
    },
    _handleDragEnter(e) {
      e.target.classList.add('current-drag')
      this.clearDragTimeout()
    },
    _handleDragLeave(e) {
      e.target.classList.remove('current-drag')
      if (!e.clientX && !e.clientY) {
        formBus.emit('set-drag-timeout')
      }
    },
    removeFile(e) {
      this.preventDefault(e)
      this.source.cancel()
      this.$emit('update:modelValue', new File([], ''))
      this.resetInput()
    },
    _formatBytes(bytes) {
      if (bytes === 0) return this.$t('0 Bytes')
      const k = 1024
      const dm = 1
      const sizes = [this.$t('Bytes'), 'KB', 'MB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
    },
    _fileSelect() {
      this.$refs[this.inputRef].value = null
      this.$refs[this.inputRef].click()
    },
    /**
     * @param {File} file
     */
    _validateSize(file) {
      const error = msg => {
        this.$message.error(msg)
        return false
      }
      const fileSize = file.size
      if (fileSize === 0) return error(this.$t("Empty files can't be uploaded"))
      if (this._maxSize !== 0 && fileSize > this._maxSize) return error(this.$t('Maximum allowed file size is %MB').format(this._maxSize))
      return true
    },
    async _uploadFile(e, onDrag = false) {
      /** @type {File} */
      const inputFile = onDrag ? e.files[0] : e.target.files[0]
      if (!this._validateSize(inputFile)) return
      this.file = inputFile
      await this._initUpload()
      this.source = axios.CancelToken.source()
      const cancelToken = this.source.token
      const formData = new FormData()
      formData.append('option', this.name)
      this.beforeUpload(formData)
      formData.append('file', this.file)
      try {
        this.uploadPercentage = 1
        const res = await this.$axios.post(this.action, formData, {
          cancelToken,
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'json',
          onUploadProgress: progressEvent => {
            if (!this.uploading) return
            this.uploadPercentage = parseInt(Math.round((progressEvent.loaded / progressEvent.total) * 100))
          }
        })
        this.uploadPercentage = 100
        this.displayName = `${this.file.name} (${this.size})`
        this.$emit('uploaded', { file: this.file, res })
        this.resetInput()
      } catch (error) {
        if (error.message === 'ERR_CANCELED') {
          this.$message.error(this.$t('Upload canceled'))
        } else {
          this._handleUploadErr(error)
        }
      } finally {
        this.uploading = false
      }
    },
    async _initUpload() {
      this.uploading = true
      this.activeDrag = false
    },
    resetInput() {
      this.$emit('update:modelValue', '')
      this.error = false
      this.errorMessage = ''
      // reseting <input> element value, because we're listening to change event,
      // so if same file is uploaded <input @change> event won't trigger
      this.$refs[this.inputRef].value = null
      this.displayName = this.$t('No file selected')
      this.uploading = false
      this.uploadPercentage = 0
      this.$emit('reset')
    }
  }
}
</script>

<style scoped>
#upload {
  display: flex;
  .bar-wrapper {
    width: 100%;
    max-width: 300px;
    height: 100%;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
  }
  .background-bar {
    position: relative;
    background-color: var(--color-theme-bg-secondary-subtle);
    left: 0;
    width: 100%;
    height: 8px;
    top: 0;
    border-radius: 3px;
    &.bg-error-light {
      background: rgba(255, 192, 203, 0.3);
    }
  }
  .progress-bar {
    background: var(--color-theme-bg-primary-1);
    transition: max-width ease-in-out 0.3s;
    left: 0;
    width: 100%;
    height: 8px;
    top: 0;
    display: absolute;
    border-radius: 3px;
    &.bg-error {
      background: var(--color-theme-bg-danger);
    }
  }
  .file-placeholder {
    display: flex;
    justify-content: space-between;
    width: 100%;
    text-align: left;
    word-wrap: anywhere;
  }
}
.active-drag {
  border: 1.5px dotted var(--color-theme-border-primary);
  width: 100%;
  min-width: 300px;
  padding: 12px 16px;
  color: var(--color-theme-text-primary);
  background-color: rgba(180, 201, 235, 0.1);
  border-radius: 8px;
}
.current-drag {
  border: 1.5px solid var(--color-theme-border-primary);
}
.remove-file {
  height: 10px;
  margin-top: 4px;
  margin-bottom: auto;
  padding-left: 8px;
  padding-right: 8px;
  cursor: pointer;
  &:hover {
    &:after,
    &:before {
      background-color: var(--color-theme-bg-primary-1);
    }
  }
  &:after {
    transform: rotate(45deg);
  }
  &:before {
    transform: rotate(-45deg);
  }
  &:after,
  &:before {
    transition-duration: 0.3s;
    content: ' ';
    background-color: var(--color-theme-text-base);
    position: absolute;
    height: 10px;
    width: 1px;
  }
}

@media (max-width: 800px) {
  #upload {
    .bar-wrapper {
      width: 60%;
    }
  }
}
@media (max-width: 500px) {
  #upload {
    .bar-wrapper {
      width: 100%;
    }
  }
}
.delete-wrapper {
  z-index: 9;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 20px;
  width: 20px;
}

.file-name {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.upload-overlay {
  width: 100%;
  height: 100%;
  z-index: 8;
  top: 0;
  left: 0;
  position: fixed;
}

.upload-wrapper {
  display: flex;
  max-width: 20rem;
  position: relative;
}

label {
  display: flex;
  width: inherit;
}
</style>
