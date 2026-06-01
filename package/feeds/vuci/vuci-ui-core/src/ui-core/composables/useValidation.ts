import { rules, type ValidationFunction, type ValidationResult } from '@/validation-rules'
import { i18n } from '@ui-core/plugins/i18n'
import { isArray, isEmpty } from '@ui-core/utils/inspect'
import { computed, ref, toValue, watchEffect, type MaybeRefOrGetter } from 'vue'

const encoder = new TextEncoder()

const array = () => ({
  max: i18n.t('Maximum length of single value is %s.'),
  min: i18n.t('Minimum length of single value is %s.'),
  eq: i18n.t('Length of single value entry must be %s.')
})
const single = () => ({
  max: i18n.t('Maximum length of value is %s.'),
  min: i18n.t('Minimum length of value is %s.'),
  eq: i18n.t('Length of the value must be %s.')
})

export type ValidationRule = (value: string) => ValidationResult

export type ValidationOptions = {
  /**
   * whether the validation should be ran automatically on value change. Set this to false and validation will not be invoked manually.
   * @default true
   */
  autoValidate?: boolean
  required?: boolean
  /**
   * an array of functions to be ran when validation function is invoked.
   */
  rules?: ValidationRule[]
  /**
   * minimum symbol/item length of value. Please use rule with `string({minlength: number})` instead
   * @deprecated in favor of string({ minlength: number })
   */
  minlength?: number
  /**
   * maximum symbol/item length of value. Please use rule with `string({maxlength: number})` instead
   * @deprecated in favor of string({ maxlength: number })
   */
  maxlength?: number
  path?: string
}

export type ValidationIssue = ErrorIssue

export type ErrorIssue = { message: string; path: string }

type MaybeArray<T> = T | T[]

export function useValidation(value: MaybeRefOrGetter<MaybeArray<any>>, options: MaybeRefOrGetter<ValidationOptions> = {}) {
  const autoValidate = toValue(options).autoValidate ?? true
  const errors = ref<ValidationIssue[]>([])
  /**
   * flag indicating if the value is valid. Value is valid when no error severity messages are present.
   */
  const valid = computed(() => !errors.value.length)

  /**
   * invokes validation on given value with options passed to the composable.
   */
  function validate(val = value, opts = options) {
    const _v = toValue(val)
    const { path = '', ..._options } = toValue(opts)
    errors.value = runValidation(_v, _options, path)

    return valid.value
  }
  if (autoValidate) {
    watchEffect(() => validate())
  }

  function clearErrors() {
    errors.value = []
  }

  return {
    validate,
    valid,
    errors,
    clearErrors
  }
}

function runValidation(value: MaybeArray<string | undefined | null | number>, options: ValidationOptions, path: string = '', isArrayValue = false): ValidationIssue[] {
  if (isArray(value)) {
    return value.flatMap((val, index) => runValidation(val, options, path ? `${path}.${index}` : `${index}`, true))
  }
  const messages: ValidationIssue[] = []
  const { required, rules, minlength = 0, maxlength = 0 } = options
  const isEmptyValue = isEmpty(value)
  if (isEmptyValue) {
    return required ? [{ message: i18n.t('Value is required'), path }] : []
  }
  value = value?.toString() || ''
  if (minlength || maxlength) messages.push(...validateLength(value, { minlength: Number(minlength), maxlength: Number(maxlength), path, isArrayValue }))
  for (const rule of rules || []) {
    const res = rule(value)
    if (!res.isValid) messages.push({ path, message: res.message })
  }
  return messages
}

type ValidateLengthOptions = {
  minlength?: number
  maxlength?: number
  path?: string
  isArrayValue?: boolean
}

function validateLength(value: string, options: ValidateLengthOptions = {}): ValidationIssue[] {
  const valueLength = encoder.encode(value).length
  const { minlength: min = 0, maxlength: max = 0, isArrayValue = false, path = '' } = options
  const message = isArrayValue ? array() : single()
  if (min && max && min === max && valueLength !== min) return [{ message: message.eq.format(min), path }]
  const messages: ValidationIssue[] = []
  if (min && valueLength < min) messages.push({ message: message.min.format(min), path })
  else if (max && valueLength > max) messages.push({ message: message.max.format(max), path })
  return messages
}

type Rules = typeof rules

type Shift<T> = T extends [any, ...infer Rest] ? Rest : []

export type LazyRule<T extends Record<string, ValidationFunction>> = {
  [K in keyof T]: {
    (...args: Shift<Parameters<T[K]>>): (value: string) => ValidationResult
    raw: T[K]
  }
}

export const lazyValidator = Object.fromEntries(
  Object.entries(rules).map(([k, v]) => {
    const fn =
      (...args: Shift<Parameters<typeof v>>) =>
      (value: string) =>
        // @ts-expect-error
        v(value, ...args)
    fn.raw = v
    return [k, fn]
  })
) as LazyRule<Rules>

/**
 * @alias lazyValidator
 */
export const lz = lazyValidator
