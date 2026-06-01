import { ref, reactive, computed, watch, toRef, type Ref } from 'vue'
import { useBreakpoints, breakpointsTailwind, useMounted } from '@vueuse/core'
import { isArray, isFunction, isObject } from '@ui-core/utils/inspect'
import type { RequiredByKeys } from '@ui-core/utils/types'
import type { AcceptableValue, ColumnOptions, DataTransformKey, FilterOptions, SortingOptions } from './types'
import type { TableRootProps } from '.'

export type UseTableRootProps<T extends AcceptableValue> = RequiredByKeys<TableRootProps<T>, 'childrenKey' | 'idKey'>

export function useTableRoot<T extends AcceptableValue>(props: UseTableRootProps<T>, selectedValues: Ref<T[keyof T][]>, sortingOptions: Ref<SortingOptions>, currentPage: Ref<number>) {
  // #region Elements
  const mounted = useMounted()
  // #endregion

  // #region General Data
  const sortedColumns = computed(() =>
    columnOptions.value.length
      ? columnOptions.value
          .filter(v => v.shown)
          .map(option => props.columns.find(col => col.dataIndex === option.dataIndex))
          .filter(v => !!v)
      : props.columns
  )

  const breakpoints = useBreakpoints(breakpointsTailwind)
  const isMobile = breakpoints.smaller('lg')

  const search = ref('')

  const filters = ref<Record<string, FilterOptions>>({})

  const displayValues = computed(() => {
    const cache = new WeakMap<object, Record<string, string>>()
    const displayFunctions = props.columns.map(col => [col.dataIndex, col.displayFn] as const)

    for (const row of childrenIterator(rawDataSource.value)) {
      if (!row || !isObject(row)) continue

      const values = displayFunctions.reduce<Record<string, string>>((acc, [key, displayFn]) => {
        if (!displayFn) return acc

        const value = row[key] || ''
        const displayValue = displayFn(value, row)
        acc[key] = displayValue

        return acc
      }, {})

      cache.set(row, values)
    }

    return cache
  })

  const loadDataSource = computed(() => (isFunction(props.dataSource) ? props.dataSource : null))

  const localDataSource = ref<T[]>([]) as Ref<T[]>
  const rawDataSource = computed(() => (isFunction(props.dataSource) ? localDataSource.value : props.dataSource))

  const dataTransforms = reactive(new Map<DataTransformKey<T>, (data: T[]) => T[]>())
  const transformedRows = computed(() => Array.from(dataTransforms.values()).reduce((rows, transformFn) => transformFn(rows), rawDataSource.value))

  const hasTransforms = computed(() => dataTransforms.size > 0)

  const isPaginationLazy = computed(() => isFunction(props.dataSource))
  const applyPagination = ref<((rows: T[]) => T[]) | null>(null)

  const displayedRows = computed(() => {
    if (!mounted.value) return []
    const rows = applyPagination.value ? applyPagination.value(transformedRows.value) : transformedRows.value
    return rows.filter(row => !!row)
  })

  const hasChildren = computed(() =>
    transformedRows.value.some(data => {
      if (!isObject(data) || !(props.childrenKey in data) || !isArray(data[props.childrenKey])) return false
      const children = data[props.childrenKey]
      return children.length > 0
    })
  )

  const uniqueEntries = computed(() => {
    const properties = props.columns.filter(col => !isArray(col.actions) && col.actions?.filter?.type === 'uniqueValues').map(col => col.dataIndex)

    const getUnique = (source: T[]) =>
      source.reduce<Record<string, Record<string, { count: number; name?: string }>>>((sum, dataRow) => {
        properties?.forEach(prop => {
          const value = dataRow[prop]
          if (!value) return

          const displayValue = getDisplayValue(dataRow, prop)

          if (!sum[prop]) sum[prop] = {}

          if (!sum[prop][value]) sum[prop][value] = { count: 0, name: displayValue }
          sum[prop][value].count += 1
        })
        return sum
      }, {})

    const all = getUnique(rawDataSource.value)
    return { all, shown: getUnique(transformedRows.value) }
  })
  // #endregion

  // #region Column Options
  const columnOptions = ref<ColumnOptions[]>([])
  const isOverflowing = ref(false)
  // #endregion

  // Update selected values when the data source changes to ensure non existant rows are selected
  watch(transformedRows, rows => {
    if (!selectedValues.value.length) return
    const allIds = new Set<string | number>(rows.filter(row => !!row).map(row => row[props.idKey]))
    selectedValues.value = selectedValues.value.filter(v => allIds.has(v))
  })

  // #region Utils
  function* childrenIterator(rows: T[]): Generator<T> {
    for (const row of rows) {
      yield row
      if (row[props.childrenKey]) yield* childrenIterator(row[props.childrenKey] as T[])
    }
  }

  function getDisplayValue(row: T, key: string) {
    if (!row) return ''
    return displayValues.value.get(row)?.[key] ?? row[key] ?? ''
  }
  // #endregion

  const EMPTY_ROW = Symbol('empty-row') as any as T

  return {
    id: props.id,
    idKey: props.idKey,
    childrenKey: props.childrenKey,
    isOverflowing,
    columns: toRef(() => props.columns),
    sortedColumns,
    columnOptions,
    localDataSource,
    rawDataSource,
    dataTransforms,
    transformedRows,
    displayedRows,
    selectedValues,
    uniqueEntries,
    hasChildren,
    isMobile,
    currentPage,
    search,
    sortingOptions,
    filters,
    isPaginationLazy,
    loadDataSource,
    applyPagination,
    hasTransforms,
    EMPTY_ROW,

    childrenIterator,
    getDisplayValue
  }
}
