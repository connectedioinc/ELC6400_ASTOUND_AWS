import { isPlainObject } from '@ui-core/utils/inspect'
import type { QueryKey } from './types'

export function hashKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val
  )
}

export const createQueryKey = <T>(value: any[]): QueryKey<T> => {
  return value as QueryKey<T>
}
