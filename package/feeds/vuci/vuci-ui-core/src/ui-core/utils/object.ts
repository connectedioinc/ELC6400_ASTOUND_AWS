import { isArray, isFunction, isObject, isPlainObject } from './inspect'

/**
 *
 * @param source - object from whose properties will be omitted
 * @param predicate - function that determines whether a property should be omitted. If it returs true - property will be omitted
 * @example ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 * const result = omit(obj, (key, value) => value % 2 === 0);
 * console.log(result); // { a: 1, c: 3 }
 *
 * const result2 = omit(obj, () => true)
 * console.log(result2); // {}
 *
 * ```
 */
export function omit<T extends Record<string, any>, TKey extends keyof T>(source: T, predicate: (key: TKey, value: T[TKey]) => boolean): Omit<T, any>
/**
 *
 * @param source - object from whose properties will be omitted
 * @param keys - array (or single string) of keys to omit from the source object
 */
export function omit<T extends Record<string, any>, TKey extends keyof T>(source: T, keys: TKey | TKey[]): Omit<T, TKey>
export function omit<T extends Record<string, any>, TKey extends keyof T>(source: T, keyOrPredicate: TKey[] | TKey | ((key: TKey, value: T[TKey]) => boolean)): Omit<T, TKey> {
  if (isFunction(keyOrPredicate)) {
    const entries = Object.entries(source).filter(([k, v]) => !keyOrPredicate(k as TKey, v))
    return Object.fromEntries(entries) as Omit<T, any>
  }

  const _keys = [keyOrPredicate].flat()
  const entries = Object.entries(source).filter(([k]) => !_keys.includes(k as TKey))
  return Object.fromEntries(entries) as Omit<T, TKey>
}

export function pick<T extends Record<string, any>, TKey extends keyof T>(source: T, keys: TKey[] | TKey | ((key: TKey, value: T[TKey]) => boolean)): Pick<T, TKey> {
  if (isFunction(keys)) {
    const entries = Object.entries(source).filter(([k, v]) => keys(k as TKey, v))
    return Object.fromEntries(entries) as Pick<T, TKey>
  }

  const _keys = [keys].flat()
  return Object.fromEntries(Object.entries(source).filter(([k]) => _keys.includes(k as TKey))) as Pick<T, TKey>
}

export function dereference<T>(obj: T): T {
  if (!isObject(obj)) return obj

  if (isArray(obj)) return obj.map(dereference) as T

  if (obj instanceof File) {
    return new File([obj], obj.name, obj) as T
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  if (isPlainObject(obj)) {
    const result: Partial<T> = {}
    for (const key in obj) {
      result[key] = dereference(obj[key])
    }
    return result as T
  }

  throw new Error(`Unsupported type: ${typeof obj}`)
}

export function isEqualObjects(a: Record<string, any>, b: Record<string, any>): boolean {
  if (a === b) return true
  if (!isObject(a) || !isObject(b)) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every(key => isEqualObjects(a[key], b[key]))
}

/**
 * returns true if **`a`** is a subset of **`b`**
 * @example
 * isSubset({ a: 1, b: 2 }, { a: 1, b: 2, c: 3 }) // true
 * isSubset({ a: 1, b: 2 }, { a: 1, b: 3 }) // false
 * isSubset([1,2], [1,2,3,4]) // true
 * isSubset([1,2, 6], [1,2,3,4]) // false
 */
export function isSubset(a: any, b: any): boolean {
  if (a === b) return true

  if (!isObject(a) || !isObject(b)) return false

  const keysSubset = Object.keys(a)
  const keysSuperset = Object.keys(b)

  if (keysSubset.length > keysSuperset.length) return false
  // @ts-expect-error

  return keysSubset.every(key => isSubset(a[key], b[key]))
}

/**
 * returns true if `a` is a superset of `b`
 * @example
 * isSuperset([1,2], [1,2,3,4]) // false - [1,2] is not a superset, but a subset of [1,2,3,4]
 * isSuperset([1,2,3,4], [1,2]) // true - [1,2,3,4] is a superset of [1,2]
 */
export function isSuperset(a: any, b: any): boolean {
  // just check if b is a subset of a
  return isSubset(b, a)
}
