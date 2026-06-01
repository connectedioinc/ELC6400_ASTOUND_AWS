import { createCollection } from '@ui-core/utils/collection'
import type { Collection, Entry, MetaFactoryArgs } from '@ui-core/utils/collection'
import { hashKey } from './utils'
import type { QueryKey } from './types'

export type ConfigEntryMeta = {
  loading: boolean
}

export type ConfigEntry<T = unknown, Meta extends Record<string, any> = {}> = Entry<T, ConfigEntryMeta & Meta>

export type ConfigCollection<T = unknown, Meta extends Record<string, any> = {}> = Collection<T, ConfigEntryMeta & Meta>

type BuildCollectionOptions<T, TMeta extends Record<string, any>> = {
  queryKey: QueryKey<T>
  queryHash?: string
  metaFactory?: (args: MetaFactoryArgs<T>) => TMeta
}

export class CollectionCache {
  private collections: Map<string, ConfigCollection>
  private client: any
  constructor() {
    this.collections = new Map<string, ConfigCollection>()
  }

  build<TData, TMeta extends Record<string, any>>(options: BuildCollectionOptions<TData, TMeta>) {
    const queryHash = options.queryHash ?? hashKey(options.queryKey)
    const _metaFactory = options.metaFactory ?? (() => ({}))
    let collection = this.get<TData, TMeta>(queryHash)
    if (!collection) {
      const mergedFactory = (ctx: MetaFactoryArgs<TData>) => ({
        ..._metaFactory(ctx),
        loading: false
      })
      collection = createCollection(mergedFactory) as any
      this.set(queryHash, collection!)
    }
    return collection!
  }

  get<TData, TMeta extends Record<string, any>>(hash: string) {
    return this.collections.get(hash) as ConfigCollection<TData, ConfigEntryMeta & TMeta> | undefined
  }

  set(hash: string, collection: ConfigCollection<any, any>) {
    if (!this.collections.has(hash)) {
      this.collections.set(hash, collection)
    }
  }

  getAll() {
    return [...this.collections.values()]
  }
}
