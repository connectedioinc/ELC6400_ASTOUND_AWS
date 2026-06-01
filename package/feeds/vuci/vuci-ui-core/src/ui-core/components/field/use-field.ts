import type { ValidationOptions } from '@ui-core/composables/useValidation'
import { useValidation } from '@ui-core/composables/useValidation'
import type { Updater } from '@ui-core/utils/core-utils'
import { getId, resolveReactiveOptions, resolveUpdater } from '@ui-core/utils/core-utils'
import { isNonNullable, isNumber } from '@ui-core/utils/inspect'
import { dereference } from '@ui-core/utils/object'
import { computed, ref, shallowRef, toValue, type ShallowRef } from 'vue'
import { getContextValue, hasValidName, isFieldNameDefined, setupContext, toArrayStrict } from './shared'
import type { AcceptableValue, FieldGroup, FieldMeta, FieldOptions, SetModelValueOptions } from './types'
import { useFieldAria } from './use-field-aria'

export type UseFieldReturn = ReturnType<typeof useField<any>>

export type FieldContext = Pick<FieldGroup, 'readonly' | 'disabled' | 'required' | 'inputName' | 'setFieldValue' | 'add' | 'remove' | 'modelValue'>

export function useField<T extends AcceptableValue>(options: FieldOptions<T>, context?: FieldContext) {
  const modelValue = ref<T | undefined>()
  const id = getId()

  const { readonly = false, disabled = false, required = false, defaultValue: _defaultValue, name, rules = [], srLabel } = resolveReactiveOptions(options)

  const state = {
    controlLabel: computed(() => toValue(srLabel)),
    readonly: computed(() => context?.readonly.value || toValue(readonly)),
    disabled: computed(() => context?.disabled.value || toValue(disabled)),
    required: computed(() => context?.required.value || toValue(required)),
    name: computed(() => toValue(name)),
    inputName: computed(() => {
      const _name = toValue(name)
      if (isNumber(_name) && context?.inputName.value) return `${context.inputName.value}[${_name}]`
      return context?.inputName.value ? `${context.inputName.value}.${_name}` : _name?.toString()
    }),
    defaultValue: computed(() => toValue(_defaultValue as T | undefined)),
    touched: ref(false)
  }

  const getDefault = () => modelValue.value ?? state.defaultValue.value
  if (!state.disabled.value) {
    modelValue.value = context && hasValidName(state.name.value) ? (getContextValue(context, state.name.value) ?? getDefault()) : getDefault()
  }

  const defaultValue = shallowRef(dereference(getDefault())) as ShallowRef<T | undefined>

  const validatorOptions = computed(
    () =>
      ({
        autoValidate: false,
        rules: toArrayStrict(toValue(rules)),
        required: state.required.value,
        path: state.inputName.value?.toString()
      }) satisfies ValidationOptions
  )
  const { validate, errors, valid: _valid, clearErrors } = useValidation(modelValue, validatorOptions)
  const valid = computed(() => state.disabled.value || _valid.value)

  const warningFns = computed(() => toArrayStrict(toValue(options.warnings)))
  const warnings = ref<string[]>(runWarnings(modelValue.value))

  function runWarnings(value: T | undefined): string[] {
    if (value === undefined) return []
    return warningFns.value.map(fn => fn(value)).filter(isNonNullable)
  }

  function clearWarnings() {
    warnings.value = []
  }

  const changed = computed(() => String(defaultValue.value) !== String(modelValue.value))

  function reset(): void
  function reset(nextDefaultValue: Updater<T | undefined>): void
  function reset(...args: any[]) {
    const nextDefault = args.length > 0 ? resolveUpdater(args[0], modelValue.value) : defaultValue.value

    defaultValue.value = dereference(nextDefault)
    modelValue.value = dereference(nextDefault)
    state.touched.value = false
    clearErrors()
    clearWarnings()
  }

  let bubbleChange: (value: T | undefined) => void = () => {}

  function setModelValue(value: T | undefined, options: SetModelValueOptions = {}) {
    modelValue.value = value
    if (state.disabled.value) return
    const { bubbles = true, dontValidate = false } = options
    if (bubbles) {
      // bubble up the changes to parent
      bubbleChange(value)
    }
    if (!dontValidate) {
      state.touched.value = true
      validate(value)
      warnings.value = runWarnings(value)
    }
  }

  const fieldApi = {
    ...state,
    id,
    modelValue,
    setModelValue,
    reset,
    changed,
    valid,
    validate,
    errors: computed(() => errors.value.map(e => e.message)),
    clearErrors,
    defaultValue
  } satisfies FieldMeta<T>

  // CONTEXT SPECIFIC LOGIC
  if (context && isFieldNameDefined(fieldApi)) {
    const { write } = setupContext(context, fieldApi)
    bubbleChange = write
  }

  const attrs = useFieldAria(fieldApi)

  const metaState = computed<'error' | 'warning' | undefined>(() => {
    if (errors.value.length) return 'error'
    if (warnings.value.length) return 'warning'
    return undefined
  })

  return {
    ...fieldApi,
    attrs,
    metaState,
    warnings,
    label: ref('')
  }
}
