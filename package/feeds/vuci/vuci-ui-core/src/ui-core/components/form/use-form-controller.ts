import { resolveReactiveOptions, type Updater } from '@ui-core/utils/core-utils'
import type { ComputedRef, MaybeRef } from 'vue'
import { computed, ref, shallowRef, toValue } from 'vue'
import type { CompositeFieldError } from '@components/field/types'
import type { GetFormValueOptions, UseFormReturn, ValidateFormResult } from './use-form'

type MultiValidateFormResult = ValidateFormResult<any> & { form: FormMeta }

/**
 * error context that is receveived when any of the childred form field validation fails
 */
type InvalidSubmitFields = {
  stage: 'field-validation'
  forms: Record<string, CompositeFieldError<any>>
}

/**
 * error context that is received when any of the children forms `onSubmit` validator returns errors
 */
type InvalidSubmitForms = {
  stage: 'form-validation'
  forms: {
    [formName: string]: MultiValidateFormResult
  }
}

/**
 * error context that is received when an unhandled error in `onSubmit` callback is thrown
 */
type InvalidSubmitInflight = {
  stage: 'inflight'
  error: unknown
}

/**
 * error context that is receveived when any of the childred form field validation fails
 */
type InvalidSubmitController = {
  stage: 'controller-validation'
  error: string
}

export type InvalidSubmitContext = InvalidSubmitFields | InvalidSubmitForms | InvalidSubmitInflight | InvalidSubmitController

export type FormControllerProps = {
  readonly?: boolean
  onSubmit?: (data: ValidSubmitContext[]) => Promise<any> | any
  onSubmitInvalid?: (context: InvalidSubmitContext) => Promise<any> | any
  validateSubmit?: (context: ValidSubmitContext[]) => Promise<string | undefined> | string | undefined
}

export type UseFormControllerProps = {
  readonly?: MaybeRef<boolean>
  validateSubmit?: (context: ValidSubmitContext[]) => Promise<string | undefined> | string | undefined
  onSubmit?: (data: ValidSubmitContext[]) => Promise<any> | any
  onSubmitInvalid?: (data: InvalidSubmitContext) => Promise<any> | any
}

export type FormMeta<T extends Record<string | number, any> = any> = {
  name: ComputedRef<string | number>
  validateFields: () => boolean
  validateForm: () => Promise<ValidateFormResult<T>> | ValidateFormResult<T>
  valid: ComputedRef<boolean>
  errors: ComputedRef<CompositeFieldError<T>>
  changed: ComputedRef<boolean>
  touched: ComputedRef<boolean>
  getFormValue: UseFormReturn['getFormValue']
  setModelValue: UseFormReturn['setModelValue']
  reset: UseFormReturn['reset']
}

export type ValidSubmitContext<T extends Record<string, any> = any> = {
  /**
   * name of the form
   */
  name: string | number
  data: T
  form: FormMeta
}

export type UseFormControllerReturn = ReturnType<typeof useFormController>

const noop: () => void = () => {}

