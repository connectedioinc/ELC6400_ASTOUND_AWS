import { createContext } from '@ui-core/utils/create-context'
import type { useTableHeader } from './useTableHeader'
import type { AcceptableValue } from './types'

export type TableHeaderContext<T extends AcceptableValue = AcceptableValue> = ReturnType<typeof useTableHeader<T>>

export const [provideTableHeaderContext, useTableHeaderContext] = createContext<TableHeaderContext>('TableHeaderContext')
