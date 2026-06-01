<template>
  <div
    ref="tableWrapperElement"
    class="relative w-full isolate text-sm"
    :class="{ 'lg:overflow-x-auto': scrollable }"
  >
    <tlt-dnd
      v-if="_sortable"
      ref="dndElement"
      :items="rawDataSource"
      tag="table"
      :teleport-to="null"
      restrict-to-container
      drag-class="shadow-lg border-t-0! bg-inherit!"
      :test-id="`table-${id}`"
      @drag-end="$emit('dragEnd', $event as T[])"
    >
      <template #before>
        <slot
          name="before"
          :sorted-columns="sortedColumns"
        />
      </template>
      <template #default="slotProps">
        <slot
          :rows="displayedRows"
          :sorted-columns="sortedColumns"
          v-bind="slotProps"
        />
      </template>
      <template #after>
        <slot
          name="after"
          :sorted-columns="sortedColumns"
        />
      </template>
    </tlt-dnd>
    <table
      v-else
      :test-id="`table-${id}`"
    >
      <slot
        name="before"
        :sorted-columns="sortedColumns"
      />
      <slot
        :rows="displayedRows"
        :sorted-columns="sortedColumns"
      />
      <slot
        name="after"
        :sorted-columns="sortedColumns"
      />
    </table>
  </div>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { useTemplateRef, type Ref } from 'vue'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import { useTableBody } from './useTableBody'
import { provideTableBodyContext } from './useTableBodyContext'
import type { AcceptableValue } from './types'
import type TltDnd from '@ui-core/tlt-design/layout/TltDnd.vue'

export interface Props {
  scrollable?: boolean
  sortable?: boolean
  selectable?: boolean
  selectableRow?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  dragEnd: [T[]]
}>()

const selectedRow = defineModel<T | null>('selectedRow', { default: null })

const { id, rawDataSource, displayedRows, sortedColumns } = useTableRootContext<TableRootContext<T>>()

const dndElement = useTemplateRef('dndElement') as Ref<InstanceType<typeof TltDnd> | null>
const tableWrapperElement = useTemplateRef('tableWrapperElement')

const ctx = useTableBody(props, selectedRow, tableWrapperElement, dndElement)
const { sortable: _sortable } = ctx

provideTableBodyContext(ctx)

defineExpose({
  selectedRow: ctx.selectedRow
})
</script>

<style scoped>
@reference '@/theme.css';

table {
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 100%;
  width: 0;
  position: relative;
}

@media (min-width: theme(--breakpoint-lg)) {
  :deep(tbody:nth-last-child(1 of :not(.dnd__dragging-element)) tr:last-child td) {
    @apply border-b-0;
  }
}
</style>
