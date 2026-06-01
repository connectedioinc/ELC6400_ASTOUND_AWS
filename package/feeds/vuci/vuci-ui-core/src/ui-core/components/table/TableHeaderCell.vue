<template>
  <th
    v-show="show !== false"
    :id="`${id}-column-${dataIndex}`"
    :test-id="dataIndex"
    class="lg:border-b lg:border-b-theme-border-base font-sans text-theme-text-base lg:px-3 lg:py-2.5 box-content lg:bg-inherit text-left max-lg:w-auto font-semibold"
    :class="[
      actions?.bulk || displayInMobileHeader ? 'max-lg:flex! first-of-type:ml-auto' : 'max-lg:hidden',
      columnWidthClass,
      columnClasses[dataIndex],
      { 'bg-theme-bg-secondary-subtle!': allSelectedInPage }
    ]"
    :style="lockedColumnStyle(dataIndex)"
  >
    <slot>
      <component
        :is="hasActions ? 'button' : 'div'"
        :id="`${dataIndex}-${id}-title`"
        :key="`${dataIndex}-title`"
        :test-id="hasActions ? `button-${dataIndex}-${id}-action` : null"
        :type="hasActions ? 'button' : null"
        :data-sorting="actions?.sort ? getSortingString(sortingDirection) : null"
        class="flex items-center gap-1 p-1 rounded-sm max-w-max relative transition-colors text-start"
        :class="{
          'hover:bg-theme-bg-subtle-hover': help || $slots.help || hasActions
        }"
        @click="hasActions ? onClick() : null"
      >
        <slot
          :column="$props"
          name="header"
        >
          {{ title }}
        </slot>
        <template v-if="hasActions && actions">
          <tlt-icon
            v-if="actions.sort && !actions.filter"
            icon="sort-direction"
            class="text-theme-text-subtle shrink-0 size-5"
            :direction="sortingDirection"
          />
          <template v-else-if="actions.filter">
            <TltIcon
              icon="filter"
              class="text-theme-text-subtle size-5"
              :class="{ '!text-theme-text-primary': transformActive }"
            />
            <TltContentBox
              v-model:open="open"
              tabindex="0"
              size="big"
              class="max-h-96 h-fit overflow-y-auto"
              :target="`#${dataIndex}-${id}-title`"
            >
              <template v-if="actions.sort">
                <FormSort
                  v-model="sortingDirection"
                  class="pb-4"
                />
                <hr class="mx-4" />
              </template>
              <FormUniqueValues
                v-if="filter.type === 'uniqueValues'"
                v-model:selected="filter.selected"
                :values="uniqueEntries.all[dataIndex]"
                @close="open = false"
                @apply="(...args) => applyFilter(dataIndex, ...args)"
                @reset="resetFilterState(dataIndex)"
              />
              <FormRange
                v-else-if="filter.type === 'range'"
                v-model:selected="filter.selected"
                :custom-name="actions.filter.customName"
                @close="open = false"
                @apply="(...args) => applyFilter(dataIndex, ...args)"
                @reset="resetFilterState(dataIndex)"
              />
            </TltContentBox>
          </template>
          <template v-else-if="actions.bulk">
            <tlt-icon
              icon="dropdown-arrow"
              class="size-5"
              :class="{ 'rotate-180': open }"
            />
            <TltContentBox
              v-model:open="open"
              tabindex="0"
              class="flex flex-col gap-4 min-w-64!"
              size="big"
              :target="`#${dataIndex}-${id}-title`"
            >
              <FormBulkActions
                :action="actions.bulk"
                :selected-values="selectedValues.length"
                @submit="onSubmit"
                @reset="open = false"
              />
            </TltContentBox>
          </template>
        </template>
      </component>
      <TltPopover
        v-if="help || $slots.help"
        :disabled="open"
        :target="`#${dataIndex}-${id}-title`"
        :rawhtml="rawhtml"
        expand-to="bottom-start"
        fallback-expand-to="bottom-end"
        :content="help"
      >
        <slot
          v-if="$slots.help"
          name="help"
        />
      </TltPopover>
    </slot>
  </th>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCurrentElement, whenever } from '@vueuse/core'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import { useTableBodyContext, type TableBodyContext } from './useTableBodyContext'
import { useTableHeaderContext, type TableHeaderContext } from './useTableHeaderContext'
import type { TableColumn, ActionOption, AcceptableValue } from './types'

import FormUniqueValues from '@ui-core/tlt-design/presets/FormUniqueValues.vue'
import FormRange from '@ui-core/tlt-design/presets/FormRange.vue'
import { copy } from '@ui-core/utils/vue-helpers'

export interface Props<T extends AcceptableValue> extends TableColumn<T> {}

const props = withDefaults(defineProps<Props<T>>(), {
  show: undefined
})

const { id, uniqueEntries, sortingOptions, filters, selectedValues } = useTableRootContext<TableRootContext<T>>()
const { columnStates, columnClasses, lockedColumnStyle } = useTableBodyContext<TableBodyContext<T>>()
const { applyFilter, resetFilterState, allSelectedInPage } = useTableHeaderContext<TableHeaderContext<T>>()

const open = ref(false)

const hasActions = computed(() => !!(props.actions?.filter || props.actions?.sort || props.actions?.bulk))

const filter = computed(() => filters.value[props.dataIndex])

const transformActive = computed(() => (sortingOptions.value?.dataIndex === props.dataIndex && sortingOptions.value?.direction !== 0) || filter.value?.fn)

const sortingDirection = computed({
  get: () => {
    return sortingOptions.value?.dataIndex === props.dataIndex ? sortingOptions.value?.direction : 0
  },
  set: value => {
    if (!sortingOptions.value) return
    sortingOptions.value = { dataIndex: props.dataIndex, direction: value }
  }
})
function cycleSortingDirection() {
  sortingDirection.value = sortingDirection.value === 1 ? -1 : sortingDirection.value === -1 ? 0 : 1
}

function getSortingString(sorting: -1 | 0 | 1) {
  return sorting === 1 ? 'ascending' : sorting === -1 ? 'descending' : 'none'
}

function onClick() {
  if (!hasActions.value || !props.actions) return
  if (props.actions.filter || props.actions.bulk) {
    open.value = !open.value
  } else if (props.actions.sort) cycleSortingDirection()
}

whenever(open, () => {
  if (!filter.value) return
  filter.value.selected = copy(filter.value.applied)
})

const columnWidthClass = computed(() => {
  switch (props.width) {
    case 'xs':
      return 'w-[120px]'
    case 'sm':
      return 'w-36'
    case 'base':
      return 'w-56'
    case 'md':
      return 'w-[328px]'
    case 'lg':
      return 'w-[456px]'
    case 'xl':
      return 'w-[680px]'
    case 'auto':
      return 'w-full'
    default:
      return props.width || 'w-[120px]'
  }
})

onMounted(() => {
  const element = useCurrentElement()
  if (!element.value || !(element.value instanceof HTMLElement)) return

  columnStates.value.set(props.dataIndex, {
    dataIndex: props.dataIndex,
    element: element.value,
    left: 0,
    right: 0,
    detached: false
  })
})

onUnmounted(() => {
  columnStates.value.delete(props.dataIndex)
})

function onSubmit(selected: ActionOption<T[keyof T][]>) {
  open.value = false
  selected.callback(selectedValues.value, selected.key)
}
</script>

<style scoped>
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
