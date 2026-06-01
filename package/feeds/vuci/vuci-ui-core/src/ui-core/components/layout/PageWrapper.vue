<template>
  <NavigationTabs
    v-if="tabs && tabs.length > 1"
    :tabs="tabs"
    :selected="selectedTab"
    @update:selected="onTabChange"
  >
    <slot />
  </NavigationTabs>
  <component
    :is="component"
    v-else
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { h, computed, watch, toValue, defineComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import DefaultLayout from '@/layouts/default.vue'
import type { Tab } from '../tabs/TltTabs.vue'

export type Layout = 'none' | 'default'
export type PageTab = Tab & { path?: string }

export interface Props {
  layout?: Layout
}

const props = withDefaults(defineProps<Props>(), {
  layout: undefined
})

const router = useRouter()
const route = useRoute()
const store = useMainStore()
const $t = useTranslate()

const components = {
  default: DefaultLayout,
  none: defineComponent(
    (_, { slots }) =>
      () =>
        h('div', slots.default?.())
  )
} as const

const component = computed(() => {
  const value = props.layout ?? toValue(route.meta.layout)
  return components[value]
})

const menus = computed(() => {
  const path = route.path
  const subPath = path.substring(0, path.lastIndexOf('/'))

  return store.subMenus[path] || store.subMenus[subPath] || []
})

const tabs = computed<PageTab[]>(() =>
  menus.value.map(menu => ({
    title: $t(menu.title),
    name: menu.path.split('/').at(-1) ?? menu.path,
    path: menu.path
  }))
)

const selectedTab = computed(() => tabs.value.find(t => t.path === route.path)?.name || tabs.value[0]?.name)

function onTabChange(tabName: string) {
  const tab = tabs.value.find(t => t.name === tabName)
  if (!tab) return

  if (tab.path && route.path !== tab.path) router.push(tab.path).catch(() => {})
}

watch(
  () => route.path,
  (toPath, fromPath) => {
    if (toPath === fromPath) return
    onTabChange(toPath)
  }
)
</script>
