import { isUndefined } from '@ui-core/utils/inspect'
import type { QueryKey } from './types'
import { computed, ref, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import { Subscribable } from './subscribable'
import type { QueryCache } from './query-cache'

export type QueryConfig<T, TData extends T | T[]> = {
  queryHash: string
  queryKey: QueryKey<T>
  queryFn: () => Promise<TData>
  queryCache: QueryCache
}

type QueryState = 'pending' | 'success' | 'error'
type FetchState = 'idle' | 'pending'

export class Query<TQueryKey = unknown, TQueryReturn extends TQueryKey | TQueryKey[] = TQueryKey> extends Subscribable<any> {
  queryHash: string
  queryKey: QueryKey<TQueryKey>
  data: ShallowRef<TQueryReturn | undefined>
  queryFn: () => Promise<TQueryReturn>
  state: Ref<QueryState>
  fetchState: Ref<FetchState>
  isFetching: ComputedRef<boolean>
  /**
   * whether the query is loading the data for the first time.
   * - `fetchState` is `"pending"`
   * - `state` is `"pending"`
   */
  isLoading: ComputedRef<boolean>
  isPending: ComputedRef<boolean>
  isSuccess: ComputedRef<boolean>
  /**
   * true when `state` is `"error"`
   */
  isError: ComputedRef<boolean>
  isStale: Ref<boolean>
  /**
   * flag indicating whether the query has observers.
   * Observer-less queries are not taken into account of accumulated `isFetching` or `isLoading` and  etc. client states.
   */
  active: Ref<boolean>
  private queryCache: QueryCache
  private runningPromise: Promise<TQueryReturn> | null = null
  constructor(config: QueryConfig<TQueryKey, TQueryReturn>) {
    super()
    this.queryFn = config.queryFn
    this.queryHash = config.queryHash
    this.queryKey = config.queryKey
    this.data = shallowRef(undefined)
    this.state = ref('pending')
    this.fetchState = ref('idle')
    this.isStale = ref(true)
    this.active = ref(false)
    this.queryCache = config.queryCache
    this.isFetching = computed(() => this.fetchState.value === 'pending')
    this.isPending = computed(() => this.state.value === 'pending')
    this.isSuccess = computed(() => this.state.value === 'success')
    this.isError = computed(() => this.state.value === 'error')
    this.isLoading = computed(() => this.isFetching.value && this.isPending.value)
  }
  // TODO could have events/hooks that would be triggered on fetch state changes like:
  // `onError`, `onSuccess`, `onFetch`

  async fetch(): Promise<TQueryReturn> {
    if (!this.isStale.value && !isUndefined(this.data.value)) {
      return this.data.value
    }
    if (this.runningPromise) return this.runningPromise

    this.fetchState.value = 'pending'

    this.runningPromise = this.queryFn()
      .then(data => {
        this.data.value = data
        this.state.value = 'success'
        this.isStale.value = false
        return data
      })
      .catch(error => {
        this.state.value = 'error'
        throw error
      })
      .finally(() => {
        this.fetchState.value = 'idle'
      })

    return this.runningPromise
  }
  invalidate() {
    this.isStale.value = true
  }
  refetch() {
    this.invalidate()
    this.fetch()
  }
  setData(data: TQueryReturn) {
    this.data.value = data
    this.state.value = 'success'
    this.isStale.value = false
  }
  protected onSubscribe(): void {
    if (this.listeners.size === 1) {
      this.active.value = true
    }
  }
  protected onUnsubscribe(): void {
    if (this.listeners.size === 0) {
      this.active.value = false
      // should query be destroyed?
      // this.queryCache.delete(this)
    }
  }
  destroy() {
    if (this.listeners.size === 0) this.queryCache.delete(this)
  }
}
