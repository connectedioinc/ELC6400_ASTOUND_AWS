<template>
  <NavigationTabs>
    <TabContent
      name="device"
      :title="$t('Device update')"
    >
      <firmware-update
        v-model:selected-from="deviceSelectedFrom"
        v-model:selected-version="deviceSelectedVersion"
        v-model:keep-settings="keepSettings"
        type="device"
        :read-only-page="store.readOnlyPage"
        :info-loaded="infoLoaded"
        :current-data="currentFirmwareData"
        :server-data="serverFirmwareData"
        :parsed-stable-fw-download-url="parsedStableFwDownloadUrl"
        :parsed-latest-fw-download-url="parsedLatestFwDownloadUrl"
        :firmware-update-info="store.firmwareUpdateInfo !== 'N/A' ? store.firmwareUpdateInfo : {}"
        :company-short="brand.text('companyShort')"
        :fw-sdk-url="brand.text('fwSdkDownloadsURL')"
        :changelog-url="brand.text('fwChangelog').format(store.device)"
        @upload-error="(code: number) => toErrorPrompt(getUploadError(code))"
        @uploaded="event => onUploadFirmware('device')(event)"
        @download="downloadDeviceFw"
      />
    </TabContent>

    <TabContent
      v-if="isArray(modemInfo) && modemInfo.length > 0"
      name="modem"
      :title="$t('Modem update')"
    >
      <firmware-update
        v-model:selected-from="modemSelectedFrom"
        v-model:selected-modem="selectedModem"
        type="modem"
        :read-only-page="store.readOnlyPage"
        :info-loaded="infoLoaded"
        :show-mobile-msg="showMobileMsg"
        :current-data="currentModemData"
        :server-data="serverModemData"
        :modem-options="modemOptions"
        :company-short="brand.text('companyShort')"
        :file-updates-supported="!store.hasPackages('dfota.control')"
        @upload-error="(code: number) => toErrorPrompt(getUploadError(code))"
        @uploaded="event => onUploadFirmware('modem')(event)"
        @download="downloadModemFw"
      />
    </TabContent>
  </NavigationTabs>

  <fw-verify
    :open="verifyStep"
    :fw-data="verification"
    :keep-settings="keepSettings"
    @cancel-upgrade="verifyStep = false"
  />
</template>

<script setup lang="ts">
import { h, ref, computed, watch, onMounted } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useAlerts, useMessages, usePrompt } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import { useMainStore } from '@/stores/main'
import FwVerify from './FwVerify.vue'
import FirmwareUpdate from './FirmwareUpdate.vue'
import TltButton from '@ui-core/tlt-design/form/core/TltButton.vue'
import { isArray, isObject } from '@ui-core/utils/inspect'
import { date } from '@ui-core/plugins/date'
import { axios } from '@ui-core/plugins/axios'
import { useNotifications } from '@/stores/messages'
import { brand } from '@ui-core/plugins/brand'
import { mobile } from '@/plugins/mobile'
import { reconnect } from '@ui-core/plugins/helper'
import { $bus } from '@ui-core/plugins/event-bus'
import TabContent from '@ui-core/components/tabs/TabContent.vue'

interface FirmwareInfo {
  version?: string
  build_date?: string
  kernel_version?: string
}

interface ModemInfo {
  id: string
  type: string
  version?: string
  cfg_version?: string
}

interface ModemStatus {
  id: string
  mobile_dfota?: boolean
}

interface UpdateInfo {
  version?: string
  stable_version?: string
}

interface ModemUpdateInfo {
  id: string
  update_exists: string
}

interface Verification extends Record<string, any> {
  fwType?: 'device' | 'modem'
  online?: boolean
}

interface TableDataItem {
  title: string
  value?: string
  slotName?: string
  hint?: string
  customHints?: Array<{ title: string; info: string }>
}

interface ModemOption {
  name: string
  value: string
}

interface UploadResponse {
  res: {
    data: {
      valid: string
      hw_support: string
      md5: string
      size: string
      newer: string
      sha256: string
      allow_backup: string
      message_code: string
      fw_version: string
    }
  }
}

defineOptions({
  layout: 'none'
})

