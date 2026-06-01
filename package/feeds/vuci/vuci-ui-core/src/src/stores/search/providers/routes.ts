import { computed } from 'vue'
import type { SearchItem, SearchProvider } from '../'
import type { MenuItem } from '@ui-core/types'
import { menu } from '@/plugins/menu'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'

export interface RouteSearchItem extends SearchItem {
  type: 'route'
  path: string
}

export default function createSearchProvider(): SearchProvider<RouteSearchItem> {
  const store = useMainStore()
  const $t = useTranslate()

  const filteredRoutes = computed(() => {
    const routes: MenuItem[] = []
    // Excluding primary menu routes
    for (const primaryMenu of store.menus) {
      routes.push(...menu.menuIterator(primaryMenu.children))
    }
    return routes.filter(route => route.title && route.meta?.route && route.read_access && route.view)
  })

  const items = computed(() => {
    return filteredRoutes.value.map(route => ({
      id: route.path,
      type: 'route' as const,
      title: $t(route.title) || '',
      path: route.path,
      crumbs: route.meta.route?.map(r => ({ name: $t(r.title), path: r.path }))
    }))
  })

  const itemsMap = computed(() => new Map(items.value.map(item => [item.id, item])))

  return {
    id: 'routes',
    getItems: () => items.value,
    getItem: id => itemsMap.value.get(id) || null,
    options: {
      keys: ['title', obj => obj.crumbs?.map(crumb => crumb.name).join() || '']
    }
  }
}
