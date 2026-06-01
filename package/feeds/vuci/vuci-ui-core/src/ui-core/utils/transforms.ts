import { isBoolean, isObject } from './inspect'
import { omit } from './object'
/**
 * this file contains base utility functions for transforming data for the VUCI UI Core.
 */

type Dict = Record<string, any>

const fieldMetaRE = /^\w+:(\w+)$/

export const removeMetaFields = <T extends Dict>(source: T) => omit(source, key => fieldMetaRE.test(key as string))

/**
 * set fields rules:
 * - if received from the server: "x:set": "1"
 * - front-end mocks the value: "x": "********"
 *
 * when saving to the back-end:
 * - if value in the front-end is touched/changed, e.g, "x": ""
 *   - send the value to the back-end
 * - if the value is untouched - don't send the value to the back-end
 */

export const booleanToString = (value: boolean) => (value ? '1' : '0')

/**
 * transforms boolean values to strings
 * - `true` => `'1'`
 * - `false` => `'0'`
 */
export const transformBooleansToStrings = <T extends Dict>(source: T) => {
  return Object.entries(source).reduce((acc, [key, value]) => {
    if (isBoolean(value)) {
      acc[key] = booleanToString(value)
    } else {
      acc[key] = value
    }
    return acc
  }, {} as Dict)
}

export const stringToBoolean = (value: string) => value === '1'

/**
 * transforms string values ('1' and '0') to booleans
 * - `'1'` => true
 * - `'0'` => false
 * @example
 * transformStringsToBooleans({ x: '1', y: '0', z: '2' })
 * // { x: true, y: false, z: '2' }
 */
export const transformStringsToBooleans = <T extends Dict>(source: T) => {
  return Object.entries(source).reduce((acc, [key, value]) => {
    if (isObject(value)) {
      acc[key] = transformStringsToBooleans(value)
    } else if (value === '1' || value === '0') {
      acc[key] = stringToBoolean(value)
    } else {
      acc[key] = value
    }
    return acc
  }, {} as Dict)
}
