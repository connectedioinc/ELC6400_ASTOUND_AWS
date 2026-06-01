import type { ComputedRef, ShallowRef } from 'vue'
import { computed, shallowRef, triggerRef } from 'vue'
import { Query } from './query'
import type { QueryKey } from './types'
import { hashKey } from './utils'

export type BuildQueryOptions<T = unknown, TData = T> = {
  queryKey: QueryKey<T>
  queryHash?: string
  queryFn: () => Promise<TData>
}

export class QueryCache {
  all: ComputedRef<Query<unknown>[]>
  private queries: ShallowRef<Map<string, Query<any>>>
  private client: any
  constructor() {
    this.queries = shallowRef(new Map<string, Query>())
    this.all = computed(() => [...this.queries.value.values()])
  }

  build<TQueryKey, TData extends TQueryKey | TQueryKey[]>(options: BuildQueryOptions<TQueryKey, TData>): Query<TQueryKey, TData> {
    const queryHash = options.queryHash || hashKey(options.queryKey)
    let query = this.get<TQueryKey, TData>(queryHash)
    if (!query) {
      query = new Query({
        queryKey: options.queryKey,
        queryHash: queryHash,
        queryFn: options.queryFn,
        queryCache: this
      })
      this.set(query)
    }
    return query
  }

  get<TQueryKey, TQueryReturn extends TQueryKey | TQueryKey[]>(hash: string) {
    return this.queries.value.get(hash) as Query<TQueryKey, TQueryReturn> | undefined
  }

  set(query: Query) {
    if (!this.queries.value.has(query.queryHash)) {
      this.queries.value.set(query.queryHash, query)
      triggerRef(this.queries)
    }
  }
  delete(query: Query) {
    if (this.queries.value.has(query.queryHash)) {
      this.queries.value.delete(query.queryHash)
      triggerRef(this.queries)
    }
  }
}
