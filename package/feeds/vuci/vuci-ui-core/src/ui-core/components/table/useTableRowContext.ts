import type { Ref } from 'vue'
import { createContext } from '@ui-core/utils/create-context'
import type { AcceptableValue } from './types'

// Can't get type from useTableRow due to circular reference import
export type TableRowContext<T extends AcceptableValue = any> = {
  rowId: Ref<string>
  selectRow: (targetRow: T) => void
  row: Ref<T>
  rowIndex: Ref<number>
  firstRow: Ref<boolean>
  lastRow: Ref<boolean>
  level: number
  selected: Ref<boolean>
  expandable: Ref<boolean>
  expanded: Ref<boolean>
  childrenRows: Ref<T[] | undefined>
  siblingRows: Ref<T[] | undefined>
  isRowSelected: Ref<boolean>
}

export const [provideTableRowContext, useTableRowContext] = createContext<TableRowContext>('TableRowContext')
