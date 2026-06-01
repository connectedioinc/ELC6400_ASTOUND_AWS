import { computed, ref, watch, watchEffect, getCurrentInstance } from 'vue'
import { whenever } from '@vueuse/core'
import { sortCollection } from '@ui-core/plugins/helper'
import { copy } from '@ui-core/utils/vue-helpers'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import type { AcceptableValue, FilterOptions, FilterType } from './types'

export function useTableHeader<T extends AcceptableValue>() {
  const { emit } = getCurrentInstance()!
  const { idKey, dataTransforms, getDisplayValue, columns, selectedValues, childrenIterator, transformedRows, displayedRows, sortingOptions, filters, isPaginationLazy } =
    useTableRootContext<TableRootContext<T>>()

  // #region Sorting
  const sortingKey = 'column-sorting'

  sortingOptions.value = {
    dataIndex: null,
    direction: 0
  }

  watch(
    sortingOptions,
    options => {
      if (!options) return

      if (!isPaginationLazy.value) {
        if (!options.direction || !options.dataIndex) dataTransforms.delete(sortingKey)
        else dataTransforms.set(sortingKey, rows => sortCollection(rows, row => getDisplayValue(row, options.dataIndex!), options.direction === 1))
      }

      emit('sortingApplied', options)
    },
    { deep: true }
  )
  // #endregion

  // #region Filtering
  function filterFactory(type: FilterType): FilterOptions {
    switch (type) {
      case 'uniqueValues':
        return {
          type,
          selected: [],
          applied: [],
          fn: null
        }
      case 'range':
        return {
          type,
          selected: { from: null, to: null },
          applied: { from: null, to: null },
          fn: null
        }
      default:
        throw new Error(`[TableHeader]: unrecognized filter type "${type}"`)
    }
  }

  watchEffect(() => {
    columns.value.forEach(column => {
      const type = column.actions?.filter?.type
      if (!type) return

      if (filters.value[column.dataIndex]) return
      filters.value[column.dataIndex] = filterFactory(type)
    })
  })

  watch(
    filters,
    filters => {
      if (isPaginationLazy.value) return
      Object.entries(filters).forEach(([dataIndex, filter]) => {
        const key = `column-${dataIndex}-filter` as const
        if (!filter.fn) return dataTransforms.delete(key)
        dataTransforms.set(key, (rows: T[]) => rows.filter(row => filter.fn?.(row[dataIndex])))
      })
    },
    { deep: true }
  )

  const filterColumns = computed(() => columns.value.filter(column => column.actions && ('sort' in column.actions || 'filter' in column.actions)))
  const hasFilters = computed(() => filterColumns.value.length > 0)
  const hasActiveFilter = computed(() => sortingOptions.value?.direction !== 0 || Array.from(dataTransforms.keys()).some(key => /^column-.+-filter$/.test(key)))

  const mobileFiltersExpanded = ref(false)

  function close(isMobile: boolean) {
    if (isMobile) mobileFiltersExpanded.value = false
  }

  function clearFilter(dataIndex: string) {
    const filter = filters.value[dataIndex]
    if (!filter) return
    filters.value[dataIndex] = filterFactory(filter.type)
  }

  function clearAllFilters() {
    filterColumns.value.forEach(column => clearFilter(column.dataIndex))
  }

  const filterFunctions = {
    uniqueValues: (values: any) => (item: any) => values.includes(item),
    range: (range: any) => (item: string) => {
      const value = parseFloat(item)
      if (isNaN(value)) return false
      const lessThanMax = value <= (range?.to || Infinity)
      const moreThanMin = value >= (range?.from || -Infinity)
      return lessThanMax && moreThanMin
    }
  }

  function applyFilter(dataIndex: string, ...values: any[]) {
    const column = columns.value.find(column => column.dataIndex === dataIndex)
    if (!column) return

    const filterType = column.actions?.filter?.type ?? 'uniqueValues'
    const filter = filters.value[dataIndex]
    if (!filter) return

    const v = values.flat()
    filter.applied = v
    filter.fn = filterFunctions[filterType](v)
    emit('filterApplied', filters.value)
  }

  async function resetFilterState(dataIndex: string) {
    clearFilter(dataIndex)
    emit('filterApplied', filters.value)
  }

  whenever(mobileFiltersExpanded, () => {
    Object.values(filters.value).forEach(filter => {
      filter.selected = copy(filter.applied)
    })
  })
  // #endregion

  // #region Row Selection
  const flatTransformedRows = computed(() => Array.from(childrenIterator(transformedRows.value)))
  const flatDisplayedRows = computed(() => Array.from(childrenIterator(displayedRows.value)))

  const allSelectedInPage = computed(() => flatDisplayedRows.value.length > 0 && flatDisplayedRows.value.every(data => selectedValues.value.includes(data[idKey])))
  const someSelectedInPage = computed(() => flatDisplayedRows.value.length > 0 && flatDisplayedRows.value.some(data => selectedValues.value.includes(data[idKey])))
  const noneSelectedInPage = computed(() => flatDisplayedRows.value.length > 0 && flatDisplayedRows.value.every(data => !selectedValues.value.includes(data[idKey])))

  const allSelected = computed({
    get: () => selectedValues.value.length > 0 && selectedValues.value.length === flatTransformedRows.value.length,
    set: selected => {
      selectedValues.value = selected ? flatTransformedRows.value.map(v => v[idKey]) : []
    }
  })

  const shownSelected = computed({
    get: () => selectedValues.value.length > 0,
    set: () => {
      if (allSelected.value) return (selectedValues.value = [])
      if (noneSelectedInPage.value) selectedValues.value = [...selectedValues.value, ...flatDisplayedRows.value.map(data => data[idKey])]
      else if (allSelectedInPage.value) selectedValues.value = flatTransformedRows.value.map(v => v[idKey])
      else if (someSelectedInPage.value) selectedValues.value = selectedValues.value.filter(v => !flatDisplayedRows.value.map(data => data[idKey]).includes(v))
      else selectedValues.value = []
    }
  })

  const isPartiallySelected = computed(() => selectedValues.value.length > 0 && !allSelected.value)
  // #endregion

  return {
    allSelected,
    shownSelected,
    isPartiallySelected,
    allSelectedInPage,
    someSelectedInPage,
    noneSelectedInPage,
    hasFilters,
    hasActiveFilter,
    mobileFiltersExpanded,

    close,
    clearAllFilters,
    applyFilter,
    resetFilterState
  }
}
