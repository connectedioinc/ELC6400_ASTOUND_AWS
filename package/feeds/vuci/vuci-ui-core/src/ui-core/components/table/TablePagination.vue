<template>
  <div
    v-if="transformedRows.length > Math.min(...perPageOptions.map(opt => opt.key))"
    class="flex flex-col gap-4 lg:flex-row w-full lg:items-center justify-center mt-4"
  >
    <div class="flex items-center justify-center">
      <div class="items-center hidden md:flex">
        {{ perPageText }}
        <TltSelect
          id="per-page"
          v-model="_perPage"
          :data-source="perPageOptions"
          prop="tlt_entry_page_select"
          width="60px"
          class="ml-4 w-max"
          label-width="max-content"
          :readonly="false"
        />
      </div>
      <p class="ml-4">
        {{ $t('Showing %s-%s of %s').format((currentPage - 1) * _perPage + 1, $utils.clamp(currentPage * _perPage, 0, transformedRows.length), transformedRows.length) }}
      </p>
    </div>
    <TltPagination
      v-model="currentPage"
      :total-pages="totalPages"
      class="lg:ml-auto justify-center"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useLocalStorage, whenever } from '@vueuse/core'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useTableRootContext } from './useTableRootContext'
import { utils } from '@/plugins/utils'
import { isNumber } from '@ui-core/utils/inspect'
import type { AcceptableValue } from './types'

export interface Props {
  perPageOptions?: { key: number; value: string }[]
  perPageText?: string
  initialPerPage?: number
  perPage?: number
}
const props = withDefaults(defineProps<Props>(), {
  perPageOptions: () => [
    { key: 10, value: '10' },
    { key: 25, value: '25' },
    { key: 50, value: '50' }
  ],
  perPageText: undefined,
  perPage: undefined,
  initialPerPage: 10,
  loadData: undefined
})

const emit = defineEmits<{
  pageChange: [number]
  dataLoaded: [AcceptableValue[]]
  dataLoadedError: [Error]
  'update:perPage': [number]
}>()

const { id, localDataSource, loadDataSource, transformedRows, applyPagination, currentPage, search, sortingOptions, filters, isPaginationLazy, EMPTY_ROW } = useTableRootContext()

applyPagination.value = (rows: AcceptableValue[]) => {
  const sliceStart = _perPage.value * (currentPage.value - 1)
  const sliceEnd = sliceStart + _perPage.value
  const pageItems = rows.slice(sliceStart, sliceEnd)
  return pageItems
}

const store = useMainStore()
const $t = useTranslate()

function clampPerPage(value: number) {
  const closest = props.perPageOptions.reduce((prev, curr) => (Math.abs(curr.key - value) < Math.abs(prev.key - value) ? curr : prev))
  return closest.key
}

const _perPage = useLocalStorage(id + '_page', clampPerPage(props.initialPerPage), {
  serializer: {
    read: raw => clampPerPage(Number(raw)),
    write: value => String(clampPerPage(value))
  }
})
watch(
  () => props.perPage,
  value => {
    _perPage.value = value ?? props.perPageOptions[0].key
  }
)
watch(
  _perPage,
  value => {
    emit('update:perPage', value)
  },
  { immediate: true }
)

const perPageText = computed(() => props.perPageText || $t('Items per page'))

const totalPages = computed(() => Math.ceil(transformedRows.value.length / _perPage.value) || 1)
watch(totalPages, total => {
  if (total < currentPage.value) currentPage.value = total
})

const loadingRange = ref({ from: -1, to: -1 })
watch(loadingRange, ({ from, to }) => {
  if (from !== -1 && to !== -1) return
  store.spin(false)
})

const currentPageRange = computed(() => [(currentPage.value - 1) * _perPage.value, currentPage.value * _perPage.value])
const fullLoadedRange = computed(() => {
  const [start] = currentPageRange.value
  return [utils.clamp(currentPage.value - 3, 0, start) * _perPage.value, (currentPage.value + 2) * _perPage.value]
})
const blockSize = computed(() => Math.max(...props.perPageOptions.map(({ value }) => parseInt(value))))

watch([currentPage, _perPage], () => {
  if (isPaginationLazy.value) checkLoading()
})

const sortingQueryParams = computed(() => {
  if (!sortingOptions.value?.dataIndex || sortingOptions.value?.direction === 0) return {}
  return {
    sortby: sortingOptions.value.dataIndex,
    orderby: sortingOptions.value?.direction > 0 ? ('asc' as const) : ('desc' as const)
  }
})

