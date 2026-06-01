import { pick } from '@ui-core/utils/object'
import type { FieldHelpProps, FieldLabelProps, FieldRootProps, FieldArrayProps, FieldObjectProps } from '../field'

export const fieldRootKeys: (keyof FieldRootProps)[] = ['defaultValue', 'name', 'rules', 'warnings', 'standalone', 'required', 'readonly', 'disabled', 'srLabel'] as const

export const fieldObjectKeys: (keyof FieldObjectProps<any>)[] = ['defaultValue', 'name', 'standalone', 'required', 'readonly', 'disabled'] as const

export const fieldArrayKeys: (keyof FieldArrayProps)[] = ['defaultValue', 'name', 'standalone', 'required', 'readonly', 'disabled'] as const

export const getFieldArrayProps = <T extends Record<string, any>>(props: T): FieldArrayProps => pick(props, fieldArrayKeys)

export const getFieldObjectProps = <T extends Record<string, any>>(props: T): FieldArrayProps => pick(props, fieldObjectKeys)

export const getFieldRootProps = <T extends Record<string, any>>(props: T): FieldRootProps => pick(props, fieldRootKeys)

export const getFieldLabelProps = <T extends Record<string, any>>(props: T): FieldLabelProps => pick(props, ['requiredIndicator'])

export const getFieldHelpProps = <T extends Record<string, any>>(props: T): FieldHelpProps => pick(props, ['help'])
