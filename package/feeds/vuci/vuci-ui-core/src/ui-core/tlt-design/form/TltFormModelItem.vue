<template>
  <div
    v-if="visible"
    class="text-body-secondary min-w-0"
    :class="{
      'md:grid-cols-[2fr_3fr] gap-x-4 gap-y-2 items-start md:items-center': !inlineForm && !tableChild,
      'mx-auto md:grow min-w-full md:min-w-fit md:basis-40 gap-1': inlineForm,
      'inline-flex flex-wrap md:grid max-w-full': inlineInput,
      grid: !inlineInput
    }"
  >
    <tlt-hint
      v-if="label"
      class="relative form-item-label min-w-0 w-fit"
      :class="{
        'md:justify-self-end md:text-end': !inlineForm,
        'max-md:hidden': label === ' '
      }"
      :style="{ minWidth: labelWidth }"
      :hints="help ? { title: parseValues(label), info: help } : undefined"
      :rawhtml="rawhtml"
      :target="isMobile ? () => $el : undefined"
      placement="bottom-start"
      fallback-placements="top-start"
      show-icon="mobile"
    >
      <label
        :id="prop + '-label'"
        :ref="el => (labelRef = el)"
        class="text-theme-text-base max-w-fit font-sans"
        :class="{
          'hover:text-theme-text-primary': help || $slots.help
        }"
        :for="prop"
      >
        <slot
          name="label"
          :label="parsedLabel"
        >
          {{ parsedLabel }}
        </slot>
      </label>
      <span
        v-if="required && label && label.trim() !== ''"
        class="font-semibold text-theme-text-danger leading-3"
      >
        *
      </span>
      <template
        v-if="$slots.help"
        #title
      >
        {{ parsedLabel }}
      </template>
      <template
        v-if="$slots.help"
        #hintBox
      >
        <slot name="help">
          {{ help }}
        </slot>
      </template>
    </tlt-hint>

    <tlt-hint
      :ref="el => (controlRef = el)"
      class="relative inline-flex gap-2 min-w-0 w-full form-item-control"
      :class="{ 'unset-max-width': width, 'col-span-full': !label, 'max-w-xs': inlineForm }"
      :hints="hints"
      :target="() => controlRef.$el.firstElementChild"
      show-icon="mobile"
    >
      <slot />
      <template
        v-if="$slots.controlHintBox"
        #hintBox
      >
        <slot name="controlHintBox" />
      </template>
    </tlt-hint>

    <template v-if="controlRef?.$el">
      <tlt-popover
        v-if="prop"
        :disabled="errorMessageDisabled"
        :target="() => controlRef.$el.firstElementChild"
        :style="isMobile && fieldWidth ? { 'max-width': `${fieldWidth}px` } : {}"
        :placement="isMobile ? 'bottom-start' : 'right-start'"
        :fallback-placements="['top-start']"
        class="max-w-xs"
        variant="error"
      >
        <div class="flex gap-3 text-theme-text-danger font-semibold">
          <tlt-icon
            icon="error"
            class="size-5 shrink-0"
          />
          <ul class="min-w-0">
            <li
              v-for="message in messages"
              :key="message"
              class="break-words"
            >
              {{ message }}
            </li>
          </ul>
        </div>
      </tlt-popover>
      <tlt-popover
        :disabled="!warningMessages.length || messages.length > 0"
        :target="() => controlRef.$el.firstElementChild"
        :style="isMobile && fieldWidth ? { 'max-width': `${fieldWidth}px` } : {}"
        variant="warning"
        :placement="isMobile ? 'bottom-start' : 'right-start'"
        :fallback-placements="['top-start']"
      >
        <div class="flex gap-3 font-semibold rounded-sm">
          <tlt-icon
            icon="warning"
            class="size-5 shrink-0"
          />
          <ul class="min-w-0">
            <li
              v-for="message in warningMessages"
              :key="message"
              class="break-words"
            >
              {{ message }}
            </li>
          </ul>
        </div>
      </tlt-popover>
    </template>

    <slot
      v-if="controlRef?.$el.firstElementChild"
      name="after-content"
      :control-ref="controlRef.$el.firstElementChild"
      :label-ref="labelRef"
    />
  </div>
</template>

<script>
import { ValidationBus } from './core/validation-bus'
import { isEmpty, isArray, isBoolean, isFunction } from '@ui-core/utils/inspect'
import { KEY_ITEM_ID, KEY_ELEMENT_ID, KEY_VALID, KEY_WARNING, KEY_MAX_LEN, KEY_MIN_LEN } from '@ui-core/tlt-design/form/core/_shared/constants'

const encoder = new TextEncoder()

