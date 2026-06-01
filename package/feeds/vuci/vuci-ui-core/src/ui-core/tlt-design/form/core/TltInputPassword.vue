<template>
  <div
    class="tlt-input-wrapper"
    :aria-disabled="disabled || readOnly"
  >
    <div
      v-if="icon || $slots.before"
      class="tlt-input-before"
    >
      <slot name="before">
        <tlt-icon :icon="icon" />
      </slot>
    </div>
    <!-- For chrome auto-filling other than password fields bug. Chrome autofills username into the nearest textlike-input field, that appears prior the password field, that's why this is created -->
    <input
      v-if="!useAutocomplete"
      type="text"
      class="sr-only"
      aria-hidden="true"
      tabindex="-1"
    />
    <input
      :id="itemId"
      :test-id="`input-${elementId}`"
      :type="inputType"
      class="tlt-input-field"
      :name="name"
      :value="modelValue"
      :disabled="disabled || readOnly"
      :data-state="inputState"
      :autocomplete="useAutocomplete ? 'on' : 'new-password'"
      :aria-autocomplete="useAutocomplete ? undefined : 'none'"
      @input="$emit('update:modelValue', $event.target.value, $event)"
    />
    <!-- eslint-enable -->
    <div class="tlt-input-after flex gap-1.5">
      <slot
        name="password-toggle"
        :disabled="disabled || readOnly"
        :toggle-hidden="_toggleText"
        :hidden="passwordStyle"
      >
        <tlt-button
          class="text-inherit"
          type="text"
          color="secondary"
          :disabled="disabled || readOnly"
          @click="_toggleText"
        >
          <tlt-icon
            icon="password"
            :hide="passwordStyle"
            class="size-5"
          />
        </tlt-button>
      </slot>
      <template v-if="canRandomize && supportsCrypto">
        <tlt-button
          ref="generateButton"
          class="text-inherit"
          type="text"
          color="secondary"
          :disabled="disabled || readOnly"
          @click="onGenerateClick"
        >
          <tlt-icon
            icon="dice"
            class="size-5"
          />
        </tlt-button>
        <tlt-tooltip
          :target="() => $refs?.generateButton?.$el"
          triggers="click"
          placement="top"
        >
          {{ $t('Password generated') }}
        </tlt-tooltip>
      </template>
    </div>
  </div>
</template>

<script>
import { isObject } from '@ui-core/utils/inspect'
import { makeProps } from '@ui-core/utils/props'
import { useCommonInjects as useInputInjects } from './_shared/useCommonInjects'

/**
 * @typedef GenerateOptions
 * @property {number} [length] - Length of the password
 * @property {string[]} [charsets] - List of charsets to use, at least one character from each charset will be used
 */

export default {
  inject: {
    useAutocomplete: {
      default: false
    },
    datatype: {
      default: ''
    }
  },
  props: makeProps({
    disabled: [Boolean, false],
    name: [String, ''],
    modelValue: [String, ''],
    readonly: [Boolean, false],
    icon: [String, null],
    /** @type {boolean|GenerateOptions} */
    canRandomize: [[Boolean, Object], false]
  }),
  emits: ['update:modelValue', 'randomize'],
  setup() {
    return useInputInjects()
  },
  data() {
    return {
      inputType: 'password',
      defaultOptions: {
        length: 16,
        charsets: ['abcdefghijklmnopqrstuvwxyz', 'BCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789', '!@#$%^&*()_+~|}{[]:;?></-=']
      }
    }
  },
  computed: {
    passwordStyle() {
      return this.inputType === 'password'
    },
    readOnly() {
      return this.readonly ?? this.$store.readOnlyPage
    },
    supportsCrypto() {
      // Supported by 98% of browsers
      return window.crypto && window.crypto.getRandomValues
    },
    generateOptions() {
      if (!isObject(this.canRandomize)) return this.defaultOptions
      return { ...this.defaultOptions, ...this.canRandomize }
    }
  },
  methods: {
    _toggleText() {
      const nextStyle = this.inputType === 'password' ? 'text' : 'password'
      this.inputType = nextStyle
    },
    resetType() {
      this.inputType = 'password'
    },
    /**
     * @param {GenerateOptions} options
     */
    generatePassword(options, tries = 0) {
      if (!this.supportsCrypto) return ''
      const charIncluded = Array.from({ length: options.charsets.length }, () => false)
      const charset = options.charsets.join('')
      let password = Array.from(crypto.getRandomValues(new Uint8Array(options.length)))
        .map(x => {
          const char = charset[x % charset.length]
          options.charsets.forEach((charset, i) => !charIncluded[i] && (charIncluded[i] = charset.includes(char)))
          return char
        })
        .join('')
      if (!charIncluded.every(Boolean) || tries > 100) {
        password = this.generatePassword(options, tries + 1)
      }
      return password
    },
    onGenerateClick() {
      const password = this.generatePassword(this.generateOptions)
      this.$emit('update:modelValue', password)
      this.$emit('randomize', password)
    }
  }
}
</script>
