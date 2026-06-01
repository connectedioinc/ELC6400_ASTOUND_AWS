<template>
  <div
    class="field field-input"
    :data-readonly="dataAttribute(props.readonly)"
    :data-disabled="dataAttribute(props.disabled)"
    :data-state="optionalAttribute(props.state)"
    @click.self="focusInput"
  >
    <slot
      v-if="$slots.leading"
      name="leading"
    />
    <!-- For chrome auto-filling other than password fields bug. Chrome autofills username into the nearest textlike-input field, that appears prior the password field, that's why this is created -->
    <input
      v-if="!props.autocomplete"
      type="password"
      class="sr-only"
      aria-hidden="true"
      tabindex="-1"
    />
    <input
      :id="optionalAttribute(props.id)"
      ref="input"
      v-model="model"
      class="field-input__control"
      :type="isPasswordType ? 'password' : 'text'"
      :placeholder="optionalAttribute(props.placeholder)"
      :readonly="optionalAttribute(props.readonly)"
      :disabled="optionalAttribute(props.disabled)"
      :name="optionalAttribute(props.name)"
      :aria-required="optionalAttribute(props.required)"
      :autocomplete="autocompleteAttribute"
    />

    <slot name="trailing" />
    <InputAddon
      v-if="props.toggleMask"
      as="button"
      type="button"
      :aria-label="isPasswordType ? 'show password' : 'hide password'"
      @click="isPasswordType = !isPasswordType"
    >
      <TltIcon
        icon="password"
        class="size-full"
        :hide="isPasswordType"
      />
    </InputAddon>

    <InputAddon
      v-if="props.canGeneratePassword && supportsCrypto"
      as="button"
      type="button"
      aria-label="generate random password"
    >
      <TltIcon
        icon="dice"
        class="size-5"
        :hide="isPasswordType"
        :disabled="disabled || props.readonly"
        @click="onPasswordGenerateClick"
      />
    </InputAddon>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef, ref } from 'vue'
import { dataAttribute, optionalAttribute } from '@ui-core/utils/attributes'
import { isBoolean } from '@ui-core/utils/inspect'
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'
import InputAddon from './InputAddon.vue'
import type { FieldState } from '../shared-types'

export type Props = {
  /**
   * if a truthy value is passed:
   * - a button to randomize password value will be added
   * @default false
   */
  canGeneratePassword?: boolean | Partial<GenerateOptions>
  /**
   * whether to render an icon to display the value as plain text
   * @default true
   */
  toggleMask?: boolean
  /**
   * @default false
   */
  disabled?: boolean
  /**
   * @default false
   */
  readonly?: boolean
  required?: boolean
  state?: FieldState
  name?: string | number
  id?: string
  placeholder?: string
  /**
   * provides autocomplete of the field
   * when value is:
   * - **true**: autocomplete="on"
   * - **false**: autocomplete="off"
   * - **non-empty** string: autocomplete="{passed string}"
   */
  autocomplete?: string | boolean
}
const props = withDefaults(defineProps<Props>(), {
  canGeneratePassword: false,
  toggleMask: true,
  autocomplete: undefined,
  state: undefined,
  name: undefined,
  id: undefined,
  placeholder: undefined
})
const model = defineModel<string>({ default: '' })

const input = useTemplateRef('input')
const isPasswordType = ref(true)

const generatePasswordOptions = computed<GenerateOptions>(() => {
  if (isBoolean(props.canGeneratePassword)) return defaultGenerateOptions
  return {
    ...defaultGenerateOptions,
    ...props.canGeneratePassword
  }
})

function onPasswordGenerateClick() {
  model.value = generatePassword(generatePasswordOptions.value)
}

const autocompleteAttribute = computed(() => {
  if (isBoolean(props.autocomplete)) return props.autocomplete ? 'on' : 'off'
  return props.autocomplete
})

function focusInput() {
  input.value?.focus()
}
</script>

<script lang="ts">
type GenerateOptions = {
  /**
   * @default 16
   */
  length: number
  /**
   * @default ['abcdefghijklmnopqrstuvwxyz', 'BCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789', '!@#$%^&*()_+~|}{[]:;?></-=']
   */
  charsets: string[]
}
const defaultGenerateOptions: GenerateOptions = {
  length: 16,
  charsets: ['abcdefghijklmnopqrstuvwxyz', 'BCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789', '!@#$%^&*()_+~|}{[]:;?></-=']
} as const

export const supportsCrypto = 'crypto' in window && 'getRandomValues' in window.crypto

function generatePassword(options: GenerateOptions, tries = 0) {
  if (!supportsCrypto) return ''

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
    password = generatePassword(options, tries + 1)
  }

  return password
}
</script>
