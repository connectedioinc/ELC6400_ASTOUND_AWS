import { getId, resolveReactiveOptions, resolveUpdater, type Updater } from '@ui-core/utils/core-utils'
import { isNumber } from '@ui-core/utils/inspect'
import { dereference } from '@ui-core/utils/object'
import type { ShallowRef } from 'vue'
import { computed, shallowRef, toValue } from 'vue'
import { assertFieldNameIsString, getContextValue, hasValidName, isFieldNameDefined, setupContext } from './shared'
import type { FieldGroup, ObjectFieldProps, SetFieldValueOptions, SetModelValueOptions } from './types'
import { useFieldComposite } from './use-field-composite'
import { useListFieldAria } from './use-field-aria'

export function useFieldObject<T extends Record<string | number, unknown>>(props: ObjectFieldProps<T>, context?: FieldGroup) {
  const id = getId()
  const { readonly = false, disabled = false, required = false, name = id } = resolveReactiveOptions(props)
  const state = {
    readonly: computed(() => context?.readonly.value || toValue(readonly)),
    disabled: computed(() => context?.disabled.value || toValue(disabled)),
    required: computed(() => context?.required.value || toValue(required)),
    name: computed(() => toValue(name)),
    inputName: computed(() => {
      const _name = toValue(name)
      if (isNumber(_name) && context?.name.value) return `${context.name.value}[${_name}]`
      return context?.name.value ? `${context.name.value}.${_name}` : _name?.toString()
    }),
    // casting to `as T` to infer the generic type instead of the literal.
    defaultValue: computed(() => toValue((props.defaultValue || {}) as T))
  }

  const getDefault = () => state.defaultValue.value
  const modelValue: ShallowRef<T | undefined> = shallowRef<T>(context && hasValidName(state.name.value) ? ((getContextValue(context, state.name.value) as T) ?? getDefault()) : getDefault())
  const defaultValue = shallowRef<T>(dereference(modelValue.value) ?? ({} as T))

  const composite = useFieldComposite<string>({
    onAdd: assertFieldNameIsString
  })
  function reset(): void
  function reset(nextDefaultValue: Updater<T | undefined>): void
  function reset(...args: any[]) {
    const result: T | undefined = args.length > 0 ? resolveUpdater(args[0], modelValue.value) : defaultValue.value
    defaultValue.value = result
    modelValue.value = dereference(result)
    composite.children.value.forEach(item => item.reset(result?.[item.name.value]))
  }

  let bubbleChange: (value: T | undefined) => void = () => {}

  function setModelValue(valueOrUpdator: Updater<T | undefined>, options: SetModelValueOptions = {}) {
    const { bubbles = true, dontValidate = false } = options
    const result = resolveUpdater(valueOrUpdator, modelValue.value)
    modelValue.value = result
    if (bubbles && !state.disabled.value) {
      // bubble up the changes to parent
      bubbleChange(result)
    }

    updateChildrenModelValue(result, { dontValidate, bubbles: false })
  }

  function setFieldValue<TValue>(key: string | number, value: Updater<TValue | undefined>, options: SetFieldValueOptions = {}) {
    const { bubbles = true, dontUpdateChildren = false } = options
    const current: Record<string | number, any> = modelValue.value ? { ...modelValue.value } : {}
    current[key] = resolveUpdater(value, current[key] as TValue | undefined)
    modelValue.value = current as any

    if (bubbles && !state.disabled.value) {
      // bubble up the changes to parent
      bubbleChange(current as any)
    }

    if (dontUpdateChildren) return
    updateChildrenModelValue(current as T)
  }

  function updateChildrenModelValue(current: T | undefined, options: SetModelValueOptions = {}) {
    const childOptions = { ...options, bubbles: false }
    composite.children.value.forEach(item => {
      const value = current?.[item.name.value]
      if (item.modelValue.value !== value) {
        item.setModelValue(value, childOptions)
      }
    })
  }

  const contextApi = {
    id,
    modelValue,
    setModelValue,
    reset,
    changed: composite.changed,
    valid: composite.valid,
    validate: composite.validate,
    errors: composite.errors,
    clearErrors: composite.clearErrors,
    touched: composite.touched,
    add: composite.add,
    remove: composite.remove,
    setFieldValue,
    ...state
  } satisfies FieldGroup

  // CONTEXT SPECIFIC LOGIC
  if (context && isFieldNameDefined(contextApi)) {
    const { write } = setupContext(context, contextApi as any)
    bubbleChange = write
  }

  const attrs = useListFieldAria({
    disabled: state.disabled,
    id,
    name: state.name,
    readonly: state.readonly,
    required: state.required,
    valid: composite.valid
  })

  return {
    ...contextApi,
    attrs,
    label: shallowRef(''),
    warnings: shallowRef([]),
    metaState: computed<'error' | 'warning' | undefined>(() => undefined)
  }
}
