<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { useUniversalGatewayUtils } from '@/composables/useUniversalGatewayUtils'
import { useTranslate } from '@ui-core/composables/useI18n'

/** @typedef {import('@/types/tagTypes').Dnp3OutstationTagConfig} Dnp3OutstationTagConfig */
/** @typedef {import('./Dnp3OutstationCommon').Dnp3OutstationConfig} Dnp3OutstationConfig */
/** @typedef {import('./Dnp3OutstationCommon').Dnp3SerialOutstationConfig} Dnp3SerialOutstationConfig */

const $t = useTranslate()
const { getTagSize } = useUniversalGatewayUtils(true)
/**
 * @type {Record<number, number>}
 */
const GROUP_DATA_BYTES = {
  1: 1,
  3: 1,
  20: 4,
  30: 4,
  110: 1,
  40: 2,
  10: 1
}

/**
 * @param {string} groupId
 * @return {number}
 */
export function getGroupDataBytes(groupId) {
  return GROUP_DATA_BYTES[groupId]
}
/**
 * @param {string | undefined} dnp3Index
 * @param {string | undefined} dnp3Group
 * @param {number | undefined} tagSize
 * @return {[number, number] | undefined}
 */
export function getOccupiedRegisterRange(dnp3Index, dnp3Group, tagSize) {
  if (!dnp3Index || !dnp3Group || !tagSize) return undefined

  const count = Math.ceil(tagSize / GROUP_DATA_BYTES[dnp3Group]) - 1
  const indexStart = Number(dnp3Index)
  if (isNaN(indexStart)) return undefined

  const indexEnd = indexStart + count
  return [indexStart, indexEnd]
}
/**
 * @param {Dnp3OutstationTagConfig} section
 * @param {{tags: Dnp3OutstationTagConfig[]; [key: string]: any }} uciData
 * @param {boolean} isTcp
 * @param {Dnp3OutstationConfig[] | Dnp3SerialOutstationConfig[]} servers
 * @return {{isValid: boolean, message: string}}
 */
export function validateObjectOverlap(section, uciData) {
  const newRegisterRange = getOccupiedRegisterRange(section.dnp3_index, section.dnp3_group, getTagSize(section))
  if (!newRegisterRange) return { isValid: true }

  const overlappedTag = findOverlappedRegister(section, uciData, newRegisterRange, false)
  if (overlappedTag) return { isValid: false, message: $t("Object range overlaps with object '%s'").format(overlappedTag.tag_name) }

  return { isValid: true }
}

/**
 * @param {{tags: Dnp3OutstationTagConfig[]; [key: string]: any }} uciData
 */
export function isRequestOverlappingRegisters(request, uciData) {
  if (request.data_type === '21') return false // unavailable type in data sources

  const reqBytes = GROUP_DATA_BYTES[request.data_type] || 1
  const reqRange = getOccupiedRegisterRange(request.index, request.data_type, reqBytes)
  const reqPermissions = ['40', '10'].includes(request.data_type) ? 'w' : 'r'

  const tagSection = {
    dnp3_group: request.data_type,
    dnp3_index: request.index,
    tag_permissions: reqPermissions
  }
  return !!findOverlappedRegister(tagSection, uciData, reqRange, true)
}

/**
 * @param {{tag_permissions: 'r' | 'w' | 'rw', dnp3_group: string, dnp3_index: string, [key: string]: any} | undefined} section
 * @param {{tags: Dnp3OutstationTagConfig[]; [key: string]: any }} uciData
 * @param {[number, number] | undefined} registerRange
 * @param {boolean} checkItself
 * @return {Dnp3OutstationTagConfig | undefined}
 */
function findOverlappedRegister(section, uciData, registerRange, checkItself) {
  const definedKeys = ['tag_permissions', 'dnp3_group', 'dnp3_index']
  if (!section || definedKeys.some(key => !section[key]) || !registerRange) return

  return uciData.tags.find(otherTag => {
    const skipSelf = !checkItself && otherTag.id === section.id
    if (skipSelf) return
    const isPermsNonOverlapping = otherTag.tag_permissions && otherTag.tag_permissions === section.tag_permissions
    if (otherTag.enabled === '1' && otherTag.dnp3_group === section.dnp3_group && isPermsNonOverlapping) {
      const otherRegisterRange = getOccupiedRegisterRange(otherTag.dnp3_index, otherTag.dnp3_group, getTagSize(otherTag))
      return !!otherRegisterRange && isRegistersOverlapping(registerRange, otherRegisterRange)
    }
  })
}

function isRegistersOverlapping(registerRange, otherRegisterRange) {
  return registerRange[0] <= otherRegisterRange[1] && otherRegisterRange[0] <= registerRange[1]
}

export default {
  data() {
    return {
      globalEnabled: { globalStatus: 'firstLoad' },
      formOptions: {
        /** @type {import('@/types/tagTypes').Dnp3OutstationTagConfig[]} */
        sourcedObjects: [],
        tagStatus: {}
      },
      stateChanged: false,
      infoMessage: this.$t('%s service is disabled, navigate to global settings configuration to enable it.').format('DNP3 client')
    }
  },
  computed: {
    ...mapState(useMainStore, ['modalOpen'])
  },
  watch: {
    'globalEnabled.globalStatus': function (value, oldValue) {
      if (oldValue === 'firstLoad') {
        if (!value) {
          this.$notification.info(this.infoMessage)
        }
      } else {
        this.stateChanged = true
      }
    },
    // Note: second state is watched because notification should only be created when modal is fully closed
    modalOpen(value) {
      if (!value && this.stateChanged) {
        this.stateChanged = false
        if (!this.globalEnabled.globalStatus) this.$notification.info(this.infoMessage)
        else this.$notification.remove(this.infoMessage)
      }
    }
  },
  methods: {
    afterLoad(uciData, clientType) {
      const clientName = {
        tcp: this.$t('TCP client'),
        serial: this.$t('Serial client')
      }[clientType]
      const requests = uciData.dnp3.map(s => `/api/dnp3/${clientType}/${s.id}/requests/config`)
      const objectsRequest = `/api/dnp3/${clientType === 'serial' ? 'serial_' : ''}outstation/objects/config`
      const tagStatusRequest = `/api/universal_gateway/status?client_service=dnp3_client`
      const fullRequests = ['/api/dnp3/global', objectsRequest, tagStatusRequest, ...requests]
      return this.$axios
        .bulkGet(fullRequests)
        .then(([global, sourcedObjects, tagStatus, ...requests]) => {
          if (global.success) {
            this.globalEnabled.globalStatus = global.data.client_enabled === '1'
          } else {
            this.$message.error(this.$t('Failed to load DNP3 client global data'))
          }
          this.formOptions.sourcedObjects = sourcedObjects.success ? sourcedObjects.data : []
          this.formOptions.tagStatus = tagStatus.success ? tagStatus.data : {}
          if (!sourcedObjects.success) this.$message.error(this.$t('Failed to load DNP3 Outstation objects data'))
          if (!tagStatus.success) this.$message.error(this.$t('Failed to load universal gateway status'))
          requests.forEach((response, index) => {
            const sectionName = uciData.dnp3[index].id
            if (response.success) uciData[sectionName] = response.data
            else this.$message.error(this.$t('Failed to load %s client requests for %s instance.').format(clientName, sectionName))
          })
          return uciData
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    clearRequests(self) {
      this.formData[self.id] = []
    }
  },
  render() {
    return ''
  }
}
</script>
