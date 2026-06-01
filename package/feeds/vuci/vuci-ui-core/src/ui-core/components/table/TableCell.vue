<template>
  <td
    v-show="show !== false && shown"
    :test-id="`tablecolumns-${dataIndex}`"
    class="lg:bg-theme-bg-surface px-4 py-2 lg:py-2.5 bg-clip-padding lg:border-b lg:border-b-theme-border-subtle"
    :class="[
      columnClasses[dataIndex],
      {
        'expanded-shadow': expanded,
        'lg:bg-theme-bg-secondary-subtle!': selected || isRowSelected || expanded,
        'first-of-type:max-lg:bg-theme-bg-secondary-subtle!': selected,
        'max-lg:bg-theme-bg-secondary-subtle!': isRowSelected,
        'group-hover/row:bg-theme-bg-subtle-hover!': selectableRow
      }
    ]"
    :style="lockedColumnStyle(dataIndex)"
  >
    <div
      v-if="level > 0 && firstRow"
      class="max-lg:hidden top-shadow"
    />
    <div
      class="flex justify-between sm:items-center gap-x-4 gap-y-1 max-sm:flex-col text-theme-text-base lg:text-inherit max-lg:ml-0!"
      :style="level > 0 && indentedColumn === dataIndex ? { marginLeft: `${level}rem` } : null"
    >
      <slot
        name="content"
        :record="row"
        :level="level"
      >
        <tlt-hint
          v-if="title || $slots.title"
          class="font-semibold lg:hidden!"
          :hints="help"
        >
          <slot
            name="title"
            :record="row"
            :level="level"
          >
            <span :id="`${dataIndex}-title`">
              {{ title || '' }}
            </span>
          </slot>
        </tlt-hint>
        <span
          class="word-break sm:w-1/2 lg:w-full max-xs:justify-self-start max-xs:w-full justify-self-end lg:justify-self-start"
          test-id="innertext-value"
        >
          <slot
            :record="row"
            :level="level"
          >
            {{ getDisplayValue(row, dataIndex) }}
          </slot>
        </span>
      </slot>
    </div>
    <div
      v-if="level > 0 && lastRow"
      class="max-lg:hidden bottom-shadow"
    />
  </td>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { computed } from 'vue'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import { useTableBodyContext, type TableBodyContext } from './useTableBodyContext'
import { useTableRowContext, type TableRowContext } from './useTableRowContext'
import type { AcceptableValue, TableColumn } from './types'

export interface Props<T extends AcceptableValue> extends TableColumn<T> {}

const props = withDefaults(defineProps<Props<T>>(), {
  show: undefined
})

defineEmits<{
  swapPrevious: [MouseEvent]
  swapNext: [MouseEvent]
}>()

const { columnOptions, getDisplayValue } = useTableRootContext<TableRootContext<T>>()
const { selectableRow, indentedColumn, columnClasses, lockedColumnStyle } = useTableBodyContext<TableBodyContext<T>>()
const { row, level, firstRow, lastRow, selected, expanded, isRowSelected } = useTableRowContext<TableRowContext<T>>()

const shown = computed(() => columnOptions.value.find(c => c.dataIndex === props.dataIndex)?.shown ?? true)
</script>

<style scoped>
.top-shadow {
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
  height: 4px;
  box-shadow:
    inset 0 4px 4px -4px rgb(0 0 0 / 0.1),
    inset 0 2px 2px -2px rgb(0 0 0 / 0.1);
  pointer-events: none;
}

.bottom-shadow {
  position: absolute;
  width: 100%;
  bottom: 0;
  left: 0;
  height: 4px;
  box-shadow:
    inset 0 -3px 4px -4px rgb(0 0 0 / 0.1),
    inset 0 -2px 2px -2px rgb(0 0 0 / 0.1);
  pointer-events: none;
}

.word-break {
  overflow-wrap: anywhere;
}

.shadow-left:not(:first-of-type)::before {
  content: '';
  position: absolute;
  height: 100%;
  width: 15px;
  top: 0;
  right: 100%;
  box-shadow: inset -15px 0 10px -10px rgb(0 0 0 / 5%);
  pointer-events: none;
}

.shadow-right:not(:last-of-type)::after {
  content: '';
  position: absolute;
  height: 100%;
  width: 15px;
  top: 0;
  left: 100%;
  box-shadow: inset 15px 0 10px -10px rgb(0 0 0 / 5%);
  pointer-events: none;
}
</style>
