<template>
  <div v-if="isCollapsed">
    <tlt-hint
      :hints="property.values.map(a => ({ info: a.value }))"
      class="text-theme-text-primary-subtle underline decoration-dotted"
    >
      {{ property.name }}
    </tlt-hint>
  </div>
  <div
    v-else
    class="flex gap-1 flex-wrap"
  >
    <template v-if="!property.reverse">{{ property.name }}</template>
    <div
      v-for="(value, i) in property.values"
      :key="value.value"
    >
      {{ value.prefix }}
      <tlt-hint
        :hints="parseHint(value)"
        class="text-theme-text-primary-subtle break-keep"
        :class="{ 'underline decoration-dotted': parseHint(value).length > 0 }"
      >
        {{ value.value }}
      </tlt-hint>
      <template v-if="i + 1 !== property.values.length">,</template>
    </div>
    <template v-if="property.reverse">{{ property.name }}</template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

export type FwRuleValue = {
  /** value name */
  name?: string
  values: HintValue[]
  forceCollapse?: boolean
  /** seperates with 'and' from other values */
  andSeperator?: boolean | string
  /** first value then name */
  reverse?: boolean
}
export type HintValue = {
  value: string
  hint?: string | string[]
  /** prefix will be put outside hint */
  prefix?: string
}

export interface Props {
  property: FwRuleValue
}

const props = defineProps<Props>()

const isCollapsed = computed(() => props.property.forceCollapse || props.property.values.length > 3)

function parseHint(value: HintValue): { info: string }[] {
  if (!value.hint) return []
  if (Array.isArray(value.hint)) {
    return value.hint.map(hint => ({ info: hint }))
  }
  return [{ info: value.hint }]
}
</script>
