import { i18n } from '@ui-core/plugins/i18n'
import { session } from '@ui-core/plugins/session'
import { axios } from '@ui-core/plugins/axios'
import { usePrompt, useMessages } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { isFunction, isNumber } from '@ui-core/utils/inspect'
import { delay, timeout } from '@ui-core/utils/promises'

function hardRefresh(address) {
  address = address || location.origin
  // cache busting: Reliable but modifies URL
  const newURL = new URL(address)
  newURL.searchParams.append('t', new Date().getTime())
  location.replace(newURL.toString())
}

function handleMessages(store, protocol, address, messageDelay = 0) {
  const link = `<a href="${address.href}">${address.origin}</a>`
  const defaultMessage = i18n.t('If you are not redirected, please click on this link: %s').format(link)
  const httpsMessage = i18n.t('The page you are trying to reach uses HTTPS protocol. Click the link and add exceptions: %s').format(link)
  window.setTimeout(() => {
    store.spinner.message = protocol === 'http:' ? defaultMessage : httpsMessage
  }, messageDelay * 1000)
}

/**
 * @typedef ReconnectOptions
 * @prop {boolean} logout
 * @prop {number} duration
 * @prop {number} port
 * @prop {boolean} eraseData
 * @prop {Record<string, string | number>} params
 * @prop {string} address - only the IP, protocol is not needed. E.g. 192.168.1.5 is OK, http://192.168.1.5 is NOT
 */
/**
 *
 * @param {string} title
 * @param {Partial<ReconnectOptions>} [options]
 */
export function reconnect(title, options = {}) {
  const { logout = true, duration = 20000, port = location.port, params = {}, address, eraseData = false, messageDelay, protocol = location.protocol } = options
  const { hostname } = location
  const store = useMainStore()
  store.setFormLoading(true)
  axios.cancelRequests('navigation')
  store.eventSource?.abort()
  const defaultIp = findKey(store.board.network, 'default_ip')
  const nextAddress = address || hostname
  store.spin({ tip: title, fullOpacity: true })
  let _address = new URL(`${protocol}//${defaultIp}`)
  if (!eraseData) {
    _address = new URL(`${protocol}//${nextAddress}`)
    _address.port = port
  }
  Object.entries(params).forEach(([k, v]) => _address.searchParams.set(k, v))
  window.setTimeout(() => {
    handleMessages(store, protocol, _address, messageDelay)
    ping(_address.origin).then(async () => {
      if (logout)
        await session.logout().catch(() => {
          /** Ignore logout endpoint fails due to changed IP sometimes */
        })
      store.spin(i18n.t('Redirecting...'))
      store.setFormLoading(false)
      setTimeout(() => hardRefresh(_address.href), 1000 * 10)
    })
  }, duration)
}

/**
 * @typedef PingOptions
 * @prop {number} timeout - time after which ping will stop, if not succedded, if 0 is provided, it will ping until succeeds
 * @prop {number} delay - delay in miliseconds between pings
 * @prop {number} startAfter - after how much time should the pinging start
 */
/**
 * @description pings to provided address and returns true when server responds, if timeout is provided error is thrown if no response was received during the pinging.
 * @param {string} address
 * @param {Partial<PingOptions>} [options]
 */
export async function ping(address, options) {
  const { timeout: _timeout = 0, delay: _delay = 1500, startAfter = 0 } = options || {}
  if (startAfter) await delay(startAfter)
  const loaded = new Promise(resolve => {
    const img = document.createElement('img')
    const interval = setInterval(() => (img.src = `${address}/favicon.ico?r=${Math.random()}`), _delay)
    img.addEventListener('load', () => {
      clearInterval(interval)
      resolve(true)
    })
  })
  if (_timeout) return timeout(loaded, _timeout)
  return loaded
}

