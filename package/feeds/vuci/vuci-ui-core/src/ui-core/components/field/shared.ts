import { isArray, isNumber, isString } from '@ui-core/utils/inspect'
import type { Ref } from 'vue'
import { nextTick, watch } from 'vue'
import type { FieldGroup, FieldMeta } from './types'
import type { FieldContext } from './use-field'

export function isFieldNameDefined<T extends FieldMeta | FieldGroup>(field: T): field is T & { name: Ref<string | number> } {
  return hasValidName(field.name.value)
}

export function assertFieldNameIsString(field: FieldMeta): asserts field is FieldMeta<any, number> {
  const name = field.name.value
  if (!isString(name) || name.length === 0) {
    throw new Error('Fields must have a non-empty name assigned to them.')
  }
}

export function assertFieldNameIsNumber(field: FieldMeta): asserts field is FieldMeta<any, number> {
  if (!isNumber(field.name.value)) {
    throw new Error('Fields inside tuple or list fields must have number names.')
  }
}

export function getContextValue(context: FieldContext, key: string | number) {
  return context.modelValue.value[key]
}

export const hasValidName = (name: unknown): name is string | number => isNumber(name) || (isString(name) && name.length > 0)

export const setupContext = (context: FieldContext, field: FieldMeta<any, string | number>) => {
  const unregister = context.add(field)
  const write = (value: any) => context.setFieldValue(field.name.value, value, { dontUpdateChildren: true })

  // do the first write only if the field is not disabled
  if (!field.disabled.value) {
    write(field.modelValue.value)
  }
  // later or start to react to changes in field's disabled state
  watch(
    () => field.disabled.value,
    disabled => {
      if (disabled) {
        write(undefined)
      } else {
        nextTick(() => {
          write(field.modelValue.value)
        })
      }
    }
  )

  return { unregister, write }
}

/**
 * strictly converts a value to an array
 */
export const toArrayStrict = <T>(value: T | T[] | undefined): T[] => {
  return value ? (isArray(value) ? value : [value]) : []
}

/**
 * converts value to an array if it's not undefined
 */
export const toArray = <T>(value: T | T[] | undefined): T[] | undefined => {
  return value ? toArrayStrict(value) : undefined
}
