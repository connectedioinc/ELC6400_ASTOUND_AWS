<template>
  <ul class="text-body-secondary text-theme-text-secondary-subtle">
    <li v-if="dataSource.length < 1">{{ $t('This section contains no values yet') }}</li>
    <li
      v-for="item in dataSource"
      :key="item.title"
      :test-id="item.title"
      class="py-2 first:pt-0 last:pb-0 sm:px-4 border-b border-b-theme-border-base last:border-b-0"
    >
      <div class="flex max-sm:flex-col justify-center sm:justify-between max-sm:*:w-full grow text-theme-text-base gap-x-2 gap-y-1 items-center">
        <div class="max-md:font-semibold">
          <slot
            :name="`${item.slotName || $utils.slug(item.title)}_title`"
            :item="{ item }"
          >
            <tlt-hint :hints="item.hint">
              {{ item.title }}
            </tlt-hint>
          </slot>
        </div>
        <slot
          :name="`${item.slotName || $utils.slug(item.title)}_value`"
          :item="item"
        >
          <tlt-overflow-hint class="text-theme-text-secondary-subtle">
            {{ item.value }}
          </tlt-overflow-hint>
        </slot>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
type KeyValuePair = {
  title: string
  value: any
  hint?: string
  slotName?: string
}

withDefaults(defineProps<{ dataSource?: KeyValuePair[] }>(), { dataSource: () => [] })
</script>
