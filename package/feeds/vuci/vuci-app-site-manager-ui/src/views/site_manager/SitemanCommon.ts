import { ref, computed, type CSSProperties, type Ref, type ComputedRef } from 'vue'
import { createContext } from '@ui-core/utils/create-context'
import { useTranslate } from '@ui-core/composables/useI18n'
import IconSwmImg from './IconSwm.webp'
import IconTswImg from './IconTsw.webp'
import IconTapImg from './IconTap.png'
import type { DevmanDeviceStatus } from './SitemanTypes'

interface Group {
  id: number
  name: string
}

interface DeviceStatus {
  id: number
  paired: boolean
  custom_name?: string
  device_type?: string
  api_version: number
}

interface ErrorObject {
  code: number
  value: Array<{ id: number }>
}

export function useDevmanCommonFunction() {
  const $t = useTranslate()

  const latestApiVersion = ref(0.3)
  const syncErrors = ref<Array<{ id: number }>>([])
  const editErrors: Record<number | string, string> = {
    12: $t('Device returned authorization error'),
    13: $t('Site manager daemon error'),
    15: $t('The selected device(s) do not support groups. To enable this feature, please update the firmware of the device(s)'),
    17: $t('The selected device(s) do not support synchronization. To enable this feature, please update the firmware of the device(s)'),
    21: $t('Failed to synchronize wireless configuration'),
    default: $t('Failed to edit configuration')
  }
  const editableSectionErrors = ref([12, 13, 21])
  const logErrorTranslates = {
    API: $t('Failed to parse API response'),
    periodic_reboot: $t('Failed to synchronize periodic reboot configuration'),
    ping_reboot: $t('Failed to synchronize ping reboot configuration'),
    network: $t('Failed to synchronize network configuration'),
    ntp: $t('Failed to synchronize NTP configuration'),
    system: $t('Failed to synchronize system configuration'),
    wireless: $t('Failed to synchronize wireless configuration'),
    password: $t('Failed to change device password'),
    access_control: $t('Failed to configure SSH/WebUI access control'),
    fota_upgrade: $t('Firmware upgrade failed'),
    firstboot: $t('Device factory reset failed'),
    vlan: $t('Failed to synchronize VLAN configuration'),
    default: $t('An unexpected error occurred')
  }
  const groups = ref<Group[]>([])
  const deviceStatus = ref<DeviceStatus[]>([])

  const mappedGroups = computed(() => groups.value.map(group => [group.id, group.name]))
  const mappedDevices = computed(() => deviceStatus.value.filter(device => device.paired).map(device => [device.id, device.custom_name || device.device_type]))

  const validateSync = (sectionData: any, statusData: DeviceStatus[]) => {
    return new Promise<void>((resolve, reject) => {
      if (sectionData?.dm_device_id?.length > 0 && sectionData?.dm_device_id?.some(id => statusData.find(status => status.id === id && Number(status.api_version) < latestApiVersion.value))) {
        return reject($t('The selected device(s) do not support synchronization. To enable this feature, please update the firmware of the device(s)'))
      }
      return resolve()
    })
  }

  const handleEditErrorsMixin = (res: any, getDeviceNames: (data: any) => string[]) => {
    const errorObject: ErrorObject = 'payload' in res ? res.payload[0].errors[0] : res.data.errors[0]
    const errorCode = errorObject.code
    if (errorCode === 21) {
      const errorValues = removeDuplicateObjects(errorObject.value, 'id')
      if (getDeviceNames) {
        composeAlert(errorValues, getDeviceNames)
      } else {
        syncErrors.value = errorValues
      }
    }
    return editErrors[errorCode] || editErrors.default
  }

  const composeAlert = (data: any, getDeviceNames: (data: any) => string[]) => {
    const deviceNames = getDeviceNames(data)
    if (deviceNames.length === 1) {
      console.error($t('Failed to synchronize %s device configuration').format(deviceNames[0]))
    }
    if (deviceNames.length > 1) {
      console.error($t('Failed to synchronize these device configurations: %s').format(deviceNames.join(', ')))
    }
  }

  const removeDuplicateObjects = <T extends Record<string, any>>(array: T[], property: keyof T): T[] => {
    const map = new Map<T[keyof T], T>()
    array.forEach(obj => {
      map.set(obj[property], obj)
    })
    return Array.from(map.values())
  }

  function filterIcon(s: { device_type?: string; devicename?: string }): string {
    if (!s.device_type && !s.devicename) return 'tap'
    if (s.device_type?.includes('SWM') || s.devicename?.includes('SWM')) return 'swm'
    if (s.device_type?.includes('TAP') || s.devicename?.includes('TAP')) return 'tap'
    if (s.device_type?.includes('TSW') || s.devicename?.includes('TSW')) return 'tsw'
    return 'tap'
  }

  function composeDeviceNames(s: { dm_device_id: string[] }) {
    const maxDevicesToShow = 3
    const deviceIds = [...s.dm_device_id].splice(0, maxDevicesToShow)
    const formatedDeviceNames = deviceIds.map(id => mappedDevices.value.find(devices => devices[0] === id)?.[1])
    if (s.dm_device_id.length > maxDevicesToShow) {
      formatedDeviceNames.push($t('+%s more devices...').format(s.dm_device_id.length - maxDevicesToShow))
    }
    return formatedDeviceNames.join('; ')
  }

  function displayDevMan(group: string, self: { uciSection: { dm_group_id?: string; dm_device_id?: string[] } }) {
    const section = self.uciSection
    if (!section.dm_group_id && !section.dm_device_id) return '-'
    if (section.dm_group_id) return mappedGroups.value.find(item => item[0] === group)?.[1]
    if (section.dm_device_id) {
      return composeDeviceNames(section)
    }
  }

  function getDeviceImage(s: { device_type?: string; devicename?: string }) {
    const icon = filterIcon(s)
    if (icon === 'swm') return IconSwmImg
    if (icon === 'tsw') return IconTswImg
    return IconTapImg
  }

  function getDeviceImageStyle(s: { device_type?: string; devicename?: string }): CSSProperties {
    const icon = filterIcon(s)
    if (icon === 'swm') {
      return {
        width: '3.5em',
        height: '1.5em',
        display: 'block',
        objectFit: 'contain'
      }
    }
    if (icon === 'tap') {
      return {
        width: '3.5em',
        height: '3.5em',
        objectFit: 'contain'
      }
    }
    return {
      width: '3.25em',
      height: '3.25em',
      objectFit: 'contain'
    }
  }

  return {
    latestApiVersion,
    syncErrors,
    editErrors,
    editableSectionErrors,
    logErrorTranslates,
    groups,
    deviceStatus,
    mappedGroups,
    mappedDevices,
    validateSync,
    handleEditErrorsMixin,
    composeAlert,
    removeDuplicateObjects,
    filterIcon,
    displayDevMan,
    getDeviceImage,
    getDeviceImageStyle
  }
}

export const [provideGroupDeviceContext, useGroupDeviceContext] = createContext<{
  groups: Ref<(string | number)[][]>
  devices: Ref<(string | number)[][]>
}>('group-device')
export const [providePairedContext, usePairedContext] = createContext<{
  pairedDeviceIds: ComputedRef<string[]>
  deviceStatuses: Ref<DevmanDeviceStatus[]>
}>('paired-devices')