const $t = useTranslate()
const message = useMessages()
const alert = useAlerts()
const prompt = usePrompt()
const store = useMainStore()
const notifications = useNotifications()

const fwInfo = ref<FirmwareInfo>({})
const modemInfo = ref<ModemInfo[]>([])
const modemStatus = ref<ModemStatus[]>([])
const updateInfo = ref<UpdateInfo | 'N/A'>({})
const modemUpdateInformation = ref<ModemUpdateInfo[]>([])
const fotaEnabled = ref(false)
const keepSettings = ref(true)
const verifyStep = ref(false)
const startedDownload = ref(false)
const downloadFailedGuard = ref(true)
const loadingInfo = ref($t('Verifying...'))
const selectedModem = ref('3-1')
const verification = ref<Verification>({})
const deviceSelectedFrom = ref<'server' | 'file'>('server')
const deviceSelectedVersion = ref<'stable' | 'latest'>('stable')
const modemSelectedFrom = ref<'server' | 'file'>(store.hasPackages('dfota.control') ? 'server' : 'file')
const infoLoaded = ref(false)
const deviceRAMStatus = ref(0)
const isCancellingDownload = ref(false)

const statusMessages = {
  newest: $t('Newest version installed on the device'),
  newestModem: $t('Newest version installed on the modem'),
  noUpdate: $t('No updates available')
} as const

const timer = useTimer({
  method: getDownloadProgress,
  time: 1500,
  autostart: false,
  immediate: true
})

const parsedStableFwDownloadUrl = computed(() => buildFirmwareDownloadUrl('stable_version'))
const parsedLatestFwDownloadUrl = computed(() => buildFirmwareDownloadUrl('version'))

const currentFirmwareData = computed(() => {
  const tableData: TableDataItem[] = [
    { title: $t('Firmware version'), value: fwInfo.value?.version },
    { title: $t('Firmware build date'), value: fwInfo.value?.build_date?.split(' ')[0] },
    { title: $t('Kernel version'), value: fwInfo.value?.kernel_version }
  ]
  return tableData
})

const serverFirmwareData = computed(() => {
  const tableData: TableDataItem[] = [
    { title: $t('Stable firmware'), value: stableFwVersion.value, slotName: 'stable_fw_version' },
    { title: $t('Latest firmware'), value: fwVersion.value, slotName: 'latest_fw_version' },
    { title: $t('%s downloads').format('FW & SDK'), slotName: 'fw_sdk' },
    { title: $t('Changelog'), slotName: 'changelog' }
  ]
  return tableData
})

const stableFwVersion = computed(() => {
  if (!fotaEnabled.value) return $t('FOTA service is disabled')
  if (isObject(updateInfo.value) && !updateInfo.value?.stable_version && updateInfo.value?.stable_version !== '') {
    return $t('Checking...')
  }
  if (updateInfo.value === 'N/A' || !store.firmwareUpdateInfo) return statusMessages.noUpdate
  if (!updateInfo.value?.stable_version || updateInfo.value?.stable_version === '') return statusMessages.noUpdate
  if (updateInfo.value?.stable_version === 'newest') return statusMessages.newest
  return updateInfo.value?.stable_version
})

const fwVersion = computed(() => {
  if (!fotaEnabled.value) return $t('FOTA service is disabled')
  if (isObject(updateInfo.value) && !updateInfo.value?.version) return $t('Checking...')
  if (updateInfo.value === 'N/A' || !store.firmwareUpdateInfo) return statusMessages.noUpdate
  if (updateInfo.value?.version === 'Fw_newest' || updateInfo.value?.version === 'newest') {
    return statusMessages.newest
  }
  return updateInfo.value?.version || statusMessages.noUpdate
})

const currentModemData = computed(() => {
  if (!modemInfo.value.length || !isArray(modemInfo.value)) return []
  const tableData: TableDataItem[] = []
  modemInfo.value.forEach(modem => {
    const fwHints = modem.cfg_version
      ? [
          {
            title: $t("Modem's current version:"),
            info: modem.version || '-'
          },
          {
            title: $t('Configuration version:'),
            info: modem.cfg_version
          }
        ]
      : undefined

    tableData.push({
      title: $t('%s firmware version').format(modem.type),
      value: modem.version,
      hint: modem.cfg_version ? $t("Modem's current firmware version.") : undefined,
      customHints: fwHints,
      slotName: modem.cfg_version ? 'modem_version_with_config' : undefined
    })
  })

  return tableData
})

