<template>
  <vuci-form
    ref="vuciForm"
    v-model="formData"
    config="system"
    :after-load="loadData"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        name="general"
        :endpoints="[{ endpoint: 'logging/config' }]"
        data-key="logging_general"
        :error-handlers="{ edit: handleError }"
      >
        <tlt-card
          :title="$t('System settings')"
          :help="
            $t(
              `This section is used to configure logging settings for individual services. Each service can have its own log level and output settings, allowing for more detailed troubleshooting and monitoring of specific system components.`
            )
          "
          title-space-between
        >
          <template #title-content>
            <div class="flex gap-4">
              <usage-indicator
                :label="$t('RAM')"
                :used="ramData.used"
                :total="ramData.total"
                :free="ramData.free"
                test-id="ram"
              />
              <usage-indicator
                :label="$t('FLASH')"
                :used="flashData.used"
                :total="flashData.total"
                :free="flashData.free"
                test-id="flash"
              />
            </div>
          </template>
          <vuci-form-item-radio-group
            :uci-section="s"
            :label="$t('Save log in')"
            :help="
              $t(
                'Specifies which type of memory to use for storing system logs. RAM (Random access memory) has temporary storage which works only when the devices is powered on. Flash is primary longterm storage.'
              )
            "
            name="log_type"
            initial="circular"
            :options="logTypeOptions"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="log_levels"
            :help="$t('Sets the global log level for system logs.')"
            :label="$t('Global log level')"
            multiple
            :options="logLevels.slice(0, -1)"
            required
            has-select-all
          />
          <tlt-form-model-item
            element-id="system-logs"
            label=" "
          >
            <tlt-button
              button-id="system-logs"
              color="tertiary"
              class="pl-0"
              icon-left="system"
              :disabled="false"
              @click="showLog"
            >
              <tlt-hint
                :hints="
                  $t(
                    'Displays the contents of the device\'s system log file. \
                  The system log contains records of various system related events, such as starts/stops of various services, errors, reboots, etc.'
                  )
                "
                show-icon="mobile"
              >
                {{ $t('System Log') }}
              </tlt-hint>
            </tlt-button>
            <tlt-logs-modal
              ref="logsModal"
              :title="$t('System logs')"
              :help="
                $t(
                  'Displays the contents of the device\'s system log file. \
                  The system log contains records of various system related events, such as starts/stops of various services, errors, reboots, etc.'
                )
              "
              :logs="systemLogs"
              :open="showModal"
              :nav-bar="[$t('System logs')]"
              custom-id="log-output"
              @close="showModal = false"
            />
          </tlt-form-model-item>
          <tlt-form-accordion name="logging_advanced_settings">
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Show hostname')"
              :help="$t('Show hostname instead of IP address in system logs.')"
              name="log_hostname"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="size"
              :label="$t('System log file size')"
              :help="$t('Maximum size (in kilobytes) of a log file. When threshold is reached, log rotation is performed.')"
              rules="uinteger"
              placeholder="128"
              initial="128"
              required
            />
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Compress')"
              :help="$t('Compress rotated log files using gzip (.gz) format.')"
              name="log_compress"
              :depend="s.log_type === 'file'"
            />
          </tlt-form-accordion>
          <vuci-form-item-custom
            :uci-section="s"
            name="remote_logger"
            :label="$t('External system log servers')"
            :help="$t('External system log server hostname and port in host:port format (i.e. 127.0.0.1:6001).')"
            inputs="input,select"
            :headers="[$t('Hostname'), $t('Protocol')]"
            :input-props="remoteLoggerInputProps"
            allow-create
            :maxlines="3"
            class="md:mt-0"
          />
          <vuci-form-item-button
            :uci-section="s"
            name="deleteSystemLog"
            :label="$t('Delete log file')"
            :help="$t('Deletes log file from device.')"
            :text="$t('Delete')"
            :disabled="isDeleteButtonDisabled"
            color="error"
            @click="deleteLog"
          />
        </tlt-card>
      </vuci-named-section>
      <vuci-typed-section
        v-model:selected="checkedSections"
        :uci-data="uciData"
        :title="$t('Service settings')"
        type="logservice"
        data-key="logservice"
        :endpoints="[{ endpoint: 'logging/services/config' }]"
        :columns="columns"
        :bulk-actions="bulkActions"
        :row-actions="rowActions"
        :table-actions="['search', 'column-list']"
        pagination
      >
        <template #name="{ s }">
          <vuci-form-item-select
            :uci-section="s"
            name="name"
            :options="serviceNameMapping"
            :rules="() => validateServiceName(s)"
            required
            allow-create
            maxlength="255"
          />
        </template>
        <template #log_levels="{ s }">
          <vuci-form-item-select
            :uci-section="s"
            name="log_levels"
            :options="logLevels"
            :placeholder="$t('Set log priority')"
            :initial="logLevels.slice(0, -1).map(([level]: string[]) => level)"
            required
            has-select-all
            multiple
          />
        </template>
      </vuci-typed-section>
      <tlt-logs-modal
        :title="$t('%s logs').format(capitalize(serviceLogs.info.title))"
        :logs="serviceLogs.info.logInfo"
        :open="serviceLogsShow"
        custom-id="service-log-output"
        :nav-bar="navBarTitle"
        @close="handleCloseServiceLogs"
      >
        <template #before-content>
          <div class="flex md:items-center gap-4 mb-2 flex-col md:flex-row md:-ml-4">
            <tlt-form-item-select
              v-model="selectedServiceId"
              :label="$t('Selected service')"
              :options="serviceOptions"
              :help="$t(`Displays selected service log contents. Contains records of various events, such as starts/stops of various services, errors, reboots, etc.`)"
              :placeholder="$t('Select service')"
              class="w-80"
              @update:model-value="onServiceChange"
            />
            <tlt-hint :hints="serviceLogs.info.logInfo === '' ? [{ info: $t('No logs are available') }] : []">
              <tlt-button
                button-id="export"
                type="text"
                size="md"
                icon-left="download-import"
                :disabled="serviceLogs.info.logInfo === ''"
                @click="handleExportSettings([selectedServiceId])"
              >
                {{ $t('Download') }}
              </tlt-button>
            </tlt-hint>
          </div>
        </template>
      </tlt-logs-modal>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          :disabled="saveDisabled"
          @click="save"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script lang="ts" setup>
