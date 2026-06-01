<template>
  <form-filter-preset
    @submit="onSubmit"
    @reset="onReset"
  >
    <template #header>{{ $t('Filter settings') }}</template>
    <div class="w-full py-2">
      <tlt-input-search v-model="search" />
    </div>
    <ul class="flex flex-col gap-4 py-2">
      <template
        v-for="col in columns"
        :key="col.dataIndex"
      >
        <li v-if="col.actions && ('filter' in col.actions || 'sort' in col.actions)">
          <button
            type="button"
            class="w-full flex flex-row gap-1"
            @click="expanded = expanded === col.dataIndex ? null : col.dataIndex"
          >
            <tlt-icon
              icon="chevron"
              class="text-theme-text-subtle transition-transform size-5"
              :class="expanded === col.dataIndex ? '-rotate-90' : 'rotate-90'"
            />
            <span class="font-semibold">{{ col.title }}</span>
          </button>
          <Transition name="expand">
            <div
              v-if="expanded === col.dataIndex"
              class="grid"
            >
              <div class="overflow-hidden px-2">
                <FormSort
                  v-if="col.actions?.sort"
                  :model-value="sorting.dataIndex === col.dataIndex ? sorting.direction : 0"
                  class="pb-4"
                  @update:model-value="onSortingChange(col.dataIndex, $event)"
                >
                  <template #footer />
                </FormSort>
                <hr
                  v-if="col.actions?.sort && filters[col.dataIndex]"
                  class="mx-4"
                />
                <FormFilterColumn
                  v-if="filters[col.dataIndex] && shownValues[col.dataIndex]"
                  :ref="(el: any) => (actionComponentRefs[col.dataIndex] = el)"
                  v-model:filter="filters[col.dataIndex]"
                  :shown-values="shownValues[col.dataIndex]"
                  :search="search"
                  @apply="$emit('apply', col.dataIndex, $event)"
                  @reset="$emit('reset')"
                />
              </div>
            </div>
          </Transition>
        </li>
      </template>
    </ul>
  </form-filter-preset>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FormRange from './FormRange.vue'
import FormUniqueValues from './FormUniqueValues.vue'
import type { TableColumn } from '@ui-core/components/table/types'
import type { FilterOptions, FilterUniqueValues, FilterRange, SortingOptions } from '@ui-core/components/table/types'

export interface Props {
  columns: TableColumn[]
  shownValues: Record<string, Record<string, number>>
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  reset: []
  apply: [string, FilterUniqueValues | FilterRange]
}>()

const sorting = defineModel<SortingOptions>('sorting', { required: true })
const filters = defineModel<Record<string, FilterOptions>>('filters', { required: true })

const search = ref('')
const expanded = ref<string | null>(null)

function onSortingChange(dataIndex: string, direction: -1 | 0 | 1) {
  sorting.value = {
    dataIndex,
    direction
  }
}

const actionComponentRefs = ref<Record<string, InstanceType<typeof FormUniqueValues> | InstanceType<typeof FormRange> | null>>({})

function onSubmit() {
  emit('close')
  if (!expanded.value) return
  actionComponentRefs.value[expanded.value]?.onSubmit()
}

function onReset() {
  emit('reset')
  sorting.value = { dataIndex: '', direction: 0 }
  if (!expanded.value) return
  actionComponentRefs.value[expanded.value]?.onReset()
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: grid-template-rows 150ms;
}

.expand-enter-from,
.expand-leave-to {
  grid-template-rows: 0fr;
}

.expand-enter-to,
.expand-leave-from {
  grid-template-rows: 1fr;
}
</style>
