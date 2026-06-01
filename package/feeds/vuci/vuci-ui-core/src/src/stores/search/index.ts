import { computed, onMounted, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { searchAll, type SearchOptions, type SearchResult } from '@ui-core/utils/search'
import type { BreadCrumbItem } from '@/components/VuciLayout/src/TltBreadcrumbs.vue'
import type { RouteSearchItem } from './providers/routes'
import type { ActionSearchItem } from './providers/actions'
import type { PackageSearchItem } from './providers/packages'

export interface SearchItem {
  id: string
  title: string
  crumbs?: BreadCrumbItem[]
}

export interface SearchProvider<T extends SearchItem = SearchItem> {
  id: string
  isLoading?: () => boolean
  /** Returns a list of searchable items */
  getItems: () => T[]
  getItem: (id: string) => T | null
  options: SearchOptions<T>
  cleanup?: () => void
}

export type SearchProviderFactory<T extends SearchItem = SearchItem> = () => SearchProvider<T>

export type SearchItemType = RouteSearchItem | ActionSearchItem | PackageSearchItem

export const useSearchStore = defineStore('search', () => {
  const providers = reactive(new Map<string, SearchProvider<SearchItemType>>())

  function registerProvider(provider: SearchProvider<SearchItemType>) {
    providers.set(provider.id, provider)
  }

  function unregisterProvider(id: string) {
    const provider = providers.get(id)
    if (!provider) return

    provider.cleanup?.()
    providers.delete(id)
  }

  const query = ref('')
  const loading = computed(() => Array.from(providers.values()).some(provider => provider.isLoading?.() === true))

  const results = computed<SearchItemType[]>(() => {
    if (!query.value.trim()) return []

    const allResults: SearchResult<SearchItemType>[] = []

    for (const provider of providers.values()) {
      const items = provider.getItems()
      const providerResults = searchAll(items, query.value, provider.options)

      allResults.push(...providerResults)
    }

    allResults.sort((a, b) => b.score - a.score)

    return allResults.map(result => result.obj)
  })

  function search(q: string) {
    query.value = !q.trim() ? '' : q

    return { loading, results }
  }

  function getItem(id: string) {
    for (const provider of providers.values()) {
      const item = provider.getItem(id)
      if (item) return item
    }
    return null
  }

  async function loadProviders() {
    const modules = import.meta.glob<SearchProviderFactory<SearchItemType>>('./providers/*.ts', { import: 'default' })

    const loadedProviders = await Promise.all(Object.values(modules).map(load => load()))

    for (const createProvider of loadedProviders) {
      const provider = createProvider()
      registerProvider(provider)
    }
  }

  onMounted(loadProviders)

  return {
    providers,
    registerProvider,
    unregisterProvider,
    loadProviders,
    search,
    getItem,
    query,
    loading,
    results
  }
})