import { ref, computed, useTemplateRef, watch } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import tltLogsModal from '@ui-core/tlt-design/layout/TltLogsModal.vue'
import { capitalize } from '@ui-core/plugins/helper'
import { useMainStore } from '@/stores/main'
import { utils } from '@/plugins/utils'
import { isArray } from '@ui-core/utils/inspect'
import { type ApiResponse, axios } from '@ui-core/plugins/axios'
import UsageIndicator from '@/components/UsageIndicator.vue'

interface LogProtoOption {
  0: string
  1: string
}

interface LogFileStatus {
  exists?: string
  logfile_not_empty?: string
}

interface InputProps {
  prop: string
  placeholder: string
  rules: Array<string | ((val: string) => { isValid: boolean; message?: string })>
}

interface SelectProps {
  prop: string
  options: LogProtoOption[]
}

interface LoggingGeneralConfig {
  log_type: string
  size: string
  log_compress: string
  log_hostname: string
  remote_logger: string[]
}

interface LogService {
  '.type': string
  id: string
  log_levels: string[]
  name: string
}

interface FormDataType {
  logging_general: LoggingGeneralConfig[]
  logservice: LogService[]
}

interface SystemResourceInfo {
  used: number
  total: number
  free: number
  percentage: number
}

interface ErrorMessages {
  [key: number]: string
  default: string
}

interface SystemMemoryInfo {
  ram_used: number
  ram_total: number
  ram_free: number
  ram_percentage: number
  flash_used: number
  flash_total: number
  flash_free: number
  flash_percentage: number
}

interface SystemInfo {
  memory: SystemMemoryInfo
}

const $t = useTranslate()
const message = useMessages()
const prompt = usePrompt()
const store = useMainStore()

const formRef = useTemplateRef('vuciForm')
const formData = ref<FormDataType>({
  logging_general: [],
  logservice: []
})
const logFileStatus = ref<LogFileStatus>({})
const systemInfo = ref<SystemInfo | undefined>()
const isDeleteInProgress = ref(false)
const showModal = ref(false)
const serviceLogsShow = ref(false)
const checkedSections = ref<string[]>([])
const systemLogs = ref('')
const serviceLogs = ref({
  info: { title: '', logInfo: '' }
})
const currentLog = ref()
const selectedServiceId = ref('')
const savedServicesConfig = ref<Map<string, string>>(new Map())
const saveDisabled = ref(false)

const logTypeOptions = ref<{ value: string; name: string }[]>([
  {
    value: 'circular',
    name: $t('RAM memory')
  },
  {
    value: 'file',
    name: $t('Flash memory')
  }
])

const logProtoOptions = ref<LogProtoOption[]>([
  ['udp', 'UDP'],
  ['tcp', 'TCP']
])