const serverModemData = computed(() => {
  if (!store.hasPackages('dfota.control') || modemInfo.value.length === 0) return []
  return parseModemData()
})

const modemOptions = computed(() => {
  const options: ModemOption[] = [{ name: $t('All'), value: 'all' }]

  if (!isArray(modemInfo.value) || !isArray(modemUpdateInformation.value)) return options

  const modems = modemUpdateInformation.value.filter(modem => modem.update_exists === '1')
  const modemIds = modemInfo.value.filter(modem => modems.some(mod => mod.id === modem.id)).map(modem => ({ name: modem.type, value: modem.id }))

  return modemIds.length < 2 ? modemIds : [...options, ...modemIds]
})

const hasModemUpdates = computed(() => {
  return modemUpdateInformation.value?.some(i => i.update_exists === '1') ?? false
})

const showMobileMsg = computed(() => {
  if (!modemStatus.value || modemStatus.value.length === 0) return false

  const modem = selectedModem.value === 'all' ? modemStatus.value[0] : modemStatus.value.find(m => m.id === selectedModem.value)

  return !!modem?.mobile_dfota
})

watch(
  () => [store.firmwareUpdateInfo, store.fotaInfo],
  ([firmwareInfo, fotaInfo]) => {
    if (firmwareInfo) {
      modemUpdateInformation.value = store.modemUpdateInfo
      updateInfo.value = firmwareInfo
      infoLoaded.value = true
    }
    if (fotaInfo?.enabled === '1') {
      fotaEnabled.value = true
    }
  },
  { immediate: true }
)

watch(
  modemOptions,
  options => {
    if (options.length > 1 && options[0].value === 'all') {
      selectedModem.value = 'all'
    } else if (options.length === 1) {
      selectedModem.value = options[0].value
    }
  },
  { immediate: true }
)

function showNotification(): void {
  const remove = notifications.info(
    {
      id: 'subscribe',
      text: $t('Sign up for our newsletter to get the latest news, events, and product changes delivered directly to your inbox.'),
      action: {
        text: $t('Subscribe to newsletter'),
        href: brand.text('subscribeURL'),
        onClick: () => {
          store.showNewsletterNotification = false
          remove?.()
        }
      },
      onClose: () => (store.showNewsletterNotification = false)
    },
    true
  )
}

function eolNotificationShown(): void {
  if (!store.board?.eol) return
  const eol = store.board.eol
  const eolDate = eol.date

  const now = new Date()
  const monthsUntilEOL = date(eolDate).diff(now, 'month')
  if (monthsUntilEOL > 6) return

  const hasReplacement = !!eol?.replacement?.length
  let title = ''
  let text = ''

  if (monthsUntilEOL <= 0) {
    if (hasReplacement) {
      title = $t('Device has reached EOL, with replacement available')
      text = $t('Device has reached end of support. We recommend exploring product lineup. For more information please visit EOL page.')
    } else {
      title = $t('Device has reached EOL, without replacement available')
      text = $t('Device has reached end of support. For more information please visit EOL page.')
    }
  } else {
    if (hasReplacement) {
      title = $t('Device is nearing EOL, with replacement available')
      text = $t('Device is nearing end of support (%s). We recommend exploring product lineup. For more information please visit EOL page.').format(eol.date)
    } else {
      title = $t('Device is nearing EOL, without replacement available')
      text = $t('Device is nearing end of support (%s). For more information please visit EOL page.').format(eol.date)
    }
  }

  alert.info({
    id: 'eol-notification',
    title,
    text,
    action: {
      text: $t('Go to EOL'),
      to: brand.text('eolURL'),
      type: 'button'
    }
  })
}

function buildFirmwareDownloadUrl(versionType: 'stable_version' | 'version') {
  if (updateInfo.value === 'N/A') return undefined
  const version = updateInfo.value?.[versionType]
  if (!version || version === 'N/A' || version === 'newest' || version === 'Fw_newest') return

  const regex = /(?<=^|\.)0+(?=\d)/g
  const parts = version.split('_')
  const cleanVersion = parts[2]?.replace('00.', '')?.replace(regex, '')
  return brand.text('fwDownloadUrl').format(cleanVersion, parts[0], version)
}

