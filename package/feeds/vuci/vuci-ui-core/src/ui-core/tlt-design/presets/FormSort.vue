<template>
  <form-filter-preset
    :resettable="sorting !== 0"
    @reset="sorting = 0"
  >
    <template #header>
      <slot name="header">
        {{ $t('Sort') }}
      </slot>
    </template>
    <template #footer>
      <slot name="footer">
        <component :is="() => null" />
      </slot>
    </template>
    <div class="flex flex-col gap-3">
      <tlt-check-box
        v-model="sorting"
        type="radio"
        :box-value="1"
        :readonly="false"
        custom-id="ascending"
      >
        <div class="flex gap-1">
          <tlt-icon
            icon="sort-direction"
            :direction="1"
            class="text-theme-text-subtle size-5"
          />
          {{ $t('Ascending') }}
        </div>
      </tlt-check-box>
      <tlt-check-box
        v-model="sorting"
        type="radio"
        :box-value="-1"
        :readonly="false"
        custom-id="descending"
      >
        <div class="flex gap-1">
          <tlt-icon
            icon="sort-direction"
            :direction="-1"
            class="text-theme-text-subtle size-5"
          />
          {{ $t('Descending') }}
        </div>
      </tlt-check-box>
    </div>
  </form-filter-preset>
</template>

<script setup lang="ts">
import type { SortingOptions } from '@ui-core/components/table/types'

const sorting = defineModel<SortingOptions['direction']>({ required: true })
</script>
