import { axiosRaw } from '@ui-core/plugins/axios'
import { i18n } from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'
import { isPlainObject } from '@ui-core/utils/inspect'
import { useMessages } from '@/stores/messages'
import { capitalize } from '@ui-core/plugins/helper'

/**
 * Generates rolling id which is guaranteed to be unique for a single page refresh
 * (Do not use for persistent data)
 * @returns {() => number} id
 */
export function createRollingId() {
  let id = 1
  return () => id++
}

export const utils = {
  downloadFileApi(link, fileType, method = 'GET', data, cancellable = false) {
    const store = useMainStore()
    store.spinner.cancelButton = cancellable
    let promise
    if (method === 'GET') {
      promise = axiosRaw.get(link, {
        headers: {
          Accept: fileType
        },
        responseType: 'blob'
      })
    } else {
      promise = axiosRaw.post(
        link,
        { data },
        {
          headers: {
            Accept: fileType
          },
          responseType: 'blob'
        }
      )
    }

    return promise
      .then(response => {
        let fileName = response.headers['content-disposition'].split('filename=')[1]
        fileName = fileName.replace(/"/g, '') // removes "" surrounding the name
        const url = window.URL.createObjectURL(new Blob([response.data], { type: fileType }))
        utils.downloadFromDataURL(url, fileName)
      })
      .catch(error => {
        // Determine how to return the error - json or blob
        if (!(error.request.responseType === 'blob' && error.response.data instanceof Blob && error.response.data.type && error.response.data.type.toLowerCase().indexOf('json') !== -1)) throw error
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            error.response.data = JSON.parse(reader.result)
            resolve(Promise.reject(error))
          }
          reader.onerror = () => {
            reject(error)
          }
          reader.readAsText(error.response.data)
        })
      })
  },

  async downloadFromDataURL(url, fileName) {
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },

  getNavTestId(path) {
    const noFirstLetter = path.substring(1)
    const otherSeperators = noFirstLetter.replace(/\//g, '-')
    return `navigation-${otherSeperators}-end`
  },

  /**
   * Generates rolling id which is guaranteed to be unique for a single page refresh
   * (Do not use for persistent data)
   * @returns {number} id
   */
  getUniqueId: createRollingId(),
  /**
   * @param {number} value - The value to be clamped
   * @param {number} min - The minimum value
   * @param {number} max - The maximum value
   * @returns {number} The clamped value
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  },

  /**
   * Wraps a value to ensure it stays within the bounds of a given length.
   * Useful for circular navigation in lists (e.g., up/down arrow key navigation).
   * @param {number} value - The value to wrap.
   * @param {number} min - The minimum value.
   * @param {number} max - The maximum value.
   * @returns {number} The wrapped value, always between min and max - 1.
   */
  wrap(value, min, max) {
    const range = max - min
    return ((((value - min) % range) + range) % range) + min
  },

  slug(input) {
    return input.trim().toLowerCase().replace(/\s+/g, '_')
  },

  /**
   * Converts text to snake case
   * @param {string} input - Text to convert
   * @returns {string} Converted text
   */
  toSnakeCase(input) {
    return input
      .replace(/-/g, '_')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
  },

  /**
   * Maps value from one range to another
   * @param {number} value - The value to be mapped
   * @param {number} x1 - The minimum value of the input range
   * @param {number} x2 - The maximum value of the input range
   * @param {number} y1 - The minimum value of the output range
   * @param {number} y2 - The maximum value of the output range
   */
  mapRange(value, x1, x2, y1, y2) {
    return ((value - x1) * (y2 - y1)) / (x2 - x1) + y1
  },

  /**
   * @template T
   * @param {T | null | undefined} value
   * @returns {value is T}
   */
  notEmpty(value) {
    return value !== null && value !== undefined
  },

  /**
   * Put into form's items \@change
   *
   * Validates only input's section
   * @param {any} self
   */
  validate(self) {
    return self.vuciSection.validate()
  },

  /**
   * Put into form's items \@change
   *
   * Validates whole form
   * @param {any} self
   */
  validateForm(self) {
    return self.vuciForm.validate()
  },

  /**
   * Returns value if it's devined or '-' if not
   * @template T
   * @param {T} value
   */
  valueOrBlank(value) {
    return value || '-'
  },

  /**
   * @template {Object} T
   * @param {T} value
   * @return {{[P in keyof T]: undefined extends T[P] ? '-' | Exclude<T[P], undefined> : T[P]}}
   */
  valueOrBlankObject(value) {
    const entries = Object.entries(value).map(([key, value]) => [key, this.valueOrBlank(value)])
    return Object.fromEntries(entries)
  },

  /**
   * @param {number} number
   * @param {{from: number, to: number}}
   */
  inRange(number, { from, to }) {
    return number >= from && number < to
  },

  /**
   * @template T
   * @param {T[]} array
   * @param {(item: T, index: number) => boolean} predicate
   * @param {number} [fromIndex=0]
   */
  findIndex(array, predicate, fromIndex) {
    const startIndex = fromIndex || 0
    for (let i = startIndex; i < array.length; i++) {
      if (predicate(array[i], i)) return i
    }
    return -1
  },

  /**
   * @template T
   * @param {T[]} array
   * @param {(item: T, index: number) => boolean} predicate
   * @param {number} [fromIndex]
   */
  findLastIndex(array, predicate, fromIndex) {
    const startIndex = fromIndex || array.length
    for (let i = startIndex; i >= 0; i--) {
      if (predicate(array[i], i)) return i
    }
    return -1
  },

  /**
   * Wraps display functions when input can be unusable
   * @template T, N
   * @param {'' | undefined | null | T} value
   * @param {(arg0: T) => N} fn
   * @returns N
   */
  displayWrap(value, fn) {
    if (!value) return '-'
    return fn(value)
  },

  /**
   * Shows error in user and developer friendly way
   * @param {string | Error} err
   */
  showThrownError(err) {
    const message = useMessages()
    if (err instanceof Error) {
      // user defined error when doing simple new Error(this.$t('error message'))
      if (err.name === 'Error') message.error(err.message)
      // predefined errors like type error so should not be shown to user
      else message.error(i18n.t('An unexpected error occurred'))
      if (!import.meta.env.PROD) console.trace(err)
    } else if (typeof err === 'string') {
      // String should not be trown but as linter does not like it but we might still have it
      message.error(err)
    }
  },

  /**
   * @template {Record<string, any>} T
   * @param {T[]} sections - sections to look for dublications
   * @param {keyof T} key - field key
   * @param {string} val - current field value
   * @param {string} [prettyKey] - field pretty name
   * @param {boolean} [caseInsensitive] - be case insensitive when comparing values
   * @param {boolean} [addValidation] - validation does not expect to see same section inside "sections"
   * @return {{isValid: true} | {isValid: false, message: string}}
   */
  validateNoDuplicates(sections, key, val, prettyKey, caseInsensitive, addValidation) {
    if (sections.filter(section => (caseInsensitive ? section[key]?.toUpperCase() === val?.toUpperCase() : section[key] === val)).length > (addValidation ? 0 : 1)) {
      return { isValid: false, message: i18n.t("Instance with %s '%s' already exists").format(prettyKey ?? key, val) }
    }
    return { isValid: true }
  },

  /**
   * Convert relative timestamp into pretty string e.g "1 hour ago"
   * @param {number} relativeTimestamp
   * @returns {string}
   * original source: {@link https://stackoverflow.com/a/53800501}
   */
  parseRelativeTime(relativeTimestamp) {
    const units = {
      year: 24 * 60 * 60 * 1000 * 365,
      month: (24 * 60 * 60 * 1000 * 365) / 12,
      week: 7 * 24 * 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      hour: 60 * 60 * 1000,
      minute: 60 * 1000
    }
    const rtf = new Intl.RelativeTimeFormat(this.store.lang, { numeric: 'auto' })
    for (const u in units) {
      const unit = /** @type {keyof typeof units} */ (u)
      const unitSpan = units[unit]
      if (Math.abs(relativeTimestamp) >= unitSpan) return rtf.format(Math.trunc(relativeTimestamp / unitSpan), unit)
    }
    return i18n.t('just now')
  },

  /**
   * Convert relative timestamp into pretty string with two time units e.g "1 hour, 42 minutes"
   * @param {number} relativeTimestamp
   * @returns {string}
   */
  parseTwoUnitRelativeTime(relativeTimestamp) {
    const units = {
      year: 24 * 60 * 60 * 1000 * 365,
      month: (24 * 60 * 60 * 1000 * 365) / 12,
      week: 7 * 24 * 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      hour: 60 * 60 * 1000,
      minute: 60 * 1000,
      second: 1000
    }
    const nf = new Intl.NumberFormat(this.store.lang, { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    const rtf = new Intl.RelativeTimeFormat(this.store.lang, { numeric: 'always' })
    for (const [primaryUnit, primarySpan] of Object.entries(units)) {
      if (Math.abs(relativeTimestamp) >= primarySpan) {
        const primaryValue = Math.trunc(relativeTimestamp / primarySpan)
        const remainder = relativeTimestamp % primarySpan
        const secondaryUnit = Object.entries(units).find(([, span]) => Math.abs(remainder) >= span)?.[0]
        if (secondaryUnit) {
          const secondaryValue = Math.trunc(remainder / units[secondaryUnit])
          return `${this.formatUnit(rtf, nf, primaryValue, primaryUnit)}, ${this.formatUnit(rtf, nf, secondaryValue, secondaryUnit)}`
        }
        return this.formatUnit(rtf, nf, primaryValue, primaryUnit)
      }
    }
    return i18n.t('just now')
  },
  /**
   *
   * @param {Intl.RelativeTimeFormat} rtf - The RelativeTimeFormat instance for formatting relative time.
   * @param {Intl.NumberFormat} nf - The NumberFormat instance for formatting numbers.
   * @param {number} value - The numeric value of the time unit.
   * @param {string} unit - The time unit (e.g., 'year', 'month', 'day').
   * @returns {string} A formatted string representing the time unit, e.g., "2 days" or "1 year".
   */
  formatUnit(rtf, nf, value, unit) {
    const formatted = rtf.format(value, unit)
    const number = nf.format(Math.abs(value))
    return formatted
      .replace(/\d+/, number)
      .replace(/^[^0-9]+/, '')
      .trim()
  },
  /**
   * Deep merge two objects.
   * @template {Record<string, any>} T
   * @param {T} target
   * @param {T[]} sources
   * @return {T}
   */
  mergeDeep(target, ...sources) {
    if (!sources.length) return target
    const source = sources.shift()
    if (isPlainObject(target) && isPlainObject(source)) {
      for (const key in source) {
        if (isPlainObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} })
          this.mergeDeep(target[key], source[key])
        } else {
          Object.assign(target, { [key]: source[key] })
        }
      }
    }

    return this.mergeDeep(target, ...sources)
  },
  /**
   * Deep merge without first object mutations
   * @template {Record<string, any>} T
   * @param {T} target
   * @param {T[]} sources
   * @return {T}
   */
  combineDeep(...sources) {
    return this.mergeDeep({}, ...sources)
  },

  /**
   * Finds and retrieves the corresponding certificate warning message based on the provided value and warning messages.
   * @param {string} val
   * @param {Array<{source: string, code: number}>} warningMessages
   * @param {Array<{id: string}>} formData
   * @param {Object.<number, string>} certificateWarnings
   * @returns {string|undefined}
   */
  certificateWarnings(val, warningMessages, formData, certificateWarnings) {
    const fileWarning = warningMessages?.find(message => {
      const [instanceId, fieldName] = message.source.split(':')
      const instance = formData.find(instance => instance.id === instanceId)
      return instance && val === instance[fieldName]
    })
    return fileWarning ? certificateWarnings[fileWarning.code] : undefined
  },

  /**
   * Checks if the provided encryption cipher is in the deprecated cipher list.
   * @param {string} value - The encryption cipher value to check.
   * @returns {boolean} - Returns true if the cipher is deprecated, false otherwise.
   */
  encryptionCypherWarning(value) {
    const depracatedCypherList = ['3DES', 'DES', 'RC2-64-CBC', 'CAST5-CBC', 'RC2-40-CBC', 'BF-CBC', 'DESX-CBC', 'DES-EDE3-CBC', 'DES-EDE-CBC', 'RC2-CBC', 'DES-CBC']
    return depracatedCypherList.includes(value)
  },

  /**
   * Checks if the provided authentication algorithm is in the deprecated algorithm list.
   * @param {string} value - The authentication algorithm value to check.
   * @returns {boolean} - Returns true if the algorithm is deprecated, false otherwise.
   */
  authAlgorithmWarning(value) {
    const depracatedAlgoList = ['MD5', 'SHA1']
    return depracatedAlgoList.includes(value)
  },

  /**
   * Mutates array in object to ensure specified value is mutually exclusive to any other value
   * @template {{[key:string]: any}} T
   * @param {T} obj
   * @param {keyof {[P in keyof T as T[P] extends string[] ? P : never]: any}} key - field key
   * @param {string} value - mutually exclusive value
   */
  mutuallyExclusiveValue(obj, key, value) {
    if (obj[key]?.length <= 1 || !obj[key]?.includes(value)) return
    obj[key] = obj[key].at(-1) === value ? [value] : obj[key].filter(e => e !== value)
  },

  /**
   * Get random rgb color from name hash
   * @param {string} name
   */
  getNameColor(name) {
    const colors = [
      'var(--color-theme-bg-info)',
      'var(--color-blue-500)',
      'var(--color-theme-bg-success)',
      'var(--color-yellow-300)',
      'var(--color-purple-300)',
      'var(--color-theme-bg-warning)',
      'var(--color-theme-bg-danger)',
      'var(--color-lime-300)'
    ]
    if (name === 'lan') return colors[0]
    if (name === 'wan') return colors[2]
    const sum = name.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    return colors[sum % colors.length]
  },

  /**
   * Removes unnecessary presition if it is whole number. E.g: "10.00" -> "10"
   * Also support strings that already have units. E.g: "10.00 Mb/s" -> "10 Mb/s"
   * @param {string} str
   * @returns {string}
   */
  removeOverPrecision(str) {
    const values = str.split(' ')
    values[0] = values[0].replace(/\.0+$/, '')
    return values.join(' ')
  },
  /**
   * Checks if bulk kas no errors
   * @param {Array<import('@ui-core/plugins/axios').ApiResponse | import('@ui-core/plugins/axios').ApiErrorResponse>} bulkResult
   * @return {bulkResult is Array<import('@ui-core/plugins/axios').ApiResponse>}
   */
  noErrors(bulkResult) {
    return bulkResult.every(({ success }) => success === true)
  },

  /**
   * Generates a CSV file from provided data and initiates its download
   * @param {string} filename
   * @param {any[][]} data
   * @param {string} delimiter
   */
  generateCsv(filename, data, delimiter = ';') {
    const formatField = field => {
      const stringField = String(field)
      if (stringField.includes(delimiter) || stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`
      }
      return stringField
    }
    const csvContent = data.map(row => row.map(field => formatField(field)).join(delimiter)).join('\r\n')
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
    utils.downloadFromDataURL(encodedUri, `${filename}.csv`)
  },

  /**
   * Creates modal title
   * @param {string} configType - general name for config. Should be singular form and start with lower case or be abbreviation (e.g., traffic rule, DHCP)
   * @param {string} [configName] - user created configuration name. If it has one
   */
  getModalTitle(configType, configName) {
    return configName ? i18n.t('"%s" %s configuration').format(configName, configType) : i18n.t('%s configuration').format(capitalize(configType))
  },

  /**
   * Translate value using field options
   * @param {string[][]} options
   * @param {string} value
   */
  translateFromOption(options, value) {
    return options.find(([optValue]) => optValue === value)?.[1] ?? value
  },

  /**
   * Helper function for list format function. It is used to display list of items in locale aware fation
   * @param {string[]} list
   * @param {{type: 'conjunction' | 'disjunction' | 'unit'; style: 'long'| 'short' | 'narrow'}} [options]
   */
  formatList(list, options) {
    if (!Intl.ListFormat) return list.join(', ')
    const store = useMainStore()
    // Options defaults are good: long conjunction. This makes "apple, orange and pear" in en-GB locale
    const formatter = new Intl.ListFormat(store.lang, options)
    return formatter.format(list)
  }
}

export default {
  install(app) {
    utils.store = useMainStore()
    app.config.globalProperties.$utils = utils
  }
}
