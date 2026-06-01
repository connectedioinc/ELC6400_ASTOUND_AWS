<template>
  <div class="relative">
    <div
      ref="columnListButton"
      class="flex items-center"
    >
      <slot>
        <TableAction
          id="column-config"
          :icon-left="icon"
          :bubble="shownColumnOptions.length < configurableColumnOptions.length"
          v-bind="$attrs"
          :button-props="{ disabled: false }"
          @click="columnListOpen = !columnListOpen"
        >
          <template
            v-if="!iconOnly"
            #label
          >
            <slot
              name="button-text"
              :shown-columns="shownColumnOptions"
              :total-columns="configurableColumnOptions"
            >
              <span>{{ $t('Visible columns') }} ({{ $t('%d of %d').format(shownColumnOptions.length, configurableColumnOptions.length) }})</span>
            </slot>
          </template>
        </TableAction>
      </slot>
    </div>
    <tlt-content-box
      v-model:open="columnListOpen"
      expand-to="box-bottom-right"
      class="p-2 pb-3 min-w-64!"
      :target="() => columnListButton"
    >
      <div class="p-2 flex justify-between items-center">
        <h2 class="font-bold text-base">{{ $t('Column list') }}</h2>
        <tlt-button
          button-id="reset-columns"
          :disabled="false"
          type="text"
          @click="resetColumns"
        >
          {{ $t('Reset') }}
        </tlt-button>
      </div>
      <tlt-dnd
        v-slot="{ startDrag, targetIndex }"
        tag="ul"
        :disabled="false"
        drag-class="list-none p-0 m-0 font-sans text-sm cursor-grabbing shadow-sm rounded-lg"
        :items="configurableColumnOptions"
        restrict-to-container
        @drag-end="configurableColumnOptions = $event"
      >
        <li
          v-for="(option, index) of configurableColumnOptions"
          :key="option.dataIndex"
          class="flex flex-row items-center gap-2 w-full bg-theme-bg-surface hover:bg-theme-bg-hover min-h-9 rounded-lg pr-4"
          :class="{ 'bg-theme-bg-hover': index === targetIndex }"
        >
          <tlt-check-box
            v-model="option.shown"
            :custom-id="option.dataIndex"
            :readonly="false"
            class="text-start flex flex-row items-center gap-2 w-full px-4 py-2"
          >
            <span class="grow min-w-0 leading-4 break-words">{{ configurableColumns.find(column => column.dataIndex === option.dataIndex)?.title ?? capitalize(option.dataIndex) }}</span>
          </tlt-check-box>
          <template v-if="isOverflowing">
            <button
              :ref="el => (el ? columnLockButtons.set(option.dataIndex, el) : columnLockButtons.delete(option.dataIndex))"
              type="button"
              :class="option.locked ? 'text-theme-text-primary' : 'text-theme-text-subtle'"
              @click.stop="option.locked = !option.locked"
            >
              <tlt-icon
                icon="lock"
                class="size-5"
              />
            </button>
            <tlt-tooltip
              :target="() => columnLockButtons.get(option.dataIndex)"
              class="z-50"
            >
              {{ $t('Column lock') }}
            </tlt-tooltip>
          </template>
          <button
            :ref="el => (el ? columnSwapButtons.set(option.dataIndex, el) : columnSwapButtons.delete(option.dataIndex))"
            type="button"
            class="hover:cursor-grab text-theme-text-subtle hover:text-theme-text-primary touch-none"
            :class="{ 'text-theme-text-primary': index === targetIndex }"
            @click.stop
            @mousedown="startDrag($event, index)"
            @touchstart="startDrag($event, index)"
          >
            <tlt-icon
              icon="thumb"
              class="size-5"
            />
          </button>
          <tlt-tooltip
            :target="() => columnSwapButtons.get(option.dataIndex)"
            class="z-50"
          >
            {{ $t('Column position swap') }}
          </tlt-tooltip>
        </li>
      </tlt-dnd>
    </tlt-content-box>
  </div>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { ref, watch, computed, watchEffect, type ComponentPublicInstance, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import type { AcceptableValue, ColumnOptions, TableColumn } from './types'
import { capitalize } from '@ui-core/plugins/helper'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'

export interface Props {
  icon?: Icon
  iconOnly?: boolean
}

withDefaults(defineProps<Props>(), {
  icon: 'columns'
})

defineOptions({
  inheritAttrs: false
})

const { id, isOverflowing, columns, columnOptions } = useTableRootContext<TableRootContext<T>>()

const columnListOpen = ref(false)
const columnListButton = useTemplateRef('columnListButton')
const columnLockButtons = ref(new Map<string, Element | ComponentPublicInstance>())
const columnSwapButtons = ref(new Map<string, Element | ComponentPublicInstance>())

const route = useRoute()

const shownColumns = computed(() => columns.value.filter(column => column.show !== false))
const configurableColumns = computed(() => shownColumns.value.filter(column => column.configurable !== false))

function createColumnOption(column: TableColumn<T>) {
  return {
    dataIndex: column.dataIndex,
    shown: column.hidden !== true,
    locked: column.locked === true
  }
}

function createColumnOptions() {
  return configurableColumns.value.map(createColumnOption)
}
function resetColumns() {
  configurableColumnOptions.value = createColumnOptions()
}

const configurableColumnOptions = useLocalStorage<ColumnOptions[]>(`${route.path}_${id}_columns`, createColumnOptions())
const shownColumnOptions = computed(() => configurableColumnOptions.value.filter(v => v.shown))

watch(
  configurableColumns,
  columns => {
    const removed = configurableColumnOptions.value.filter(option => !columns.find(col => col.dataIndex === option.dataIndex))
    configurableColumnOptions.value = configurableColumnOptions.value.filter(option => !removed.includes(option))

    const added = columns
      .map((column, index) => [index, column] as const)
      .filter(([, column]) => !configurableColumnOptions.value.find(option => option.dataIndex === column.dataIndex))
      .map(([index, column]) => [index, createColumnOption(column)] as const)
    added.forEach(([index, options]) => {
      configurableColumnOptions.value.splice(index, 0, options)
    })
  },
  { immediate: true }
)

watchEffect(() => {
  if (!columns.value.length) return (columnOptions.value = configurableColumnOptions.value)

  const notConfigurableColumns = Object.entries(columns.value).filter(([, column]) => column.configurable === false)
  const options = [...configurableColumnOptions.value]
  notConfigurableColumns.forEach(([index, column]) => options.splice(Number(index), 0, createColumnOption(column)))

  columnOptions.value = options
})
</script>
