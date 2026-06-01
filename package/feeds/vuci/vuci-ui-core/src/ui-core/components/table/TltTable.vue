<template>
  <TableRoot
    :id
    ref="root"
    v-slot="{ uniqueEntries }"
    v-model:selected="selectedValues"
    v-model:sorting="sorting"
    v-model:current-page="currentPage"
    :id-key
    :columns="_columns"
    :data-source="dataSource"
  >
    <TableWrapper
      v-show="show"
      ref="wrapper"
      :title
      :help
      v-bind="$attrs"
    >
      <template #wrapper-content>
        <slot name="title-content">
          <template
            v-for="action of tableActions"
            :key="isString(action) ? action : action.id"
          >
            <template v-if="isString(action)">
              <slot
                v-if="action === 'refresh'"
                name="refresh"
              >
                <TableAction
                  :id="action"
                  label="Refresh"
                  icon-left="refresh"
                  @click="$emit('refresh')"
                />
              </slot>
              <slot
                v-else-if="action === 'search' && searchable"
                name="search"
              >
                <TableSearch
                  v-model:search="_search"
                  class="max-lg:order-first"
                />
              </slot>
              <slot
                v-else-if="action === 'column-list'"
                name="column-list"
              >
                <TableColumnsConfig />
              </slot>
              <slot
                v-else
                :name="action"
              />
            </template>
            <TableAction
              v-else
              v-bind="action"
            />
          </template>
        </slot>
      </template>

      <div
        v-if="$slots.before"
        class="max-lg:mb-2"
      >
        <slot
          name="before"
          :unique-entries
        />
      </div>

      <slot>
        <TableBulkActions
          v-if="bulkActions"
          :actions="bulkActions"
          class="max-lg:hidden"
        >
          <template
            v-for="action of bulkActions"
            :key="action.id"
            #[action.id]="slotProps"
          >
            <slot
              :name="action.id"
              v-bind="slotProps"
            />
          </template>
        </TableBulkActions>

        <TableBody
          v-model:selected-row="selectedRow"
          :sortable
          :scrollable
          :selectable="hasBulkActions"
          :selectable-row="selectable"
          @drag-end="$emit('dataChange', $event)"
        >
          <template #before="{ sortedColumns }">
            <TableHeader
              ref="header"
              :style="!transitioning && { top: 'var(--header-height, 0)' }"
              @filter-applied="emit('filterApplied', $event)"
            >
              <template
                v-for="column of sortedColumns"
                :key="column.dataIndex"
              >
                <template v-if="column.dataIndex === '__bulk-actions'">
                  <TableHeaderCellBulkActions
                    v-bind="column"
                    class="max-lg:mr-auto"
                  >
                    <template #[`${column.dataIndex}-header`]="slotProps">
                      <slot
                        :name="`${column.dataIndex}-header`"
                        v-bind="slotProps"
                      />
                    </template>
                    <TableBulkActions
                      v-if="bulkActions"
                      :actions="bulkActions"
                      class="lg:hidden bulk-actions-mobile"
                    />
                  </TableHeaderCellBulkActions>
                </template>
                <TableHeaderCell
                  v-else
                  v-bind="column"
                >
                  <template
                    v-if="$slots[getHeaderCellSlotName(column)]"
                    #header="slotProps"
                  >
                    <slot
                      :name="getHeaderCellSlotName(column)"
                      v-bind="slotProps"
                    />
                  </template>
                  <template
                    v-if="$slots[`${column.dataIndex}-help`]"
                    #help
                  >
                    <slot :name="`${column.dataIndex}-help`" />
                  </template>
                </TableHeaderCell>
              </template>
            </TableHeader>
          </template>

          <template #default="{ sortedColumns, rows }">
            <template v-if="rows.length">
              <ConditionalWrapper
                v-for="(row, index) of rows"
                :key="row[idKey] || index"
                :tag="props.rowWrapperComponent"
                v-bind="isFunction(props.rowWrapperComponentProps) ? props.rowWrapperComponentProps(row, index) : props.rowWrapperComponentProps"
              >
                <TableRow
                  v-slot="{ record }"
                  :row="row"
                  :index="index"
                  :initial-expanded="rowsInitialExpanded"
                  @row-selected="$emit('selected', $event)"
                >
                  <template
                    v-for="column of sortedColumns"
                    :key="column.dataIndex"
                  >
                    <TableCellBulkActions
                      v-if="column.dataIndex === '__bulk-actions'"
                      v-bind="column"
                    >
                      <template #[`${column.dataIndex}-checkbox`]="slotProps">
                        <slot
                          :name="`${column.dataIndex}-checkbox`"
                          v-bind="slotProps"
                        />
                      </template>
                    </TableCellBulkActions>
                    <TableCellRowActions
                      v-else-if="column.dataIndex === '__row-actions'"
                      v-bind="column"
                    >
                      <template #[column.dataIndex]="slotProps">
                        <slot
                          :name="column.dataIndex"
                          v-bind="slotProps"
                        />
                      </template>
                      <TableRowActions :actions="isFunction(rowActions) ? rowActions(record) : rowActions">
                        <template
                          v-for="action of isFunction(rowActions) ? rowActions(record) : rowActions"
                          #[getRowActionSlotName(action)]="slotProps"
                        >
                          <slot
                            :name="getRowActionSlotName(action)"
                            v-bind="slotProps"
                          />
                        </template>
                      </TableRowActions>
                    </TableCellRowActions>
                    <TableCell
                      v-else
                      v-slot="slotProps"
                      v-bind="column"
                    >
                      <slot
                        v-if="$slots[column.dataIndex]"
                        :name="column.dataIndex"
                        v-bind="slotProps"
                      />
                    </TableCell>
                  </template>
                </TableRow>
              </ConditionalWrapper>
            </template>
            <TableRow
              v-else
              :row="{}"
              :index="0"
              :selectable="false"
              class="max-lg:block"
            >
              <td
                :colspan="sortedColumns?.length"
                class="text-theme-text-secondary-subtle font-sans text-body-secondary px-4 py-3 max-lg:block"
              >
                <slot name="emptySection">
                  {{ noValueText || $t('This section contains no values yet') }}
                </slot>
              </td>
            </TableRow>
          </template>
        </TableBody>
        <TablePagination
          v-if="pagination || isPaginationLazy"
          ref="pagination"
          v-model:per-page="perPage"
          v-model:current-page="currentPage"
          :per-page-options
          :per-page-text
          :initial-per-page
          @data-loaded="emit('dataLoaded', $event as T[])"
          @data-loaded-error="emit('dataLoadedError', $event)"
        />
      </slot>
      <slot name="after" />
    </TableWrapper>
  </TableRoot>
