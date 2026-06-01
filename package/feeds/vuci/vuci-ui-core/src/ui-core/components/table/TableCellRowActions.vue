<template>
  <TableCell :data-index>
    <div class="flex gap-2.5 items-center flex-wrap">
      <slot :record="row" />
    </div>
  </TableCell>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { useTableRowContext, type TableRowContext } from './useTableRowContext'
import type { AcceptableValue } from './types'

export interface Props {
  dataIndex: string
}

defineProps<Props>()

const { row } = useTableRowContext<TableRowContext<T>>()
</script>
