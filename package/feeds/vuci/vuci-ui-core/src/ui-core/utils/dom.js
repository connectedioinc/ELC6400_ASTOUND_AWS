import { isFunction, isString } from './inspect'

// https://stackoverflow.com/questions/35939886/find-first-scrollable-parent
export const getScrollParent = node => {
  const regex = /(auto|scroll)/
  const parents = (_node, ps) => {
    if (_node.parentNode === null) {
      return ps
    }
    return parents(_node.parentNode, ps.concat([_node]))
  }

  const style = (_node, prop) => getComputedStyle(_node, null).getPropertyValue(prop)
  const overflow = _node => style(_node, 'overflow') + style(_node, 'overflow-y') + style(_node, 'overflow-x')
  const scroll = _node => regex.test(overflow(_node))

  const scrollParent = _node => {
    if (!(_node instanceof HTMLElement || _node instanceof SVGElement)) {
      return null
    }
    const ps = parents(_node.parentNode, [])
    for (let i = 0; i < ps.length; i += 1) {
      if (scroll(ps[i])) {
        return ps[i]
      }
    }
  }
  return scrollParent(node)
}

/**
 * Adds event listener to specified element and returns a callback to remove the added listener.
 * @template {HTMLElementEventMap} T
 * @template {keyof T} K
 * @template {Element} E
 * @param {E} element - element on which events will be listened to.
 * @param {K} event - event name.
 * @param {(this: E, ev:T[K]) => any} callback - callback to be invoked
 * @param {boolean | AddEventListenerOptions} options
 * @returns {() => void} a callback to remove added listener.
 */
export function addListener(element, event, callback, options = false) {
  element.addEventListener(event, callback, options)
  return () => element.removeEventListener(event, callback, options)
}

/**
 * Select element by given selector (should be ID of element)
 * @param {string} selector
 * @return {HTMLElement}
 */
export function selectElement(selector) {
  const elements = selector.startsWith('#') ? [document.getElementById(selector.slice(1))] : document.querySelectorAll(selector)
  if (elements.length > 1) throw new Error('[dom]: provided target query: ' + selector + '\npoints to more than one DOM element!', { cause: elements })
  return elements[0]
}

/**
 * @param {any} el
 * @returns el is Element
 */
export function isElement(el) {
  return !!el && el.nodeType === Node.ELEMENT_NODE
}

/**
 * @returns {HTMLElement | null}
 */
export function getTarget(target) {
  if (isString(target)) {
    target = selectElement(target)
  } else if (isFunction(target)) {
    target = target()
  } else if (target) {
    target = target.$el || target
  }
  return isElement(target) ? target : null
}