</template>

<script setup lang="ts" generic="T extends AcceptableValue, P = {}">
import { computed, ref, provide, useTemplateRef, toRef, inject, type Ref } from 'vue'
import { unrefElement } from '@vueuse/core'
import { isArray, isFunction, isString } from '@ui-core/utils/inspect'
import { useTranslate } from '@ui-core/composables/useI18n'
import { KEY_ELEMENT_ID, KEY_ITEM_ID } from '@ui-core/tlt-design/form/core/_shared/constants'
import { collapseTransitioning } from '@ui-core/tlt-design/layout/tltCollapseTransition.vue'
import type { AcceptableValue, Action, FilterOptions, TableColumn, SortingOptions, DataLoaderFunction } from './types'
import type { DefineComponent, Component, ComponentOptions } from 'vue'
import ConditionalWrapper from '@components/ConditionalWrapper.vue'

export interface Props<T extends AcceptableValue, P = {}> {
  id: string
  title?: string
  help?: string
  dataSource?: T[] | DataLoaderFunction<T>
  /**
   * Key to identify rows in the data object. Used for row selection to work properly
   * @default 'id'
   */
  idKey?: keyof T
  columns: TableColumn<T>[]
  /**
   * Renders buttons in the table header
   */
  tableActions?: (Action<T[keyof T][]> | 'refresh' | 'search' | 'column-list' | (string & {}))[]
  /**
   * Renders dropdown menu with actions for selected rows.
   * Shows in the Actions column when rowActions are present, else in the leftmost column.
   */
  bulkActions?: Action<T[keyof T][]>[]
  /**
   * Renders buttons in Actions column for every row.
   * Accepts function that has access to individual row data.
   */
  rowActions?: (Action<T> | string)[] | ((record: T) => (Action<T> | string)[]) | null
  noValueText?: string
  perPageOptions?: { key: number; value: string }[]
  perPageText?: string
  initialPerPage?: number
  pagination?: boolean
  /**
   * Allows selecting a single row by clicking on it
   *
   * **Note**: not the same as checkboxes to select multiple rows, bind `selected` for that
   */
  selectable?: boolean
  sortable?: boolean
  childrenKey?: keyof T
  rowsInitialExpanded?: boolean
  /**
   * Controls search value from outside
   * Set true to always enable search input (by default it is shown when there are more than 10 rows)
   */
  search?: string | boolean
  scrollable?: boolean
  selected?: T[keyof T][]
  /**
   * Use this instead of v-show, as it does not work on multiple root element components
   */
  show?: boolean
  rowWrapperComponent?: DefineComponent<P> | Component<P> | ComponentOptions<P>
  rowWrapperComponentProps?: P | ((row: T, index: number) => P)
}

