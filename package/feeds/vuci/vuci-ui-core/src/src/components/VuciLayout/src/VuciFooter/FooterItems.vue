<template>
  <div class="flex items-center flex-wrap gap-x-4 gap-y-1 overflow-hidden divider">
    <component
      :is="getComponent(item)"
      v-for="item of items"
      v-bind="getProps(item)"
      :key="isString(item) ? item : item.text"
      class="text-caption text-theme-text-secondary-subtle"
    >
      {{ $t(isString(item) ? item : item.text) }}
    </component>
  </div>
</template>

<script setup lang="ts">
import { isObject, isString } from '@ui-core/utils/inspect'

export interface FooterItem {
  text: string
  url?: string
  action?: string
}

defineProps<{
  items: (FooterItem | string)[]
}>()

const emit = defineEmits<{
  click: [type: string]
}>()

function getComponent(item: FooterItem | string) {
  if (isString(item)) return 'span'
  if (isObject(item)) {
    if (item.url) return 'a'
    if (item.action) return 'button'
  }
  return 'span'
}

function getProps(item: FooterItem | string) {
  if (isString(item)) return
  if (isObject(item)) {
    if (item.url)
      return {
        href: item.url,
        target: '_blank',
        class: 'no-underline hover:underline'
      }

    if (item.action)
      return {
        type: 'button',
        class: 'hover:underline',
        onClick: () => emit('click', item.action!)
      }
  }
}

/**
 * Manually adding translatable strings from brand.json
 *
 * $t('Wiki')
 * $t('Community Forum')
 * $t('Licenses')
 */
</script>

<style scoped>
@reference '@/theme.css';

.divider > * {
  position: relative;
  outline: none;
}

.divider > :focus {
  text-decoration: underline;
}

.divider > *:not(:first-child)::before {
  content: '';
  position: absolute;
  top: 0;
  left: -0.5rem;
  height: 100%;
  border-right: 1px solid var(--theme-border-strong);
  color: var(--theme-text-secondary-subtle);
}
</style>