export default {
  provide() {
    return {
      [KEY_ITEM_ID]: this.prop,
      [KEY_ELEMENT_ID]: this.elementId,
      [KEY_VALID]: () => this.valid,
      [KEY_WARNING]: () => this.warningMessages.length > 0,
      datatype: this.datatype,
      [KEY_MAX_LEN]: this.maxlength,
      [KEY_MIN_LEN]: this.minlength
    }
  },
  inject: {
    formData: {
      default: () => {}
    },
    inlineForm: {
      default: false
    },
    tableChild: {
      default: false
    },
    noValidate: {
      default: () => () => false
    },
    itemId: {
      type: String,
      default: null
    }
  },
  props: {
    warnings: {
      type: [Array, Function],
      default: null
    },
    inlineInput: {
      type: Boolean,
      default: false
    },
    rawhtml: {
      type: Boolean,
      default: false
    },
    help: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ' '
    },
    elementId: {
      type: String,
      default: ''
    },
    prop: {
      type: String,
      default: ''
    },
    visible: {
      default: true,
      type: Boolean
    },
    rules: {
      type: [Object, Array],
      default: () => {}
    },
    tltInput: {
      type: Boolean,
      default: false
    },
    inputValue: {
      type: [String, Array],
      default: ''
    },
    labelWidth: {
      type: String,
      default: ''
    },
    width: {
      type: String,
      default: ''
    },
    validatorHint: {
      type: String,
      default: ''
    },
    maxlength: {
      type: String,
      default: null
    },
    minlength: {
      type: String,
      default: null
    },
    required: {
      type: Boolean,
      default: false
    },
    datatype: {
      type: [String, Function, Array],
      default: ''
    },
    duplicatesValidation: {
      type: Object,
      default: () => {
        return {
          duplicates: [],
          message: ''
        }
      }
    },
    hints: {
      type: [String, Object, Array],
      default: null
    }
  },

  data() {
    return {
      controlRef: null,
      labelRef: null,
      isMobile: false,
      messages: [],
      warningMessages: [],
      valid: true,
      showMessage: true,
      fieldWidth: 320,
      eventName: null,
      media: null
    }
  },
  computed: {
    errorMessageDisabled() {
      return this.valid || this.messages.length === 0 || !this.showMessage
    },
    value() {
      if (this.tltInput) {
        return this.inputValue
      }
      return this.formData?.[this.prop]
    },
    lengthMessages() {
      return Array.isArray(this.value)
        ? {
            max: this.$t('Maximum length of single value is %s.'),
            min: this.$t('Minimum length of single value is %s.'),
            eq: this.$t('Length of single value entry must be %s.')
          }
        : {
            max: this.$t('Maximum length of value is %s.'),
            min: this.$t('Minimum length of value is %s.'),
            eq: this.$t('Length of the value must be %s.')
          }
    },
    parsedLabel() {
      return this.parseValues(this.label)
    }
  },
  watch: {
    value(v) {
      if (this.noValidate()) return
      this.checkWarnings()
      this.validate(v)
    }
  },
  created() {
    const mm = window.matchMedia('(max-width: 767px)')
    this.isMobile = mm.matches
    mm.addEventListener('change', this.updateMobile)
    this.media = mm
    this.eventName = `validate-${this.prop}`
    ValidationBus.on(this.eventName, this.validateCallback)
  },
  mounted() {
    this.$resizeObserver.observe(this.$el, this.resizeUpdate)
    this.checkWarnings()
  },
  beforeUnmount() {
    ValidationBus.off(this.eventName, this.validateCallback)
    this.media?.removeEventListener('change', this.updateMobile)
    this.$resizeObserver.unobserve(this.$el, this.resizeUpdate)
  },
  methods: {
    checkWarnings() {
      if (!this.warnings) return
      if (isArray(this.warnings)) {
        this.warningMessages = this.warnings.map(warnCb => warnCb(this.value, this)).filter(Boolean)
      } else {
        const warns = this.warnings(this.value, this)
        this.warningMessages = (isArray(warns) ? warns : [warns]).filter(Boolean)
      }
    },
    parseValues(val) {
      if (isArray(val)) return val.join(' , ') || '-'
      return !isEmpty(val) ? val : '-'
    },
    _validateLength(input) {
      const format = (valid, message) => ({ valid, ...(message ? { messages: [message] } : {}) })
      let {
        maxlength,
        minlength,
        lengthMessages: { eq, max, min }
      } = this
      const inputLength = encoder.encode(input).length
      maxlength = parseInt(maxlength)
      minlength = parseInt(minlength) ?? -1
      if (isNaN(maxlength)) return format(true)
      if (maxlength === minlength && inputLength !== maxlength) {
        return format(false, eq.format(maxlength))
      } else if (maxlength && maxlength < inputLength) {
        return format(false, max.format(maxlength))
      } else if (minlength && minlength > inputLength) {
        return format(false, min.format(minlength))
      }
      return format(true)
    },
    async validate(value = this.value) {
      const { duplicates = [], message = '' } = this.duplicatesValidation || {}
      const isEmptyValue = isEmpty(value)
      let messages = []
      const assignToState = (valid, messages = []) => {
        this.valid = valid
        this.messages = messages
        return valid
      }
      if (this.required && isEmptyValue) return assignToState(false, [this.$t('A non-empty value is required.')])
      if (isEmptyValue) return assignToState(true)
      if (value.length > 0) {
        const values = isArray(value) ? value : [value]
        values.find(v => {
          const result = this._validateLength(v)
          if (!result.valid) messages.push(result.messages[0])
          return !result.valid
        })
      }
      if (this.rules && (!isEmptyValue || isBoolean(value))) {
        const [rulesArray, validationRules] = [this.rules.flat(), []]
        while (rulesArray.length > 0) {
          const validator = rulesArray.pop()
          if (isFunction(validator)) validationRules.push(validator(value))
        }
        const invalidRules = validationRules.filter(r => !r.isValid).map(r => r.message)
        if (invalidRules.length > 0) {
          messages = messages.concat(this.validatorHint ? [this.validatorHint] : invalidRules)
        }
      }
      if (duplicates.includes(value)) messages.push(message)
      return assignToState(messages.length === 0, messages)
    },
    validateCallback() {
      this.validate(this.value)
    },
    updateMobile(ev) {
      this.isMobile = ev.matches
    },
    resizeUpdate(e) {
      const width = this.isMobile ? this.$el.clientWidth : e.target?.clientWidth
      this.fieldWidth = width > 320 ? 320 : width
    }
  }
}
</script>
