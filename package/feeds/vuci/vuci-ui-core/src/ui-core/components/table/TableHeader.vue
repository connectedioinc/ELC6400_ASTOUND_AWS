<template>
  <thead
    class="lg:min-h-12 lg:h-full z-10 max-lg:sticky max-lg:basis-full"
    :class="selectable || hasFilters ? 'has-header' : 'max-lg:hidden'"
  >
    <tr
      class="max-lg:flex max-lg:justify-end max-lg:gap-2 max-lg:flex-wrap max-lg:px-4 max-lg:py-2 max-lg:bg-theme-bg-secondary-subtle lg:bg-theme-bg-surface max-lg:rounded-t max-lg:border max-lg:border-x max-lg:overflow-hidden"
    >
      <slot />
      <th
        v-if="hasFilters"
        class="font-normal lg:hidden"
      >
        <button
          :id="`${id}-mobile-filters-button`"
          type="button"
          :test-id="`button-${id}-filters-mobile`"
          class="p-1.5 rounded-full text-theme-text-subtle bg-theme-bg-surface hover:bg-theme-bg-subtle-hover active:bg-theme-bg-subtle-active hover:text-theme-text-primary-hover active:text-theme-text-primary-active justify-center"
          @click="mobileFiltersExpanded = !mobileFiltersExpanded"
        >
          <tlt-icon
            icon="filter"
            class="size-5"
            :class="{ 'text-theme-text-primary': hasActiveFilter }"
          />
        </button>
        <tlt-content-box
          v-model:open="mobileFiltersExpanded"
          class="max-h-[66vh] h-fit overflow-y-auto flex flex-col gap-4"
          :target="`#${id}-mobile-filters-button`"
          size="big"
        >
          <form-filter-columns
            v-model:sorting="sortingOptions"
            v-model:filters="filters"
            :columns="sortedColumns"
            :shown-values="uniqueEntries.all"
            :resettable="hasActiveFilter"
            :reset-button="$t('Cancel')"
            :footer-button="$t('Apply filters')"
            @apply="applyFilter"
            @close="close(true)"
            @reset="clearAllFilters"
          />
        </tlt-content-box>
      </th>
    </tr>
  </thead>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { useTableHeader } from './useTableHeader'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import { useTableBodyContext, type TableBodyContext } from './useTableBodyContext'
import { provideTableHeaderContext } from './useTableHeaderContext'
import type { AcceptableValue, FilterOptions, SortingOptions } from './types'

defineEmits<{
  sortingApplied: [SortingOptions]
  filterApplied: [Record<string, FilterOptions>]
}>()

const { id, sortedColumns, uniqueEntries, sortingOptions, filters } = useTableRootContext<TableRootContext<T>>()
const { selectable } = useTableBodyContext<TableBodyContext<T>>()

const ctx = useTableHeader()

const { mobileFiltersExpanded, hasFilters, hasActiveFilter, applyFilter, close, clearAllFilters } = ctx

provideTableHeaderContext(ctx)

defineExpose({
  applyFilter: ctx.applyFilter,
  clearAllFilters: ctx.clearAllFilters
})
</script>

<style scoped>
@reference '@/theme.css';

@media not all and (min-width: theme(--breakpoint-lg)) {
  .has-header + :deep(tbody tr) {
    border-top-width: 0 !important;
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
  }
}
</style>
