import { ref, computed, watch, type Ref } from 'vue'
import { useResizeObserver, useScroll } from '@vueuse/core'
import { utils } from '@/plugins/utils'
import TltDnd from '@ui-core/tlt-design/layout/TltDnd.vue'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import type { AcceptableValue, ColumnState } from './types'
import type { TableBodyProps } from '.'

export function useTableBody<T extends AcceptableValue>(
  props: TableBodyProps,
  selectedRow: Ref<T | null>,
  wrapperElement: Ref<HTMLDivElement | null>,
  dndElement: Ref<InstanceType<typeof TltDnd> | null>
) {
  const { selectedValues, hasChildren, columnOptions, isOverflowing, displayedRows } = useTableRootContext<TableRootContext<T>>()

  const _sortable = computed(() => props.sortable && displayedRows.value.length > 1)

  const hasBulkActions = computed(() => !!selectedValues.value)
  const hasActions = computed(() => hasBulkActions.value || _sortable.value || hasChildren.value)

  const startDrag = computed(() => {
    if (!_sortable.value || !dndElement.value) return
    return dndElement.value.startWrapper
  })
  const swapNext = computed(() => {
    if (!_sortable.value || !dndElement.value) return
    return dndElement.value.swapNext
  })
  const swapPrev = computed(() => {
    if (!_sortable.value || !dndElement.value) return
    return dndElement.value.swapPrev
  })

  const indentedColumn = ref<string | undefined>()

  // #region Column locking
  const columnStates = ref<Map<string, ColumnState>>(new Map())
  const lockedColumnOptions = computed(() => columnOptions.value.filter(v => v.locked))

  function updateColumnOffsets() {
    if (!wrapperElement.value) return

    let leftWidth = 0
    let rightWidth = 0

    for (let i = 0; i < columnOptions.value.length; i++) {
      const leftOptions = columnOptions.value[i]
      const rightOptions = columnOptions.value[columnOptions.value.length - i - 1]

      const leftState = columnStates.value.get(leftOptions.dataIndex)
      if (leftOptions.locked && leftState?.element) {
        leftState.left = leftWidth
        leftWidth += leftState.element.offsetWidth
      }

      const rightState = columnStates.value.get(rightOptions.dataIndex)
      if (rightOptions.locked && rightState?.element) {
        rightState.right = rightWidth
        rightWidth = utils.clamp(rightWidth + rightState.element.offsetWidth, 0, wrapperElement.value.offsetWidth)
      }
    }
  }

  const lockedOverflowing = ref(false)
  function checkOverflow() {
    if (!wrapperElement.value) return

    isOverflowing.value = wrapperElement.value?.scrollWidth > wrapperElement.value?.clientWidth

    const lockedWidth = lockedColumnOptions.value.reduce((sum, c) => {
      const columnState = columnStates.value.get(c.dataIndex)
      return sum + (columnState?.element?.offsetWidth ?? 0)
    }, 0)

    lockedOverflowing.value = lockedWidth >= wrapperElement.value?.offsetWidth
  }

  function onTableScroll(x: number) {
    measure()

    columnOptions.value.forEach(options => {
      const state = columnStates.value.get(options.dataIndex)
      if (!options.locked || !state?.element || !wrapperElement.value) return

      const offsetLeft = state.element.offsetLeft
      const offsetRight = offsetLeft + state.element.offsetWidth

      const left = !arrivedState.left && Math.round(x) >= offsetLeft - state.left
      const right = !arrivedState.right && x + wrapperElement.value.offsetWidth - state.right <= offsetRight

      state.detached = left !== right
    })
  }

  const { x: scrollX, arrivedState, measure } = useScroll(wrapperElement)
  watch(scrollX, onTableScroll)

  watch(
    [columnOptions, columnStates],
    () => {
      updateColumnOffsets()
      onTableScroll(scrollX.value)
      updateColumnClasses()
    },
    { deep: true, flush: 'post' }
  )
  useResizeObserver(wrapperElement, () => {
    updateColumnOffsets()
    onTableScroll(scrollX.value)
    checkOverflow()
    updateColumnClasses()
  })

  const columnClasses = ref<Record<string, any>>({})
  function updateColumnClasses() {
    if (!isOverflowing.value || lockedOverflowing.value)
      return (columnClasses.value = columnOptions.value.reduce<Record<string, string>>((sum, options) => ({ ...sum, [options.dataIndex]: 'lg:relative' }), {}))

    let nearestDetachedToLeft: ColumnState | null = null
    columnClasses.value = columnOptions.value.reduce<Record<string, Record<string, boolean>>>((sum, options, index) => {
      const state = columnStates.value.get(options.dataIndex)
      if (!state) return sum

      const leftShadowShown = nearestDetachedToLeft?.element && state.element ? nearestDetachedToLeft.element.offsetLeft + nearestDetachedToLeft.element.offsetWidth < state.element.offsetLeft : null
      sum[options.dataIndex] = {
        'lg:sticky z-10': options.locked,
        'lg:relative': !options.locked,
        'shadow-left': index > 0 && options.locked && state.detached && (leftShadowShown === null || leftShadowShown),
        'shadow-right': index < columnOptions.value.length - 1 && options.locked && state.detached
      }
      if (options.locked && state.detached) nearestDetachedToLeft = state
      return sum
    }, {})
  }

  function lockedColumnStyle(dataIndex: string) {
    if (!isOverflowing.value || lockedOverflowing.value) return null

    const options = columnOptions.value.find(c => c.dataIndex === dataIndex)
    const state = columnStates.value.get(dataIndex)

    if (!state || !options?.locked) return null
    return {
      left: `${state.left}px`,
      right: `${state.right}px`
    }
  }
  // #endregion

  return {
    sortable: _sortable,
    selectable: props.selectable,
    selectableRow: props.selectableRow,
    hasBulkActions,
    hasActions,
    selectedRow,
    startDrag,
    swapNext,
    swapPrev,
    indentedColumn,
    lockedColumnStyle,
    columnClasses,
    columnStates
  }
}
