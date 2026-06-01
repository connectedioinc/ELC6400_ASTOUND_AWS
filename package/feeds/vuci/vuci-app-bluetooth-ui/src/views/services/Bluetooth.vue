<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="blesem,ble_devices"
    :after-load="loadAvailableDevices"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('General settings')"
      name="general"
      :endpoints="[{ endpoint: 'bluetooth/config' }]"
      data-key="bluetooth"
      :after-save="clearAvailableDevices"
    >
      <tlt-form-model-item
        :help="$t('Displays the current status of the service. Shows whether the service is running and, if active, indicates the duration it has been running.')"
        :label="$t('Status')"
      >
        <tlt-dummy-value
          :value="isReady ? $t('Up') : isStarting ? $t('Starting...') : $t('Down')"
          :class="isReady ? 'success' : isStarting ? 'text-theme-text-warning' : 'error'"
        />
        <tlt-dummy-value
          v-if="isReady"
          :value="displayUptime(statusData.uptime)"
        />
      </tlt-form-model-item>
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable Bluetooth')"
        :help="$t('Enable/Disable bluetooth service.')"
        name="enabled"
      />
      <tlt-form-model-item :label="$t('Scan devices')">
        <tlt-button
          button-id="scan"
          :label="$t('Scan devices')"
          type="text"
          colors="tertiary"
          :disabled="scanButtonHint.length > 0"
          @click="onScanClick"
        >
          <tlt-hint :hints="scanButtonHint">
            {{ $t('Scan') }}
          </tlt-hint>
        </tlt-button>
      </tlt-form-model-item>
    </vuci-named-section>
    <tlt-table
      id="available_devices"
      :columns="availableDevicesColumns"
      :data-source="availableDevices"
      pagination
      :title="$t('Available devices')"
      :help="$t('Devices that are found by the router.')"
      :table-actions="['column-list', 'search']"
    >
      <template #pair="{ record }">
        <tlt-check-box
          :key="record.idx"
          v-model="record.checked"
          :readonly="$store.readOnlyPage"
          :custom-id="'available_' + record.idx.toString()"
        />
      </template>
      <template #after>
        <tlt-button
          class="mt-6"
          button-id="pair"
          @click="pairDevices()"
        >
          {{ $t('Pair') }}
        </tlt-button>
      </template>
    </tlt-table>
    <vuci-typed-section
      :title="$t('Paired devices')"
      :columns="pairedDevicesColumnsForTypedSection"
      :uci-data="uciData"
      :form-methods="['edit', 'get']"
      type="device"
      pagination
      :endpoints="[{ endpoint: 'bluetooth/paired/config' }]"
      data-key="paired_devices"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          name="name"
          :uci-section="s"
        />
      </template>
      <template #rssi="{ s }">
        <vuci-form-item-dummy
          name="rssi"
          :uci-section="s"
        />
      </template>
      <template #address="{ s }">
        <vuci-form-item-dummy
          name="address"
          :uci-section="s"
        />
      </template>
      <template #store_data="{ s }">
        <vuci-form-item-switch
          name="store_data"
          :uci-section="s"
          checkbox
        />
      </template>
      <template #details="{ s }">
        <tlt-button
          :disabled="false"
          button-id="details"
          @click="getDeviceInfo(s)"
        >
          {{ $t('Details') }}
        </tlt-button>
      </template>
      <template #unpair="{ s }">
        <tlt-check-box
          :key="s.address"
          v-model="s.checked"
          :readonly="$store.readOnlyPage"
          :custom-id="'paired_' + s.address.toString()"
        />
      </template>
      <template #after>
        <div class="flex gap-2 mt-6">
          <tlt-button
            button-id="unpairall"
            class="mr-2"
            @click="unpairAllDevices()"
          >
            {{ $t('Unpair all') }}
          </tlt-button>
          <tlt-button
            button-id="unpair"
            @click="unpairCheckedDevices()"
          >
            {{ $t('Unpair') }}
          </tlt-button>
        </div>
      </template>
    </vuci-typed-section>
    <tlt-modal
      :open="showModal"
      :hide-navigation="true"
      size="small"
      @close="closeModal"
    >
      <tlt-card :title="$t('Device data')">
        <tlt-value-list
          id="device-details"
          :data-source="singleDeviceDetail"
        />
      </tlt-card>
    </tlt-modal>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      formData: {},
      failedScanningIterations: 0,
      availableDevices: [],
      pairedDevices: [],
      serviceStatus: [],
      availableDevicesColumns: [
        { dataIndex: 'name', title: this.$t('Device Name') },
        { dataIndex: 'rssi', title: this.$t('RSSI') },
        { dataIndex: 'address', title: this.$t('MAC Address') },
        { dataIndex: 'pair', title: this.$t('Pair') }
      ],
      pairedDevicesColumnsForTypedSection: [
        { name: 'name', label: this.$t('Device Name') },
        { name: 'rssi', label: this.$t('RSSI') },
        { name: 'address', label: this.$t('MAC Address') },
        { name: 'store_data', label: this.$t('Store Data') },
        { name: 'details', label: this.$t('Details') },
        { name: 'unpair', label: this.$t('Unpair') }
      ],
      showModal: false,
      deviceDetail: [],
      singleDeviceDetail: [],
      statusData: {},
      errors: {
        2: this.$t('Bluetooth service is offline, turn on bluetooth and try again.'),
        7: this.$t('Bluetooth service is not ready, wait for it to start and try again')
      }
    }
  },
  computed: {
    generalSection() {
      return this.formData?.bluetooth?.[0]
    },
    isReady() {
      return this.statusData.ready
    },
    isStarting() {
      return this.statusData.ready === false
    },
    scanButtonHint() {
      if (this.generalSection?.enabled !== '1' && !this.isReady) {
        return [{ info: this.$t('Bluetooth is disabled.') }]
      } else if (this.isStarting) {
        return [{ info: this.$t('Bluetooth is starting.') }]
      } else if (!this.isReady) {
        return [{ info: this.$t("Bluetooth hasn't started.") }]
      } else {
        return []
      }
    }
  },
  mounted() {
    this.$timer.start({ method: this.checkIfScanning, time: 1000, immediate: true })
    this.$timer.start({ method: this.startScan, time: 1000, immediate: true })
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    clearAvailableDevices() {
      return this.$axios.get('/api/bluetooth/config').then(response => {
        if (response.data[0].enabled === '0') {
          this.availableDevices = []
        }
      })
    },
    getDeviceInfo(s) {
      return this.$axios
        .get(`/api/bluetooth/paired/config/${s.id}`)
        .then(({ data }) => {
          // Sometimes data comes back as string when bluetooth crashes. To prevent webui from crashing we handle it
          if (typeof data.data !== 'string') {
            this.singleDeviceDetail = Object.keys(data.data).map(key => ({
              title: key.toUpperCase(),
              value: data.data[key]
            }))
            this.showModal = true
          } else {
            this.singleDeviceDetail = []
            this.showModal = true
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load device data'))
        })
    },
    closeModal() {
      this.showModal = false
    },
    onScanClick() {
      this.$spin(this.$t('Scanning for available Bluetooth devices...'))
      this.$timer.start(this.startScan)
    },
    startScan() {
      return this.$axios
        .post('/api/bluetooth/actions/scan', null, { cancellable: true })
        .then(() => {
          this.$timer.start(this.checkIfScanning)
          this.$timer.stop(this.startScan)
        })
        .catch(e => {
          this.$timer.stop(this.startScan)
          this.$spin(false)
          this.$message.error(this.errors[e.response.data.errors[0].code])
        })
    },
    checkIfScanning() {
      return this.$axios
        .get('/api/bluetooth/scanning/status')
        .then(response => {
          if (response.data.scanning === '1') return
          this.$timer.stop(this.checkIfScanning)
          this.loadAvailableDevices()
          this.$spin(false)
        })
        .catch(() => {
          // Sometimes bluetooth is unreachable, we add some waiting time to let scan work.
          this.failedScanningIterations++
          if (this.failedScanningIterations > 5) {
            this.failedScanningIterations = 0
            this.$timer.stop(this.checkIfScanning)
            this.$spin(false)
            this.$message.error(this.$t('Scan failed, try again.'))
          }
        })
    },
    loadAvailableDevices(form) {
      if (form?.bluetooth[0].enabled === '0') return Promise.resolve()
      return this.$axios
        .get('/api/bluetooth/result/status')
        .then(response => {
          this.availableDevices = response.data.devices
            .filter(o => o.paired === '0')
            .map((device, index) => ({
              name: device.name || this.$t('NAMELESS DEVICE'),
              rssi: device.rssi || this.$t('N/A'),
              address: device.address || this.$t('N/A'),
              paired: device.paired,
              checked: false,
              idx: index
            }))
          return {}
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load available devices'))
        })
    },
    loadPairedDevices() {
      return this.$axios.get('/api/bluetooth/paired/config').then(response => {
        this.formData.paired_devices = response.data
      })
    },
    pairDevices() {
      const selected = this.availableDevices.filter(device => device.checked)
      const addresses = selected.map(device => device.address)
      if (selected.length === 0) {
        this.$message.error(this.$t('Please select a device to pair'))
      } else {
        return this.$axios
          .post('/api/bluetooth/actions/pair', { data: { address: addresses } })
          .then(() => {
            this.$message.success(this.$t('Devices successfully paired'))
            this.loadPairedDevices()
            this.loadAvailableDevices()
          })
          .catch(() => {
            this.$message.error(this.$t('Wrong device address'))
          })
      }
    },
    unpairAllDevices() {
      const devices = this.formData.paired_devices.map(device => device.address)
      if (devices.length === 0) {
        this.$message.error(this.$t('There are no devices to unpair'))
      } else {
        this.unpairDevices(devices)
      }
    },
    unpairCheckedDevices() {
      const checked = this.formData.paired_devices.filter(device => device.checked).map(dev => dev.address)
      if (checked.length === 0) {
        this.$message.error(this.$t('Please select a device to unpair'))
      } else {
        this.unpairDevices(checked)
      }
    },
    unpairDevices(device) {
      return this.$axios.get('/api/bluetooth/config').then(response => {
        if (response.data[0].enabled === '0') {
          this.$message.error(this.$t('Bluetooth service is offline. Turn on bluetooth to unpair a device.'))
          return
        }
        return this.$axios
          .post('/api/bluetooth/actions/unpair', { data: { address: device } })
          .then(() => {
            this.loadPairedDevices()
            this.loadAvailableDevices()
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to unpair devices'))
          })
      })
    },
    updateStatus() {
      return this.$axios
        .get('/api/bluetooth/status')
        .then(({ data }) => {
          this.statusData = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    }
  }
}
</script>