export function useFormController(props: UseFormControllerProps) {
  const { readonly = false } = resolveReactiveOptions(props)
  const { onSubmit = noop, onSubmitInvalid = noop } = props
  const isSubmitting = ref(false)
  const isSubmitSuccessful = ref(false)

  const formMetas = shallowRef<FormMeta[]>([])

  const changed = computed(() => formMetas.value.some(form => form.changed.value))

  function add(newForm: FormMeta) {
    if (hasForm(newForm)) return () => remove(newForm)
    formMetas.value = [...formMetas.value, newForm]
    return () => remove(newForm)
  }

  function remove(toRemove: FormMeta) {
    const result = formMetas.value.filter(form => form !== toRemove)
    if (result.length === formMetas.value.length) return
    formMetas.value = result
  }

  function hasForm(form: FormMeta) {
    return formMetas.value.includes(form)
  }

  function getForm(name: string | number) {
    return formMetas.value.find(form => form.name.value === name)
  }

  const valid = computed(() => formMetas.value.every(form => form.valid.value))

  /**
   * validates all fields in provided forms. If no forms are provided, validates all forms.
   */
  function validateFields(forms: FormMeta[] = formMetas.value) {
    for (const form of forms) {
      form.validateFields()
    }
    return forms.every(form => form.valid.value)
  }
  /**
   * runs `onSubmit` validation on all forms
   * @private
   */
  async function validateForms(forms: FormMeta[] = formMetas.value) {
    const errors: Record<string | number, MultiValidateFormResult> = {}
    for (const form of forms) {
      const res = await form.validateForm()
      if (res.formErrors?.length || Object.keys(res.fieldErrors || {}).length) errors[form.name.value] = { ...res, form }
    }
    return Object.keys(errors).length ? errors : undefined
  }

  async function validateBeforeSubmit(context: ValidSubmitContext[]) {
    const error = await props.validateSubmit?.(context)
    return error ? error : undefined
  }

  function getFormValue<T extends Record<string, any>>(name: string | number) {
    const form = getForm(name)
    if (form) {
      return form.getFormValue() as T
    }
    return undefined
  }

  function getAllFormValues() {
    const result: Record<string, any> = {}
    for (const form of formMetas.value) {
      result[form.name.value] = form.getFormValue()
    }
    return result
  }

  function setFormValue<TFormData extends Record<string, any>>(formName: string | number, updater: Updater<TFormData>) {
    const form = formMetas.value.find(f => f.name.value === formName)
    if (!form) {
      if (import.meta.env.DEV) {
        console.warn(`Form with name ${formName} not found`)
      }
      return false
    }
    form.setModelValue(updater)
  }
  const startSubmit = () => {
    isSubmitSuccessful.value = false
    isSubmitting.value = true
  }

  const doneSubmit = (success: boolean) => {
    isSubmitSuccessful.value = success
    isSubmitting.value = false
  }

  /**
   * Submits all registered forms.
   * If all forms succeeds validation, their form states will be updated to new default forms.
   * @param [onlyChanged=false] should only changed forms be included into the outputs
   * @param [includeDisabled=true] option that is passed to single form.handleSubmit function call
   */
  async function handleSubmit(changedOnly: boolean = false, includeDisabled = true): Promise<void> {
    startSubmit()

    const toVisit = changedOnly ? formMetas.value.filter(form => form.changed.value) : formMetas.value

    if (toVisit.length === 0) {
      return doneSubmit(true)
    }
    const isFieldsValid = validateFields(toVisit)

    if (!isFieldsValid) {
      const invalidForms: [string | number, CompositeFieldError<any>][] = toVisit.filter(form => !form.valid.value).map(form => [form.name.value, form.errors.value])
      const forms = Object.fromEntries(invalidForms)
      await onSubmitInvalid({ stage: 'field-validation', forms })
      doneSubmit(false)
      return
    }

    const invalidForms = await validateForms(toVisit)

    if (invalidForms) {
      await onSubmitInvalid({ stage: 'form-validation', forms: invalidForms })
      doneSubmit(false)
      return
    }

    const context = getSubmitContext(toVisit, { includeDisabled })

    const invalidSubmit = await validateBeforeSubmit(context)

    if (invalidSubmit) {
      await onSubmitInvalid({ stage: 'controller-validation', error: invalidSubmit })
      doneSubmit(false)
      return
    }

    try {
      await onSubmit(context)
      context.forEach(item => item.form.reset(item.data))
      doneSubmit(true)
    } catch (e) {
      await onSubmitInvalid({ stage: 'inflight', error: e })
      doneSubmit(false)
    }
  }

  function getSubmitContext(forms: FormMeta[], options: GetFormValueOptions = {}) {
    return forms.map<ValidSubmitContext>(form => ({
      name: form.name.value,
      data: form.getFormValue(options),
      form: form
    }))
  }

  return {
    /**
     * adds a new form to the collection.
     */
    add,
    /**
     * removes a form from the collection.
     */
    remove,
    forms: computed(() => formMetas.value),
    /**
     * returns true if all forms are valid, false otherwise.
     */
    valid,
    /**
     * validates all registered form fields.
     */
    validate: () => validateFields(),
    /**
     * aggregates all form values into a single object.
     */
    getAllFormValues,
    getFormValue,
    /**
     * sets single form value to the provided one
     */
    setFormValue,
    /**
     * A boolean indicating if the forms are currently in the process of being submitted after `handleSubmit` is called.
     *
     * Goes back to `false` when submission completes for one of the following reasons:
     * - the validation step returned errors.
     * - the `onSubmit` function has completed.
     *
     * Note: if you're running async operations in your `onSubmit` function make sure to await them to ensure `isSubmitting` is set to `false` only when the async operation completes.
     *
     * This is useful for displaying loading indicators or disabling form inputs during submission.
     *
     */
    isSubmitting,
    /**
     * A boolean indicating if the last submission was successful.
     */
    isSubmitSuccessful,
    /**
     * handles registered form submission.
     * - if at least one of the form is invalid, will invoke onSubmitInvalid handler
     * - if all forms are valid, will invoke onSubmit handler
     *  - if onSubmit handler passes (does not throw an error) will reset all submitted forms.
     */
    handleSubmit,
    /**
     * a computed property that shows whether at least one form is changed
     */
    changed,
    /**
     * a passthrough property - registered forms will inherit readonly value.
     */
    readonly: computed(() => toValue(readonly) || isSubmitting.value),
    touched: computed(() => formMetas.value.some(form => form.touched.value))
  }
}
