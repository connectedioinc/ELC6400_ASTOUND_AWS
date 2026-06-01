<template>
  <tlt-search-form
    v-model="search"
    @submit="onSubmit"
    @clear="onClear"
  />
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { searchAll } from '@ui-core/utils/search'
import { isArray } from '@ui-core/utils/inspect'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import type { AcceptableValue } from './types'

const search = defineModel<string>('search', { default: '' })
const submittedSearch = ref('')

const emit = defineEmits<{
  submit: [string]
  clear: []
}>()

const { id, currentPage, dataTransforms, getDisplayValue, columns, search: rootSearch, isPaginationLazy } = useTableRootContext<TableRootContext<T>>()

const route = useRoute()

watch(
  () => route.query,
  async query => {
    await nextTick()
    if (!query) return
    // Supports query id `search` or `search_${id}` with table id when multiple tables are present
    const queryValue = query[`search_${id}`] || query['search']
    const querySearch = isArray(queryValue) ? queryValue[0] : queryValue

    if (querySearch && querySearch !== search.value) {
      search.value = querySearch
      onSubmit(querySearch)
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (search.value) onSubmit(search.value)
})

const searchableColumns = computed(() => columns.value.filter(c => c.title))

function filterBySearch(rows: T[], query: string) {
  if (!query) return rows

  const results = searchAll(rows, query, {
    keys: searchableColumns.value.map(column => (row: T) => getDisplayValue(row, column.dataIndex))
  })

  return results.map(result => result.obj)
}

function onSubmit(value: string) {
  submittedSearch.value = value

  emit('submit', value)
}

function onClear() {
  submittedSearch.value = ''

  emit('clear')
}

watch(submittedSearch, value => {
  rootSearch.value = value
  currentPage.value = 1

  if (isPaginationLazy.value) return

  if (!value) dataTransforms.delete('search')
  else dataTransforms.set('search', (rows: T[]) => filterBySearch(rows, value))
})
</script>
