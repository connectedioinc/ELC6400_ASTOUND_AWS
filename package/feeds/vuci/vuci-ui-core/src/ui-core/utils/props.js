import { isArray, isObject } from './inspect'

/**
 * @typedef {(value: unknown) => boolean|string[]|number[]} PropValidator
 */

/**
 * @template T
 * @param {T} type - the allowed type or types of the prop.
 * @param {any} [value] - default value of prop
 * @param {boolean|PropValidator} requiredOrValidator
 * @param {PropValidator} validator
 * @returns {import('vue').PropOptions<T>}
 */
export const makeProp = (type, value = undefined, requiredOrValidator = undefined, validator = undefined) => {
  const required = requiredOrValidator === true
  validator = required ? validator : requiredOrValidator
  if (isArray(validator)) validator = validatorWrapper(validator)
  return {
    type,
    default: isObject(value) ? () => value : value,
    ...(required ? { required } : {}),
    ...(validator ? { validator } : {})
  }
}

/**
 *
 * @param {any[]} allowedValues allowed prop values
 * @param {string} propName property name
 * @returns {(value: unknown) =>}
 */
function validatorWrapper(allowedValues) {
  return v => {
    const res = allowedValues.includes(v)
    if (!res) console.warn(`Received ${v}, but only <${allowedValues.join(' | ')}> are allowed`)
    return res
  }
}

/**
 * @template {Record<string, typeof makeProp extends (...args: infer R) => any ? R : never} T
 * @param {T} propsObject
 * @returns {{[P in keyof T]: import('vue').PropOptions<T[P][0]>}}
 */
export const makeProps = propsObject => {
  return Object.entries(propsObject).reduce((res, [k, v]) => {
    res[k] = makeProp(...v)
    return res
  }, {})
}

export const noop = () => {}
