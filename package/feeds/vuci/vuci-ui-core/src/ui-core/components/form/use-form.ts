import { resolveReactiveOptions, resolveUpdater, type Updater } from '@ui-core/utils/core-utils'
import { computed, isRef, ref, shallowRef, toValue, watch, type MaybeRef } from 'vue'
import { assertFieldNameIsString, toArray } from '../field/shared'
import { useFieldComposite } from '../field/use-field-composite'
import { dereference, omit } from '@ui-core/utils/object'
import type { CompositeFieldError, SetModelValueOptions } from '../field/types'
import { isArray, isObject, isPlainObject, isString } from '@ui-core/utils/inspect'

type FormData = Record<string | number, any>

/**
 * error occurs when some of the fields in the form do not pass the validation rules
 */
type InvalidSubmitStageFields<T extends FormData> = {
  stage: 'field-validation'
  fieldErrors: CompositeFieldError<T>
}

/**
 * error occurs when given form `onSubmit` validator does not pass the validation
 */
type InvalidSubmitStageForm<T extends FormData> = {
  stage: 'form-validation'
  fieldErrors?: CompositeFieldError<T>
  formErrors: string[]
}

/**
 * error occurs when onSubmit handler throws an unhandled error
 */
type InvalidSubmitStageInflight = {
  stage: 'inflight'
  error: unknown
}

type InvalidSubmitContext<T extends FormData> = InvalidSubmitStageFields<T> | InvalidSubmitStageForm<T> | InvalidSubmitStageInflight

type ValidSubmitResult<T> = {
  value: T
}

export type ValidateFormResult<T extends FormData> = {
  formErrors: string[] | undefined
  fieldErrors?: CompositeFieldError<T> | undefined
}

type MaybePromise<T> = T | Promise<T>

/**
 * if this function returns something other that void or undefined, it will be treated as if the form is not valid
 */
export type FormValidateFn<TFormData extends FormData> = (props: { value: TFormData }) => MaybePromise<
  | {
      form?: string | string[] | undefined
      fields?: CompositeFieldError<TFormData> | undefined
    }
  | undefined
>

/**
 * special override of UseFormProps, because vue fails to parse `Reactive<UseFormProps<any>>`
 */
export type FormProps<T extends Record<string, any>> = {
  name?: string | number
  defaultValues?: T
  schema?: Record<keyof T, any>
  /**
   * @default false
   */
  readonly?: boolean
  /**
   * @default false
   */
  disabled?: boolean
  /**
   * a callback that will be called when the form is submitted and is valid. If submitted, the form will be reset.
   * @default () => {}
   */
  onSubmit?: (context: ValidSubmitResult<T>) => Promise<void | any> | void
  /**
   * @default () => {}
   */
  onSubmitInvalid?: (context: InvalidSubmitContext<T>) => Promise<void | any> | void
  validateSubmit?: FormValidateFn<T>
}

export type UseFormProps<T extends Record<string, any>> = {
  name?: MaybeRef<string | number>
  defaultValues?: MaybeRef<T>
  schema?: Record<keyof T, any>
  /**
   * @default false
   */
  readonly?: MaybeRef<boolean>
  /**
   * @default false
   */
  disabled?: MaybeRef<boolean>
  /**
   * a callback that will be called when the form is submitted and is valid. If submitted, the form will be reset.
   * @default () => {}
   */
  onSubmit?: (context: ValidSubmitResult<T>) => Promise<void | any> | void
  /**
   * @default () => {}
   */
  onSubmitInvalid?: (context: InvalidSubmitContext<T>) => Promise<void | any> | void
  validateSubmit?: FormValidateFn<T>
}

export type GetFormValueOptions = {
  /**
   * if true, will include disabled items as empty strings in the state.
   * @default false
   */
  includeDisabled?: boolean
}

const noop = () => {}

export type UseFormReturn<T extends Record<string, any> = any> = ReturnType<typeof useForm<T>>

export function useForm<T extends Record<string, any> = any>(options: UseFormProps<T>) {
  const { onSubmit = noop, onSubmitInvalid = noop } = options
  const { name: _name, readonly: _readonly = false, disabled: _disabled = false, defaultValues: _defaultValues } = resolveReactiveOptions(options)

  const isSubmitting = ref(false)
  const isSubmitSuccessful = ref(false)
  const name = computed(() => toValue(_name) ?? '')
  const disabled = computed(() => toValue(_disabled))
  const readonly = computed(() => toValue(_readonly) || isSubmitting.value)
  const defaultValues = shallowRef<Partial<T>>(dereference(toValue(_defaultValues) ?? {}))
  const modelValue = shallowRef<T>(dereference(defaultValues.value))

  if (isRef(_defaultValues)) {
    watch(
      () => _defaultValues.value,
      values => {
        reset(values)
      }
    )
  }
  const composite = useFieldComposite<string>({
    onAdd: assertFieldNameIsString
  })

  async function validateBeforeSubmit(value: T): Promise<ValidateFormResult<T>> {
    const result = await options.validateSubmit?.({ value })
    if (result) {
      return { formErrors: toArray(result.form), fieldErrors: result.fields }
    }
    return { formErrors: undefined }
  }

  /**
   * sets the value of the form, but without updating the field values with it.
   * use it to set the form value from **internal** sources (fields).
   */
  function setModelValue(valueOrUpdator: Updater<T, Partial<T>>, options: SetModelValueOptions = {}) {
    const result = resolveUpdater(valueOrUpdator, modelValue.value)
    modelValue.value = result
    const _options = { ...options, bubbles: false }
    for (const field of composite.children.value) {
      const value = result[field.name.value]
      if (field.modelValue.value !== value) field.setModelValue(value, _options)
    }
  }

  function reset(nextDefaultValues?: Updater<T, Partial<T>>) {
    const result = nextDefaultValues ? resolveUpdater(nextDefaultValues, getFormValue() as T) : (defaultValues.value as T)
    defaultValues.value = result
    modelValue.value = dereference(result)
    composite.children.value.forEach(item => item.reset(result[item.name.value]))
  }

  function getFormValue(options: GetFormValueOptions = {}): Partial<T> | (Record<string, any> & {}) {
    const output = omit(dereference(modelValue.value), (_, v) => v === undefined) as Record<string, any>
    if (options.includeDisabled) {
      for (const field of composite.children.value) {
        // if field is not disabled or other field already defined a value for it we just ignore it.
        if (!field.disabled.value || output[field.name.value] !== undefined) continue
        output[field.name.value] = ''
      }
    }
    return output
  }

  function setFieldValue<TValue>(name: string | number, updater: Updater<TValue | undefined>) {
    const current = modelValue.value ? { ...modelValue.value } : {}
    current[name as any] = resolveUpdater(updater, current[name])
    modelValue.value = {
      ...modelValue.value,
      [name]: resolveUpdater(updater, current[name])
    }
  }

  const startSubmit = () => {
    isSubmitSuccessful.value = false
    isSubmitting.value = true
  }

  const doneSubmit = (success: boolean) => {
    isSubmitSuccessful.value = success
    isSubmitting.value = false
  }

  async function handleSubmit(options: GetFormValueOptions = {}) {
    startSubmit()
    // firstly validate all fields
    const isFieldsValid = composite.validate()
    if (!isFieldsValid) {
      await onSubmitInvalid({ stage: 'field-validation', fieldErrors: composite.errors.value })
      doneSubmit(false)
      return
    }
    const value = getFormValue(options) as T

    const { formErrors, fieldErrors } = await validateBeforeSubmit(value)

    if (formErrors) {
      await onSubmitInvalid({ stage: 'form-validation', formErrors, fieldErrors })
      doneSubmit(false)
      return
    }

    try {
      await onSubmit({ value })
      reset(value as T)
      doneSubmit(true)
    } catch (e) {
      await onSubmitInvalid({ stage: 'inflight', error: e })
      doneSubmit(false)
    }
  }

  return {
    add: composite.add,
    remove: composite.remove,
    changed: composite.changed,
    valid: composite.valid,
    clearErrors: composite.clearErrors,
    errors: composite.errors,
    validateFields: composite.validate,
    validate: composite.validate,
    validateForm: (value: T = modelValue.value) => validateBeforeSubmit(value),
    touched: composite.touched,
    defaultValue: computed<T>(() => defaultValues.value),
    isSubmitting: computed(() => isSubmitting.value),
    isSubmitSuccessful: computed(() => isSubmitSuccessful.value),
    id: name.value,
    disabled,
    reset,
    modelValue,
    readonly,
    setModelValue,
    setFieldValue,
    required: computed(() => false),
    name,
    inputName: shallowRef<string>(''),
    getFormValue,
    handleSubmit
  }
}
