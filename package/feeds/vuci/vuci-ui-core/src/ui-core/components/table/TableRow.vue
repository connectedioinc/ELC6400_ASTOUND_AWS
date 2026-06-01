<template>
  <ConditionalWrapper
    v-if="isObject(row)"
    :tag="level > 0 ? undefined : 'tbody'"
    class="max-lg:block lg:relative"
  >
    <tr
      :id="`tablerow-${rowId}`"
      :test-id="`tablerow-${rowId}`"
      class="text-theme-text-secondary-subtle flex flex-col lg:px-0 lg:table-row max-lg:border-b max-lg:border-x group/row"
      :class="{
        'lg:font-semibold': selected || isRowSelected || expanded,
        relative: expandable,
        'cursor-pointer': selectableRow
      }"
      :style="{ paddingInline: `${level}rem`, '--row-offset': `${level - 1}rem`, zIndex: 5 - level }"
      v-bind="$attrs"
      @click="selectRow(row)"
    >
      <slot
        :record="row"
        :level="level"
      />
      <TableCell
        v-if="sortable"
        class="lg:hidden"
        data-index="__move"
        :title="$t('Move')"
      >
        <div class="flex gap-4">
          <tlt-hint :hints="hasTransforms ? $t('Sorting is disabled when filtering is applied.') : undefined">
            <tlt-button
              type="text"
              icon-left="arrow-up"
              :disabled="firstRow || hasTransforms"
              @click="swapPrev?.(index)"
            >
              {{ $t('Up') }}
            </tlt-button>
          </tlt-hint>
          <tlt-hint :hints="hasTransforms ? $t('Sorting is disabled when filtering is applied.') : undefined">
            <tlt-button
              type="text"
              icon-left="arrow-down"
              :disabled="lastRow || hasTransforms"
              @click="swapNext?.(index)"
            >
              {{ $t('Down') }}
            </tlt-button>
          </tlt-hint>
        </div>
      </TableCell>
      <TableCell
        v-if="expandable"
        data-index="__expand"
        class="lg:hidden"
      >
        <template #content>
          <tlt-button
            type="text"
            @click="expanded = !expanded"
          >
            <tlt-icon
              icon="dropdown-arrow"
              :class="{ 'rotate-180': expanded }"
            />
            {{ expanded ? $t('Show less') : $t('Show more') }}
          </tlt-button>
        </template>
      </TableCell>
    </tr>
    <template v-if="childrenRows && childrenRows.length > 0">
      <template
        v-for="(child, childIndex) of childrenRows"
        :key="child?.id || index"
      >
        <TableRow
          v-if="expanded"
          v-slot="childProps"
          v-bind="$props"
          :row="child"
          :index="childIndex"
          :level="level + 1"
          @select="(selected: boolean, row: T) => $emit('select', selected, row)"
          @expand="(expanded, index) => $emit('expand', expanded, index)"
        >
          <slot v-bind="childProps" />
        </TableRow>
      </template>
    </template>
  </ConditionalWrapper>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { useTableBodyContext, type TableBodyContext } from './useTableBodyContext'
import { provideTableRowContext, type TableRowContext } from './useTableRowContext'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import { useTableRow } from './useTableRow'
import type { AcceptableValue } from './types'
import { isObject } from '@ui-core/utils/inspect'

export interface Props<T> {
  row: T
  index: number
  level?: number
  initialExpanded?: boolean
  selectable?: boolean
}

const props = withDefaults(defineProps<Props<T>>(), {
  level: 0,
  selectable: true
})

defineEmits<{
  select: [boolean, T]
  rowSelected: [T]
  expand: [boolean, number]
}>()

defineSlots<{
  [key: string]: (props: { record: T; level: number }) => any
}>()

const { hasTransforms } = useTableRootContext<TableRootContext<T>>()
const { selectableRow, sortable, swapNext, swapPrev } = useTableBodyContext<TableBodyContext<T>>()

const ctx = useTableRow(props)

const { rowId, selected, isRowSelected, expanded, expandable, selectRow, firstRow, lastRow, childrenRows } = ctx

provideTableRowContext<TableRowContext<T>>({ ...ctx, siblingRows: childrenRows })
</script>

<style scoped>
@reference '@/theme.css';

@media not all and (min-width: theme(--breakpoint-lg)) {
  tbody:first-of-type :deep(tr) {
    border-top: 1px solid var(--color-theme-border-base);
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
  }

  tbody:last-of-type :deep(tr) {
    border-bottom-left-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
  }

  tr :deep(td:last-of-type) {
    padding-bottom: 1rem;
  }
  tr :deep(td:first-of-type) {
    padding-top: 1rem;
  }
}
</style>
