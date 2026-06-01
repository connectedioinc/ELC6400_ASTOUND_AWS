<template>
  <component
    :is="component.component"
    v-if="isExternal || menuElement"
    ref="link"
    class="no-underline font-semibold"
    :class="[isExternal || menuElement?.read_access ? 'text-theme-text-primary!' : 'text-theme-text-secondary! cursor-not-allowed', { 'text-sm': !inline }]"
    tabindex="0"
    v-bind="{ ...$attrs, ...component.bind }"
  >
    <slot
      :menu-element="menuElement"
      :title="props.customName !== undefined ? props.customName : menuElement?.title && $t(menuElement?.title)"
    >
      <div :class="inline ? 'inline whitespace-nowrap' : 'flex gap-1 items-center'">
        <tlt-icon
          v-if="props.icon"
          :icon="props.icon"
          color="primary"
          :class="{ 'inline align-bottom mr-1': inline }"
          class="size-5 shrink-0"
        />{{ props.customName !== undefined ? props.customName : menuElement?.title && $t(menuElement?.title) }}
      </div>
    </slot>
    <tlt-tooltip
      v-if="!isExternal && menuElement && !menuElement.read_access"
      :target="() => link"
    >
      {{ $t('No read access') }}
    </tlt-tooltip>
  </component>
</template>

<script lang="ts" setup>
import type { RoutePath } from '@root/vuci-menu'
import { menu } from '@/plugins/menu'
import { computed, useTemplateRef, watchEffect } from 'vue'
import { RouterLink } from 'vue-router'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import { log } from '@ui-core/plugins/log'

export type InternalLink = `${RoutePath}` | `${RoutePath}?${string}` | `${RoutePath}#${string}` | `${RoutePath}?${string}#${string}`
export type ExternalLink = `${'http' | 'https'}://${string}`
export type Link = InternalLink | ExternalLink

defineOptions({
  inheritAttrs: false
})

const component = computed(() => {
  if (isExternal.value) {
    return {
      component: 'a',
      bind: {
        href: props.path,
        target: '_blank'
      }
    }
  }
  if (menuElement.value?.read_access) {
    return {
      component: RouterLink,
      bind: {
        to: menuElement.value?.path ? props.path : undefined
      }
    }
  }
  return {
    component: 'span',
    bind: {}
  }
})

export interface Props {
  path: Link
  customName?: string
  icon?: Icon | null
  inline?: boolean
}

const props = withDefaults(defineProps<Props>(), { customName: undefined, icon: 'external-link', inline: false })

const link = useTemplateRef<HTMLElement>('link')

const isExternal = computed(() => props.path.startsWith('http'))
const menuElement = computed(() => (isExternal.value ? undefined : menu.findMenuItem(URL.parse(props.path, location.href)?.pathname ?? '')))
watchEffect(() => {
  if (!menuElement.value && !isExternal.value) log(`Failed to find "${props.path}" in menu`)
})
</script>
