<template>
  <tlt-card :title="props.cardTitle">
    <template #title-content>
      <tlt-search-form
        class="ml-auto"
        @submit="(v: string) => (searchValue = v)"
        @clear="searchValue = ''"
      />
    </template>
    <div
      v-for="item in filteredData"
      :key="item.id"
      class="mb-4"
    >
      <tlt-horizontal-card
        v-if="item.data"
        :class="{ 'rounded-b-none!': cardStates[item.id] }"
      >
        <name-cell
          v-if="item.title"
          :value="item.title"
        />
        <card-cell
          v-for="(cell, index) in columns"
          :key="index"
        >
          <cell-row
            v-for="(row, rowIndex) in cell"
            :key="rowIndex"
            :label="row.label"
            :value="item.data?.[row.name] || '-'"
          >
            <template #label>
              <slot
                name="cell-row-label"
                :item="{ label: row.label, value: item.data?.[row.name] }"
              />
            </template>
            <template #value>
              <slot
                name="cell-row-value"
                :item="{ label: row.label, value: item.data?.[row.name] }"
              />
            </template>
          </cell-row>
        </card-cell>
        <action-cell>
          <button
            type="button"
            @click="() => _toggleContent(item.id)"
          >
            <tlt-icon
              icon="dropdown-arrow"
              :class="{ 'rotate-180': cardStates[item.id] }"
            />
          </button>
        </action-cell>
      </tlt-horizontal-card>
      <tlt-collapse-transition>
        <div
          v-show="!item.data || cardStates[item.id]"
          :key="item.id"
          :class="item.data && 'rounded-bl-md rounded-br-md'"
          class="border-t-0 border overflow-clip"
        >
          <tlt-table
            :id="`${props.tableId}-${item.id}`"
            class="routing-table border-t -m-px"
            :columns="tableColumns"
            :data-source="item.tableData"
          >
            <template
              v-for="col in tableColumns"
              #[col.dataIndex]="slotProps"
            >
              <slot
                :name="col.dataIndex"
                v-bind="slotProps"
              />
            </template>
            <template #emptySection>
              <slot name="empty-table" />
            </template>
          </tlt-table>
        </div>
      </tlt-collapse-transition>
    </div>
    <div v-if="!filteredData.length">
      {{ $t('There are no neighbours') }}
    </div>
  </tlt-card>
</template>
<script setup lang="ts">
import type { TableColumn } from '@ui-core/components/table/types'
import { ref, computed, watch } from 'vue'

export type Props = {
  cardTitle: string
  tableId?: string
  tableColumns: TableColumn[]
  cardsColumns: { label: string; name: string }[]
  cards?: Card[]
  maxNumberOfColumnElements?: number
}
export type Card = {
  id: number | string
  title?: string
  /**
   * data that will be shown in horizontal card, if present
   */
  data?: any
  tableData: any[]
}

const props = withDefaults(defineProps<Props>(), {
  tableId: 'routing-table',
  maxNumberOfColumnElements: 3,
  cards: () => []
})

const cardStates = ref(Object.fromEntries(props.cards.map(card => [card.id, card.data ? false : true])))

watch(
  () => props.cards,
  newCards => {
    const entries = newCards.map(card => {
      const state = cardStates.value[card.id] ?? (card.data ? false : true)
      return [card.id, state]
    })
    cardStates.value = Object.fromEntries(entries)
  }
)

const columns = computed(() => {
  const columns = []
  const maxEls = props.maxNumberOfColumnElements
  const cardsColumns = props.cardsColumns
  for (let i = 0; i < cardsColumns.length; i += maxEls) {
    columns.push(cardsColumns.slice(i, i + maxEls))
  }
  return columns
})

const searchValue = ref('')

const filteredData = computed<Card[]>(() => {
  if (!searchValue.value) return props.cards
  const search = searchValue.value.toLowerCase()
  const isMatching = (value: any) => value.toString().toLowerCase().includes(search)
  const _cards: Card[] = []
  for (const card of props.cards) {
    const match = Object.values(card.data || {}).some(isMatching)
    if (match) {
      _cards.push(card)
      continue
    }
    const matchingRows = (card.tableData || []).filter(data => Object.values(data).some(isMatching))
    if (matchingRows.length > 0) {
      _cards.push({ ...card, tableData: matchingRows })
    }
  }
  return _cards
})

watch(
  () => searchValue.value,
  search => {
    if (!search.length) return
    filteredData.value.forEach(card => (cardStates.value[card.id] = true))
  }
)

function _toggleContent(id: number | string) {
  cardStates.value[id] = !cardStates.value[id]
}
</script>
<style scoped>
:deep(.routing-table) {
  --bg-color: var(--color-theme-bg-secondary-subtle, #f8f8f8);
}
:deep(.routing-table table th),
:deep(.routing-table table td) {
  background-color: var(--bg-color);
}
</style>