function getUploadErrorIndex(code: number): number {
  if ([1, 2, 3, 4, 5, 6, 17].includes(code)) return 0
  if ([7, 8, 9, 10].includes(code)) return 1
  if ([11, 13, 14].includes(code)) return 2
  if (code === 15) return 3
  if ([12, 16].includes(code)) return 4
  if (code === 18) return 5
  if (code === 150) return 6
  if (code === 122 && deviceRAMStatus.value < 30) return 7
  return 8
}

function getUploadError(code: number) {
  const index = getUploadErrorIndex(code)
  const officialSourcesLink = h('a', { class: 'tlt-link', target: '_blank', href: 'https://wiki.teltonika-networks.com/view/FW_%26_SDK_Downloads' }, ' official sources')
  const makeSure = () => h('p', null, [$t('Make sure that your firmware is obtained from'), officialSourcesLink])
  const rebootDevice = () => h('p', null, ['Please', ' ', h(TltButton, { onClick: onReboot, type: 'text', class: 'inline!', size: 'lg' }, 'reboot'), ' ', 'device and try again'])
  const officialSources = () => h('p', null, ['Check', ' ', officialSourcesLink, ' ', 'for newer firmware version.'])
  const notEnoughSpace = () => h('p', null, ['Not enough free space in RAM. Disable unused services to free up the space and try again.'])
  const lowBattery = () => h('p', null, ['Upgrade terminated due to low battery level.'])

  const errs = [
    () => ({ title: $t('Invalid firmware image'), content: makeSure }),
    () => ({ title: $t('Mismatching manufacturing information'), content: makeSure }),
    () => ({ title: $t('Firmware image is incompatible with this device'), content: makeSure }),
    () => ({ title: $t('Current device state is insufficient for firmware update'), content: rebootDevice }),
    () => ({ title: $t('Firmware image is too old'), content: officialSources }),
    () => ({ title: $t('Low battery'), content: lowBattery }),
    () => ({ title: $t('Not enough free space in RAM'), content: rebootDevice }),
    () => ({ title: $t('Insufficient memory for this operation'), content: notEnoughSpace }),
    () => ({ title: $t('An unexpected error occurred'), content: () => null })
  ]
  return errs[index]()
}

function toErrorPrompt(message: { title: string; content: any }): void {
  prompt.show({
    ...message,
    icon: { name: 'error', class: 'text-theme-text-danger' },
    okDisplay: false,
    cancelText: $t('Close')
  })
}

