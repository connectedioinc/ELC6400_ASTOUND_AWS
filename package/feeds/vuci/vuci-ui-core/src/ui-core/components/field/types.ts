import type { ValidationRule } from '@ui-core/composables/useValidation'
import type { Updater } from '@ui-core/utils/core-utils'
import type { ComputedRef, MaybeRef, Ref, ShallowRef } from 'vue'

export type WarningFn<T> = (value: T) => string | undefined

export type FieldError = string[]

export type CompositeFieldError<T extends Record<string | number, any>> = {
  [P in keyof T]?: T[P] extends object ? CompositeFieldError<T[P]> : FieldError
}

export type AcceptableValue = string | number | boolean

export type SetModelValueOptions = {
  /**
   * whether the value set should not trigger validation and for check warnings
   * @default false
   */
  dontValidate?: boolean
  /**
   * if true - change will be bubbled up the chain of fields
   * @default true
   */
  bubbles?: boolean
}

export type SetFieldValueOptions = {
  /**
   * whether children should be notified of the new value
   * @default false
   */
  dontUpdateChildren?: boolean
  /**
   * whether the change should be bubbled up the field chain
   * @default true
   */
  bubbles?: boolean
}

export type MaybeShallowRef<T = any> = T | ShallowRef<T, T>
export type CommonOptions<T> = {
  /**
   * Indicates that the value must specified for the input before the owning form can be submitted. Adds the appropriate attributes to indicate that the control is required.
   * @default false
   */
  required?: MaybeRef<boolean>
  /**
   * Sets the control to disabled state (does not allow focusing the control)
   * @default false
   */
  disabled?: MaybeRef<boolean>
  /**
   * Sets the control to read-only state (allows focusing the control, but any value setting is not permitted)
   * @default false
   */
  readonly?: MaybeRef<boolean>
  /**
   * @default undefined
   */
  defaultValue?: MaybeShallowRef<T | undefined>
  /**
   * @default undefined
   */
  name?: MaybeRef<string | number>
}

export type CommonProps<T> = {
  /**
   * Indicates that the value must specified for the input before the owning form can be submitted. Adds the appropriate attributes to indicate that the control is required.
   * @default false
   */
  required?: boolean
  /**
   * Sets the control to disabled state (does not allow focusing the control)
   * @default false
   */
  disabled?: boolean
  /**
   * Sets the control to read-only state (allows focusing the control, but any value setting is not permitted)
   * @default false
   */
  readonly?: boolean
  /**
   * @default undefined
   */
  defaultValue?: T
  /**
   * @default undefined
   */
  name?: string | number
}

export type FieldProps<T extends AcceptableValue> = CommonProps<T> & {
  rules?: ValidationRule[] | ValidationRule
  warnings?: WarningFn<T> | WarningFn<T>[]
  /**
   * screen-reader label. Add this if you want to omit adding label as a separate element
   */
  srLabel?: string
}

export type FieldOptions<T extends AcceptableValue> = CommonOptions<T> & {
  rules?: MaybeShallowRef<ValidationRule[] | ValidationRule>
  warnings?: MaybeShallowRef<WarningFn<T> | WarningFn<T>[]>
  /**
   * screen-reader label. Add this if you want to omit adding label as a separate element
   */
  srLabel?: MaybeRef<string>
}

export type ObjectFieldOptions<T extends Record<string, any>> = CommonOptions<T>
export type ObjectFieldProps<T extends Record<string, any>> = CommonProps<T>

export type ArrayFieldProps<T extends any[]> = CommonProps<T>
export type ArrayFieldOptions<T extends any[]> = CommonOptions<T>

export type FieldMeta<TValue = any, TName extends string | number | undefined = string | number | undefined, TErrors = string[]> = {
  /**
   * randomly generated field id.
   * @readonly
   */
  id: string | number
  /**
   * name of the field (target where the value should be written to if context is given)
   * @readonly
   */
  name: ComputedRef<TName>
  /**
   * @example
   * <input :name="state.inputName" />
   */
  inputName: ComputedRef<string | undefined> | Readonly<Ref<string | undefined>>
  /**
   * whether the field is in readonly state.
   * @readonly
   */
  readonly: ComputedRef<boolean | undefined>
  /**
   * whether the field is in disabled state. Disabled inputs are usually excluded from submitted forms.
   * @readonly
   */
  disabled: ComputedRef<boolean | undefined>
  /**
   * whether the value must be defined.
   * @readonly
   */
  required: ComputedRef<boolean | undefined>
  defaultValue: ShallowRef<TValue | undefined>
  /**
   * whether the value changed from the initial one.
   * @readonly
   */
  changed: ComputedRef<boolean>
  touched: Ref<boolean>
  /**
   * array of all validation errors from the last run.
   * @readonly
   */
  errors: ComputedRef<TErrors>
  /**
   * clears out all `errors`, `valid` becomes true
   */
  clearErrors: () => void
  /**
   * will be true if value passes validation
   * @readonly
   */
  valid: ComputedRef<boolean>
  /**
   * invokes validation.
   */
  validate: () => boolean
  modelValue: Ref<TValue | undefined>
  setModelValue: (value: any, options?: SetModelValueOptions) => void
  /**
   * resets the state of the field, if function, receives the current modelValue state as argument.
   * changed value becomes false.
   */
  reset: {
    /**
     * resets to the passed `defaultValue` if no arguments are provided
     * ```ts
     * // e.g. default value is number 10
     * field.reset()
     * console.log(field.modelValue.value) // logs 10
     * ```
     */
    (): void
    /**
     * resets to the passed value or the result of the updater function (even if it's undefined)
     * @example
     * ```ts
     * field.reset(undefined)
     * console.log(field.modelValue.value) // logs undefined
     * ```
     */
    (nextDefault: Updater<TValue | undefined, TValue>): void
  }
}

/**
 * this type serves as a composite - has all common operations as field, plus can execute operations on parent.
 */
export interface FieldGroup<NameType extends string | number | undefined = string | number | undefined> extends FieldMeta<any, NameType, CompositeFieldError<any>> {
  add: <T extends FieldMeta<any, any>>(fieldMeta: T) => () => void
  remove: (id: FieldMeta['id']) => void
  setFieldValue: <TValue>(name: string | number, updater: Updater<TValue | undefined>, options?: SetFieldValueOptions) => void
  errors: ComputedRef<CompositeFieldError<any>>
}
