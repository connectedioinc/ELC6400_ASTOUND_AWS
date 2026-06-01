import { isFunction } from './inspect'

export function timeout<T>(promise: Resolvable<Promise<T>>, timeoutMs: number) {
  const timeoutPromise = async () => {
    await delay(timeoutMs)
    throw new Error('Timeout')
  }
  return Promise.race([resolveValue(promise), timeoutPromise()])
}

export function delay(time: number): Promise<undefined> {
  return new Promise(resolve => setTimeout(resolve, time))
}

type RepeatOptions = {
  /** @description how many times the promise should be retried */
  times: number
  /** @description how much time should be waited before trying again to execute the promise */
  timeout: number
}

/**
 * @description repeats the promise function for provided amount of times or until it resolves. If promise did not resolve in such amount of times, last returned error is thrown.
 */
export async function repeat<T>(promise: () => Promise<T>, options: Partial<RepeatOptions> = {}): Promise<T> {
  const { times = 1, timeout = 0 } = options
  if (times < 1) throw new Error('Repeat times cannot be a less than 1!')
  let retries = 0
  let error = null
  while (retries < times) {
    try {
      const resolved = await resolveValue(promise)
      return resolved
    } catch (e) {
      retries++
      error = e
      if (timeout && retries < times) await delay(timeout)
    }
  }
  throw error
}

type Resolvable<T> = T | (() => T)

function resolveValue<T>(resolvable: Resolvable<T>) {
  return isFunction(resolvable) ? resolvable() : resolvable
}

type AsyncFunction<T extends any[]> = (...args: T) => Promise<any>

/**
 * wrapper function that removes double same promise execution.
 * If promise is already running, it won't be ran twice.
 */
export function dedupe<T extends AsyncFunction<any>>(callback: T): T {
  const argsMap = new Map<string, ReturnType<T>>()
  function execute(...args: Parameters<T>): ReturnType<T> {
    const cacheKey = JSON.stringify(args)
    // check if promise function was called with such arguments already
    if (argsMap.has(cacheKey)) return argsMap.get(cacheKey)!

    // if it was not yet called with such arguments, call the async function
    const promise = callback(...args) as ReturnType<T>

    argsMap.set(cacheKey, promise)

    promise.finally(() => {
      argsMap.delete(cacheKey)
    })
    return promise
  }
  return execute as unknown as T
}
