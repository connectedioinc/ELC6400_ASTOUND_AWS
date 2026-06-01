<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="break-all inline-flex items-center min-w-0 max-w-full">
    <tlt-overflow-hint
      v-if="rawhtml"
      :test-id="`text-${elementId}`"
    >
      <span v-html="$xss(parsedValue)" />
    </tlt-overflow-hint>
    <tlt-overflow-hint
      v-else
      :test-id="`text-${elementId}`"
    >
      {{ parsedValue }}
    </tlt-overflow-hint>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommonInjects as useInputInjects } from './_shared/useCommonInjects'
import { isArray, isNumber, isString } from '@ui-core/utils/inspect'

const { elementId } = useInputInjects()

const props = withDefaults(
  defineProps<{
    value?: string | number | string[]
    rawhtml?: boolean
  }>(),
  {
    value: '-',
    rawhtml: false
  }
)

const parsedValue = computed(() => {
  if (isNumber(props.value)) return props.value.toString()
  if (isString(props.value)) return props.value || '-'
  if (isArray(props.value)) return props.value.length > 0 ? props.value.join(', ') : '-'
  return '-'
})
</script>
