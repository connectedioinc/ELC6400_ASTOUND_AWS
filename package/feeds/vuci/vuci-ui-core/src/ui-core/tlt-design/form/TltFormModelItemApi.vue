<template>
  <div
    v-if="visible"
    class="text-body-secondary min-w-0"
    :class="{
      'md:grid-cols-[2fr_3fr] gap-x-4 gap-y-2 items-start md:items-center flex flex-col': !inlineForm && !tableChild,
      'mx-auto w-full': inlineForm,
      'max-md:inline-flex max-md:flex-wrap max-md:justify-between md:grid gap-1 align-text-bottom items-center max-w-full': inlineInput,
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
        :id="`${inputId}-label`"
        :ref="el => (labelRef = el)"
        class="text-theme-text-base md:max-w-fit min-w-0"
        :class="{
          'hover:text-theme-text-primary': help || $slots.help
        }"
        :for="inputId"
      >
        <slot
          name="label"
          :label="parsedLabel"
        >
          {{ parsedLabel }}
        </slot>
      </label>
      <span
        v-if="required"
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
        <slot
          v-if="$slots.help"
          name="help"
        >
          {{ help }}
        </slot>
      </template>
    </tlt-hint>

    <tlt-hint
      :ref="el => (controlRef = el)"
      class="inline-flex gap-2 relative min-w-0 form-item-control"
      :class="{ 'col-span-full': !label && hasLabel, 'md:col-start-2': !hasLabel && !label, 'min-w-0': !inlineInput }"
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
        :disabled="!warningMessages.length || validationMessages.length > 0"
        :target="() => controlRef.$el.firstElementChild"
        :style="isMobile && fieldWidth ? { 'max-width': `${fieldWidth}px` } : {}"
        :placement="isMobile ? 'bottom-start' : 'right-start'"
        :fallback-placements="['top-start']"
        variant="warning"
      >
        <div class="flex gap-3 font-semibold">
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
      <tlt-popover
        :disabled="errorMessageDisabled"
        :target="() => controlRef.$el.firstElementChild"
        :style="isMobile && fieldWidth ? { 'max-width': `${fieldWidth}px` } : {}"
        :placement="isMobile ? 'bottom-start' : 'right-start'"
        :fallback-placements="['top-start']"
        variant="error"
      >
        <div class="flex gap-3 font-semibold">
          <tlt-icon
            icon="error"
            class="size-5 shrink-0"
          />
          <ul class="min-w-0">
            <li
              v-for="message in validationMessages"
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
import { KEY_VALID, KEY_WARNING, KEY_MAX_LEN, KEY_MIN_LEN } from '@ui-core/tlt-design/form/core/_shared/constants'

export default {
  provide() {
    return {
      [KEY_VALID]: () => this.valid,
      [KEY_WARNING]: () => this.warning,
      [KEY_MAX_LEN]: this.maxlength,
      [KEY_MIN_LEN]: this.minlength
    }
  },

  inject: {
    inlineForm: {
      default: false
    },
    tableChild: {
      default: false
    },
    itemId: {
      default: null
    }
  },
  props: {
    /**
     * @description flag indicates that form item has label. This could be set to false, to position form item same as the other items without providing a label.
     */
    hasLabel: {
      type: Boolean,
      default: true
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
    validationMessages: {
      type: Array,
      default: () => []
    },
    warningMessages: {
      type: Array,
      default: () => []
    },
    valid: {
      type: Boolean,
      default: true
    },
    warning: {
      type: Boolean,
      default: false
    },
    inlineInput: {
      type: Boolean,
      default: false
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
      showHelp: false,
      showMessage: true,
      fieldWidth: 320,
      eventName: null,
      media: null
    }
  },
  computed: {
    errorMessageDisabled() {
      return this.valid || this.validationMessages.length === 0 || !this.showMessage
    },
    inputId() {
      return this.itemId || this.prop
    },
    parsedLabel() {
      return this.parseValues(this.label)
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
  },
  beforeUnmount() {
    ValidationBus.off(this.eventName, this.validateCallback)
    this.media?.removeEventListener('change', this.updateMobile)
    this.$resizeObserver.unobserve(this.$el, this.resizeUpdate)
  },
  methods: {
    parseValues(val) {
      if (Array.isArray(val)) {
        if (val.length > 0) {
          return val.join(' , ')
        }
        return '-'
      }
      return val.length > 0 ? val : '-'
    },
    validateCallback() {
      this.validate(this.value)
    },
    updateMobile(ev) {
      this.showHelp = false
      this.isMobile = ev.matches
    },
    resizeUpdate(e) {
      const width = this.isMobile ? this.$el.clientWidth : e.target?.clientWidth
      this.fieldWidth = width > 320 ? 320 : width
    }
  }
}
</script>