export const checkNetwork = async function (options) {
  const store = useMainStore()
  const { timeout = 40 * 1000, delay = 2000, startAfter = 5 * 1000 } = options || {}
  const target = import.meta.env.PROD ? location.origin : import.meta.env.VITE_PROXY
  store.setFormLoading(true)
  store.spin()
  try {
    await ping(target, { timeout, delay, startAfter })
    store.spin(false)
    store.setFormLoading(false)
    return true
  } catch {
    store.spin(false)
    store.spin(i18n.t('Could not regain access to the device after applying the configuration changes'))
    return false
  }
}

/*
 * Returns array of property keys that are matching between `input` and some `dataSource` object.
 * @param {string[]} fields - array of fields to check duplication for
 */
export const checkDuplicates = (fields, dataSource, input) => {
  return fields.filter(prop => dataSource.some(dataSourceRecord => dataSourceRecord[prop] === input[prop]))
}

export function findKey(obj, prop) {
  let result = null
  for (const [key, value] of Object.entries(obj)) {
    if (key === prop) return value
    if (value && typeof value === 'object') result = findKey(value, prop)
    if (result) break
  }
  return result
}

// COLLECTION HELPERS

/**
 * Sorts collection using key
 * @template T
 * @param {T[]} collection
 * @param {keyof T | ((item: T) => any)} sortBy
 * @param {boolean} [ascending=true]
 * @returns {T[]}
 */
export function sortCollection(collection, sortBy, ascending = true) {
  const collator = new Intl.Collator(navigator.languages?.[0] || navigator.language, { numeric: true, caseFirst: 'upper' })
  if (typeof collection.sort !== 'function') return console.error("given collection doesn't have sort method")

  const copy = [...collection]
  const getValue = isFunction(sortBy) ? sortBy : item => item[sortBy]

  return copy.sort((a, b) => {
    const aValue = getValue(a)
    const bValue = getValue(b)

    // falsy check doesn't sort zero values properly
    // double equals operator `==` is used to check for `null` and `undefined` values
    const isAUndefined = aValue == null || aValue === ''
    const isBUndefined = bValue == null || bValue === ''
    if (isAUndefined && isBUndefined) return 0
    if (isAUndefined) return ascending ? 1 : -1
    if (isBUndefined) return ascending ? -1 : 1
    // from https://stackoverflow.com/questions/4340227/sort-mixed-alpha-numeric-array#answer-54427214
    if (isNaN(aValue) || isNaN(bValue)) {
      return ascending ? collator.compare(aValue, bValue) : collator.compare(bValue, aValue) // way faster than localeCompare
    }
    const [aNum, bNum] = [parseInt(aValue), parseInt(bValue)]
    return ascending ? aNum - bNum : bNum - aNum
  })
}

/**
 * @description finds object that can be nested in another object or an array
 * @param {any[]|Object} collection - array/object in which to search for searchable
 * @param {object|null} searchable - object to search for. OR null if custom predicate is given
 * @param {Object} [options] - extra options for function
 * @param {(any) => boolean} options.customPredicate - function which will be called to check if given item is the one that's being searched for. if predicate returns true, that item will be returned.
 */
export function findObject(collection, searchable, options) {
  let result = null
  const check = options?.customPredicate ? item => options.customPredicate(item) : item => item === searchable
  for (const item of collection) {
    if (check(item)) return item
    if (Array.isArray(item)) result = findObject(item, searchable, options)
    if ((!result || result === -1) && item && typeof item === 'object') result = findObject(Object.values(item), searchable, options)
    if (result) break
  }
  return result
}
/**
 * @param {any} data
 * @returns size of content length in kilobytes
 */
export function getContentLength(data) {
  const kilobytes = input => new Blob([input]).size / 1024
  const stringify = input => JSON.stringify(input)
  return kilobytes(stringify(data))
}

/**
 *
 * @param {any[]} arr array that will be split into chunks.
 * @param {{chunkSize: number, chunkCount?: never}|{chunkSize?: never, chunkCount: number}} options
 * @returns {any[][]} chunked array, where it is either split into given chunk count, or into chunks based on chunk size.
 */
