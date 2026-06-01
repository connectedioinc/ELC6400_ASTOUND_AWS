import { createContext } from '@ui-core/utils/create-context'
import { useTableBody } from './useTableBody'
import type { AcceptableValue } from './types'

export type TableBodyContext<T extends AcceptableValue = AcceptableValue> = ReturnType<typeof useTableBody<T>>

export const [provideTableBodyContext, useTableBodyContext] = createContext<TableBodyContext>('TableBody')
