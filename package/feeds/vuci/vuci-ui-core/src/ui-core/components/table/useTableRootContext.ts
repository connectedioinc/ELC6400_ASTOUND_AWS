import { createContext } from '@ui-core/utils/create-context'
import { useTableRoot } from './useTableRoot'
import type { AcceptableValue } from './types'

export type TableRootContext<T extends AcceptableValue = any> = ReturnType<typeof useTableRoot<T>>

export const [provideTableRootContext, useTableRootContext] = createContext<TableRootContext>('TableRoot')
