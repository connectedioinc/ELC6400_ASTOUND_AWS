/**
 * @template {HTMLElement} T
 * @typedef ObserverEntry
 * @prop {T} target
 * @prop {ResizeObserverEntry['borderBoxSize']} borderBoxSize
 * @prop {ResizeObserverEntry['contentBoxSize']} contentBoxSize
 * @prop {ResizeObserverEntry['contentRect']} contentRect
 * @prop {ResizeObserverEntry['devicePixelContentBoxSize']} devicePixelContentBoxSize
 */

import { isElement } from '@ui-core/utils/dom'

/**
 * @callback ResizeObserverCallback
 * @param {ObserverEntry<unknown>} entry
 * @returns {void}
 */

function createResizeObserver() {
  /**
   * @type {Map<HTMLElement, ((entry: ObserverEntry<any>) => void)[]>}
   */
  const observables = new Map()
  const observer = new ResizeObserver(entries => {
    entries.forEach(entry => {
      const callbacks = observables.get(entry.target)
      if (!callbacks.length) return import.meta.env.DEV && console.warn('[resizeObserver]: Missing callback for:', entry.target)
      callbacks.forEach(c => c(entry))
    })
  })
  const removeObserver = element => {
    observables.delete(element)
    if (!isElement(element)) return
    observer.unobserve(element)
  }
  /**
   * @template {HTMLElement} T
   * @param {T} element
   * @param {(entry: ObserverEntry<T>) => void} callback
   */
  function observe(element, callback) {
    if (observables.has(element)) {
      const callbacks = observables.get(element)
      if (callbacks.includes(callback)) return // callback has already been added
      callbacks.push(callback)
    } else {
      observer.observe(element)
      observables.set(element, [callback])
    }
    return () => unobserve(element, callback)
  }
  /**
   * @template {HTMLElement} T
   * @param {T} [element]
   */
  function unobserve(element, callback) {
    if (!element) {
      const observedElements = Array.from(observables.keys())
      return observedElements.forEach(el => !el.isConnected && observables.delete(el) && observer.unobserve(el))
    }
    if (observables.has(element)) {
      const callbacks = observables.get(element)
      observables.set(
        element,
        callbacks.filter(cb => cb !== callback)
      )
    }
    if (!observables.get(element)?.length || !callback) removeObserver(element)
  }
  return {
    observe,
    unobserve,
    printObservers: () => console.log(observables)
  }
}

export const observer = createResizeObserver()

export default {
  install(app) {
    app.config.globalProperties.$resizeObserver = observer
  }
}
