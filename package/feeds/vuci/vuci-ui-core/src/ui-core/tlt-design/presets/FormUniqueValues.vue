<template>
  <form-filter-preset
    :resettable="selected.length > 0"
    @reset="onReset"
    @submit="onSubmit"
  >
    <template #header>
      <slot name="header">
        {{ $t('Filters') }}
        <span
          v-if="selected.length > 0"
          class="text-theme-text-subtle"
        >
          ({{ selected.length }})
        </span>
      </slot>
    </template>
    <template #footer>
      <slot name="footer" />
    </template>
    <tlt-input-search
      v-if="searchValue === undefined"
      v-model="search"
      class="w-full mb-2"
    />
    <div
      v-if="values"
      class="flex flex-col"
    >
      <template v-if="searchedOptions.length > 5">
        <tlt-check-box
          v-model="allSelected"
          class="p-2 hover:bg-theme-bg-hover rounded-lg w-full"
          custom-id="all-options"
          :readonly="false"
          :indeterminate="indeterminate"
        >
          <span class="break-all">
            {{ !allSelected ? $t('Select all') : $t('Deselect all') }}
            <span class="text-theme-text-subtle shrink-0">({{ Object.keys(values).length }})</span>
          </span>
        </tlt-check-box>
        <hr class="mx-2 my-1" />
      </template>
      <tlt-check-box
        v-for="option of searchedOptions"
        :key="option.text"
        :custom-id="option.value"
        class="p-2 hover:bg-theme-bg-hover rounded-lg w-full"
        :model-value="selected"
        :text="option.text"
        :readonly="false"
        :box-value="option.value"
        @update:model-value="updateValue"
      >
        <span class="break-all">
          {{ option.text || option.value }}
          <span class="text-theme-text-subtle shrink-0">({{ option.count }})</span>
        </span>
      </tlt-check-box>
    </div>
  </form-filter-preset>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { isArray } from '@ui-core/utils/inspect'
import type { FilterUniqueValues } from '@ui-core/components/table/types'

export interface Props {
  values?: Record<string, { count: number; name?: string }>
  /**
   * Allows providing search value externally.
   * Hides search input when set.
   */
  searchValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  values: undefined,
  searchValue: undefined
})

const emit = defineEmits<{
  close: []
  apply: [FilterUniqueValues]
  reset: []
}>()

const search = ref('')

const selected = defineModel<FilterUniqueValues>('selected', { default: () => [] })

const allSelected = computed({
  get: () => !!selected.value && selected.value.length > 0,
  set: value => {
    if (value || indeterminate.value) selected.value = searchedOptions.value.map(opt => opt.value)
    else selected.value = []
  }
})

const indeterminate = computed(() => allSelected.value && !!selected.value && selected.value.length < searchedOptions.value.length)

/**
 * returns sorted and mapped options to objects which are displayed in component.
 */
const options = computed(() => {
  if (!props.values) return []

  return Object.entries(props.values)
    .map(([property, { count, name }]) => ({
      count: count ?? 0,
      value: property,
      text: name ?? property
    }))
    .filter(s => s.text)
    .sort((a, b) => b.count - a.count)
})

const searchedOptions = computed(() => {
  const _search = (props.searchValue ?? search.value).toUpperCase()
  return options.value.filter(opt => opt.text.toUpperCase().includes(_search))
})

function updateValue(value: string | null | (string | null)[]) {
  if (!value || !isArray(value)) return
  selected.value = value.filter(v => v !== null)
}

function onSubmit() {
  const values = selected.value
  emit('close')
  if (!values || values.length === 0) return onReset()
  emit('apply', values)
}
function onReset() {
  selected.value = []
  emit('reset')
}

defineExpose({ onSubmit, onReset })
</script>
