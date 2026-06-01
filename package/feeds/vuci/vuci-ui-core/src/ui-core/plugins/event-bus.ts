import { onScopeDispose, type App } from 'vue'

export function createEventBus<T extends Record<string, any> = any>() {
  const events = {} as Record<keyof T, Set<any>>
  /**
   * Removes event listener for provided eventName
   */
  function off<U extends keyof T>(eventName: U | string, callback: (...args: T[U]) => void) {
    if (!(eventName in events)) return
    if (events[eventName]) events[eventName].delete(callback)
    if (events[eventName].size === 0) delete events[eventName]
  }

  return {
    /**
     * Adds a listener for eventName event.
     * @returns a callback to remove the listener
     */
    on<U extends keyof T>(eventName: U | string, callback: (...args: T[U]) => void) {
      if (!(eventName in events)) events[eventName] = new Set()
      events[eventName].add(callback)
      return () => off(eventName, callback)
    },
    /**
     * Adds a listener for eventName event that will be called only once and the it will be removed.
     * @returns a callback to remove the listener
     */
    once<U extends keyof T>(eventName: U | string, callback: (...args: T[U]) => void) {
      if (!(eventName in events)) events[eventName] = new Set()
      const selfDelete = (...args: T[U]) => {
        callback(...args)
        this.off(eventName, selfDelete)
      }
      events[eventName].add(selfDelete)
    },
    /**
     * Removes event listener for provided eventName
     */
    off,
    /**
     * Emits an event for given eventName
     */
    emit<U extends keyof T>(eventName: U | string, ...args: any[]) {
      if (!(eventName in events)) return
      events[eventName].forEach(fn => fn(...args))
    }
  }
}

export interface GlobalEvents {}

export const $bus = createEventBus<GlobalEvents>()

/**
 * reactive version of event bus that automatically removes listeners when the component is destroyed
 */
export const useGlobalEventBus = (): typeof $bus => {
  const removeCallbacks: (() => void)[] = []
  const onOverride = (...args: Parameters<typeof $bus.on>): ReturnType<typeof $bus.on> => {
    const removeCb = $bus.on(...args)
    removeCallbacks.push(removeCb)
    return removeCb
  }
  onScopeDispose(() => {
    removeCallbacks.forEach(cb => cb())
  })
  return {
    ...$bus,
    on: onOverride
  }
}

export default {
  install(app: App) {
    app.config.globalProperties.$bus = $bus
  }
}
