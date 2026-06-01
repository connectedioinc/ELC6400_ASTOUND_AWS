import { ref, computed, toRef, getCurrentInstance } from 'vue'
import { useTableBodyContext, type TableBodyContext } from './useTableBodyContext'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import { useTableRowContext, type TableRowContext } from './useTableRowContext'
import { isObject } from '@ui-core/utils/inspect'
import type { TableRowProps } from '.'
import type { AcceptableValue } from './types'
import type { RequiredByKeys } from '@ui-core/utils/types'

export type UseTableRowProps<T extends AcceptableValue> = RequiredByKeys<TableRowProps<T>, 'level'>

export function useTableRow<T extends AcceptableValue>(props: UseTableRowProps<T>) {
  const { emit } = getCurrentInstance()!

  const { displayedRows, selectedValues, idKey, childrenKey } = useTableRootContext<TableRootContext<T>>()
  const { selectableRow, selectedRow } = useTableBodyContext<TableBodyContext<T>>()
  const { siblingRows } = useTableRowContext<TableRowContext<T>>({ siblingRows: undefined } as any)

  const rowId = computed(() => (props.row && isObject(props.row) && idKey in props.row ? props.row[idKey].toString().toLowerCase() : props.index))

  const childrenRows = computed<T[] | undefined>(() => props.row[childrenKey])
  const expandable = computed(() => !!childrenRows.value && childrenRows.value?.length > 0)

  const first = computed(() => props.index === 0)
  const last = computed(() => {
    const rows = props.level > 0 ? siblingRows.value : displayedRows.value
    return !!rows && props.index === rows.length - 1
  })

  const selected = computed({
    get: () => !!selectedValues.value.includes(props.row[idKey]),
    set: newValue => {
      if (selected.value === newValue) return
      if (newValue && !selectedValues.value.includes(props.row[idKey])) selectedValues.value = [...selectedValues.value, props.row[idKey]]
      else selectedValues.value = selectedValues.value.filter(v => v !== props.row[idKey])
    }
  })

  const isRowSelected = computed(() => selectedRow.value === props.row)

  function selectRow(targetRow: T) {
    if (!selectableRow || !props.selectable) return
    selectedRow.value = targetRow !== selectedRow.value ? targetRow : null
    emit('rowSelected', targetRow)
  }

  const _expanded = ref(props.initialExpanded)
  const expanded = computed({
    get: () => !!expandable.value && !!_expanded.value,
    set: value => {
      _expanded.value = value
      emit('expand', value, props.index)
    }
  })

  return {
    rowId,
    selectRow,
    row: toRef(() => props.row),
    rowIndex: toRef(() => props.index),
    firstRow: first,
    lastRow: last,
    level: props.level,
    selected,
    expandable,
    expanded,
    childrenRows,
    isRowSelected
  }
}
