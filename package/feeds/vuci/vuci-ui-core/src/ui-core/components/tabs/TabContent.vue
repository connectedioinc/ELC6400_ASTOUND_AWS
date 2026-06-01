<template>
  <ListLayout
    v-show="shown"
    :test-id="shown ? `selected-tab-content-${utils.slug(name || '')}` : `tab-content-${utils.slug(name || '')}`"
    gap="md"
    role="tabpanel"
    :bordered="!inner"
  >
    <slot />
  </ListLayout>
</template>

<script setup lang="ts" generic="T extends string">
import { computed, onUnmounted, provide } from 'vue'
import type { Tab, TabIndicator } from './TltTabs.vue'
import { utils } from '@/plugins/utils'
import { useTabsContext } from './useTabsContext'

export interface Props<T extends string> extends Tab<T> {}

const props = withDefaults(defineProps<Props<T>>(), {
  show: true
})
const { registeredTabs, selected, indicators, highlight, inner } = useTabsContext()

if (!registeredTabs.value.find(t => t.name === props.name)) {
  registeredTabs.value.push({ name: props.name, title: props.title })
}

onUnmounted(() => {
  const index = registeredTabs.value.findIndex(t => t.name === props.name)
  if (index >= 0) registeredTabs.value.splice(index, 1)

  removeTabIndicator()
})

const shown = computed(() => props.name === selected.value && props.show)

function canHighlight(type: 'error' | 'change') {
  return highlight.value === true || highlight.value === type
}

function onInputChange() {
  if (!canHighlight('change') || indicators.value[props.name]) return
  addTabIndicator({ type: 'info' })
}
provide('onChange', onInputChange)

let inputName: string | null = null
function onFormSubmit(name: string, valid: boolean) {
  if (!canHighlight('error')) return

  if (!valid) {
    inputName = name
    addTabIndicator({ type: 'error' })
  } else if (inputName === name) {
    inputName = null
    removeTabIndicator()
  }
}
provide('onFormSubmit', onFormSubmit)

provide('tab', { name: props.name, title: props.title })

function addTabIndicator(options: TabIndicator) {
  if (shown.value) return

  indicators.value = { ...indicators.value, [props.name]: options }
}

function removeTabIndicator() {
  if (!indicators.value[props.name]) return

  const newIndicators = { ...indicators.value }
  delete newIndicators[props.name]
  indicators.value = newIndicators
}
</script>
