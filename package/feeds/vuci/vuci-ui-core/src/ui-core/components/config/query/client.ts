import { isArray } from '@ui-core/utils/inspect'
import { isSubset } from '@ui-core/utils/object'
import { computed, type ComputedRef } from 'vue'
import { CollectionCache } from './collection-cache'
import { MutationCache } from './mutation-cache'
import { QueryCache } from './query-cache'
import type { QueryFetchOptions, QueryKey } from './types'
import { hashKey } from './utils'

const noop = () => {}

// accepting these options now, open for extension in the future
// with the ability to customize the behavior of the caches, e.g., providing hooks on some events
type ClientConfig = {
  queryCache?: QueryCache
  mutationCache?: MutationCache
  collectionCache?: CollectionCache
}

type DefaultQueryOptions<T = unknown> = {
  idKey: keyof T
  baseUrl: string
  get: () => Promise<any>
  create: (...args: any[]) => Promise<any>
  remove: (...args: any[]) => Promise<any>
  update: (...args: any[]) => Promise<any>
}

export class Client {
  private queryCache: QueryCache
  private mutationCache: MutationCache
  private collectionCache: CollectionCache

  private pendingQueries: Map<string, Promise<any>>
  private defaultOptions: Map<QueryKey<unknown>, DefaultQueryOptions>

  /**
   * true, when at least one mutation is active
   */
  isMutating: ComputedRef<boolean>
  /**
   * true, when at least one query is fetching data
   */
  isFetching: ComputedRef<boolean>
  /**
   * true, when at least one query is loading the data for the first time
   * @see {Query#isLoading} for more information
   */
  isLoading: ComputedRef<boolean>
  isPending: ComputedRef<boolean>

  constructor(config: ClientConfig = {}) {
    this.queryCache = config.queryCache || new QueryCache()
    this.collectionCache = config.collectionCache || new CollectionCache()
    this.mutationCache = config.mutationCache || new MutationCache()
    this.pendingQueries = new Map()
    this.defaultOptions = new Map()

    this.isMutating = computed(() => {
      return this.mutationCache.all.value.some(({ isMutating }) => isMutating.value)
    })

    this.isFetching = computed(() => {
      return this.queryCache.all.value.some(query => query.active.value && query.isFetching.value)
    })

    this.isLoading = computed(() => {
      return this.queryCache.all.value.some(query => query.active.value && query.isLoading.value)
    })

    this.isPending = computed(() => {
      return this.queryCache.all.value.some(query => query.active.value && query.isPending.value)
    })
  }

  getQueryCache() {
    return this.queryCache
  }

  getCollectionCache() {
    return this.collectionCache
  }

  getMutationCache() {
    return this.mutationCache
  }

  setDefaultOptions<T>(queryKey: QueryKey<T>, options: DefaultQueryOptions) {
    const current = this.defaultOptions.get(queryKey) || {}
    this.defaultOptions.set(queryKey, { ...current, ...options })
  }

  getDefaultOptions<T>(queryKey: QueryKey<T>): DefaultQueryOptions {
    let options = this.defaultOptions.get(queryKey)
    if (!options) {
      const defaults = [...this.defaultOptions.keys()]
      options = defaults.reduce<DefaultQueryOptions>(
        (curr, key) => {
          if (isSubset(key, queryKey)) {
            curr = { ...curr, ...this.defaultOptions.get(key)! }
          }
          return curr
        },
        { idKey: 'id' } as any
      )
    }
    return options
  }

  /**
   * ensures that the query data is fetched and returns it with current changes to it
   */
  async ensureQueryData<TQueryKey, TQueryData extends TQueryKey | TQueryKey[] = TQueryKey>(options: QueryFetchOptions<TQueryKey, TQueryData>) {
    await this.fetchQuery(options)
    const collection = this.collectionCache.build({ queryKey: options.queryKey })
    return collection.visible.value.map(d => d.data) as T extends any[] ? T : T[]
  }

  async prefetchQuery<TQueryKey, TQueryData extends TQueryKey | TQueryKey[] = TQueryKey>(options: QueryFetchOptions<TQueryKey, TQueryData>) {
    return this.fetchQuery(options).catch(noop)
  }

  async fetchQuery<TQueryKey, TQueryData extends TQueryKey | TQueryKey[]>(options: QueryFetchOptions<TQueryKey, TQueryData>): Promise<void> {
    const _options = {
      ...options,
      queryHash: hashKey(options.queryKey)
    }
    // get the query, get the collection
    const query = this.queryCache.build(_options)
    const collection = this.collectionCache.build(_options)

    if (this.pendingQueries.has(_options.queryHash)) {
      return this.pendingQueries.get(_options.queryHash)!
    }

    /** we want to skip re-assignment if the query is not stale */
    if (!query.isStale.value) return

    const promise = query
      .fetch()
      .then(data => {
        if (!data) throw new Error('Query did not return any data')
        if (isArray(data)) {
          collection.setData(data)
        } else {
          console.warn('Received query data is not of array type. Fetch info: ', options)
          collection.setData([data as never])
        }
      })
      .finally(() => {
        this.pendingQueries.delete(_options.queryHash)
      })

    this.pendingQueries.set(_options.queryHash, promise)

    return promise
  }
}
