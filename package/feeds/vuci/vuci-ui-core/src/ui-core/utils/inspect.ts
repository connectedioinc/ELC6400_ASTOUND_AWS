export const toType = (value: unknown) => typeof value

type AnyFunction = (...args: any[]) => any

export const isFunction = (value: unknown): value is AnyFunction => toType(value) === 'function'

export const isArray = (value: unknown): value is any[] => Array.isArray(value)

export const isObject = (value: unknown): value is object => !!value && toType(value) === 'object'

/**
 * @decription Returns true only when value is actually object. Meaning it will return false if array or some sort of class is given for evalutation
 */
export const isPlainObject = (value: unknown): value is object => Object.prototype.toString.call(value) === '[object Object]'

export const isUndefined = (value: unknown): value is undefined => toType(value) === 'undefined'

export const isNull = (value: unknown): value is null => value === null

export const isBoolean = (value: unknown): value is boolean => toType(value) === 'boolean'

export const isString = (value: unknown): value is string => toType(value) === 'string'

export const isNumber = (value: unknown): value is number => toType(value) === 'number'

export const isPrimitive = (value: unknown): value is string | boolean | number => isString(value) || isBoolean(value) || isNumber(value)

export const isEmpty = (value: unknown): value is null | undefined | [] | '' => value === null || value === undefined || ((isArray(value) || isString(value)) && value.length === 0)

export const isPromise = (value: unknown): value is Promise<unknown> => value instanceof Promise

export const isNullish = (value: unknown): value is null | undefined => value === null || value === undefined

export const isNonNullable = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined
