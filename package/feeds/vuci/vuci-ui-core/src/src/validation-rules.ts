import { i18n } from '@ui-core/plugins/i18n'
import { isArray, isEmpty, isString } from '@ui-core/utils/inspect'
import type { PasswordPolicy } from './types/passwordPolicyTypes'
/**
 * ~~~~~~~ IMPORTANT ~~~~~~
 * Rule of validation-rules
 * We should stick to one simple rule when writing validation rules in this file -
 *
 * Validation rules should ONLY validate the FORMAT of the input and should NOT DO any additional checks.
 * Allowed maxlength/minlength should be added individually in html template instead of rules to prevent validating same thing twice,
 * since inputs can already validate the length of the entered value.
 *
 * NOTE:This does not apply when:
 * - only specific lengths are allowed, check exact_length rule
 * - rule "wpakey" which, if length validation inside rule is removed,
 *   would not really be informative of the required format, which differs from the entered value's length.
 */

export type ValidationResult = { isValid: true; message?: undefined } | { isValid: false; message: string }
export type Rules = keyof typeof rules
export type Validators = typeof rules

export type ValidationFunction = (value: any, ...params: any[]) => ValidationResult

const encoder = new TextEncoder()
/* eslint-disable camelcase */

function isValid(value: any, rule: ValidationFunction, ...params: any[]) {
  return rule(value, ...params).isValid
}

// HELPERS
const PROTO_REGEX = '[a-zA-Z][a-zA-Z0-9+.-]*://'
const IPV4_REGEX = '((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])\\.\\b){3}((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])\\b)'
const IPV6_REGEX =
  '(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))'
const HOSTNAME_REGEX = '([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])(\\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9]))*'
const SYSTEM_HOSTNAME_REGEX = '([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])((?!(?=\\..*)[0-9.]+$)\\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9]))*'
const PORT_REGEX = '([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])'

// URL_PATH_REGEX , URL_QUERY_REGEX and URL_FRAGMENT_REGEX are all very similar with slight differences
const URL_ENCODE_REGEX = '%[0-9a-fA-F]{2}'
const URL_SHARED_REGEX = "a-zA-Z0-9!$&'()*+,./;=:@_~\\[\\]\\-"
const URL_PATH_REGEX = `((?:[${URL_SHARED_REGEX}])|(?:${URL_ENCODE_REGEX}))*`
const URL_QUERY_REGEX = `((?:[${URL_SHARED_REGEX}\\?])|(?:${URL_ENCODE_REGEX}))*`
// URL_FRAGMENT_REGEX is the thing that's after '#' in the url
const URL_FRAGMENT_REGEX = `((?:[${URL_SHARED_REGEX}\\?#])|(?:${URL_ENCODE_REGEX}))*`

const URL_REGEX = `(${IPV4_REGEX}|\\[${IPV6_REGEX}\\]|${HOSTNAME_REGEX})(:${PORT_REGEX})?(\\/${URL_PATH_REGEX})?(\\?${URL_QUERY_REGEX})?(#${URL_FRAGMENT_REGEX})?`

const pattern = {
  email: /^([\w+-]+\.)*[\w+-]+@([\w+-]+\.)*[\w+-]+\.[a-zA-Z0-9]+$/,
  url: new RegExp(
    '^([a-zA-Z]+(?:[+.-]?[a-zA-Z0-9]+)+://)?(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:[a-z\\u00a1-\\uffff0-9-]*[a-z\\u00a1-\\uffff0-9]+)(?:\\.[a-z\\u00a1-\\uffff0-9-]*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))|\\[' +
      IPV6_REGEX +
      '\\])|localhost)(?<port>:\\d{1,})?(?:(/|\\?|#)[^\\s`]*)?$',
    'i'
  ),
  ipv6: new RegExp(IPV6_REGEX, 'i')
}

function setCharAt(str: string, index: number, chr: string) {
  if (index > str.length - 1) {
    return str
  }
  return str.substr(0, index) + chr + str.substr(index + 1)
}

export function parseIPv4(str: string) {
  if (!isString(str) || !str.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    return undefined
  }
  const num = []
  const parts = str.split(/\./)

  for (let i = 0; i < parts.length; i++) {
    if (leadingZero(parts[i])) {
      return undefined
    }
    const n = parseInt(parts[i])
    if (isNaN(n) || n > 255) {
      return undefined
    }

    num.push(n)
  }

  return num
}

export function parseIPv6(x: string) {
  if (x.match(/^([a-fA-F0-9:]+):(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)) {
    const v6 = RegExp.$1
    const v4 = parseIPv4(RegExp.$2)

    if (!v4) {
      return null
    }

    x = v6 + ':' + (v4[0] * 256 + v4[1]).toString(16) + ':' + (v4[2] * 256 + v4[3]).toString(16)
  }

  if (!x.match(/^[a-fA-F0-9:]+$/)) {
    return null
  }

  const prefixSuffix = x.split(/::/)

  if (prefixSuffix.length > 2) {
    return null
  }

  const prefix = (prefixSuffix[0] || '0').split(/:/)
  const suffix = prefixSuffix.length > 1 ? (prefixSuffix[1] || '0').split(/:/) : []

  if (suffix.length ? prefix.length + suffix.length > 7 : (prefixSuffix.length < 2 && prefix.length < 8) || prefix.length > 8) {
    return null
  }

  let i, word
  const words = []

  for (i = 0, word = parseInt(prefix[0], 16); i < prefix.length; word = parseInt(prefix[++i], 16)) {
    if (prefix[i].length <= 4 && !isNaN(word) && word <= 0xffff) {
      words.push(word)
    } else {
      return null
    }
  }

  for (i = 0; i < 8 - prefix.length - suffix.length; i++) {
    words.push(0)
  }

  for (i = 0, word = parseInt(suffix[0], 16); i < suffix.length; word = parseInt(suffix[++i], 16)) {
    if (suffix[i].length <= 4 && !isNaN(word) && word <= 0xffff) {
      words.push(word)
    } else {
      return null
    }
  }

  return words
}

export function isNetmask(addr: any[] | undefined) {
  if (!isArray(addr)) {
    return false
  }

  let c

  for (c = 0; c < addr.length && addr[c] === 255; c++);

  if (c === addr.length) {
    return true
  }

  if (addr[c] === 254 || addr[c] === 252 || addr[c] === 248 || addr[c] === 240 || addr[c] === 224 || addr[c] === 192 || addr[c] === 128 || addr[c] === 0) {
    for (c++; c < addr.length && addr[c] === 0; c++);

    if (c === addr.length) {
      return true
    }
  }

  return false
}

export function _ip4prefix(val: string) {
  const _val = parseInt(val)
  return !isNaN(_val) && _val >= 0 && _val <= 32
}

export function _ip6prefix(val: string) {
  const _val = parseInt(val)
  return !isNaN(_val) && _val >= 0 && _val <= 128
}

export function _cidr4(val: string) {
  const m = val.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/)
  return !!(m && parseIPv4(m[1]) && _ip4prefix(m[2]))
}

export function _cidr6(val: string) {
  const m = val.match(/^([0-9a-fA-F:.]+)\/(\d{1,3})$/)
  return !!(m && parseIPv6(m[1]) && _ip6prefix(m[2]))
}

export function _ipmask4(val: string) {
  return _cidr4(val) || ipnet4(val) || isValid(val, rules.ip4addr)
}

export function _ipmask6(val: string) {
  return _cidr6(val) || _ip6addr(val)
}

export function _ip6addr(value: string) {
  return !!parseIPv6(value)
}

export function ipnet4(val: string) {
  const m = val.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  return !!(m && parseIPv4(m[1]) && isNetmask(parseIPv4(m[2])))
}

export function hexstring(val: string) {
  return val.match(/^[a-fA-F0-9]+$/)
}

function getDaysInMonth(month: number, year: number) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month === 1 && isLeapYear(year)) {
    return 29
  } else {
    return daysInMonth[month]
  }
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function parseDecimal(x: string): number {
  return /^-?\d+(?:\.\d+)?$/.test(x) ? +x : NaN
}

export function number(value: string): boolean {
  return !isNaN(parseInt(value))
}