export function toChunks(arr, options) {
  let { chunkCount = null, chunkSize = null } = options
  if (isNumber(chunkCount) && isNumber(chunkSize)) throw new Error('toChunks: you can either pass chunkCount or chunkSize, but not both at the same time')
  if (isNumber(chunkCount)) chunkSize = Math.ceil(arr.length / chunkCount)
  if (isNumber(chunkSize)) chunkCount = Math.ceil(arr.length / chunkSize)
  const splitData = []
  for (let i = 1; i <= chunkCount; i++) {
    const isLastChunk = i === chunkCount
    const lastIndex = isLastChunk ? arr.length : chunkSize * i
    const firstIndex = (i - 1) * chunkSize
    splitData.push(arr.slice(firstIndex, lastIndex))
  }
  return splitData
}

/**
 * Returns string with first uppercase letter
 * @param {String} string String to uppercase.
 * @returns {string}
 */
export function capitalize(string) {
  return string?.charAt(0).toUpperCase() + string?.slice(1)
}

/**
 *
 * @param {string} str
 * @returns {string}
 */
export function toCamelCase(str) {
  return str.toLowerCase().replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

/**
 * Returns string with first lower letter
 * @param {String} string String to uppercase.
 * @returns {string}
 */
export function uncapitalize(string) {
  return string?.charAt(0).toLowerCase() + string?.slice(1)
}

/**
 * @description function is used to apply some operation for all array elements. It will iterate over ALL array items, no matter it's depth.
 * @param {T[]} array - array to iterate. It can contain other arrays inside as well
 * @param {(item:T) => void} callback - function that will be invoked for each array element (if it's not an array itself)
 */
export function flatForEach(array, callback) {
  for (const item of array) {
    if (Array.isArray(item)) {
      flatForEach(item, callback)
      continue
    }
    callback(item)
  }
}
/**
 * takes data from sessionStorage and automatically parses it.
 * @template T
 * @param {string} key
 * @returns {null|T|string}
 * */
export function fromStorage(key) {
  const dataString = sessionStorage.getItem(key)
  const [data, error] = catchFn(() => JSON.parse(dataString))
  if (error) return dataString
  return data
}

/**
 * wraps asyncronous function in a try/catch block for cleaner catching
 * @template {T extends () => unknown} T
 * @param {T} fn Function to call within try/catch blocks
 * @returns {[null|ReturnType<T>, null|Error]}
 */
export function catchFn(fn) {
  try {
    const data = fn()
    return [data, null]
  } catch (e) {
    return [null, e]
  }
}

/**
 * writes given text in clipboard
 * @param {string} textToCopy - text which will be writen in clipboard
 */
export function copyToClipboard(textToCopy) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(textToCopy)
  }
  const element = document.createElement('textarea')
  document.body.appendChild(element)
  element.value = textToCopy
  element.select()
  document.execCommand('copy')
  document.body.removeChild(element)
}

export async function reboot() {
  const message = useMessages()
  try {
    await axios.post('/api/system/actions/reboot')
    // Need to pass the address here, so it reboots and redirects to the same address as requested and not to the device's default one
    return reconnect(i18n.t('Rebooting'), { messageDelay: 90, protocol: location.protocol })
  } catch {
    return message.error(i18n.t('Failed to reboot'))
  }
}

export function promptReboot() {
  usePrompt().show({
    title: i18n.t('Reboot this device?'),
    content: i18n.t('During reboot, the device will not be reachable for 1-2 minutes.'),
    okText: i18n.t('Reboot'),
    cancelText: i18n.t('Cancel'),
    onOk: reboot,
    onCancel: () => {}
  })
}

export default {
  install(app) {
    const store = useMainStore()
    app.config.globalProperties.$spin = store.spin
    app.config.globalProperties.$reconnect = reconnect
    app.config.globalProperties.$reboot = promptReboot
    app.config.globalProperties.$capitalize = capitalize
    app.config.globalProperties.$uncapitalize = uncapitalize
    app.config.globalProperties.$copyToClipboard = copyToClipboard
  }
}
