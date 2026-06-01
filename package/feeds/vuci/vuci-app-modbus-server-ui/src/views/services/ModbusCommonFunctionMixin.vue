<script>
import { getValidationErrorMessage, validatePosixPath } from '@/plugins/fileValidator'
import { rules } from '@/validation-rules'

export default {
  methods: {
    regFileValidate(v, section, serialServers, tcpServers = []) {
      const normalizedPath = section.regfile?.replace(/^\/var/, '/tmp')
      const duplicateRegfileInstance =
        tcpServers.find(s => s.regfile?.replace(/^\/var/, '/tmp') === normalizedPath) || serialServers.find(s => s.id !== section.id && s.regfile?.replace(/^\/var/, '/tmp') === normalizedPath)
      if (duplicateRegfileInstance) {
        return { isValid: false, message: this.$t("Register file path is already used in '%s' Modbus TCP/Serial server instance").format(duplicateRegfileInstance.name || duplicateRegfileInstance.id) }
      }

      const [isValid, errorCode] = validatePosixPath(normalizedPath, 'file')
      if (!isValid) return { isValid: false, message: getValidationErrorMessage(errorCode) }

      return { isValid: true }
    },
    writeParseRegFile([prefix, path]) {
      return prefix === '/usr/share/modbus/' ? `/${path}` : `${prefix}${path}`
    },
    loadParseRegFile(value) {
      const prefixMatch = ['/mnt/', '/tmp/', '/var/'].find(p => value.startsWith(p))
      const prefix = prefixMatch || '/usr/share/modbus/'
      const path = prefix !== '/usr/share/modbus/' ? value.replace(prefix, '') : value.slice(1)
      return [prefix, path]
    },
    handleErrors(errors) {
      const errorMessages = {
        1: this.$t('Selected device is enabled elsewhere'),
        2: this.$t('Selected device is disconnected, it can not be enabled.'),
        3: this.$t('Absolute file path must be provided (must start with /).'),
        103: this.$t('Validation failed')
      }
      const errorCode = errors.data.errors[0].code

      if ((errorCode >= 1 && errorCode <= 3) || errorCode === 103) {
        return errorMessages[errorCode]
      }

      return getValidationErrorMessage(errorCode)
    },
    getRegFileFirstRegister(s) {
      return this.$store.isSwitch ? '10000' : '1025'
    },
    validateRegFileFirstRegister(value) {
      return rules.irange(value, Number(this.getRegFileFirstRegister(value)), 65536)
    }
  }
}
</script>
