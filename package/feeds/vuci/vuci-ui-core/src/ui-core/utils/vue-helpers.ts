import { Fragment, toRaw, type VNode } from 'vue'
import { isFunction, isObject } from './inspect'

export function renderSlotFragments(children?: VNode[]): VNode[] {
  if (!children) return []
  return children.flatMap(child => {
    if (child.type === Fragment) return renderSlotFragments(child.children as VNode[])

    return [child]
  })
}

const supportsStructured = 'structuredClone' in window && isFunction(window.structuredClone)

/**
 * Copies the given object and returns it.
 * @param primitivesOnly - true, if object contains only primitive values, since classes/functions cannot be stringified this needs to be set to false if function references needs to be copied as well.
 */
export function copy<T>(object: T, primitivesOnly = true): T {
  if (!isObject(object)) return object
  return !primitivesOnly && supportsStructured ? structuredClone(toRaw(object)) : JSON.parse(JSON.stringify(object))
}

export function debounce<T extends (...args: any[]) => void>(cb: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => cb(...args), delay)
  }
}

export function isEqualObjects(aObj: Record<any, any>, bObj: Record<any, any>): boolean {
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every(k => (isObject(aObj[k]) && isObject(bObj[k]) ? isEqualObjects(aObj[k], bObj[k]) : aObj[k] === bObj[k]))
}
