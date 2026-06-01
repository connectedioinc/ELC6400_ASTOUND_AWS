<template>
  <vuci-form-item-template
    v-show="showOption"
    v-bind="VuciFormItemTemplateProps"
    :required="required"
  >
    <template
      v-if="$slots.help"
      #help
    >
      <slot name="help" />
    </template>
    <template
      v-if="$slots.hintBox"
      #hintBox
    >
      <slot name="hintBox" />
    </template>
    <template
      v-if="$slots['after-content']"
      #after-content="props"
    >
      <slot
        name="after-content"
        v-bind="props"
      />
    </template>
    <tlt-upload
      v-model="inputValue"
      v-bind="uploadProps"
      v-on="uploadEvents"
      @reset="onReset"
    >
      <template #before>
        <slot name="before" />
      </template>
      <template #fileName="{ fileName: name }">
        <slot
          name="fileName"
          :file-name="name"
        />
      </template>
      <template #after>
        <slot name="after" />
      </template>
    </tlt-upload>
  </vuci-form-item-template>
</template>

<script>
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import * as Types from '@ui-core/types'
import VuciFormItemMixin from './VuciFormItemMixin'
import { formBus } from '@ui-core/vuci-form'
import { makeProps, noop } from '@ui-core/utils/props'
import { isEmpty } from '@ui-core/utils/inspect'

