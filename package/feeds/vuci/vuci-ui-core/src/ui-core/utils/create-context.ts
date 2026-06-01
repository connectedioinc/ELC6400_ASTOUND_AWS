import { getCurrentInstance, inject, provide, type InjectionKey } from 'vue'

export function createContext<T>(description: string) {
  const contextId = Symbol(description) as InjectionKey<T>

  const provider = <U extends T = T>(value: U) => provide(contextId as InjectionKey<U>, value)
  function injector<U extends T = T>(fallback?: U, treatDefaultAsFactory?: false | undefined): U
  function injector<U extends T = T>(fallback: () => U, treatDefaultAsFactory: true): U
  function injector<U extends T = T>(fallback?: U | (() => U), treatDefaultAsFactory = false): U {
    const result = inject(contextId, fallback!, treatDefaultAsFactory as any) as U
    if (!result && import.meta.env.DEV && import.meta.env.MODE !== 'test') {
      const instance = getCurrentInstance()
      console.warn(`Could not inject "${description}" context in <${instance?.type.__name} />.`)
    }
    return result
  }
  return [provider, injector, contextId] as const
}
