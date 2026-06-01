import { i18n } from '@ui-core/plugins/i18n'

// const ipv6 = '(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))'
// old email pattern: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
// const pattern = {
//   email: /^([\w+-]+\.)*[\w+-]+@([\w+-]+\.)*[\w+-]+\.[a-zA-Z0-9]+$/,
//   url: new RegExp('^([a-zA-Z]+(?:[+.-]?[a-zA-Z0-9]+)+://)?(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:[a-z\\u00a1-\\uffff0-9-]*[a-z\\u00a1-\\uffff0-9]+)(?:\\.[a-z\\u00a1-\\uffff0-9-]*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))|\\[' +
//     ipv6 + '\\])|localhost)(?<port>:\\d{1,})?(?:(/|\\?|#)[^\\s`]*)?$', 'i'),
//   ipv6: new RegExp(ipv6, 'i')
// }

export const defaultLengths = {
  credentials_validate: '64',
  ip6addr: '64',
  ipaddr: '64',
  base64: '64',
  hostname: '64',
  hostport: '64',
  host: '64',
  email: '64',
  wpakey: '64',
  root_password: '32',
  ip4addr: '18',
  ipmask4: '18',
  loglimit: '18',
  macaddr: '18',
  geofencing: '12',
  dateyyyymmdd: '12',
  uciname: '16',
  protourl: '128',
  url: '128',
  directory: '512',
  posix_filename: '255'
}

const VuciValidator = {
  buildRule(rule, ...args) {
    return value => {
      if (!value && value !== false) return true
      return this.exec(rule, value, args)
    }
  },
  compile(propRules) {
    let pos = 0
    let esc = false
    let depth = 0
    let stack = []

    propRules += ','

    for (let i = 0; i < propRules.length; i++) {
      if (esc) {
        esc = false
        continue
      }

      switch (propRules.charCodeAt(i)) {
        case 92:
          esc = true
          break

        case 40:
        case 44:
          if (depth <= 0) {
            if (pos < i) {
              let label = propRules
                .substring(pos, i)
                .replace(/\\(.)/g, '$1')
                .replace(/^[ \t]+/g, '')
                .replace(/[ \t]+$/g, '')
              if (label && !isNaN(label)) {
                stack.push(parseFloat(label))
              } else if (label.match(/^(['"]).*\1$/)) {
                stack.push(label.replace(/^(['"])(.*)\1$/, '$2'))
              } else if (typeof this[label] === 'function') {
                stack.push(label)
              } else {
                throw new Error(`Unhandled token ${label}`)
              }
            }

            pos = i + 1
          }

          depth += propRules.charCodeAt(i) === 40
          break

        case 41:
          if (--depth <= 0) {
            const args = this.compile(propRules.substring(pos, i))
            stack.push(args)
            pos = i + 1
          }

          break
      }
    }
    const res = stack[0] in this ? this.buildRule(...stack.flat()) : stack
    return res
  },
  list(subvalidator, subargs) {
    if (typeof subvalidator !== 'function') {
      return { isValid: false }
    }
    const tokens = this.value.match(/[^ \t]+/g)
    const multipleHint = i18n.t('Multiple space separated values are allowed.')
    for (let i = 0; i < tokens.length; i++) {
      const result = subvalidator(tokens[i], subargs)
      result.message = `${multipleHint} ${result.message}`
      if (result.isValid === false) {
        return result
      }
    }
    return { isValid: true }
  },
  neg(rule) {
    const val = this.value.replace(/^[ \t]*![ \t]*/, '')
    if (val.length === 0) {
      return { isValid: false, message: i18n.t('Value after an exclamation mark is required.') }
    }
    const validation = rule(val, arguments[1])
    return validation.isValid
      ? validation
      : {
          isValid: false,
          message: i18n.t('%s. Also negation acceptable using exclamation mark.').format(validation.message)
        }
  },
  exec(func, value, args) {
    let validationValues = []
    if (!Array.isArray(value) && value != null) {
      validationValues = [value]
    } else if (Array.isArray(value)) {
      validationValues = value
    } else {
      validationValues = [this.value]
    }
    let validationResult = { isValid: true }
    for (let i = 0; i < validationValues.length; i++) {
      this.value = validationValues[i]
      if (typeof this[func] === 'function') {
        validationResult = this[func].apply(this, args)
      } else if (func === 'function') {
        validationResult = func.apply(this, args)
      } else {
        throw new Error(`Validation function - ${func} does not exist.`)
      }
      if (!validationResult.isValid) {
        return validationResult
      }
    }
    return validationResult
  },
  isValid(func) {
    return this.exec(func).isValid
  }
}

export { VuciValidator }

/**
 * attaches rules to this vuciValidator object.
 * @param {Function[]} rules array of rule function that should atleast accept 1 argument - value passed to be validated
 */
function addRules(rules) {
  rules.forEach(ruleFn => {
    /* eslint-disable no-useless-call */
    VuciValidator[ruleFn.name] = (...params) => ruleFn.call(null, VuciValidator.value, ...params)
  })
}

export default {
  install(app, config) {
    addRules(config?.rules?.flat())
    app.config.globalProperties.$VuciValidator = VuciValidator
  }
}
