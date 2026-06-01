export { default as TltTable, type Props as TltTableProps } from './TltTable.vue'
export { default as TableRoot, type Props as TableRootProps } from './TableRoot.vue'
export { default as TableWrapper, type Props as TableWrapperProps } from './TableWrapper.vue'
export { default as TableBody, type Props as TableBodyProps } from './TableBody.vue'
export { default as TableHeader } from './TableHeader.vue'
export { default as TableHeaderCell, type Props as TableHeaderCellProps } from './TableHeaderCell.vue'
export { default as TableHeaderCellBulkActions, type Props as TableHeaderCellBulkActionsProps } from './TableHeaderCellBulkActions.vue'
export { default as TableRow, type Props as TableRowProps } from './TableRow.vue'
export { default as TableRowActions, type Props as TableRowActionsProps } from './TableRowActions.vue'
export { default as TableRowAction, type Props as TableRowActionProps } from './TableRowAction.vue'
export { default as TableCell, type Props as TableCellProps } from './TableCell.vue'
export { default as TableCellBulkActions } from './TableCellBulkActions.vue'
export { default as TableCellRowActions } from './TableCellRowActions.vue'
export { default as TableBulkActions, type Props as TableBulkActionsProps } from './TableBulkActions.vue'
export { default as TableAction, type Props as TableActionProps } from './TableAction.vue'
export { default as TableSearch } from './TableSearch.vue'
export { default as TableColumnsConfig } from './TableColumnsConfig.vue'
export { default as TablePagination } from './TablePagination.vue'

import { axios } from '@ui-core/plugins/axios'
import type { AcceptableValue, DataLoaderFunction } from './types'
import { isNumber } from '@ui-core/utils/inspect'

export function defaultDataLoader<T extends AcceptableValue>(endpoint: string): DataLoaderFunction<T> {
  return async ({ offset, limit, search, sorting, filter }) => {
    const res = await axios.get(endpoint, {
      params: {
        offset: isNumber(offset) ? offset : undefined,
        limit: isNumber(limit) ? limit : undefined,
        search: search || undefined,
        ...sorting,
        ...(filter ? Object.fromEntries(Object.entries(filter).map(([key, value]) => [key, value.join(',')])) : {})
      }
    })

    return {
      data: res.data,
      total: res?.metadata?.total || res.data.length
    }
  }
}
