import { watchEffect, type WatchEffectOptions } from 'vue'
import { useRoute, type LocationQuery } from 'vue-router'

export interface QueryWatcherOptions extends WatchEffectOptions {
  key?: string
  keys?: string[]
}

export function useRouteQueryWatcher(effect: (query: LocationQuery) => void | Promise<void>, options: QueryWatcherOptions = {}) {
  const route = useRoute()

  let prevQuery: LocationQuery = {}
  const watchHandler = watchEffect(() => {
    if (options.key && route.query[options.key] === prevQuery[options.key]) return
    if (options.keys && options.keys.every(key => route.query[key] === prevQuery[key])) return

    prevQuery = { ...route.query }
    return effect(route.query)
  }, options)

  return {
    watcher: watchHandler,
    query: route.query
  }
}
