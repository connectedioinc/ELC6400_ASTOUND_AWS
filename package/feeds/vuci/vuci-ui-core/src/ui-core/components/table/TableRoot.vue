<template>
  <slot
    :sorted-columns="sortedColumns"
    :unique-entries="uniqueEntries"
  />
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { computed } from 'vue'
import { utils } from '@/plugins/utils'
import type { AcceptableValue, DataLoaderFunction, SortingOptions, TableColumn } from './types'
import { useTableRoot } from './useTableRoot'
import { provideTableRootContext } from './useTableRootContext'

export interface Props<T extends AcceptableValue = AcceptableValue> {
  id: string
  columns: TableColumn<T>[]
  dataSource: T[] | DataLoaderFunction<T>
  /**
   * Key to identify rows in the data object. Used for row selection to work properly
   * @default 'id'
   */
  idKey?: keyof T
  childrenKey?: keyof T
}

const props = withDefaults(defineProps<Props<T>>(), {
  idKey: 'id',
  childrenKey: '_children'
})

const selectedValues = defineModel<T[keyof T][]>('selected', { default: () => [] })
const currentPage = defineModel<number>('currentPage', { default: 1 })

const _sorting = defineModel<SortingOptions>('sorting', { default: () => ({ dataIndex: null, direction: 0 }) })
const sorting = computed({
  get: () => _sorting.value,
  set: value => {
    if (!value || !_sorting.value) _sorting.value = { dataIndex: null, direction: 0 }
    else {
      const direction = value.dataIndex === _sorting.value.dataIndex && value.direction === _sorting.value.direction ? 0 : (utils.clamp(value.direction, -1, 1) as SortingOptions['direction'])
      _sorting.value = { ...value, direction }
    }
  }
})

const ctx = useTableRoot(props, selectedValues, sorting, currentPage)

const { sortedColumns, uniqueEntries, sortingOptions, filters } = ctx

provideTableRootContext(ctx)

defineExpose({
  sortingOptions,
  filters
})
</script>
