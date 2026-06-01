import { Memento, useMementos } from '@ui-core/composables/useMementos'
import { computed, readonly, ref, shallowRef, type ComputedRef, type Ref } from 'vue'
import { getId, resolveUpdater, type Updater } from './core-utils'
import { dereference } from './object'

export const STATE_CHANGED = 'changed'
export const STATE_REMOVED = 'removed'
export const STATE_NEW = 'new'
export const STATE_PRISTINE = 'pristine'

type EntryState = typeof STATE_CHANGED | typeof STATE_REMOVED | typeof STATE_NEW | typeof STATE_PRISTINE

export type Entry<T, TMeta = unknown> = {
  createdAt: number
  updatedAt: number
  id: EntryId
  data: T
  state: EntryState
  original: T
  meta?: TMeta
}
type EntryId = number

type EntryCreateOptions<T> = {
  id: EntryId
  data: T
  /**
   * @default Date.now()
   */
  createdAt?: number
  /**
   * @default 'pristine'
   */
  state: EntryState
}

export type MetaFactoryArgs<T> = Omit<Entry<T>, 'meta' | 'original'>

export type MetaFactoryFn<TEntry, Output> = (context: MetaFactoryArgs<TEntry>) => Output | undefined

function createEntry<T, TMeta = any>(options: EntryCreateOptions<T>, meta: MetaFactoryFn<T, TMeta>): Entry<T, TMeta> {
  const { id, data, createdAt = Date.now(), state = STATE_PRISTINE } = options
  const base: MetaFactoryArgs<T> = {
    id,
    data: dereference(data),
    state,
    createdAt,
    updatedAt: createdAt
  }
  return {
    ...base,
    original: data,
    meta: meta(base)
  }
}

export type Collection<T, TMeta = unknown> = {
  id: string
  // model: Readonly<Ref<EntryModel<T, TMeta>>>
  /**
   * all entries with **<CHANGED>** state
   */
  changed: ComputedRef<Entry<T, TMeta>[]>
  /**
   * all entries with **<REMOVED>** state
   */
  removed: ComputedRef<Entry<T, TMeta>[]>
  /**
   * all entries with **<NEW>** state
   */
  added: ComputedRef<Entry<T, TMeta>[]>
  /**
   * data that should be visible to the end-user
   * All entries with any of state: **<NEW>, <CHANGED>, <PRISTINE>**
   */
  visible: ComputedRef<Entry<T, TMeta>[]>
  push: (data: T, state?: EntryState) => Entry<T, TMeta>
  /**
   * updates entry
   * - will replace current `original` data with provided data
   * - state will be set to **<PRISTINE>**
   */
  update: (id: EntryId, updated: T) => boolean
  /**
   * updates entry softly -
   * - will update current `data`
   * - won't update originalData.
   * - state will be set to **<CHANGED>**
   */
  softUpdate: (id: EntryId, updated: T) => boolean
  /**
   * creates entry
   * - will push it to the current collection
   * - state will be set to **<PRISTINE>**
   */
  create: (newInstance: T) => Entry<T, TMeta>
  /**
   * creates entry softly
   * - will push it to the current collection
   * - entry's state will be set to <new>
   */
  softCreate: (newInstance: T) => Entry<T, TMeta>
  /**
   * removes entry. Entry will not be available anymore. Cannot be restored.
   */
  remove: (id: EntryId) => boolean
  /**
   * removes entry softly
   * - will set entry's state as <removed>
   * - won't be included in visible entries array
   * - can be restored with `restore()`
   */
  softRemove: (id: EntryId) => boolean
  /**
   * tries to reset entry state
   *
   * > if entry's state is **<NEW>**:
   * > - will do nothing
   *
   * > else
   * > - state will be set to **<PRISTINE>**
   * > - current `data` will be set to `original` data
   */
  restore: (id: EntryId) => boolean
  get: (id: EntryId) => Entry<T>
  setData: (updater: Updater<T[]>) => void
  /**
   * a function to update entry meta information. It receives current meta information and must return new meta data
   */
  setMeta: (id: EntryId, meta: Updater<TMeta | undefined, TMeta | undefined>) => void
  save: () => void
  /**
   * the last time any of the entries in the collection have been updated.
   */
  updatedAt: Readonly<Ref<number>>
  memento: Memento<any>
}