const filterQueryParams = computed(() => {
  return Object.entries(filters.value).reduce<Record<string, string[]>>((query, [key, filter]) => {
    if (filter.type !== 'uniqueValues' || filter.applied.length === 0) return query

    query[key] = filter.applied
    return query
  }, {})
})

async function checkLoading() {
  const [start, end] = currentPageRange.value
  const [prevStart, nextEnd] = fullLoadedRange.value
  const firstIndex = utils.findIndex(localDataSource.value, e => e === EMPTY_ROW, start)
  const frontLoading = preloadFront(firstIndex, start, nextEnd)
  const lastIndex = utils.findLastIndex(localDataSource.value, e => e === EMPTY_ROW, start - 1)
  const backLoading = preloadBack(lastIndex, prevStart, start)
  if (backLoading && frontLoading) {
    store.spin()
    await Promise.all([backLoading, frontLoading])
    return store.spin(false)
  }
  const loading = utils.inRange(start - 1, loadingRange.value) || utils.inRange(end, loadingRange.value)
  if (loading) store.spin()
}
/**
 * Checks if data needs to be loaded in front of the current page and loads it
 * @param emptyIndex - index of the first empty element
 * @param startIndex - starting index of checking range
 * @param endIndex - ending index of checking range
 */
function preloadFront(emptyIndex: number, startIndex: number, endIndex: number) {
  if (!utils.inRange(emptyIndex, { from: startIndex, to: endIndex })) return
  const { from, to } = loadingRange.value
  if (emptyIndex === from && emptyIndex + blockSize.value === to) return
  return loadDataRange(emptyIndex, blockSize.value)
}
/**
 * Checks if data needs to be loaded in back of the current page and loads it
 * @param emptyIndex - index of the first empty element
 * @param startIndex - starting index of checking range
 * @param endIndex - ending index of checking range
 */
function preloadBack(emptyIndex: number, startIndex: number, endIndex: number) {
  if (!utils.inRange(emptyIndex, { from: startIndex, to: endIndex })) return
  const { from, to } = loadingRange.value
  if (emptyIndex - blockSize.value === from - 1 && emptyIndex === to - 1) return
  return loadDataRange(emptyIndex - blockSize.value + 1, blockSize.value)
}
/**
 * Loads data from the provided range
 * @param offset - offset from which to load data
 * @param count - number of elements to load
 */
async function loadDataRange(offset: number, count: number) {
  loadingRange.value = { from: offset, to: offset + count }
  try {
    const res = await getLazyData(offset, count)
    localDataSource.value.splice(offset, count, ...res.data)
  } catch {
    localDataSource.value = localDataSource.value.filter(v => !!v)
  } finally {
    loadingRange.value = { from: -1, to: -1 }
  }
}

/**
 * Calls the provided function with correct query parameters
 * @param offset - offset from which to load data
 * @param limit - number of elements to load
 */
function getLazyData(offset: number | null, limit: number | null) {
  if (!loadDataSource.value) return { data: [], total: 0 }

  return loadDataSource.value({
    offset: isNumber(offset) ? offset : undefined,
    limit: isNumber(limit) ? limit : undefined,
    search: search.value || undefined,
    sorting: sortingQueryParams.value,
    filter: filterQueryParams.value
  })
}

/**
 * Loads initial data from the provided function when pagination is set to lazy
 */
async function loadLazyData() {
  if (!isPaginationLazy.value) return

  store.spin()
  const [start, end] = [0, blockSize.value * 2]
  try {
    const res = await getLazyData(start, end)
    localDataSource.value = Array.from({ length: res?.total || res.data.length }, () => EMPTY_ROW)
    localDataSource.value.splice(start, end, ...res.data)
    const offsetIndex = localDataSource.value.findIndex(e => e === EMPTY_ROW)
    if (offsetIndex > -1) {
      loadDataRange(localDataSource.value.length - offsetIndex, blockSize.value * 2)
    }
    emit('dataLoaded', localDataSource.value)
  } catch (error) {
    if (error instanceof Error) emit('dataLoadedError', error)
  } finally {
    nextTick(() => (currentPage.value = 1))
    store.spin(false)
  }
}

whenever(isPaginationLazy, loadLazyData)
watch(search, loadLazyData)
whenever(sortingQueryParams, loadLazyData)
whenever(filterQueryParams, loadLazyData)

defineExpose({
  loadLazyData
})
</script>
