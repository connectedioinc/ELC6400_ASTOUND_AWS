import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { session } from '@ui-core/plugins/session'

export default function useOveripUtils() {
  const $t = useTranslate()
  const $message = useMessages()

  async function loadDataForEdit(axios, sectionIds) {
    const requests = [
      '/api/system/device/status',
      '/api/serial/status',
      { endpoint: '/api/firewall/zones/config', condition: session.hasAccess('network/firewall/zones', 'read') },
      { endpoint: '/api/certificates/config', condition: session.hasAccess('system/admin/certificates/manager', 'read') }
    ]
    const hasOveripReadAccess = session.hasAccess('services/serial_utilities/overip', 'read')
    if (hasOveripReadAccess) {
      const filterOveripRequests = sectionIds.map(id => `/api/overip/${id}/filters/config`)
      requests.push(...filterOveripRequests)
    }
    const response = await axios.bulkGet(requests)

    let serialDevices = []
    const deviceStatusResponse = response.shift()
    if (deviceStatusResponse.success && deviceStatusResponse.data.board.serial) {
      serialDevices = deviceStatusResponse.data.board.serial
    } else if (!deviceStatusResponse.success) {
      this.$message.error(this.$t('Failed to load serial data'))
    }

    let serialStatus = []
    const serialStatusResponse = response.shift()
    if (serialStatusResponse.success) {
      serialStatus = serialStatusResponse.data
    } else {
      $message.error($t('Failed to load rs serial status'))
    }

    let firewallZones = []
    const firewallZoneResponse = response.shift()
    if (firewallZoneResponse.success) {
      firewallZones = firewallZoneResponse.data.map(element => [element.name, element.name.toUpperCase()])
    } else {
      $message.error($t('Failed to load firewall zones'))
    }

    let certificates = []
    const certificatesResponse = response.shift()
    if (certificatesResponse.success) {
      certificates = certificatesResponse.data.generated || []
    } else {
      $message.error($t('Failed to load certificates'))
    }

    const uciData = {}
    if (hasOveripReadAccess) {
      response.forEach((response, index) => {
        const sectionId = sectionIds[index]
        if (response.success) {
          uciData[sectionId] = response.data
        } else {
          $message.error($t('Failed to load filters.').format(sectionId))
        }
      })
    }

    return {
      certificates,
      firewallZones,
      serialStatus,
      serialDevices,
      uciData
    }
  }

  function afterEditLoad(section) {
    section.initialDevice = section.device
    section.isPskSet = section.psk === 'set'
    section.psk = ''
  }

  function validateEdit(options) {
    const { $serial, section, serialStatus, formData } = options

    return new Promise((resolve, reject) => {
      if (Array.isArray(section.address_connect)) {
        if (section.mode !== 'bidirect' && section.connect_on_data !== '1') {
          if (section.address_connect.length > 16) {
            return reject($t('Maximum amount of destination addresses is exceeded. Maximum is 16.'))
          }
          if (new Set(section.address_connect).size !== section.address_connect.length) {
            return reject($t('Duplicate destination address values are not allowed.'))
          }
        } else if (section.address_connect.length !== 1) {
          section.address_connect = section.address_connect.slice(0, 1)
        }
      } else {
        if (section.mode === 'bidirect' || section.connect_on_data === '1') {
          section.address_connect = [section.address_connect]
        }
      }

      const response = $serial.validateBeforeSave(serialStatus, formData.overip, 'OverIP', false)
      if (!response.isValid) {
        return reject(response.message)
      }

      return resolve()
    })
  }

  return { loadDataForEdit, afterEditLoad, validateEdit }
}