export default {
  name: 'VuciFormItemUpload',
  mixins: [VuciFormItemMixin],
  inject: {
    modalStore: {
      default: null
    }
  },
  props: makeProps({
    maxSize: [[Number, String], 0, v => typeof v === 'number' || ['KB', 'MB', 'GB'].some(size => v.includes(size))],
    endpoint: [String, null],
    rules: [[String, Array], 'string'],
    instant: [Boolean, false],
    useOptionAsSeparator: [Boolean, false],
    customRemove: [Function, noop],
    beforeUpload: [Function, noop],
    afterUpload: [Function, noop],
    customAction: [String, null],
    option: [String, ''],
    errorHandler: [Object, null]
  }),
  emits: ['user-input', 'uploaded', 'reset'],
  data() {
    return {
      fileName: '',
      parsedPath: '',
      inputValue: new File([], ''),
      defaultErrors: {
        2: this.$t('Incorrect file uploaded'),
        4: this.$t('File does not exist'),
        150: this.$t('Not enough free space in the device'),
        151: this.maxSize
          ? this.$t('Maximum allowed file size is %MB').format(parseInt(this.maxSize)) // parsing is needed because maxSize can be string with letters.
          : this.$t('File is too big'),
        default: e => {
          console.error(e)
          return this.$t('An unexpected error occurred')
        }
      }
    }
  },
  computed: {
    sectionId() {
      return this.uciSection[this.vuciSection.sectionId]
    },
    uuid() {
      return `${this.sectionId}:${this.name || this.option}`
    },
    action() {
      if (this.endpoint) return this.endpoint
      const data = this.vuciSection.uciData[this.vuciSection.dataKey]
      const endpoint = this.vuciSection.getEndpoint(data)
      return `/api/${endpoint}/${this.sectionId}`
    },
    file() {
      const updatedFile = new File([this.inputValue], this._normalizeFileName(this.inputValue.name))
      return updatedFile || {}
    },
    fileSize() {
      return parseInt(this.uciSection[`${this.name}:file_size`])
    },
    uploadProps() {
      const props = {
        ref: 'tlt-upload',
        vuciUpload: true,
        fileSize: this.fileSize,
        action: this.customAction || this.action,
        name: this.name,
        maxSize: this.maxSize,
        option: this.option,
        valid: this.valid,
        readonly: this.readonly
      }
      if (this.instant) {
        return { ...props, ...this.instantUploadProps }
      }
      return props
    },
    instantUploadProps() {
      return {
        path: this.parsedPath,
        instant: true,
        customRemove: this.customRemove,
        beforeUpload: this.beforeUpload
      }
    },
    uploadEvents() {
      return {
        uploaded: this.instant ? this.afterUpload : () => {},
        input: val => (this.instant ? this.$emit('user-input', val) : () => {})
      }
    },
    availableModel() {
      return !this.model || !this.inputValue.name
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler() {
        const event = this.visible ? `add-upload-to-form-${this.vuciForm.uid}` : `remove-upload-from-form-${this.vuciForm.uid}`
        formBus.emit(event, this)
      }
    },
    inputValue(value) {
      if (this.changed) this.resetWarnings()
      const hasPath = /^(\/?.+)+/.test(this.model)
      const path = this.getPathInfo(this.model)
      if (hasPath && !path.path) return // if some path to file is present but it's not a vuci path - probably it's some other input model
      value.size ? this.storeValue(value) : this.clearValue()
      if (!path.path) return (this.model = value.name)
      if (!value.name && !hasPath) return (this.model = '')
      this.model = path.fullPath
    },
    showOption(value) {
      if (!value) {
        this.tempValue = this.isEmpty(this.model) ? this.convertUciValue(this.initialValue) : this.model
        if (this.rmempty) this.model = ''
      } else {
        this.$nextTick(() => {
          if (this.availableModel) {
            this.model = this.isEmpty(this.tempValue) ? this.convertUciValue(this.initialValue) : this.tempValue
            this.setInputValue(this.model)
          }
          this.registerInput()
        })
      }
    }
  },
  created() {
    this.setInputValue(this.model)
  },
  methods: {
    setInitialValue(value) {
      this.tempValue = this.isEmpty(value) ? this.convertUciValue(this.initial) : value
      if (this.visible) this.model = this.tempValue
      this.initialValue = this.tempValue
    },
    getStoredValue() {
      if (!this.modalStore) return
      return this.modalStore?.get(this.uuid)
    },
    /**
     * @param {File} file
     */
    storeValue(file) {
      if (!this.modalStore) return
      this.modalStore.set(this.uuid, file)
    },
    clearValue() {
      if (!this.modalStore) return
      this.modalStore.delete(this.uuid)
    },
    // overridden mixin-api validate method.
    async validate(value = this.model) {
      const withAssign = valid => {
        this.valid = valid
        this.validationMessages = valid ? [] : [this.$t('File is required')]
        return valid
      }
      if (this.visible && this.required && isEmpty(value)) return withAssign(false)
      return withAssign(true)
    },
    getSeparator(id) {
      return `${id}.${this.useOptionAsSeparator ? this.option : this.name}`
    },
    getPathInfo(value) {
      // Try to separate by section name/type first for backwards compatibility
      let separator = this.getSeparator(this.vuciSection.name || this.vuciSection.type)
      let separatorIndex = value.indexOf(separator)
      if (separatorIndex === -1) {
        separator = this.getSeparator(this.sectionId)
        separatorIndex = value.indexOf(separator)
      }
      const path = separatorIndex > -1 ? value.slice(0, separatorIndex) : value
      const name = separatorIndex > -1 ? value.slice(separatorIndex + separator.length) : value.split('/').at(-1)
      const fullPath = separatorIndex > -1 ? `${path}${separator}${name}` : value
      return {
        path,
        name,
        separator,
        fullPath
      }
    },
    setInputValue(value) {
      if (!this.fileSize && this.visible) {
        const value = this.getStoredValue()
        if (value) {
          //  watcher will do the rest of the model setting
          this.inputValue = value
        } else {
          this.model = ''
        }
      }

      const pathInfo = this.getPathInfo(value)
      this.inputValue = new File([], pathInfo.name || '')
    },
    resetWarnings() {
      this.$nextTick(() => {
        this.warningMessages = []
        this.warning = false
      })
    },
    onReset() {
      this.$emit('reset', this.model)
      this.model = ''
      this.inputValue = new File([], '')
      this.resetWarnings()
    },
    reset() {
      this.$refs?.['tlt-upload']?.resetInput?.()
    },
    /**
     * @description Sends post request to provided action with file data and returns its response
     * @returns {Promise<Types.XHRUploadResponse>}
     */
    uploadFile() {
      if (this.instant) return
      const successResp = { success: true, name: this.model }
      if (this.file.size === 0) {
        let promise = new Promise(resolve => resolve(successResp))
        if (this.file.name === '') {
          promise = new Promise(resolve => {
            this.model = ''
            resolve({ success: true, name: '' })
          })
        }
        return promise
      }
      const formData = new FormData()
      formData.append('option', this.option || this.name)
      formData.append('file', this.file)
      return new Promise(resolve => {
        return this.$axios
          .post(this.action, formData)
          .then(res => {
            // setting file size to persist it in model, because file_size is updated after form is saved.
            this.uciSection[`${this.name}:file_size`] = this.file.size
            this.model = res.data.path
            this.setInputValue(res.data.path)
            this.$emit('uploaded', res)
            resolve({ ...successResp, name: this.file.name, result: res })
          })
          .catch(e => {
            const codes = Object.assign({}, this.defaultErrors, this.errorHandler)
            let errorCode = e?.response?.data?.errors?.[0]?.code || 'default'
            if (!(errorCode in codes)) errorCode = 'default'
            const errorMessage = typeof codes[errorCode] === 'function' ? codes[errorCode](e, codes) : codes[errorCode]
            resolve({ success: false, name: this.file.name, handler: errorMessage })
          })
      })
    },
    _normalizeFileName(value) {
      return value.replace(/[^a-zA-Z0-9.]/g, '_')
    }
  }
}
</script>
