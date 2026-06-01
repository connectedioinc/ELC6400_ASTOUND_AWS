<template>
  <component
    :is="hasAccordion ? AccordionItem : 'div'"
    :value="name"
  >
    <div class="flex gap-6 flex-start">
      <div
        class="status-box rounded-sm shrink-0"
        :class="statusColor"
      >
        <tlt-icon
          :icon="icon"
          :test-id="`icon-${name}`"
          class="m-auto size-10"
        />
      </div>
      <div class="grow">
        <component :is="headerComponent" />
        <component :is="contentComponent" />
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import AccordionHeader from '@ui-core/tlt-design/layout/accordion/AccordionHeader.vue'
import AccordionContent from '@ui-core/tlt-design/layout/accordion/AccordionContent.vue'
import AccordionItem from '@ui-core/tlt-design/layout/accordion/AccordionItem.vue'
import AccordionTrigger from '@ui-core/tlt-design/layout/accordion/AccordionTrigger.vue'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types.d.ts'
import { computed, h } from 'vue'
type Status = 'success' | 'error' | 'warning' | 'info'
interface Props {
  name: string
  header?: string
  content?: string
  status?: Status
  icon: Icon
  hasAccordion?: boolean
}
const slots = defineSlots<{
  default: any
  content: any
}>()
const props = defineProps<Props>()
const statusColor = computed(() => {
  const colors = {
    success: 'text-theme-text-success',
    warning: 'text-theme-text-warning',
    error: 'text-theme-text-danger',
    info: 'text-theme-text-info'
  }
  return colors[props.status || 'success']
})
const headerComponent = computed(() => {
  const h3 = h('h3', { class: 'uppercase', innerHTML: props.header })
  const base = h('header', { class: 'text-theme-text-secondary font-semibold text-body-main lg:mt-1 w-full' }, slots.default?.() || h3)
  return h(AccordionHeader, { class: 'mb-1' }, { default: () => (props.hasAccordion ? h(AccordionTrigger, { class: 'w-full text-left mt-2.5' }, { before: () => base }) : base) })
})
const contentComponent = computed(() => {
  const content = h('div', { class: 'grid' }, [slots?.content?.() || props.content])
  return props.hasAccordion ? h(AccordionContent, null, { default: () => content }) : content
})
</script>
