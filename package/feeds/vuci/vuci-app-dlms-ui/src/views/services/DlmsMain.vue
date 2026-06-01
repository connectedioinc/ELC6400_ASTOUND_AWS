<template>
  <vuci-form
    ref="vuciForm"
    v-model="formData"
    config="dlms_client"
    :after-load="loadData"
    :before-save="validate"
  >
    <template #default="{ uciData }">
      <tlt-card
        :title="$t('General status')"
        :help="$t('This section displays DLMS general status information.')"
        class="[&>div.card-content]:pb-0"
      >
        <tlt-form-model-item
          :help="$t('Displays the current status of the service. Shows whether the service is running and, if active, indicates the duration it has been running.')"
          :label="$t('Status')"
        >
          <tlt-dummy-value
            :value="isStatusGood ? $t('Up') : $t('Down')"
            :class="isStatusGood ? 'success' : 'error'"
          />
          <tlt-dummy-value
            v-if="isStatusGood"
            :value="displayUptime(dlmsStatusData.uptime)"
          />
        </tlt-form-model-item>
      </tlt-card>
      <tlt-tabs
        v-model:selected="selectedTab"
        :tabs="tabs"
        class="list-layout--ignore"
      >
        <template #devices>
          <ListLayout bordered>
            <vuci-typed-section
              ref="devices"
              type="physical_device"
              :title="$t('DLMS physical devices')"
              :columns="physicalDeviceColumns"
              :uci-data="uciData"
              :edit-form="editModal"
              :endpoints="[{ endpoint: `dlms/devices/config` }]"
              data-key="device"
              :add-validate="addValidate"
              :add-title="$t('Add new physical device')"
              :global-settings-form="dlmsGlobal"
              :after-delete="afterDeviceDelete"
              :row-actions="
                s => [
                  'edit',
                  {
                    id: 'delete',
                    buttonProps: { readonly: cosemExist(s.id) },
                    hints: returnDeleteHints('device', s.id)
                  }
                ]
              "
            >
              <template #parameter_status="{ s }">
                <template v-if="getActiveScanMessage(s.id)">
                  <p>{{ getActiveScanMessage(s.id) }}</p>
                </template>
                <template v-else-if="scanStatusByDevice[s.id]?.status === scanStatuses.completed">
                  <div class="flex flex-col">
                    <div class="flex flex-row gap-1">
                      <div>{{ $t('Parameters') }}:</div>
                      <tlt-button
                        button-id="show-parameters"
                        type="text"
                        @click="toggleParametersModal(s.id)"
                        >{{ loadedParamsByDevice[s.id]?.length || 0 }}</tlt-button
                      >
                    </div>
                    <tlt-button
                      button-id="repeat-scan"
                      type="text"
                      @click="startDeviceScan(s.id)"
                      >{{ $t('Repeat scan') }}</tlt-button
                    >
                  </div>
                </template>
                <template v-else>
                  <tlt-button
                    button-id="start-scan"
                    type="text"
                    @click="startDeviceScan(s.id)"
                    >{{ $t('Load parameters') }}
                  </tlt-button>
                </template>
              </template>
              <template #enabled="{ s }">
                <vuci-form-item-switch
                  :uci-section="s"
                  name="enabled"
                  :readonly="!canToggleDeviceEnable(s)"
                  :hints="getEnableHint(canToggleDeviceEnable, s)"
                />
              </template>
              <template #test="{ s }">
                <vuci-form-item-button
                  :uci-section="s"
                  name="test"
                  :text="$t('Test')"
                  :readonly="getDeviceTestHint(s).length > 0 || testDisabled"
                  :hints="getDeviceTestHint(s)"
                  @click="testDevice"
                />
              </template>
            </vuci-typed-section>
            <vuci-typed-section
              type="cosem_group"
              :title="$t('DLMS COSEM groups')"
              :table-actions="['column-list', 'search']"
              :columns="cosemGroupColumns"
              :uci-data="uciData"
              :edit-form="cosemEdit"
              :endpoints="[{ endpoint: 'dlms/cosem_group/config' }]"
              data-key="cosem_group"
              :add-validate="onCosemAdd"
              :add-title="$t('Add new COSEM group')"
              :after-delete="removeChildren"
            >
              <template #enabled="{ s }">
                <vuci-form-item-switch
                  :uci-section="s"
                  name="enabled"
                  :readonly="!canToggleCosemEnable(s)"
                  :hints="getCosemEnableHint(s)"
                />
              </template>
              <template #test="{ s }">
                <vuci-form-item-button
                  :uci-section="s"
                  name="test"
                  :text="$t('Test')"
                  :readonly="getTestGroupHint(s).length > 0 || testDisabled"
                  :hints="getTestGroupHint(s)"
                  @click="testGroup(s)"
                />
              </template>
            </vuci-typed-section>
            <div class="list-layout--ignore" />
          </ListLayout>
          <tlt-modal
            :open="showParametersModal"
            @close="toggleParametersModal()"
          >
            <tlt-table
              :title="$t('%s physical device parameters').format(uciData.device.find(d => d.id === openedInstanceId).name || $t('Unnamed'))"
              :help="$t('Scanned parameters of the device.')"
              :columns="parameterColumns"
              pagination
              :data-source="loadedParamsByDevice[openedInstanceId]"
              :table-actions="['column-list', 'search']"
            >
            </tlt-table>
          </tlt-modal>
        </template>
        <template #connections>
          <ListLayout bordered>
            <vuci-typed-section
              ref="connections"
              type="connection"
              :title="$t('DLMS connections')"
              :help="$t('This section displays connection configuration instances. Connection is active when there are active devices assigned to it.')"
              :columns="connectionColumns"
              :edit-form="connectionModal"
              :add-validate="onConnectionAdd"
              :uci-data="uciData"
              :endpoints="[{ endpoint: 'dlms/connections/config' }]"
              data-key="connection"
              :add-title="$t('Add new connection')"
              :row-actions="s => ['edit', { id: 'delete', buttonProps: { readonly: devicesExist(s.id) }, hints: returnDeleteHints('connection', s.id) }]"
            >
              <template #bus="{ s }">
                <vuci-form-item-dummy
                  :uci-section="s"
                  name="connection_type"
                  :display-value="getAddressString"
                />
              </template>
              <template #devices="{ s }">
                <vuci-form-item-dummy
                  :uci-section="s"
                  name="devices"
                  :display-value="loadDevices"
                />
              </template>
              <template #enabled="{ s }">
                <tlt-hint :hints="getEnableHint(canToggleConnectionEnable, s)">
                  <serial-hint
                    v-slot="{ disabled }"
                    :serial-status="formOptions.status"
                    :serial-devices="formOptions.serial"
                    :device="s.device"
                    :hidden="s.connection_type !== '1' || s.enabled === '1' || !canToggleConnectionEnable(s)"
                    service="DLMS"
                  >
                    <vuci-form-item-switch
                      :uci-section="s"
                      name="enabled"
                      :readonly="disabled || !canToggleConnectionEnable(s)"
                    />
                  </serial-hint>
                </tlt-hint>
              </template>
            </vuci-typed-section>
            <div class="list-layout--ignore" />
          </ListLayout>
        </template>
      </tlt-tabs>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          @click="save"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import { mapState } from 'pinia'