function _defaulttype(value: string) {
  return !!value.match(/^[^`'"\s]+$/)
}

/**
 * checks if value starts with more than one zero or space.
 * @param {string} value to check if it has leading zeros
 * @returns {boolean} true if value starts with more than 1 leading zeros
 * @example
 *  leadingZero('001') => true, leadingZero(0.12) => false
 */
export function leadingZero(value: string) {
  return !!value.match(/^((-0[0-9]*)|(0[0-9]+))| +/)
}

/**
 * Parses the URL address by breaking it down into scheme, domain and port parts.
 */
export function urlParse(value: string) {
  const isValidDomain = (value: string) => value.length < 253 && value.split('.').every(e => e.length < 61 && !e.startsWith('-') && !e.endsWith('-'))
  const empty = { url: null, scheme: null, port: null }
  try {
    let v = value
    const hasProto = /^.*:\/\//.test(v)
    if (!hasProto && !v.startsWith('/')) v = `https://${v}`
    const url = new URL(v)
    if ((!hasProto && !url.hostname) || !isValidDomain(url.hostname)) return { url: null, scheme: null, port: null }
    return {
      port: url.port || null,
      url: value,
      scheme: hasProto ? url.protocol.slice(0, -1) : null
    }
  } catch {
    return empty
  }
}
/**
 * Validates http, https protocols or any valid protocol of the entered URL address.
 * @param protocol Protocol of the URL address.
 * @param required Mandatory protocol flag.
 * @param any Dictates whether to accepts any valid protocol.
 * @return Validator object that consists of a validation flag and/or message.
 */
export function urlProtocol(protocol: string | null, required: boolean, any: boolean) {
  const protoHint = any ? i18n.t('Invalid url protocol.') : i18n.t('Accepted protocols are http or https.')
  const protoRequiredHint = i18n.t('Url address must contain a valid protocol. %s').format(protoHint)
  const invalidProto = any ? false : protocol !== 'http' && protocol !== 'https'
  if (required && (!protocol || invalidProto)) return { isValid: false, message: protoRequiredHint }
  else if (protocol && invalidProto) return { isValid: false, message: protoHint }
  return { isValid: true }
}
/**
 * Validates the port of URL address.
 * @param {String} port Port value.
 * @return {Object} Validator object that consists of a validation flag and/or message.
 */
export function urlPort(port: string | null) {
  const portHint = i18n.t('Port values must be between 0 and 65535.')
  if (port && port !== '') {
    if (!number(port)) return { isValid: false, message: portHint }
    const _port = parseInt(port)
    return { isValid: _port && _port > 0 && _port <= 65535, message: portHint }
  }
  return { isValid: true }
}
// END-OF-HELPERS

function validatorReturn(isValid: boolean, message?: string) {
  if (isValid) return { isValid }
  return { isValid, message: message || i18n.t('Incorrect value.') }
}
/**
 * counts the length of input string including extended characters like emoji
 * @param {string} input
 * @returns {number}
 */
function len(input: string) {
  return encoder.encode(input).length
}

export const rules = {
  string(value: string, options: { minlength?: number; maxlength?: number } = {}) {
    const { minlength = 0, maxlength = 0 } = options
    if (minlength && maxlength && minlength === maxlength && value.length !== minlength) return validatorReturn(false, i18n.t('Length of the value must be %s.').format(minlength))
    if (minlength && minlength > value.length) return validatorReturn(false, i18n.t('Minimum length of value is %s').format(minlength))
    if (maxlength && maxlength < value.length) return validatorReturn(false, i18n.t('Maximum length of value is %s').format(maxlength))
    return validatorReturn(true)
  },
  ip4addr(value: string) {
    return validatorReturn(!!parseIPv4(value), i18n.t('IPv4 addresses are accepted (e.g., 192.168.1.1).'))
  },
  ip6addr(value: string) {
    return validatorReturn(_ip6addr(value), i18n.t('IPv6 addresses are accepted (e.g., ::0000:8a2e:0370:7334).'))
  },
  ipaddr(value: string) {
    return validatorReturn(!!parseIPv4(value) || !!parseIPv6(value), i18n.t('IPv4 and IPv6 addresses are accepted (e.g., 192.168.1.1).'))
  },
  netmask(value: string, ipv6?: string | boolean) {
    const _ipv6 = isString(ipv6) ? ipv6 === 'true' : ipv6
    const _value = parseInt(value)
    let hint = i18n.t('Netmasks are accepted (e.g., 255.255.255.0).')
    if (_ipv6) {
      hint = i18n.t('Netmasks for IPv4 and IPv6 addresses accepted (e.g., 255.255.255.0 or 128).')
      return validatorReturn(isNetmask(parseIPv4(value)) || (_value >= 0 && _value <= 128), hint)
    }
    return validatorReturn(isNetmask(parseIPv4(value)), hint)
  },
  macaddr(value: string) {
    return validatorReturn(!!value.match(/^([a-fA-F0-9]{2}:){5}[a-fA-F0-9]{2}$/), i18n.t('Mac address of six groups of two hexadecimal digits are accepted (e.g., 01:23:45:67:89:AB).'))
  },
  macaddrrange(value: string) {
    const hint = i18n.t('MAC adress or MAC address range accepted eg. 01:23:45:67:89:AB or 00:00:00:00:00:00-FF:FF:FF:FF:FF:FF')
    if (value.includes('-')) {
      const [p1, p2] = value.split('-')
      const valid = p1.toLocaleUpperCase() < p2.toLocaleUpperCase() && isValid(p1, rules.macaddr) && isValid(p2, rules.macaddr)
      return validatorReturn(valid, hint)
    }
    return validatorReturn(isValid(value, rules.macaddr), hint)
  },
  username(value: string) {
    const hint = i18n.t('A string of lowercase Latin letters, numbers, -, . and _ characters is accepted. First character must be a lowercase Latin letter. Length between 1 and 32 characters.')
    return validatorReturn(new RegExp('^[a-z][a-z0-9-_.]{0,31}$').test(value), hint)
  },
  hostname(value: string) {
    const hint = i18n.t('Domain names are accepted (e.g., example.com).')
    // hostname regex allows all number domains, that's why we need to check it here separately
    if (/^[0-9.]+$/.test(value)) return validatorReturn(false, hint)

    if (value && value.length < 254) {
      return validatorReturn(new RegExp('^' + HOSTNAME_REGEX + '$').test(value), hint)
    } else {
      return validatorReturn(false, hint)
    }
  },
  host(value: string) {
    return validatorReturn(isValid(value, rules.hostname) || isValid(value, rules.ipaddr), i18n.t('Domain names or IP addresses accepted (e.g., 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com).'))
  },
  system_host(value: string) {
    const hint = i18n.t('Domain names or IP addresses accepted (e.g., 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com).')
    return validatorReturn(isValid(value, rules.ipaddr) || (typeof value === 'string' && value.length < 254 && new RegExp('^' + SYSTEM_HOSTNAME_REGEX + '$').test(value)), hint)
  },
  ipv6host(value: string) {
    return validatorReturn(isValid(value, rules.hostname) || isValid(value, rules.ip6addr), i18n.t('Domain names or IPv6 addresses accepted (e.g., ::0000:8a2e:0370:7334 or example.com).'))
  },
  ipmask6host(value: string) {
    return validatorReturn(
      isValid(value, rules.hostname) || isValid(value, rules.ipmask6),
      i18n.t('Domain names or IPv6 addresses with or without mask prefix accepted (e.g., ::0000:8a2e:0370:7334/24 or example.com).')
    )
  },
  ipv4host(value: string) {
    return validatorReturn(isValid(value, rules.hostname) || isValid(value, rules.ip4addr), i18n.t('Domain names or IPv4 addresses accepted (e.g., 192.168.1.1 or example.com).'))
  },
  protourl(value: string, protocols?: string[]) {
    const protoExamples = protocols || ['http']
    const urlExamples = ['www.example.com', '192.168.1.1', '[::8a2e:370:7334]']
    const examples = protoExamples.map(proto => urlExamples.map(url => `${proto}://${url}`).join(', ')).join(` ${i18n.t('or')} `)
    const hint = i18n.t('A full URL is accepted (e.g., %s).').format(examples)
    const scheme = value.match(/^(([a-zA-Z][a-zA-Z0-9+\-.]*):\/\/)/i)
    if (!scheme) return validatorReturn(false, hint)
    if (protocols && !protocols.includes(scheme[0].split(':')[0])) return validatorReturn(false, i18n.t('Url with %s protocol must be defined.').format(protocols.join(', ')))
    return validatorReturn(rules.url(value, 'protocol', 'anyProtocol').isValid, hint)
  },
  url(value: string, scheme: string, anyScheme: string) {
    const urlHint = i18n.t('URL is accepted (e.g., example.com/example or 192.168.1.1/example or [::8a2e:370:7334]/example).')
    const match = value.match(`^(${PROTO_REGEX})?${URL_REGEX}$`)
    const ok = !!match
    if (ok) {
      const ip_or_hostname = match?.[2]
      if (ip_or_hostname?.match(/^[0-9.]+$/)) {
        const valid = isValid(ip_or_hostname, rules.ip4addr)
        if (!valid) return validatorReturn(false, urlHint)
      }
    }
    const _scheme = scheme === 'protocol'
    const _anyScheme = anyScheme === 'anyProtocol'
    const parsedUrl = urlParse(value)
    const schemeValidation = urlProtocol(parsedUrl.scheme, _scheme, _anyScheme)
    const portValidation = urlPort(parsedUrl.port)
    if (!schemeValidation.isValid) return validatorReturn(false, schemeValidation.message)
    if (!parsedUrl.url) return validatorReturn(false, urlHint)
    if (parsedUrl.url && parsedUrl.url.split('.').every(el => !isNaN(el as unknown as any))) return validatorReturn(isValid(value, rules.ip4addr), urlHint)
    if (!portValidation.isValid) return validatorReturn(false, portValidation.message)
    return validatorReturn(ok, urlHint)
  },
  email(value: string) {
    return validatorReturn(!!value.match(pattern.email), i18n.t('A valid email address is accepted (e.g., example@domain.com).'))
  },
  port(value: string) {
    const _value = parseInt(value)
    return validatorReturn(isValid(value, rules.uinteger) && _value > 0 && _value <= 65535, i18n.t('Values between 1 and 65535 are accepted.'))
  },
  pincode(value: string) {
    const msg = i18n.t('A PIN made out of numbers between 4 and 8 symbols is accepted.')
    if (value.length < 4 || value.length > 8) return validatorReturn(false, msg)
    return validatorReturn(!!value.match(/^[0-9]+$/), msg)
  },
  apn(value: string) {
    if (value.length > 62) return validatorReturn(false, i18n.t('Maximum length of value is %s.').format(62))
    if (/(^[a-zA-Z0-9]$)|(^([a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9])$)/.test(value)) {
      return validatorReturn(true)
    }
    return validatorReturn(false, i18n.t("A string of a-Z, 0-9, - and . characters is accepted, but it can't start or end with - or ."))
  },
  number_leading_zeros(value: string) {
    return validatorReturn(/^[0-9]+$/.test(value), i18n.t('Only positive integers are accepted with or without leading zeros.'))
  },
  pukcode(value: string) {
    return validatorReturn(/^[0-9]{8}$/.test(value), i18n.t('A PUK made out of 8 digits is accepted.'))
  },
  fieldvalidation(value: string, valmat: string, len?: number) {
    if (len == null) len = 0
    let acceptableChars = ''
    let brackets = 0
    for (let i = 1; i < valmat.length - 1; i++) {
      if (valmat.charAt(i) === '%') {
        valmat = setCharAt(valmat, i, '\\')
        if (valmat.charAt(i + 1) === '%') {
          i++
          acceptableChars = acceptableChars + valmat.charAt(i)
        }
      } else if (valmat.charAt(i) === '[') {
        brackets++
      } else if (valmat.charAt(i) === ']') {
        brackets--
      } else if (brackets > 0) {
        acceptableChars = acceptableChars + valmat.charAt(i)
      }
    }
    let datatypeHint = ''
    if (acceptableChars) {
      datatypeHint = i18n.t('Following characters are accepted: %s').format(acceptableChars)
    } else {
      datatypeHint = i18n.t('Following words are accepted: %s').format(valmat.replace(/[\^$]/g, ''))
    }
    const v = value
    if (v.length >= len) {
      return validatorReturn(v.match(valmat) !== null, datatypeHint)
    }
    return validatorReturn(false, datatypeHint)
  },
  defaulttype(value: string) {
    return validatorReturn(_defaulttype(value), i18n.t('A string of any characters is accepted except \', ", ` and space.'))
  },
  uciname(value: string) {
    return validatorReturn(!!value.match(/^[a-zA-Z0-9_]+$/), i18n.t('A string of a-Z, 0-9 and _ characters is accepted.'))
  },
  dashname(value: string) {
    return validatorReturn(!!value.match(/^[a-zA-Z0-9_-]+$/), i18n.t('A string of a-Z, 0-9 and _- characters is accepted.'))
  },
  urlparam(value: string) {
    return validatorReturn(!!value.match(/^[a-zA-Z0-9_\-!]+$/), i18n.t('A string of a-Z, 0-9 and _-! characters is accepted.'))
  },
  mqtt_client_id(value: string) {
    return validatorReturn(!!value.match(/^[a-zA-Z0-9!@#:$%&*+\-/=?^_`[\]{|}~.]+$/), i18n.t('A string of a-Z, 0-9 and special characters !@#:$%&*+-/=?^_`[]{|}~. is accepted.'))
  },
  wpakey(value: string) {
    const valueLength = len(value)
    const hint = i18n.t('This key may be entered either as a string of 64 hexadecimal digits, or as a passphrase of 8 to 63 printable ASCII characters.')
    if (valueLength === 64) {
      return validatorReturn(value.match(/^[a-fA-F0-9]{64}$/) != null, hint)
    } else {
      return validatorReturn(valueLength >= 8 && valueLength <= 63, hint)
    }
  },
  ufloat(value: string) {
    const n = parseDecimal(value)
    if (n === Infinity) return validatorReturn(false, i18n.t('Number is too big.'))
    return validatorReturn(n >= 0, i18n.t('Only positive numbers are accepted.'))
  },
  float_scientific(value: string) {
    const absValue = Math.abs(parseFloat(value))
    const isValidDecimal = /^(?!.*\.$)(?:(?:[+-]?\d+\.\d+)|(?:[+-]?\d+\.?\d*))(?:[eE][+-]?\d+)?$/.test(value)
    const isValidDouble = absValue > Number.MIN_VALUE && absValue < Number.MAX_VALUE
    return validatorReturn(isValidDecimal && (isValidDouble || value === '0'), i18n.t('Only float numbers are accepted.'))
  },
  ufloat_scientific(value: string) {
    return validatorReturn(rules.float_scientific(value).isValid && parseFloat(value) >= 0, i18n.t('Only positive float numbers are accepted.'))
  },
  subnet4(value: string) {
    return validatorReturn(_cidr4(value), i18n.t('IPv4 addresses with mask prefix are accepted (e.g., 192.168.1.0/24).'))
  },
  subnet4mask(value: string) {
    return validatorReturn(
      _ipmask4(value) || _ip4prefix(value),
      i18n.t('IPv4 addresses with or without mask prefix are accepted (e.g., 192.168.1.0/24). Mask prefix alone is also accepted (e.g., 24).')
    )
  },
  subnet6(value: string) {
    return validatorReturn(_cidr6(value), i18n.t('IPv6 addresses with mask prefix are accepted (e.g., ::1/128).'))
  },
  subnet(value: string) {
    return validatorReturn(_cidr6(value) || _cidr4(value), i18n.t('IPv4 and IPv6 addresses with mask prefix are accepted (e.g., 192.168.1.0/24).'))
  },
  ipmask4(value: string) {
    return validatorReturn(_ipmask4(value), i18n.t('IPv4 addresses with or without mask prefix are accepted (e.g., 192.168.1.0/24).'))
  },
  ipmask6(value: string) {
    return validatorReturn(_ipmask6(value), i18n.t('IPv6 addresses with or without mask prefix are accepted.'))
  },
  ipmask(value: string) {
    return validatorReturn(_ipmask4(value) || _ipmask6(value), i18n.t('IPv4 and IPv6 addresses with or without mask prefix are accepted (e.g., 192.168.1.0/24).'))
  },
  ip6hostid(value: string) {
    if (value === 'eui64' || value === 'random') {
      return validatorReturn(true)
    }
    const v6 = parseIPv6(value)
    return validatorReturn(!(!v6 || v6[0] || v6[1] || v6[2] || v6[3]), i18n.t('Allowed values: "eui64", "random", fixed value like "::1" or "::1:2".'))
  },
  portrange(value: string) {
    const hint = i18n.t('Port ranges with values from 1 to 65535 are accepted (e.g., 232-254).')
    if (value.match(/^([1-9][0-9]*)-([1-9][0-9]*)$/)) {
      const p1 = +RegExp.$1
      const p2 = +RegExp.$2
      return validatorReturn(p1 < p2 && p2 <= 65535, hint)
    }
    return validatorReturn(isValid(value, rules.port), hint)
  },
  hexstring(value: string) {
    return validatorReturn(!!hexstring(value), i18n.t('A hexadecimal string of symbols: a-f, A-F and 0-9 is accepted.'))
  },
  exact_length(value: string, exactLengths: number[] | number) {
    const lengths = [exactLengths].flat()
    const message = lengths.length > 1 ? i18n.t('Values of specific lengths (%s) are accepted').format(lengths.join(', ')) : i18n.t('Values of %s symbols are accepted').format(lengths)
    return validatorReturn(lengths.includes(len(value)), message)
  },
  hostport(value: string, ipv4only: boolean) {
    return validatorReturn(
      isValid(value, rules.port) || rules.hostipport(value, ipv4only).isValid,
      i18n.t('Values between 0 and 65535 or an IP address or domain name with a port is required (e.g., 192.168.1.1:80).')
    )
  },
  hostipport(value: string, ipv4only: boolean) {
    const msg = i18n.t('An IP address or domain name with a port is required (e.g., 192.168.1.1:80).')
    if (ipv4only) {
      const regex = new RegExp(`^(${PROTO_REGEX})?((${IPV4_REGEX})|(${HOSTNAME_REGEX}))(:${PORT_REGEX})$`)
      return validatorReturn(regex.test(value), msg)
    } else {
      const regex = new RegExp(`^(${PROTO_REGEX})?((${IPV4_REGEX})|(\\[${IPV6_REGEX}\\])|(${HOSTNAME_REGEX}))(:${PORT_REGEX})$`)
      return validatorReturn(regex.test(value), msg)
    }
  },
  ipport(value: string, ipv4only: boolean) {
    const msg = i18n.t('Port with or without IP address is required E.g 80 or 192.168.1.1:80.')
    if (isValid(value, rules.port)) {
      return validatorReturn(true, msg)
    }
    if (ipv4only) {
      const regex = new RegExp(`^(${IPV4_REGEX})(:${PORT_REGEX})$`)
      return validatorReturn(regex.test(value), msg)
    } else {
      const regex = new RegExp(`^((${IPV4_REGEX})|(\\[${IPV6_REGEX}\\]))(:${PORT_REGEX})$`)
      return validatorReturn(regex.test(value), msg)
    }
  },
  irange(value: string, min: number, max: number) {
    const msg = i18n.t('Value must be an integer and range of the value must be from %s to %s.').format(min, max)
    return validatorReturn(isValid(value, rules.integer) && isValid(value, rules.range, min, max), msg)
  },
  number(value: string, allowTrailingZero = false) {
    const numberRE = allowTrailingZero ? /^-?(0|[1-9]+[0-9]*)(\.[0-9]+)?$/ : /^-?(0|[1-9]+[0-9]*)(\.0*[0-9]*[1-9]+)?$/
    return validatorReturn(numberRE.test(value) && value !== '-0', i18n.t('Numbers are accepted'))
  },
  range(value: string, min: number, max: number, allowTrailingZero = false) {
    const number = rules.number(value, allowTrailingZero)
    if (!number.isValid) return validatorReturn(false, number.message)
    const size = /^-?[0-9]{1,15}([.].*)?$/.test(value)
    if (!size) return validatorReturn(false, i18n.t('Value is too large'))

    const val = Number(value)
    return validatorReturn(min <= val && val <= max, i18n.t('Range of the value must be from %s to %s').format(min, max))
  },
  integer(value: string) {
    if (value.length > 15) return validatorReturn(false, i18n.t('Value is too long'))
    if (!/^((0)|(-?[1-9][0-9]*))$/.test(value)) return validatorReturn(false, i18n.t('Value must be a valid integer'))
    const val = Number(value)
    return validatorReturn(val >= -70368744177664 && val <= 70368744177664, i18n.t('Integer range is -2^46 to 2^46'))
  },
  uinteger(value: string) {
    if (value.length > 14) return validatorReturn(false, i18n.t('Value is too long'))
    if (!/^((0)|([1-9][0-9]*))$/.test(value)) return validatorReturn(false, i18n.t('Value must be a valid unsigned integer'))
    const val = Number(value)
    return validatorReturn(val >= 0 && val <= 70368744177664, i18n.t('Integer range is 0 to 2^46'))
  },
  min(value: string, min: number) {
    if (!/^[0-9]+$/.test(value)) {
      return validatorReturn(false, i18n.t('Must be a number'))
    }
    return validatorReturn(parseDecimal(value) >= +min, i18n.t('Minimum allowed value is %s.').format(min))
  },
  max(value: string, max: number) {
    if (!/^[0-9]+$/.test(value)) {
      return validatorReturn(false, i18n.t('Must be a number'))
    }
    return validatorReturn(parseDecimal(value) <= +max, i18n.t('Maximum allowed value is %s.').format(max))
  },
  max_bytes(value: string, maxlen: number) {
    return validatorReturn(len(value) <= maxlen, i18n.t('Maximum length of value is %s bytes.').format(maxlen))
  },
  phonedigit(value: string) {
    if (value.match(/^\+?[\d]+$/) == null) {
      return validatorReturn(false, i18n.t('A phone number containing 0-9 and + characters is accepted.'))
    }
    if (!(('' + value).length <= +16)) {
      return validatorReturn(false, i18n.t('Maximum length of value is %s.').format(16))
    }
    return rules.defaulttype(value)
  },
  timehhmmss(value: string) {
    return validatorReturn(!!value.match(/^[0-1][0-9]:[0-5][0-9]:[0-5][0-9]$/) || !!value.match(/^[0-2][0-3]:[0-5][0-9]:[0-5][0-9]$/), i18n.t('Time of format hh:mm:ss is accepted.'))
  },
  time(value: string) {
    return validatorReturn(!!value.match(/^[0-1][0-9]:[0-5][0-9]$/) || !!value.match(/^[0-9]:[0-5][0-9]$/) || !!value.match(/^[0-2][0-3]:[0-5][0-9]$/), i18n.t('Time of format hh:mm is accepted.'))
  },
  dateyyyymmdd(value: string, allowPast: boolean) {
    const hint = i18n.t('A date of format yyyy-mm-dd is accepted.')
    const pastDateHint = i18n.t('The provided date cannot be earlier than the current date.')
    const dateMatch = value.match(/^([1-9][0-9]{3})-(0[1-9]|1[0-2])-([0-3][0-9])$/)
    if (!dateMatch) return validatorReturn(false, hint)
    const date = dateMatch.shift()!
    const [year, month, day] = dateMatch.map(d => parseInt(d))
    if (!allowPast) {
      const currentTime = new Date().setHours(0, 0, 0, 0)
      const enteredTime = Date.parse(date)
      if (enteredTime < currentTime) return validatorReturn(false, pastDateHint)
    }
    return validatorReturn(day > 0 && day <= getDaysInMonth(month - 1, year), hint)
  },
  nospace(value: string) {
    return validatorReturn(value.match(/\s/g) === null, i18n.t('Any string without a space is accepted.'))
  },
  no_control_codes(value: string) {
    // eslint-disable-next-line no-control-regex
    return validatorReturn(value.match(/[\x00-\x1F]/g) === null, i18n.t('Using control codes is not accepted.'))
  },
  credentials_validate(value: string, allowSpace: 'allow-space' | boolean = false) {
    const _allowSpaces = allowSpace === 'allow-space' || allowSpace
    const hint = _allowSpaces ? i18n.t('All characters are allowed except `.') : i18n.t('All characters are allowed except ` and space.')
    const regex = _allowSpaces ? /^[^`]*$/ : /^[^` ]*$/
    return validatorReturn(!(value.match(regex) === null), hint)
  },
  // for reference:
  // default max-length for root_password should be 4094 symbols
  // minlength - 8
  root_password(value: string) {
    const hint = i18n.t('A password of at least one uppercase letter, one lowercase letter and one number is accepted.')
    return validatorReturn(value.match(/[a-z]/) != null && value.match(/[A-Z]/) != null && value.match(/[0-9]/) != null, hint)
  },
  renew_password(value: string, passwordPolicy: PasswordPolicy) {
    const upperValid = passwordPolicy.require_lower_upper === '1' ? /[A-Z]/.test(value) : true
    const lowerValid = passwordPolicy.require_lower_upper === '1' ? /[a-z]/.test(value) : true
    const digitValid = passwordPolicy.require_digits === '1' ? /[0-9]/.test(value) : true
    const specialValid = passwordPolicy.require_special === '1' ? /[~`!@#$%^&*()\-_+={}[\]|\\;:"<>,./?]/.test(value) : true
    if (upperValid && lowerValid && digitValid && specialValid) return validatorReturn(true)
    const rulesMessage = []
    if (!digitValid) rulesMessage.push(i18n.t('digit'))
    if (!upperValid) rulesMessage.push(i18n.t('uppercase letter'))
    if (!lowerValid) rulesMessage.push(i18n.t('lowercase letter'))
    if (!specialValid) rulesMessage.push(i18n.t('special symbol'))
    const hint = i18n.t('New password must contain %s.').format(rulesMessage.join(', '))
    return validatorReturn(false, hint)
  },
  FF_or_0(value: string) {
    const hint = i18n.t('Only values of 65280=ON, 0=OFF are allowed.')
    if (!/^(65280|0)$/.test(value)) {
      return validatorReturn(false, hint)
    }
    return validatorReturn(true, hint)
  },
  loglimit(value: string) {
    const hint = i18n.t('An time value with time interval(hour, minute, second) is accepted (e.g., 10/minute).')
    if (value.match(/^([0-9]+)\/(second|minute|hour)$/) != null) {
      let maxVal = 0
      switch (RegExp.$2) {
        case 'second':
          maxVal = 10000
          break
        case 'minute':
          maxVal = 600000
          break
        case 'hour':
          maxVal = 36000000
          break
      }
      return validatorReturn(parseInt(RegExp.$1) >= 1 && parseInt(RegExp.$1) <= maxVal, i18n.t('Length of the value must be from 1 to %s.').format(maxVal))
    }
    return validatorReturn(false, hint)
  },
  precision(value: string, precision = 6) {
    return validatorReturn(
      new RegExp(`^-?([0]|[1-9][0-9]*)\\.[0-9]{${precision}}$`).test(value),
      i18n.t('Floating part of number must contain %s digits (e.g., 25.%s).').format(precision, '0'.repeat(precision))
    )
  },
  precision_range(value: string, min: number, max: number, precision = 6) {
    const res = rules.range(value, min, max, true)
    return (!res.isValid && res) || rules.precision(value, precision)
  },
  router_id(value: string, param: string) {
    const _value = parseInt(value)
    if (param === 'ipv4') {
      return validatorReturn(
        (isValid(value, rules.uinteger) && _value > 0 && _value <= 4294967295) || isValid(value, rules.ip4addr),
        i18n.t('IPv4 addresses or 32-bit integers (1-4294967295) are accepted.')
      )
    } else if (param === 'ipv6') {
      return validatorReturn(
        (isValid(value, rules.uinteger) && _value > 0 && _value <= 4294967295) || isValid(value, rules.ip6addr),
        i18n.t('IPv6 addresses or 32-bit integers (1-4294967295) are accepted.')
      )
    }
    return validatorReturn(
      (isValid(value, rules.uinteger) && _value > 0 && _value <= 4294967295) || isValid(value, rules.ipaddr),
      i18n.t('IP addresses or 32-bit (1-4294967295) integers are accepted.')
    )
  },
  base64(value: string) {
    const hint = i18n.t('A base64 symbol string made up of a-zA-Z0-9/+= characters is accepted.')
    if (value.match(/^[a-zA-Z0-9/+]+=?=?$/) && value.length % 4 === 0) {
      return validatorReturn(true, hint)
    }
    return validatorReturn(false, hint)
  },
  no_prefix(value: string, prefix: string) {
    return validatorReturn(!value.startsWith(prefix), i18n.t('Value with no leading "%s" is accepted.').format(prefix))
  },
  prefix(value: string, prefix: string) {
    return validatorReturn(value.startsWith(prefix), i18n.t('Value without leading "%s" is not accepted.').format(prefix))
  },
  sms_rule(value: string) {
    return validatorReturn(!!value.match(/^[a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.[\] ]+$/), i18n.t('Following characters are accepted: %s and a space.').format('a-zA-Z0-9!@#$%&*+,-./=?^_`{|}~[]'))
  },
  subject_rule(value: string) {
    return validatorReturn(!!value.match(/^[a-zA-Z0-9!@#$%&*+-/=?^_`{|}~ ]+$/), i18n.t('Following characters are accepted: %s and a space.').format('a-zA-Z0-9!@#$%&*+,-./=?^_`{|}~'))
  },
  guid(value: string) {
    // Pattern taken from https://www.geeksforgeeks.org/how-to-validate-guid-globally-unique-identifier-using-regular-expression/
    const pattern = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/
    const hint = i18n.t('GUID which consists of five groups of hexadecimal digits which are seperated by hyphens is accepted.')
    return validatorReturn(!!value.match(pattern), hint)
  },
  /**
   * Validation from https://git.teltonika.lt/teltonika/rutx_open/-/issues/24866#note_1884712
   */
  posix_filename(value: string) {
    return validatorReturn(
      !!value.match(/[a-zA-Z0-9]+/) && !!value.match(/^[a-zA-Z0-9-_.]+$/),
      i18n.t('A string of at least one alphanumeric and any number of period(.), underscore(_) or hyphen(-) characters is accepted.')
    )
  },
  /**
   * validates that the value is not empty
   */
  required(value: any) {
    return validatorReturn(!isEmpty(value), i18n.t('Value is required'))
  }
} as const