const logLevels = ref<[string, string][]>([
  ['0', $t('Emergency')],
  ['1', $t('Alert')],
  ['2', $t('Critical')],
  ['3', $t('Error')],
  ['4', $t('Warning')],
  ['5', $t('Notice')],
  ['6', $t('Informational')],
  ['7', $t('Debug')]
])

const errorMessages: ErrorMessages = {
  150: $t('Cannot save logs in Flash Memory. Not enough free space.'),
  104: $t('Not enough flash space on the device.'),
  105: $t('Not enough RAM space on the device.'),
  default: $t('Failed to edit configuration')
}

const deleteLogErrors: ErrorMessages = {
  404: $t('Log file not found'),
  default: $t('An unexpected error occurred')
}

const logLevelsMap = computed(() => Object.fromEntries(logLevels.value))

const serviceNameMapping = computed(() => {
  const mappings: [string, string][] = [
    ['', $t('Select service')],
    ['dropbear', 'SSH'],
    ['uhttpd', 'WebUI'],
    ['session', $t('Session')],
    ['ip_block', $t('IP Block')]
  ]
  const conditional: Array<[string | string[], string, string]> = [
    ['coova-chilli.control', 'coova-chilli', $t('Hotspot')],
    ['vuci-app-openvpn-api.control', 'openvpn', 'OpenVPN'],
    [['xl2tpd.control', 'xl2tpd6.control'], 'xl2tpd', 'L2TP'],
    ['port_eventsd.control', 'port_eventsd', $t('Port Events')],
    ['wifi_scanner.control', 'wifi_scanner', $t('Wifi Scanner')],
    ['gkeepalive.control', 'gkeepalive', $t('GRE Keepalive')],
    ['nlbwmon.control', 'nlbwmon', $t('Bandwidth Monitor')],
    ['networkmap.control', 'networkmap', $t('Topology')]
  ]

  return [...mappings, ...conditional.filter(([pkg]) => (Array.isArray(pkg) ? pkg.some(p => store.hasPackages(p, false)) : store.hasPackages(pkg, false))).map(([, key, label]) => [key, label])]
})

const parseServiceName = (name: string): string => {
  const mapping = serviceNameMapping.value.find(m => m[0] === name)
  return mapping ? mapping[1] : name
}

const parseLogLevel = (code: string | string[]): string => {
  if (isArray(code)) {
    return code.map(c => logLevelsMap.value[c] || c).join(', ')
  }
  return logLevelsMap.value[code] || code
}

const columns = [
  {
    name: 'name',
    label: $t('Service name'),
    actions: { sort: true },
    displayFn: parseServiceName
  },
  {
    name: 'log_levels',
    label: $t('Log level assigned'),
    displayFn: parseLogLevel
  }
]

const bulkActions = computed(() => {
  return [
    {
      id: 'export',
      label: $t('Download'),
      buttonProps: { iconLeft: 'download-import' },
      callback: (settings: string[]) => handleBulkExportWithConfirmation(settings)
    },
    {
      id: 'delete',
      label: $t('Delete'),
      buttonProps: { iconLeft: 'delete', color: 'error' },
      callback: (items: string[]) => handleBulkAction(items, 'delete')
    }
  ]
})

const rowActions = (section: LogService) => {
  const isSaved = savedServicesConfig.value.has(section.id)
  return [
    {
      id: 'preview',
      label: $t('Preview'),
      callback: showServiceLog,
      buttonProps: {
        readonly: !section.name || section?.log_levels?.length === 0 || !isSaved
      }
    },
    {
      id: 'delete',
      label: $t('Delete')
    }
  ]
}

const navBarTitle = computed(() => {
  if (!serviceLogs.value.info.title) return []
  return [$t('%s logs').format(capitalize(serviceLogs.value.info.title))]
})

const serviceOptions = computed(() => {
  const services = formData.value.logservice || []
  return services
    .filter(s => s.name && s.log_levels.length > 0)
    .map(s => {
      const mapping = serviceNameMapping.value.find(m => m[0] === s.name)
      const displayName = mapping ? mapping[1] : s.name
      return [s.id, displayName]
    })
})

const ramData = computed<SystemResourceInfo>(() => ({
  used: systemInfo.value?.memory.ram_used || 0,
  total: systemInfo.value?.memory.ram_total || 0,
  free: systemInfo.value?.memory.ram_free || 0,
  percentage: systemInfo.value?.memory.ram_percentage || 0
}))

const flashData = computed<SystemResourceInfo>(() => ({
  used: systemInfo.value?.memory.flash_used || 0,
  total: systemInfo.value?.memory.flash_total || 0,
  free: systemInfo.value?.memory.flash_free || 0,
  percentage: systemInfo.value?.memory.flash_percentage || 0
}))

