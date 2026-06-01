import { getId, resolveReactiveOptions, resolveUpdater, type Updater } from '@ui-core/utils/core-utils'
import { isNumber, isString, isUndefined } from '@ui-core/utils/inspect'
import { dereference } from '@ui-core/utils/object'
import type { ShallowRef } from 'vue'
import { computed, ref, shallowRef, toValue } from 'vue'
import { assertFieldNameIsNumber, getContextValue, hasValidName, isFieldNameDefined, setupContext } from './shared'
import type { ArrayFieldProps, FieldGroup, FieldMeta, SetFieldValueOptions, SetModelValueOptions } from './types'
import { useFieldComposite } from './use-field-composite'
import { useListFieldAria } from './use-field-aria'

export type UseFieldArrayReturn = ReturnType<typeof useFieldArray>

export function assertContextIsFieldArray(context: FieldGroup): context is UseFieldArrayReturn {
  const methods = ['onValueAdd', 'onValueRemove', 'rows']
  return methods.every(method => method in context && !!context[method as keyof FieldGroup])
}

export function useFieldArray<T extends any[]>(props: ArrayFieldProps<T>, context?: FieldGroup) {
  const modelValue: ShallowRef<T | undefined> = shallowRef([] as never)
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
    defaultValue: computed(() => toValue((props.defaultValue || []) as T))
  }

  const getDefault = () => {
    const value = modelValue.value
    if (isUndefined(value) || String(value).length === 0) return state.defaultValue.value
    return value
  }

  modelValue.value = context && hasValidName(state.name.value) ? (getContextValue(context, state.name.value) ?? getDefault()) : getDefault()
  const defaultValue = shallowRef<T | undefined>(dereference(getDefault()))

  const composite = useFieldComposite<number>({
    onAdd: assertFieldNameIsNumber
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
    const { bubbles = true } = options
    const result = resolveUpdater(valueOrUpdator, modelValue.value)
    modelValue.value = result

    if (bubbles && !state.disabled.value) {
      // bubble up the changes to parent
      bubbleChange(result)
    }

    // set updated model value to children and don't bubble up changes back up to parents
    updateChildrenModelValue(result, options)
  }

  function setFieldValue<TValue>(index: number | string, value: Updater<TValue | undefined>, options: SetFieldValueOptions = {}) {
    if (isString(index)) throw new Error('Fields inside field-array must have a number name')
    let current = modelValue.value ? [...modelValue.value] : []
    const prefixArray = current.slice(0, index)

    current = [
      // adding a comment here for formating
      ...(prefixArray.length ? prefixArray : new Array(index)),
      resolveUpdater(value, current[index]),
      ...current.slice(index + 1)
    ]
    modelValue.value = current as T

    const { bubbles = true, dontUpdateChildren = false } = options
    if (bubbles) {
      bubbleChange(current as T)
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

  let rowIndex = 0
  const nextId = () => `${id}-${rowIndex++}`

  const rows = ref(Array.from({ length: modelValue.value?.length || 1 }, () => nextId()))
  /**
   * value will be added after the provided index. if nothing is passed, will be added at the end
   */
  function onValueAdd(index?: number) {
    const array: T = modelValue.value ? ([...modelValue.value] as T) : ([] as never)
    index ??= array.length - 1
    const nextItemIndex = index + 1
    array.splice(nextItemIndex, 1, undefined)
    rows.value.splice(nextItemIndex, 1, nextId())
    modelValue.value = array
  }
  /**
   * if index is not passed, will remove the last item
   */
  function onValueRemove(index?: number) {
    // or should we just ensure that modelValue is defined?
    const array: T = modelValue.value ? ([...modelValue.value] as T) : ([] as never)
    index ??= array.length - 1
    rows.value = rows.value.filter((_, i) => index !== i)
    if (rows.value.length === 0) {
      rows.value.push(nextId())
    }
    modelValue.value = array.filter((_, i) => index !== i) as T
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

  let destroy = () => {}
  // CONTEXT SPECIFIC LOGIC
  if (context && isFieldNameDefined(contextApi)) {
    const { write, unregister } = setupContext(context, contextApi as any)
    bubbleChange = write
    destroy = unregister
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
    destroy,
    attrs,
    label: ref(''),
    metaState: computed<'error' | 'warning' | undefined>(() => undefined),
    rows,
    /**
     * adds value after index, if not provided, adds at end
     */
    onValueAdd,
    /**
     * removes value at index, if not provided, removes last item
     */
    onValueRemove,
    warnings: ref<string[]>([])
  }
}
