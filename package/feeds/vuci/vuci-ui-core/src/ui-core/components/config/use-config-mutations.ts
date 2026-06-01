import { computed } from 'vue'
import type { Client } from './query/client'
import type { ConfigEntry } from './query/collection-cache'
import type { QueryKey } from './query/types'
import { useMutation } from './use-mutation'
import { useClient } from './use-client'

export type UseConfigMutationProps<T> = {
  queryKey: QueryKey<T>
  /**
   * primary key that is used to identify instances
   */
  idKey?: keyof T

  /**
   * base url of the mutation operations. Needs to be provided when file uploading is needed.
   */
  baseUrl?: string

  /**
   * callback that will be invoked before the X mutation is executed
   */
  onUpdate?: (data: T[]) => Promise<void> | void
  /*
   * callback to mutate the data itself (usually an async operation, like posting the data)
   */
  update: (data: T[]) => Promise<T[]>
  /**
   * callback that will be invoked on successful mutation
   */
  onUpdateSuccess?: () => void
  /**
   * a callback that will be invoked when an error occurs during the mutate callback
   */
  onUpdateError?: (error: any) => Promise<void> | void
  /**
   * a callback that will always be invoked, no matter if the mutation was successful or not
   */
  onUpdateSettled?: () => Promise<void> | void

  /**
   * callback that will be invoked before the X mutation is executed
   */
  onRemove?: (entry: ConfigEntry<T>) => Promise<void> | void
  /*
   * callback to mutate the data itself (usually an async operation, like posting the data)
   */
  remove: (id: string | number) => Promise<boolean>
  /**
   * callback that will be invoked on successful mutation
   */
  onRemoveSuccess?: (response: boolean, entry: ConfigEntry<T>) => void
  /**
   * a callback that will be invoked when an error occurs during the mutate callback
   */
  onRemoveError?: (error: any, entry: ConfigEntry<T>) => Promise<void> | void
  /**
   * a callback that will always be invoked, no matter if the mutation was successful or not
   */
  onRemoveSettled?: () => Promise<void> | void

  /**
   * callback that will be invoked before the X mutation is executed
   */
  onCreate?: (data: T) => Promise<any> | any
  /*
   * callback to mutate the data itself (usually an async operation, like posting the data)
   */
  create: (data: T) => Promise<T>
  /**
   * callback that will be invoked on successful mutation
   */
  onCreateError?: (error: any, data: T) => Promise<void> | void
  /**
   * a callback that will be invoked when an error occurs during the mutate callback
   */
  onCreateSuccess?: (result: T, args: T, entry: ConfigEntry<T>) => Promise<void> | void
  /**
   * a callback that will always be invoked, no matter if the mutation was successful or not
   */
  onCreateSettled?: () => Promise<void> | void
}

const setEntryLoading = (entry: ConfigEntry<any>, loading: boolean) => {
  entry.meta = { ...entry.meta, loading }
}

export function useConfigMutations<T>(props: UseConfigMutationProps<T>, client?: Client) {
  client ??= useClient()
  let { idKey, baseUrl } = props

  if (!idKey || !baseUrl) {
    const defaults = client.getDefaultOptions(props.queryKey)
    baseUrl ??= defaults.baseUrl
    idKey ??= defaults.idKey as keyof T
  }

  const collection = client.getCollectionCache().build({ queryKey: props.queryKey })

  const { mutateAsync: removeMutation, isMutating: isRemoving } = useMutation(
    {
      onMutate: (entry: ConfigEntry<T>) => {
        setEntryLoading(entry, true)
        props.onRemove?.(entry)
      },
      mutation: async (entry: ConfigEntry<T>) => {
        const key = entry.data[props.idKey as keyof T] as string
        return await props.remove(key)
      },
      onError: (error, entry) => {
        setEntryLoading(entry, false)
        props.onRemoveError?.(error, entry)
      },
      onSuccess: (res, entry) => {
        collection.remove(entry.id)
        props.onRemoveSuccess?.(res, entry)
      },
      onSettled: props.onRemoveSettled
    },
    client
  )

  const { mutateAsync: createMutation, isMutating: isCreating } = useMutation(
    {
      onMutate: (state: T) => {
        const entry = collection.create(state)
        setEntryLoading(entry, true)
        props.onCreate?.(state)
        return entry
      },
      mutation: props.create,
      onError: (error, args, entry) => {
        if (entry) collection.remove(entry.id)
        props.onCreateError?.(error, args)
      },
      onSuccess: async (result, args, entry) => {
        if (entry) {
          collection.update(entry.id, result)
          props.onCreateSuccess?.(result, args, entry)
          setEntryLoading(entry, false)
        }
      },
      onSettled: props.onCreateSettled
    },
    client
  )

  const { mutateAsync: updateMutation, isMutating: isUpdating } = useMutation(
    {
      mutation: (entries: [entryId: number, updatedEntry: T][]) => {
        return props.update(entries.map(e => e[1]))
      },
      onSuccess: (response, entries) => {
        response.forEach((updated, index) => {
          const entryId = entries[index][0]
          collection.update(entryId, updated)
        })
        props.onUpdateSuccess?.()
      },
      onError: props.onUpdateError,
      onSettled: props.onUpdateSettled
    },
    client
  )

  const isMutating = computed(() => isUpdating.value || isRemoving.value || isCreating.value)

  return {
    idKey,
    baseUrl,
    isMutating,
    isRemoving,
    isCreating,
    isUpdating,
    createMutation,
    updateMutation,
    removeMutation
  }
}