const props = withDefaults(defineProps<Props<T, P>>(), {
  title: '',
  help: '',
  dataSource: () => [],
  idKey: 'id',
  tableActions: () => ['refresh', 'column-list', 'search'],
  bulkActions: undefined,
  rowActions: undefined,
  noValueText: undefined,
  perPageOptions: () => [
    { key: 10, value: '10' },
    { key: 25, value: '25' },
    { key: 50, value: '50' }
  ],
  perPageText: undefined,
  pagination: false,
  childrenKey: '_children',
  search: true,
  scrollable: true,
  selected: undefined,
  initialPerPage: undefined,
  show: true,
  rowWrapperComponent: undefined,
  rowWrapperComponentProps: undefined
})

const emit = defineEmits<{
  dataChange: [T[]]
  filterApplied: [Record<string, FilterOptions>]
  selected: [T]
  dataLoaded: [T[]]
  dataLoadedError: [Error]
  refresh: []
  'update:selected': [T[keyof T][]]
}>()

defineOptions({
  inheritAttrs: false
})

const selectedRow = defineModel<T | null>('selectedRow', { default: null })
const perPage = defineModel<number>('perPage')
const currentPage = defineModel<number>('currentPage')
const sorting = defineModel<SortingOptions>('sorting', { default: () => ({ dataIndex: null, direction: 0 }) })

const $t = useTranslate()

const isPaginationLazy = computed(() => isFunction(props.dataSource))

const hasChildren = computed(() => {
  if (isFunction(props.dataSource)) return false

  return props.dataSource.some(row => row && props.childrenKey in row && isArray(row[props.childrenKey]))
})

const _selected = ref<T[keyof T][]>([]) as Ref<T[keyof T][]>
const selectedValues = computed({
  get: () => props.selected ?? _selected.value,
  set: newValue => {
    _selected.value = newValue
    emit('update:selected', newValue)
  }
})

const bulkActionsColumn = {
  dataIndex: '__bulk-actions',
  title: '',
  locked: true,
  configurable: false
} satisfies TableColumn

const rowActionsColumn = {
  dataIndex: '__row-actions',
  title: $t('Actions'),
  locked: true,
  width: 'xs'
} satisfies TableColumn

const _columns = computed(() => {
  const columns = [...props.columns]

  if (hasActions.value) {
    const existing = columns.findIndex(c => c.dataIndex === '__bulk-actions')
    if (existing < 0) columns.unshift(bulkActionsColumn)
    else
      columns[existing] = {
        ...bulkActionsColumn,
        ...columns[existing]
      }
  } else columns.filter(column => column.dataIndex !== '__bulk-actions')

  if (props.rowActions) {
    const existing = columns.findIndex(c => c.dataIndex === '__row-actions')

    if (existing < 0) columns.push(rowActionsColumn)
    else
      columns[existing] = {
        ...rowActionsColumn,
        ...columns[existing]
      }
  } else columns.filter(column => column.dataIndex !== '__row-actions')

  return columns
})

const hasBulkActions = computed(() => !!props.bulkActions || !!props.selected || !!props.columns.some(column => column.actions?.bulk))
const hasActions = computed(() => hasBulkActions.value || props.sortable || hasChildren.value)

const searchable = computed(() => props.search !== false || isString(props.search))
const _search = ref(isString(props.search) ? props.search : '')

function getHeaderCellSlotName(column: TableColumn<T>) {
  return column.scopedSlots?.customHeader || `${column.dataIndex}-header`
}
function getRowActionSlotName(action: Action<T> | string) {
  return isString(action) ? action : action.id
}

const rootComponent = useTemplateRef('root')
const wrapperComponent = useTemplateRef('wrapper')
const headerComponent = useTemplateRef('header')
const paginationComponent = useTemplateRef('pagination')

const transitioning = inject(collapseTransitioning, false)

defineExpose({
  loadLazyData: toRef(() => paginationComponent.value?.loadLazyData),
  filters: toRef(() => rootComponent.value?.filters),
  setFilters: toRef(() => headerComponent.value?.applyFilter),
  clearAllFilters: toRef(() => headerComponent.value?.clearAllFilters),
  $el: toRef(() => unrefElement(wrapperComponent))
})

provide(KEY_ITEM_ID, props.id)
provide(KEY_ELEMENT_ID, props.id)
provide('tableChild', true)
</script>

<style scoped>
@reference '@/theme.css';

.bulk-actions-mobile :deep(button) {
  background-color: var(--color-theme-bg-surface);

  &:hover {
    background-color: var(--color-theme-bg-secondary-subtle-hover);
  }

  &:disabled {
    background-color: var(--color-theme-bg-secondary-subtle);
  }

  & > svg {
    width: 1.25rem;
    height: 1.25rem;
  }
}
</style>