import cosemGroupEdit from './DlmsCosemGroupEdit.vue'
import { parseIPv6, parseIPv4 } from '@/validation-rules'
import deviceEdit from './DlmsDeviceEdit.vue'
import connectionEdit from './DlmsConnectionEdit.vue'
import SerialHint from '@/components/shared/SerialHint'
import dlmsGlobal from './DlmsGlobal.vue'
import { useMainStore } from '@/stores/main'
import {
  isScanRunning,
  scanStatuses,
  getConnectionTestData,
  getDeviceTestData,
  isGroupValueValid,
  isDeviceValid,
  isConnectionValid,
  getCosemGroupTestActionPayload,
  cosemList,
  validateCosemGroups
} from './dlmsUtils'

export default {
  components: { SerialHint },
  provide() {
    return {
      formOptions: () => {
        return this.formOptions
      },
      form: () => this.globalEnabled,
      scanStatusByDevice: () => this.scanStatusByDevice,
      loadedParamsByDevice: () => this.loadedParamsByDevice
    }
  },
  data() {
    return {
      tabs: [
        { name: 'devices', title: this.$t('Main') },
        { name: 'connections', title: this.$t('Connections') }
      ],
      connection: '',
      currentValue: '',
      tempVal: '',
      formData: {},
      connectionColumns: [
        { name: 'name', label: this.$t('Name'), help: this.$t('DLMS connection name.'), displayFn: v => v || '-' },
        { name: 'bus', label: this.$t('Address/Device'), help: this.$t('DLMS connection TCP address or serial device.') },
        {
          name: 'devices',
          label: this.$t('Enabled devices'),
          help: this.$t('Connection is active when there are enabled devices assigned to it.')
        },
        { name: 'enabled', label: this.$t('Enabled'), help: this.$t('DLMS connection enable switch.') }
      ],
      cosemGroupColumns: [
        { name: 'name', label: this.$t('Name'), help: this.$t('DLMS COSEM group name.'), displayFn: v => v || '-' },
        { name: 'enabled', label: this.$t('Enabled'), help: this.$t('DLMS COSEM group enable switch.') },
        { name: 'test', label: this.$t('Test'), help: this.$t('COSEM group configuration test button.') }
      ],
      physicalDeviceColumns: [
        { name: 'name', label: this.$t('Name'), help: this.$t('Physical device name.'), displayFn: v => v || '-' },
        { name: 'parameter_status', label: this.$t('Parameter status'), help: this.$t('Physical device parameter status.') },
        { name: 'enabled', label: this.$t('Enabled'), help: this.$t('Physical device enable switch.') },
        { name: 'test', label: this.$t('Test'), help: this.$t('Physical device configuration test button.') }
      ],
      parameterColumns: [
        { dataIndex: 'obis', title: this.$t('OBIS Code') },
        { dataIndex: 'short_name', title: this.$t('Short name'), displayFn: val => val || '-' },
        { dataIndex: 'cosem_class_id', title: this.$t('COSEM class id'), actions: { filter: { type: 'uniqueValues' } }, displayFn: this.displayCosemType }
      ],
      formOptions: {
        serial: [],
        device: [],
        status: [],
        connectionOptions: []
      },
      editModal: markRaw(deviceEdit),
      cosemEdit: markRaw(cosemGroupEdit),
      connectionModal: markRaw(connectionEdit),
      dlmsGlobal: markRaw(dlmsGlobal),
      testDisabled: false,
      redirect: false,
      redirectToTab: { value: undefined, currentValue: undefined },
      redirectToDevice: undefined,
      closeModal: false,
      globalEnabled: { globalStatus: 'firstLoad' },
      stateChanged: false,
      infoMessage: this.$t('%s service is disabled, navigate to global settings configuration to enable it.').format('DLMS'),
      scanStatusByDevice: {},
      scanStatuses,
      cosemList,
      dlmsStatusData: {},
      openedInstanceId: undefined,
      showParametersModal: false,
      loadedParamsByDevice: {},
      loadingParameters: false,
      selectedTab: undefined
    }
  },
  computed: {
    ...mapState(useMainStore, ['modalOpen']),
    devices() {
      return this.$serial.listDeviceNameTuples(this.formOptions.serial)
    },
    getFormOptions() {
      return this.formOptions
    },
    isStatusGood() {
      return this.dlmsStatusData.uptime !== undefined
    }
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
    // Note: second state is watched because alert should only be created when modal is fully closed
    modalOpen(value) {
      if (!value && this.stateChanged) {
        this.stateChanged = false
        if (!this.globalEnabled.globalStatus) this.$notification.info(this.infoMessage)
        else this.$notification.remove(this.infoMessage)
      }
    },
    redirect(value) {
      if (value)
        this.$nextTick(async () => {
          await this.$router.replace({ query: { edit: undefined } })
          this.$refs.devices._closeEdit(this.formData)
          this.switchToConnection(this.redirectToTab.value, this.redirectToTab.currentValue)
        })
    },
    redirectToDevice() {
      this.$nextTick(() => {
        this.switchToDevice(this.redirectToDevice)
      })
    },
    closeModal(value) {
      if (value) {
        this.$nextTick(() => {
          this.$refs.connections.reloadData()
          this.$timer.start(this.updateParameterScanStatus)
          this.closeModal = false
        })
      }
    }
  },
  async created() {
    this.$bus.on('redirect-to-tab', (value, currentValue) => {
      this.redirect = true
      this.redirectToTab.value = value
      this.redirectToTab.currentValue = currentValue
    })
    this.$bus.on('redirect-to-device', res => {
      this.redirectToDevice = res
    })
    this.$bus.on('clear-values', () => {
      this.redirect = false
      this.tempVal = ''
    })
    this.$bus.on('close-modal', () => {
      this.closeModal = true
    })
    this.$bus.on('start-device-scan', this.startDeviceScan)
    this.$bus.on('stop-device-scan', this.stopDeviceScan)
  },
  unmounted() {
    this.$bus.off('start-device-scan', this.startDeviceScan)
    this.$bus.off('stop-device-scan', this.stopDeviceScan)
  },
  mounted() {
    this.$timer.start({ method: this.updateParameterScanStatus, time: 2000, autostart: false, immediate: true })
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    switchToConnection(val, current) {
      this.tempVal = current
      this.selectedTab = this.tabs[1].name
      if (this.formData.connection.some(conn => conn.id === val)) {
        this.$refs.connections._openEdit(val)
      } else {
        this.formData.connection.push({ id: val })
        this.$refs.connections._openEdit(val)
      }
    },
    switchToDevice(res) {
      this.formData.connection.forEach((conn, index) => {
        if (conn.id === res.data.id) {
          this.formData.connection[index] = res.data
        }
      })
      if (this.tempVal) {
        this.selectedTab = this.tabs[0].name
        this.$refs.devices._openEdit(this.tempVal)
      }
    },
    loadDevices(val, self) {
      return this.formData.device.filter(dev => dev.connection === self.uciSection.id && dev.enabled === '1').length
    },
    getAddressString(connectionType, self) {
      if (connectionType === '0') {
        const address = self.uciSection.address
        if (!address) return this.$t('N/A')

        const port = self.uciSection.port
        if (!port) return this.$t('N/A')

        if (parseIPv4(address)) {
          return `${address}:${port}`
        } else if (parseIPv6(address)) {
          return `[${address}]:${port}`
        }
      } else if (connectionType === '1') {
        const devicePath = self.uciSection.device
        if (!devicePath) return this.$t('N/A')

        const devices = this.formOptions.device
        const device = devices.find(dev => dev[0] === devicePath)
        if (!device) return this.$t('N/A')

        const deviceName = device[1]
        return deviceName
      }
      return this.$t('N/A')
    },
    devicesExist(id) {
      const devices = this.formData.cosem_group.flatMap(group => this.formData[`${group.id}_cosem`]?.flatMap(cosem => cosem.physical_device))
      return this.formData.device.some(dev => dev.connection === id && devices.includes(dev.id))
    },
    multiBulkGet(requests) {
      const promises = []
      for (let i = 0; i < requests.length; i += 100) {
        promises.push(this.$axios.bulkGet(requests.slice(i, i + 100)))
      }
      return Promise.all(promises).then(response => {
        return response.flat()
      })
    },
    updateStatus() {
      return this.$axios
        .get('/api/dlms/cosem_group/status')
        .then(({ data }) => {
          this.dlmsStatusData.uptime = data.uptime
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    loadData(form) {
      const cosemRequests = form.cosem_group.map(s => `/api/dlms/cosem_group/${s.id}/cosem/config`)
      const requests = [
        '/api/system/device/status',
        { endpoint: '/api/serial/status', condition: this.$store.hasPackages('vuci-app-getty-ui') },
        '/api/dlms/connections/config',
        '/api/dlms/global',
        ...cosemRequests
      ]
      return this.multiBulkGet(requests)
        .then(res => {
          const device = res.shift()
          const status = res.shift()
          const connections = res.shift()
          const global = res.shift()
          if (global.success) {
            this.globalEnabled.globalStatus = global.data.enabled === '1'
          } else {
            this.$message.error(this.$t('Failed to load DLMS global data'))
          }
          this.formOptions.serial = device.success && device.data.board.serial ? device.data.board.serial : []
          this.formOptions.device = this.devices
          this.formOptions.status = status.success ? status.data : []
          const baseOptions = [['0', 'TCP']]
          this.formOptions.connectionOptions = !this.devices.length ? baseOptions : baseOptions.concat([['1', this.$t('Serial')]])
          if (!device.success) this.$message.error(this.$t('Failed to load serial data'))
          if (!status.success) this.$message.error(this.$t('Failed to load rs serial status'))
          if (!connections.success) this.$message.error(this.$t('Failed to load connection data'))
          const uciData = {}
          res.forEach((response, index) => {
            const sectionID = form.cosem_group[index].id
            if (response.success) {
              uciData[`${sectionID}_cosem`] = response.data
            } else {
              this.$message.error(this.$t('Failed to load COSEM data for %s COSEM group.').format(sectionID))
            }
          })
          return uciData
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$timer.start(this.updateParameterScanStatus)
        })
    },
    async testDevice(self) {
      if (!(await self.vuciForm.validate())) {
        this.$message.error(this.$t('Values used for testing are invalid'))
        return
      }

      this.testDisabled = true

      const physicalDevice = self.uciSection
      const connection = this.formData.connection.find(conn => conn.id === physicalDevice.connection)

      try {
        const payload = {
          ...getConnectionTestData(connection),
          ...getDeviceTestData(physicalDevice)
        }

        const response = await this.$axios.post(`/api/dlms/devices/actions/test`, { data: payload })
        const data = response.data

        if (data) {
          if (!data.error) {
            return this.$message.success(this.$t('Configuration test succeeded'))
          } else if (data.error && data.result) {
            if (data.result.includes('connection')) {
              return this.$message.error(this.$t('Failed to make connection with device'))
            } else if (data.result.includes('parameters')) {
              return this.$message.error(this.$t('Failed to parse device parameters'))
            }
          }
        }

        return this.$message.error(this.$t('Configuration test failed'))
      } catch (error) {
        this.$message.error(this.$t('Failed to test request, encountered an unexpected error.'))
      } finally {
        this.testDisabled = false
      }
    },
    getDeviceTestHint(physicalDevice) {
      const connection = this.formData.connection.find(conn => conn.id === physicalDevice.connection)

      if (!connection) {
        return [{ info: this.$t('Connection is missing') }]
      } else if (!isDeviceValid(physicalDevice)) {
        return [{ info: this.$t('Device is missing required values') }]
      } else if (!isConnectionValid(connection)) {
        return [{ info: this.$t('Connection is missing required values') }]
      } else {
        return []
      }
    },
    onCosemAdd(_, dataSource) {
      if (dataSource.length >= 10) {
        return { valid: false, message: this.$t('Maximum number of COSEM groups has been reached') }
      }
      return { valid: true }
    },
    onConnectionAdd(_, dataSource) {
      if (dataSource.length >= 30) {
        return { valid: false, message: this.$t('Maximum number of connections has been reached') }
      }
      return { valid: true }
    },
    cosemExist(id) {
      const devices = this.formData.cosem_group.flatMap(group => this.formData[`${group.id}_cosem`]?.flatMap(cosem => cosem.physical_device))
      return devices.includes(id)
    },
    addValidate(_, sections) {
      if (sections.length < 30) return { valid: true }
      return { valid: false, message: this.$t('Maximum number of physical devices has been reached') }
    },
    testGroup(group) {
      const payload = getCosemGroupTestActionPayload(this.formData, group.id)
      if (!payload) {
        return
      }

      this.testDisabled = true
      return this.$axios
        .post('/api/dlms/cosem_group/actions/test', { data: payload })
        .then(({ data }) => {
          if (data && !data.error) {
            return this.$message.success(this.$t('Configuration test succeeded'))
          } else {
            return this.$message.error(this.$t('Configuration test failed'))
          }
        })
        .catch(error => {
          const messages = {
            invalid: this.$t('Values used for testing are invalid')
          }
          if (error && error.message && messages[error.message]) return this.$message.error(messages[error.message])
          if (error.response?.data?.errors?.[0]?.code === 16) return this.$message.error(this.$t('There are no enabled connections, please enable a connection before using COSEM groups'))
          this.$message.error(this.$t('Failed to test request, encountered an unexpected error.'))
        })
        .finally(() => {
          this.testDisabled = false
        })
    },
    getTestGroupHint(group) {
      let enabledValues = 0
      for (let groupValue of this.formData[`${group.id}_cosem`] || []) {
        if (groupValue.enabled !== '1') continue

        if (!isGroupValueValid(groupValue)) {
          const name = groupValue.name || this.$t('Undefined')
          return [{ info: this.$t('%s COSEM object parameters are missing, double check your configuration').format(name) }]
        }

        enabledValues += 1
      }

      if (enabledValues === 0) {
        return [{ info: this.$t('There are no enabled objects in the group') }]
      }

      return []
    },
    returnDeleteHints(section, id) {
      if (section === 'connection') {
        return this.devicesExist(id)
          ? [
              {
                info: this.$t("This instance can't be deleted because devices belonging to it are used in COSEM configuration")
              }
            ]
          : []
      }
      return this.cosemExist(id)
        ? [
            {
              info: this.$t('This device cannot be deleted, it is used in COSEM configuration')
            }
          ]
        : []
    },
    removeChildren(self) {
      delete this.formData[`${self.id}_cosem`]
    },
    removeDevices(self) {
      delete this.formData[`${self.id}_device`]
    },
    afterDeviceDelete(self) {
      delete this.scanStatusByDevice[self.id]
      delete this.loadedParamsByDevice[self.id]
    },
    validateCosemEnable(self) {
      if (self.model === '0' || !self.model) return
      if (!this.formData[`${self.uciSection.id}_cosem`]?.some(cosem => cosem.enabled === '1')) {
        self.model = '0'
        this.$message.error(this.$t('To enable COSEM group at least one COSEM value needs to be enabled.'))
      }
    },
    loadDeviceParams(deviceIds) {
      this.loadingParameters = true
      this.$axios
        .get(`/api/dlms/found_parameters/status?devices=${deviceIds.join(',')}`)
        .then(res => {
          deviceIds.forEach(id => {
            this.loadedParamsByDevice[id] = []
            if (this.scanStatusByDevice[id]) this.scanStatusByDevice[id].status = this.scanStatuses.completed
          })
          res.data.forEach(p => {
            const { physical_device_id, ...rest } = p
            if (!this.loadedParamsByDevice[physical_device_id]) this.loadedParamsByDevice[physical_device_id] = []
            this.loadedParamsByDevice[physical_device_id].push(rest)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load device parameter data'))
        })
        .finally(() => {
          this.loadingParameters = false
        })
    },
    async updateParameterScanStatus() {
      let scanResponse
      try {
        scanResponse = await this.$axios.get('/api/dlms/scan/status')
      } catch {
        this.$message.error(this.$t('Failed to load parameter status data'))
        return
      }

      if (!scanResponse?.success) {
        return
      }

      const newScanStatusByDevice = scanResponse.data.reduce((acc, curr) => {
        acc[curr.physical_device_id] = curr
        delete curr.physical_device_id
        return acc
      }, {})

      const startedScanDevices = []
      const failedScanDevices = []
      const finishedScanDevices = []
      const devicesToLoad = []
      this.$refs.vuciForm.uciData.device.forEach(d => {
        const { status: oldStatus } = this.scanStatusByDevice[d.id] || {}
        const newDeviceStatus = newScanStatusByDevice[d.id] || {}

        if (isScanRunning(newDeviceStatus.status) && !isScanRunning(oldStatus)) {
          startedScanDevices.push(d.id)
        }

        if (newDeviceStatus.status === this.scanStatuses.error) {
          failedScanDevices.push(d.id)
        }

        const isInitialPageLoad = oldStatus === undefined
        const wasStartedOrRunning = oldStatus === this.scanStatuses.starting || isScanRunning(oldStatus)
        const wasManuallyStopped = oldStatus === this.scanStatuses.stopping
        const hasCompleted = newDeviceStatus.status === this.scanStatuses.completed

        if (hasCompleted && wasStartedOrRunning && !wasManuallyStopped) {
          finishedScanDevices.push(d.id)
        }

        if (hasCompleted && (wasStartedOrRunning || isInitialPageLoad)) {
          devicesToLoad.push(d.id)
          newDeviceStatus.status = scanStatuses.loading
        }
      })

      if (failedScanDevices.length > 0) {
        this.$message.error(this.$t('Error occurred while scanning device(s): %s').format(this.getVisibleDeviceNames(failedScanDevices)))
      }
      if (finishedScanDevices.length > 0) {
        this.$message.success(this.$t('Scan finished for device(s): %s. Parameters can be used in COSEM value configuration').format(this.getVisibleDeviceNames(finishedScanDevices)))
      }
      if (startedScanDevices.length > 0) {
        this.$message.info(this.$t('Parameters are being scanned for device(s): %s.').format(this.getVisibleDeviceNames(startedScanDevices)))
      }
      if (devicesToLoad.length > 0) {
        this.loadDeviceParams(devicesToLoad)
      }
      if (Object.values(newScanStatusByDevice).every(s => !isScanRunning(s.status))) {
        this.testDisabled = false
        this.$timer.stop(this.updateParameterScanStatus)
      }

      this.scanStatusByDevice = newScanStatusByDevice
    },
    startDeviceScan(sid) {
      if (this.loadingParameters) {
        return this.$message.info(this.$t('Cannot start the scan while parameters are still being loaded.'))
      }
      this.testDisabled = true
      const deviceIds = Array.isArray(sid) ? sid : [sid]
      this.$spin(this.$t('Starting parameters scan...'))
      return this.$axios
        .post('/api/dlms/scan/actions/start', {
          data: {
            device_ids: deviceIds
          }
        })
        .then(response => {
          if (response.success) {
            deviceIds.forEach(id => {
              this.scanStatusByDevice[id] = { status: this.scanStatuses.starting }
            })
            this.$message.info(this.$t('Parameters are being scanned for device(s): %s.').format(this.getVisibleDeviceNames(deviceIds)))
          }
        })
        .catch(() => this.$message.error(this.$t('Failed to initiate parameters scan')))
        .finally(() => {
          this.$spin(false)
          this.$timer.start(this.updateParameterScanStatus)
          deviceIds.forEach(id => {
            if (this.scanStatusByDevice[id]) {
              this.scanStatusByDevice[id] = { status: this.scanStatuses.inProgress, progress: 0 }
            }
          })
        })
    },
    markScanStatusAsStopping(deviceIds) {
      for (const deviceId of deviceIds) {
        const deviceStatus = this.scanStatusByDevice[deviceId]
        if (!deviceStatus) {
          continue
        }

        if (isScanRunning(deviceStatus.status)) {
          deviceStatus.status = this.scanStatuses.stopping
        }
      }
    },
    stopDeviceScan(sid) {
      this.$spin(this.$t('Stopping parameters scan...'))

      const deviceIds = Array.isArray(sid) ? sid : [sid]
      const wereScansRunning = Object.entries(this.scanStatusByDevice)
        .filter(entry => deviceIds.includes(entry[0]))
        .some(entry => isScanRunning(entry[1].status))

      return this.$axios
        .post('/api/dlms/scan/actions/stop', {
          data: {
            device_ids: deviceIds
          }
        })
        .then(() => {
          this.markScanStatusAsStopping(deviceIds)
        })
        .catch(err => {
          // API could report that a "scan isn't running" error, because by the time that we send a stop request
          // the scan might have already finished.
          // So just ignore these kinds of situations. Don't show an error message.
          const scanNotRunningError = err.response.data.errors.some(reason => reason.result === "Scan isn't running")
          if (wereScansRunning && scanNotRunningError) {
            this.markScanStatusAsStopping(deviceIds)
            return
          }

          this.$message.error(this.$t('Failed to stop parameters scan'))
        })
        .finally(() => this.$spin(false))
    },
    getVisibleDeviceNames(deviceIds) {
      const foundDeviceNames = this.$refs.vuciForm.uciData.device.filter(d => deviceIds.some(id => id === d.id)).map(d => d.name || this.$t('Unnamed'))
      const visible = foundDeviceNames.slice(0, 2).join(', ')
      return foundDeviceNames.length <= 2 ? visible : `${visible}, ..`
    },
    getActiveScanMessage(sid) {
      const activeScanMessages = {
        [this.scanStatuses.loading]: () => this.$t('Loading parameters...'),
        [this.scanStatuses.starting]: () => this.$t('Starting scan...'),
        [this.scanStatuses.inQueue]: () => this.$t('Scan in queue'),
        [this.scanStatuses.stopping]: () => this.$t('Stopping...'),
        [this.scanStatuses.inProgress]: scanStatus => this.$t('Scanning: %s blocks found').format(scanStatus.progress),
        default: () => ''
      }
      const scanStatus = this.scanStatusByDevice[sid] || {}
      return (activeScanMessages[scanStatus.status] || activeScanMessages.default)(scanStatus)
    },
    canToggleCosemEnable(section) {
      return this.formData[`${section.id}_cosem`]?.some(cosem => cosem.enabled === '1')
    },
    getCosemEnableHint(section) {
      return !this.canToggleCosemEnable(section) ? [{ info: this.$t('To enable COSEM group at least one COSEM value needs to be enabled.') }] : []
    },
    canToggleDeviceEnable(section) {
      return section.name && section.server_addr && section.log_server_addr && section.client_addr && section.connection
    },
    canToggleConnectionEnable(section) {
      const isTcpValid = section.connection_type === '0' && section.address && section.port
      const isSerialValid = section.connection_type === '1'
      return section.name && (isTcpValid || isSerialValid)
    },
    getEnableHint(canToggleEnable, section) {
      return !canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    },
    displayCosemType(cosemId) {
      const cosemTypePair = this.cosemList.find(c => c[0] === cosemId)
      return cosemTypePair ? cosemTypePair[1] : '-'
    },
    toggleParametersModal(sid) {
      this.openedInstanceId = sid
      this.showParametersModal = !this.showParametersModal
    },
    validate() {
      const serialError = this.$serial.validateBeforeSave(this.formOptions.status, this.formData.connection, 'DLMS', false)
      if (!serialError.isValid) {
        return Promise.reject(serialError.message)
      }

      const cosemGroupsValidation = validateCosemGroups(this.formData)
      if (!cosemGroupsValidation.isValid) return Promise.reject(cosemGroupsValidation.message)

      return Promise.resolve()
    }
  }
}
</script>