export function createCollection<T, TMeta = any>(metaFactory: MetaFactoryFn<T, TMeta> = () => undefined): Collection<T, TMeta> {
  const updatedAt = ref(0)

  const entries = shallowRef<Entry<T, TMeta>[]>([])
  const entriesById = shallowRef<Record<string, Entry<T, TMeta>>>({})

  const memento = useMementos<{ entries: Entry<T, TMeta>[]; lastUpdatedAt: number }>({
    restoreSnapshot(snapshot) {
      entries.value = snapshot.entries
      entriesById.value = Object.fromEntries(snapshot.entries.map(e => [e.id, e]))
      updatedAt.value = snapshot.lastUpdatedAt
    },
    takeSnapshot() {
      return {
        entries: dereference(entries.value) as Entry<T, TMeta>[],
        lastUpdatedAt: updatedAt.value
      }
    }
  })

  const only = (predicate: (e: Entry<T>) => boolean) => entries.value.filter(predicate as any)
  const changed = computed(() => only(e => e.state === STATE_CHANGED))
  const visible = computed(() => {
    return only(e => e.state !== STATE_REMOVED)
  })
  const added = computed(() => only(e => e.state === STATE_NEW))
  const removed = computed(() => only(e => e.state === STATE_REMOVED))

  let index = 0
  function getNextId(): EntryId {
    return index++
  }

  function pushBatch(data: T[], state: EntryState = STATE_PRISTINE) {
    const createdAt = Date.now()
    const newEntries = data.map(e => {
      return createEntry(
        {
          createdAt,
          data: e,
          id: getNextId(),
          state
        },
        metaFactory
      )
    })
    entries.value = [...entries.value, ...(newEntries as any[])]
    for (const entry of newEntries) {
      entriesById.value[entry.id] = entry
    }
  }

  function push(data: T, state: EntryState = STATE_PRISTINE) {
    const entry = createEntry(
      {
        data,
        state,
        id: getNextId()
      },
      metaFactory
    )
    entries.value = [...entries.value, entry as any]
    entriesById.value[entry.id] = entry
    return entry as Entry<T, TMeta>
  }

  function update(id: EntryId, newData: T) {
    const entry = entriesById.value[id]
    if (!entry || entry.state === STATE_NEW || entry.state === STATE_REMOVED) {
      console.error(`Could not update the entry with ID: ${id}`)
      return false
    }
    entry.original = { ...newData }
    entry.data = dereference(newData)
    updateState(entry, STATE_PRISTINE)
    triggerUpdate()
    return true
  }

  function softUpdate(id: EntryId, newData: T) {
    const entry = get(id)
    if (!entry || entry.state === STATE_REMOVED) {
      console.error(`Could not update the entry with ID: ${id}. It is either not found or has been removed softly.`)
      return false
    }
    entry.data = { ...newData }
    updateState(entry, entry.state === STATE_NEW ? STATE_NEW : STATE_CHANGED)
    triggerUpdate()
    return true
  }

  function softCreate(data: T) {
    return push(data, STATE_NEW)
  }

  function create(data: T) {
    return push(data, STATE_PRISTINE)
  }

  function softRemove(id: EntryId) {
    const entry = get(id)
    if (!entry || entry.state === STATE_REMOVED) {
      if (import.meta.env.DEV) console.error(`could not remove instance with id: ${id}. It either doesn't exist or has already been removed.`)
      return false
    }
    if (entry.state === STATE_NEW) {
      return remove(entry.id)
    }
    updateState(entry, STATE_REMOVED)
    triggerUpdate()
    return true
  }

  function remove(id: EntryId) {
    // already not existant
    if (!get(id)) return false
    entries.value = entries.value.filter(e => e.id !== id)
    delete entriesById.value[id]
    entriesById.value = { ...entriesById.value }
    return true
  }

  function restore(id: EntryId) {
    const entry = get(id)
    if (!entry || entry.state === STATE_NEW || entry.state === STATE_PRISTINE) return false
    entry.data = dereference(entry.original)
    updateState(entry, STATE_PRISTINE)
    triggerUpdate()
    return true
  }

  function save() {
    const result: Entry<T, TMeta>[] = []
    const byId: Record<EntryId, Entry<T, TMeta>> = {}
    const add = (entry: Entry<T, TMeta>) => {
      result.push(entry)
      byId[entry.id] = entry
    }
    for (const entry of visible.value) {
      if (entry.state !== STATE_PRISTINE) {
        entry.original = dereference(entry.data)
        updateState(entry, STATE_PRISTINE)
      }
      add(entry)
    }
    entries.value = result
    entriesById.value = byId
  }

  function setData(updater: Updater<T[]>) {
    const currentData = only(e => e.state !== STATE_NEW).map(d => d.data)
    const data = resolveUpdater(updater, currentData as T[])
    cleanup()
    pushBatch(data)
  }

  function setMeta(id: EntryId, meta: Updater<TMeta | undefined, TMeta | undefined>) {
    const entry = get(id)
    const nextMeta = resolveUpdater(meta, entry.meta)
    entry.meta = nextMeta
  }

  function cleanup() {
    entries.value = []
    entriesById.value = {}
  }

  function updateState(entry: Entry<T>, state: EntryState) {
    entry.state = state
    entry.updatedAt = Date.now()
    updatedAt.value = Date.now()
  }

  /**
   * triggers an update by re-assigning shallow refs.
   * Can be used on methods that do not re-assign entries but just updates some property.
   */
  function triggerUpdate() {
    entries.value = [...entries.value]
    entriesById.value = { ...entriesById.value }
  }

  function get(id: EntryId) {
    return entriesById.value[id]
  }

  return {
    id: getId(),
    added,
    visible,
    changed,
    removed,
    restore,
    save,
    get,
    create,
    softCreate,
    update,
    softUpdate,
    remove,
    softRemove,
    setData,
    setMeta,
    push,
    updatedAt: readonly(updatedAt),
    memento
  }
}

export function memo<TDeps extends readonly any[], TResult>(getDeps: () => [...TDeps], fn: (...args: NoInfer<[...TDeps]>) => TResult): () => TResult {
  let result: TResult | undefined
  let deps: any[] = []
  return () => {
    const newDeps = getDeps()
    const depsChanged = newDeps.length !== deps.length || newDeps.some((d, i) => d !== deps[i])
    if (!depsChanged) return result!
    deps = newDeps
    result = fn(...newDeps)
    return result!
  }
}
