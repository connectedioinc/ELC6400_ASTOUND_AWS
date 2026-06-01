import type { BuildQueryOptions } from './query-cache'

export type QueryConstraint<T> = T & {}

export type QueryKey<T = any> = any[] | QueryConstraint<T>

export type QueryFetchOptions<TQueryKey, TQueryData extends TQueryKey | TQueryKey[] = TQueryKey> = Omit<BuildQueryOptions<TQueryKey, TQueryData>, 'queryHash'>
