<template>
  <TableCell
    v-if="!isMobile || selectable"
    :data-index="dataIndex"
    class="max-lg:py-4 max-lg:bg-theme-bg-secondary-subtle max-lg:w-full lg:px-3"
  >
    <template #content>
      <div class="flex gap-2 items-center">
        <slot
          v-if="selectable"
          :record="row"
          :name="`${dataIndex}-checkbox`"
        >
          <tlt-check-box
            v-model="selected"
            :custom-id="`${dataIndex}-${rowIndex}-select`"
            class="w-fit mr-0!"
          />
        </slot>
        <tlt-hint
          v-if="!isMobile && sortable && level === 0"
          class="h-5"
          :hints="hasTransforms ? $t('Sorting is disabled when filtering is applied.') : undefined"
        >
          <button
            type="button"
            test-id="drag-anywhere"
            class="active:text-theme-text-primary"
            :disabled="hasTransforms"
            @mousedown="onDragStart"
            @touchdown="onDragStart"
            @dragstart="onDragStart"
          >
            <tlt-icon
              icon="drag-anywhere"
              class="text-theme-text-subtle size-5"
              :class="{ 'opacity-50': hasTransforms }"
            />
          </button>
        </tlt-hint>
        <button
          v-if="!isMobile && expandable"
          type="button"
          @click="expanded = !expanded"
        >
          <tlt-icon
            icon="chevron"
            class="text-theme-text-subtle transition-transform"
            :class="{ 'rotate-90': expanded }"
          />
        </button>
      </div>
    </template>
  </TableCell>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import { useTableBodyContext, type TableBodyContext } from './useTableBodyContext'
import { useTableRowContext, type TableRowContext } from './useTableRowContext'
import type { AcceptableValue } from './types'

export interface Props {
  dataIndex: string
}

defineProps<Props>()

defineEmits<{
  mousedown: [MouseEvent]
  dragstart: [DragEvent]
}>()

const { isMobile, hasTransforms } = useTableRootContext<TableRootContext<T>>()
const { startDrag, selectable, sortable } = useTableBodyContext<TableBodyContext<T>>()
const { row, rowIndex, level, selected, expanded, expandable } = useTableRowContext<TableRowContext<T>>()

function onDragStart(event: MouseEvent | DragEvent) {
  if (hasTransforms.value || !startDrag.value) return
  startDrag.value(event, rowIndex.value)
}
</script>