const remoteLoggerInputProps = computed<[InputProps, SelectProps]>(() => {
  const input: InputProps = {
    prop: 'hostport',
    placeholder: 'host:port',
    rules: ['hostipport', validateDuplicate]
  }
  const select: SelectProps = {
    prop: 'protocol',
    options: logProtoOptions.value
  }
  return [input, select]
})

const isDeleteButtonDisabled = computed<boolean>(() => {
  return logFileStatus.value?.exists === '0' || logFileStatus.value?.logfile_not_empty === '0' || isDeleteInProgress.value
})

const timer = useTimer({
  method: getLogFileStatus,
  time: 2000,
  autostart: false,
  immediate: true
})

const systemLogTimer = useTimer({
  method: getLogData,
  time: 3000,
  autostart: false
})

const serviceLogTimer = useTimer({
  method: previewSetting,
  time: 3000,
  autostart: false
})

function loadData() {
  timer.start()
}

function getLogFileStatus() {
  const request = ['/api/system/device/usage/status?exclude=loadavg', '/api/logging/status']
  return axios
    .bulkGet(request)
    .then(([system, loggingStatus]) => {
      systemInfo.value = system.success ? system.data : {}
      if (!system.success) message.error($t('Failed to load system data'))
      logFileStatus.value = loggingStatus.success ? loggingStatus.data : {}
      if (!loggingStatus.success) message.error($t('Failed to get log file status'))
      if (isDeleteInProgress.value && loggingStatus.success && system.success) {
        isDeleteInProgress.value = false
      }
      return { system, loggingStatus }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function getLogData() {
  return axios
    .get('/api/troubleshoot/system/status')
    .then(({ data }) => {
      systemLogs.value = data.response
    })
    .catch(() => {
      message.error($t('Failed to load troubleshoot log data'))
    })
}

function showLog() {
  showModal.value = true
  return getLogData().then(() => {
    systemLogTimer.start()
  })
}

function previewSetting() {
  return axios
    .get(`/api/logging/services/status/${currentLog.value}`)
    .then(({ data }) => {
      if (typeof data.log === 'string') {
        serviceLogs.value.info.logInfo = data.log
      } else {
        const sortedEntries = Object.entries(data.log).sort(([a], [b]) => a.localeCompare(b))
        serviceLogs.value.info.logInfo = sortedEntries.map(([instanceId, logContent]) => `=== ${instanceId} ===\n${logContent}`).join('\n\n')
      }
      serviceLogs.value.info.title = parseServiceName(data.service)
      selectedServiceId.value = currentLog.value
      serviceLogTimer.start()
    })
    .catch(() => {
      message.error($t('Failed to load service logs'))
    })
}

function onServiceChange(serviceId: string) {
  if (serviceId) {
    currentLog.value = serviceId
    serviceLogTimer.stop()
    previewSetting()
  }
}

function handleCloseServiceLogs() {
  serviceLogsShow.value = false
  serviceLogTimer.stop()
  selectedServiceId.value = ''
}

const loadSavedServices = () => {
  return axios
    .get('/api/logging/services/config')
    .then(res => {
      const configs = new Map<string, string>()
      res.data.forEach((service: any) => {
        if (service.name) {
          configs.set(service.id, service.name)
        }
      })

      savedServicesConfig.value = configs
    })
    .catch(() => {
      message.error($t('Failed to load service log configurations'))
    })
}

const showServiceLog = (data: { id: string }) => {
  currentLog.value = data.id
  selectedServiceId.value = data.id
  serviceLogsShow.value = true
  return previewSetting()
}

const extractLogContent = (log: any): string => {
  if (typeof log === 'string') {
    return log
  }
  const sortedEntries = Object.entries(log).sort(([a], [b]) => a.localeCompare(b))
  return sortedEntries.map(([instanceId, logContent]) => `=== ${instanceId} ===\n${logContent}`).join('\n\n')
}

const handleExportSettings = async (services: string[]) => {
  const downloadPromises = services.map(async service => {
    const response = await axios.get(`/api/logging/services/status/${service}`)
    if (!response.success) {
      message.error($t('Failed to download setting(s)'))
      return
    }
    const logContent = extractLogContent(response.data.log)
    if (!logContent || logContent.trim() === '') {
      return
    }
    const blob = new Blob([logContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    await utils.downloadFromDataURL(url, `${parseServiceName(response.data.service)}_log.txt`)
    window.URL.revokeObjectURL(url)
    message.success($t('Service(s) logs download was successful'))
  })
  await Promise.allSettled(downloadPromises)
}

const handleBulkExportWithConfirmation = async (services: string[]): Promise<void> => {
  const responses = await Promise.all(services.map(service => axios.get(`/api/logging/services/status/${service}`)))
  const servicesWithLogs = responses.filter(res => res.success && extractLogContent(res.data.log).trim() !== '')
  const serviceIds = servicesWithLogs.map((res, i) => services[responses.indexOf(res)])
  if (servicesWithLogs.length < services.length) {
    prompt.show({
      title: $t('Download service logs?'),
      content: $t('Log-free services will be automatically skipped during the download process'),
      okText: $t('Download'),
      cancelText: $t('Cancel'),
      icon: { name: 'info', class: 'text-theme-text-info' },
      onOk: async () => {
        await handleExportSettings(serviceIds)
        checkedSections.value = []
      },
      onCancel: () => {
        checkedSections.value = []
      }
    })
  } else {
    await handleExportSettings(serviceIds)
  }
}

const handleDeleteSettings = async (settings: string[]) => {
  prompt.show({
    title: $t('Delete service setting(s)?'),
    content: $t('This process cannot be undone.'),
    okText: $t('Delete'),
    cancelText: $t('Cancel'),
    icon: { name: 'warning', class: 'text-theme-text-warning' },
    onOk: async () => {
      const failedSettings: string[] = []
      for (const setting of settings) {
        await axios.delete(`/api/logging/services/config/${setting}`).catch(() => {
          const name = formData.value.logservice?.find(i => i.id === setting)?.name || setting
          failedSettings.push(name)
        })
      }
      formRef.value.loadData(true)
      if (failedSettings.length > 0) {
        message.error($t('Failed to delete some settings(s): %s').format(failedSettings.join(', ')))
      } else {
        message.success($t('Setting(s) removed successfully'))
      }
    },
    onCancel: () => (checkedSections.value = [])
  })
}

const handleBulkAction = async (settings: string[], action: string): Promise<void> => {
  action === 'download' ? await handleExportSettings(settings) : await handleDeleteSettings(settings)
}

function validateDuplicate(val: string) {
  const remoteLogger = formData.value.logging_general?.[0]?.remote_logger?.map(entry => entry.split(','))
  if (!remoteLogger) {
    return { isValid: true }
  }
  const hostPorts = remoteLogger.map(entry => entry[0])
  const protocols = remoteLogger.map(entry => entry[1])
  const duplicate = hostPorts.some((item, index) => {
    return protocols.indexOf(protocols[index]) !== index && item === val && hostPorts.indexOf(item) !== index
  })
  return {
    isValid: !duplicate,
    message: duplicate ? $t('No duplicates are allowed') : undefined
  }
}

function validateServiceName(section: LogService) {
  const uciData = formRef.value?.uciData
  const isDuplicate = uciData.logservice.find((s: any) => s.name === section.name && s.id !== section.id)
  const name = section.name || ''
  if (name && (name.includes('/') || name.includes('\\') || name.includes('..'))) {
    return {
      isValid: false,
      message: $t('Invalid service name: path characters are not allowed')
    }
  }
  const displayName = parseServiceName(name)
  saveDisabled.value = isDuplicate
  return {
    isValid: !isDuplicate,
    message: isDuplicate ? $t("Instance with service name '%s' already exists").format(displayName) : undefined
  }
}

function getErrorMessage(errorCode: number, errorMessages: ErrorMessages) {
  return errorMessages[errorCode] || errorMessages.default
}

function deleteLog() {
  isDeleteInProgress.value = true
  return axios
    .post('/api/logging/actions/delete_log')
    .then(() => {
      message.success($t('Log was deleted successfully'))
      return getLogFileStatus()
    })
    .catch(e => {
      const errorCode = e.data?.errors?.[0]?.code
      const errorMsg = getErrorMessage(errorCode, deleteLogErrors)
      message.error(errorMsg)
      isDeleteInProgress.value = false
    })
}

function handleError(res: ApiResponse<any>) {
  const errorCode = res?.data?.errors[0]?.code
  return getErrorMessage(errorCode, errorMessages)
}

watch([() => showModal.value, () => serviceLogsShow.value], ([isSystemModalOpen, isServiceLogsOpen]) => {
  if (!isSystemModalOpen) {
    systemLogTimer.stop()
  }
  if (!isServiceLogsOpen) {
    serviceLogTimer.stop()
  }
})

watch(
  () => formRef.value?.uciData?.logservice,
  () => {
    loadSavedServices()
  }
)
</script>
