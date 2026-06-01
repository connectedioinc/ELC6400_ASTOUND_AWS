import { computed, onScopeDispose } from 'vue'
import type { Client } from './query/client'
import type { QueryKey } from './query/types'
import { useClient } from './use-client'
import { checkIfInScope } from './utils'
import type { ConfigEntry } from './query/collection-cache'

type UseQueryOptions<TQueryKey, TQueryData extends TQueryKey | TQueryKey[]> = {
  queryKey: QueryKey<TQueryKey>
  queryFn: () => Promise<TQueryData>
  filter?: (data: TQueryKey) => boolean
  /**
   * @deprecated marked as deprecated only to inform, that it's not yet implemented
   * @description If set, stores additional information on the query cache entry that can be used as needed.
   */
  meta?: Record<string, any>
  /**
   * should this query immediately fetch data on execution
   * @default false
   */
  immediate?: boolean
}

export function useConfigQuery<TQueryKey, TQueryData extends TQueryKey | TQueryKey[]>(options: UseQueryOptions<TQueryKey, TQueryData>, client?: Client) {
  checkIfInScope('useConfigQuery')

  client = client || useClient()
  const query = client.getQueryCache().build(options)
  const collection = client.getCollectionCache().build({
    queryHash: query.queryHash,
    queryKey: options.queryKey
  })

  const unsubscribe = query.subscribe(() => {})

  onScopeDispose(() => {
    unsubscribe()
  })

  const data = computed<ConfigEntry<TQueryKey>[]>(() => {
    if (!options.filter) {
      return collection.visible.value
    }
    return collection.visible.value.filter(e => options.filter!(e.original))
  })

  const fetch = async () => {
    if (!query.isStale.value) return data.value
    // dedupes requests inside, sets collection data inside too.
    await client.fetchQuery(options)
    return data.value
  }

  if (options.immediate) {
    Promise.resolve().then(fetch)
  }

  return {
    isFetching: query.isFetching,
    isStale: query.isStale,
    isPending: query.isPending,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isFirstLoad: query.isLoading,
    invalidate: query.invalidate,
    refetch: query.refetch,
    data,
    fetch
  }
}
