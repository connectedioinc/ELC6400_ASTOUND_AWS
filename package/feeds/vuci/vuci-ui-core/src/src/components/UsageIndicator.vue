<template>
  <TltHint :hints="hintContent">
    <TltProgressBar
      class="inline-flex align-text-bottom"
      :name="label"
      :progress="_percentage"
      :inline="inline"
      v-bind="$attrs"
    />
  </TltHint>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { isNumber } from '@ui-core/utils/inspect'

import TltProgressBar from '@ui-core/tlt-design/widgets/tltProgressBar.vue'

defineOptions({
  inheritAttrs: false
})

export interface Props {
  label?: string
  used?: number
  total?: number
  free?: number
  percentage?: number
  reserved?: number | string
  unit?: string
  inline?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  unit: 'MB',
  used: undefined,
  total: undefined,
  percentage: undefined,
  free: undefined,
  reserved: undefined
})

const $t = useTranslate()

const _percentage = computed(() => {
  if (props.percentage || !props.total || !props.used) return props.percentage || 0
  return props.total > 0 ? (props.used / props.total) * 100 : 0
})
const remaining = computed(() => {
  if (props.free || !props.total || !props.used) return props.free
  return props.total - props.used
})

const hintContent = computed(() => {
  if (!props.used || !props.total || !remaining.value) return

  const usedVsTotal = props.used && props.total ? $t('Used: %s / %s').format(props.used.toFixed(2), props.total.toFixed(2)) : null
  const free = remaining.value ? $t('%s%s free').format(remaining.value.toFixed(2), props.unit) : null
  const reserved = props.reserved ? $t('%s is reserved').format(isNumber(props.reserved) ? `${props.reserved}${props.unit}` : props.reserved) : null

  const infoParts = [usedVsTotal, free, reserved].filter(Boolean)
  if (!infoParts.length) return undefined

  return {
    title: props.label,
    info: infoParts.length === 1 ? `${infoParts[0]}.` : `${infoParts[0]} (${infoParts.slice(1).join('. ')}).`
  }
})
</script>
