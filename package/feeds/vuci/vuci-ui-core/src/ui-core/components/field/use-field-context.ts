import { createContext } from '@ui-core/utils/create-context'
import type { UseFieldReturn } from './use-field'
import type { FieldGroup } from './types'

export const [provideFieldMetaContext, injectFieldMetaContext] = createContext<UseFieldReturn>('field-primitive-context')

export const [provideFieldContext, injectFieldContext] = createContext<FieldGroup>('field-group-context')