function afterLoad(): Promise<void> {
  store.spin()
  return axios
    .bulkGet(['/api/firmware/device/status', '/api/firmware/modem/status', { endpoint: '/api/modems/status', condition: 'mobifd.control' }, '/api/system/device/usage/status'])
    .then(([firmware, modem, modemStatusData, deviceStatus]) => {
      if (modem.success) {
        modem.data.modems.forEach((modem: ModemInfo) => (modem.type = $t(modem.type)))
        modemInfo.value = modem.data.modems
      }
      if (modemStatusData.success) modemStatus.value = mobile.parseModems(modemStatusData.data)
      fwInfo.value = firmware.success ? firmware.data : {}
      if (deviceStatus.success) deviceRAMStatus.value = deviceStatus.data.memory.ram_free
      if (!firmware.success) message.error($t('Failed to load firmware data'))
      if (!modem.success) message.error($t('Failed to load modem data'))
      if (!modemStatusData.success) message.error($t('Failed to load modem status'))
      if (!deviceStatus.success) message.error($t('Failed to load device status'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
    .finally(() => {
      store.spin(false)
    })
}

function parseModemData(): TableDataItem[] {
  if (!isArray(modemInfo.value)) return []
  return buildModemTableData()
}

function getModemStatus(modemId: string): string {
  if (!fotaEnabled.value) return $t('FOTA service is disabled')
  if (isObject(updateInfo.value) && !updateInfo.value?.version) return $t('Checking...')
  if (updateInfo.value === 'N/A' || !store.firmwareUpdateInfo) return statusMessages.noUpdate

  const modemUpdate = modemUpdateInformation.value?.find(modem => modem.id === modemId)
  if (!modemUpdate) return $t('Checking...')
  return modemUpdate?.update_exists === '0' ? statusMessages.newestModem : $t('Update available')
}

function buildModemTableData(): TableDataItem[] {
  if (!modemInfo.value.length || !isArray(modemInfo.value)) return []
  return modemInfo.value.map(modem => createModemEntry(modem.type, hasModemUpdate(modem.type), getModemStatus(modem.id)))
}

function createModemEntry(title: string, hasUpdate: boolean, status: string): TableDataItem {
  return {
    title: $t(title),
    value: hasUpdate && fotaEnabled.value ? $t('Update available') : status,
    slotName: hasUpdate && fotaEnabled.value ? 'modem' : undefined
  }
}

function hasModemUpdate(type: string): boolean {
  if (!modemInfo.value.length || !isArray(modemInfo.value)) return false
  return modemInfo.value?.some(modem => modemUpdateInformation.value?.some(update => update.id === modem.id && update.update_exists === '1') && modem.type === type) ?? false
}

function onUploadFirmware(fwType: 'device' | 'modem') {
  return ({ res }: UploadResponse) => {
    verifyStep.value = true
    verification.value = {
      ...res.data,
      fwType,
      online: false
    }
  }
}

function downloadDeviceFw() {
  const validationResult = validateDeviceDownload()
  if (validationResult !== true) {
    if (validationResult.includes('Newest')) return message.info($t(validationResult))
    return message.error($t(validationResult))
  }
  loadingInfo.value = $t('Downloading...')
  downloadDeviceFirmware()
}

function validateDeviceDownload(): true | string {
  const currentFwVersion = deviceSelectedVersion.value === 'stable' ? stableFwVersion.value : fwVersion.value
  if (!fotaEnabled.value || currentFwVersion === statusMessages.noUpdate) {
    return $t('Updates from server are not available')
  }
  if (currentFwVersion === statusMessages.newest) {
    return statusMessages.newest
  }
  return true
}

function downloadDeviceFirmware(): Promise<void> {
  store.spin(loadingInfo.value)
  verification.value.fwType = 'device'
  verification.value.online = true
  const data = {
    type: deviceSelectedVersion.value
  }
  return axios
    .post('/api/firmware/actions/fota_download', { data })
    .then(() => {
      timer.start()
    })
    .catch(handleDownloadError)
}

function downloadModemFw() {
  if (!hasModemUpdates.value) {
    return message.error($t('No modem updates available'))
  }

  const modemText = selectedModem.value === 'all' ? $t('both modems') : modemInfo.value.find(m => m.id === selectedModem.value)?.type || $t('modem')

  prompt.show({
    icon: { name: 'info', class: 'text-theme-text-info' },
    title: $t('Flash new firmware on %s').format(modemText),
    content: $t('After proceeding, you will lose current mobile connection, and the %s will be temporarily unreachable.').format(modemText),
    okText: $t('Proceed'),
    cancelText: $t('Cancel'),
    onOk: () => {
      performModemDownload()
    }
  })
}

function performModemDownload() {
  store.spin($t('Downloading...'))
  notifications.remove({ id: 'dfota_error' })
  let data = {}
  data = { modem: selectedModem.value }
  const modemText =
    selectedModem.value === 'all' ? (modemInfo.value.length > 1 ? $t('Both modems') : $t('Primary modem')) : modemInfo.value.find(m => m.id === selectedModem.value)?.type || $t('modem')

  return axios
    .post('/api/firmware/actions/fota_download_modem', { data })
    .then(() => {
      message.success($t('%s firmware update started').format(modemText))
      modemUpdateInformation.value = selectedModem.value === 'all' ? [] : modemUpdateInformation.value.filter(info => info.id !== selectedModem.value)
      store.modemUpdateInfo = modemUpdateInformation.value
    })
    .catch((err: any) => {
      if (err?.response?.data?.errors?.some((i: { code: number }) => i.code === 15)) {
        return message.error($t('Updates from server are not available'))
      }
      message.error($t('Failed to start %s firmware download').format(modemText))
    })
    .finally(() => {
      store.spin(false)
    })
}

function handleDownloadError(err: any): void {
  if (err?.response?.data?.errors?.some((i: { code: number }) => i.code === 15)) {
    updateInfo.value = 'N/A'
    message.error($t('Updates from server are not available'))
  } else {
    message.error($t('Failed to start firmware download'))
  }
  store.spin(false)
}

function getDownloadProgress() {
  if (isCancellingDownload.value) {
    isCancellingDownload.value = false
    return Promise.resolve()
  }
  return axios
    .get('/api/firmware/device/progress/status')
    .then(({ data }) => {
      if (data.process === 'started') {
        startedDownload.value = true
      }

      if (data.process === 'failed' && downloadFailedGuard.value) {
        store.spin(false)
        timer.stop()
        return prompt.show({
          icon: { name: 'error', class: 'text-theme-text-danger' },
          title: $t('Download failed'),
          content: $t('The download was unable to complete. Retry?'),
          okText: $t('Retry'),
          cancelText: $t('Cancel'),
          onOk: () => {
            downloadFailedGuard.value = false
            axios
              .post('/api/firmware/actions/fota_download')
              .then(() => {
                timer.start()
              })
              .catch((err: any) => {
                if (err?.response?.data?.errors?.some((i: { code: number }) => i.code === 15)) {
                  updateInfo.value = 'N/A'
                  return message.error($t('Updates from server are not available'))
                }
                message.error($t('Failed to start firmware download'))
              })
              .finally(() => {
                store.spin(false)
              })
            loadingInfo.value = $t('Downloading...')
            store.spin(loadingInfo.value)
          },
          onCancel: () => {
            timer.stop()
            store.spin(false)
          }
        })
      }

      if (startedDownload.value && data.process !== 'failed') {
        store.spin(false)
        loadingInfo.value = $t('Downloading...') + data.percents + '%'
        const showCancelButton = Number(data.percents) <= 70 && Number(data.percents) > 2
        store.spin({
          tip: loadingInfo.value,
          cancelButton: showCancelButton,
          cancelAction: () => {
            cancelFwDownload()
          }
        })

        if (data.percents === '100' && data.process === 'succeeded') {
          timer.stop()
          store.spin(false)
          verifyDownloadFw()
        }
        downloadFailedGuard.value = true
      } else {
        loadingInfo.value = $t('Downloading...') + '0%'
      }
    })
    .catch(() => {
      store.spin(false)
      message.error($t('Failed to load download progress'))
    })
}

function verifyDownloadFw(): Promise<void> {
  loadingInfo.value = $t('Download complete. Verifying...')
  store.spin(loadingInfo.value)
  return axios
    .post('/api/firmware/actions/verify')
    .then(({ data }) => {
      if (data.valid === '1') {
        verifyStep.value = true
        verification.value = data
        verification.value.fwType = 'device'
        verification.value.online = false
      } else {
        toErrorPrompt(getUploadError(Number(data.message_code)))
      }
    })
    .catch(() => {
      message.error($t('Failed to verify downloaded firmware'))
    })
    .finally(() => {
      store.spin(false)
    })
}

function cancelFwDownload(): Promise<void> {
  if (isCancellingDownload.value) return Promise.resolve()
  isCancellingDownload.value = true
  return axios
    .post('/api/firmware/actions/fota_cancel')
    .then(() => {
      verification.value = {}
      message.success($t('Firmware download has been canceled'))
    })
    .catch(() => {
      message.error($t('Failed to cancel firmware download'))
    })
    .finally(() => {
      store.spin(false)
      timer.stop()
    })
}

function onReboot(): void {
  prompt.show({
    title: $t('Reboot this device?'),
    content: $t('During reboot, the device will not be reachable for 1-2 minutes.'),
    okText: $t('Reboot'),
    cancelText: $t('Cancel'),
    onOk: reboot
  })
}

function reboot() {
  return axios
    .post('/api/system/actions/reboot')
    .then(() => reconnect($t('Rebooting')))
    .catch(() => message.error($t('Failed to reboot')))
}

onMounted(() => {
  $bus.on('update-firmware-data', afterLoad)
  afterLoad()
  if (store.showNewsletterNotification && brand.text('subscribeURL')) showNotification()
  if (store.board?.eol) eolNotificationShown()
})
</script>
