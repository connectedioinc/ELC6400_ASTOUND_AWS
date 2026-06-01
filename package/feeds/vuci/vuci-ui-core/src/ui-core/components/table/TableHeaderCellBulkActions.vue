<template>
  <TableHeaderCell
    :data-index="dataIndex"
    class="max-lg:flex! max-lg:w-auto! items-center flex-row gap-3 max-lg:order-first py-0! px-0! lg:p-3! lg:w-5 bg-theme-bg-secondary-subtle left-0 max-lg:border-b-0"
  >
    <div
      v-if="selectable"
      :id="`${id}-bulk-actions`"
    >
      <slot :name="`${dataIndex}-header`">
        <div class="max-lg:border-r max-lg:border-theme-border-base max-lg:pr-4 max-lg:mr-2 flex gap-4">
          <tlt-check-box
            v-model="shownSelected"
            :indeterminate="isPartiallySelected"
            :disabled="displayedRows.length === 0"
            :readonly="false"
            custom-id="entries"
            class="w-fit mt-0!"
          />
          <span class="lg:hidden font-normal">{{ selectedValues.length }}</span>
        </div>
      </slot>
    </div>
    <slot />
  </TableHeaderCell>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { watchEffect } from 'vue'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import { useTableBodyContext, type TableBodyContext } from './useTableBodyContext'
import { useTableHeaderContext, type TableHeaderContext } from './useTableHeaderContext'
import type { AcceptableValue } from './types'

export interface Props {
  dataIndex: string
}

const props = defineProps<Props>()

const { id, displayedRows, columnOptions, selectedValues } = useTableRootContext<TableRootContext<T>>()
const { selectable, indentedColumn } = useTableBodyContext<TableBodyContext<T>>()
const { shownSelected, isPartiallySelected } = useTableHeaderContext<TableHeaderContext<T>>()

watchEffect(() => {
  const index = columnOptions.value.findIndex(c => c.shown !== false && c.dataIndex === props.dataIndex)
  if (index < 0) return

  const nextColumn = columnOptions.value.find((c, i) => i > index && c.shown !== false)
  if (!nextColumn) return

  indentedColumn.value = nextColumn.dataIndex
})
</script>
