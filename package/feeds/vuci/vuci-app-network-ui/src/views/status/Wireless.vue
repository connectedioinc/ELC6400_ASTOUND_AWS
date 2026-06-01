<template>
  <tlt-card :title="$t('Wireless interfaces')">
    <div class="grid grid-cols-fill-56 md:grid-cols-fill-96 gap-6">
      <tlt-overview-card-type
        v-for="(iface, idx) in parsedInterfaceStatus"
        :key="idx"
        :selectable="isCardSelectable(iface)"
        :selected="checkSelected(iface)"
        :widget="iface"
        :item="iface"
        @click="isCardSelectable(iface) && selectInterface(iface)"
      />
    </div>
  </tlt-card>
  <tlt-table
    id="wifi_clients"
    :columns="clientCols"
    :data-source="clients"
    :data-key="null"
    :title="$t('Wireless clients')"
    :table-actions="['selected-interfaces', 'column-list', 'search']"
  >
    <template #signal="{ record }">
      <tlt-signal-bar
        class="h-3"
        :signal="parseInt(record.signal)"
      />
    </template>
    <template #band="{ record }"> {{ record.standard && record.band ? `${record.band} (${record.standard})` : record.band || '-' }} </template>
    <template #selected-interfaces>
      <div
        v-if="selectedInterfaces.length > 0"
        class="flex flex-wrap gap-y-1 md:items-center"
      >
        <tlt-badge
          v-for="(iface, idx) in selectedInterfaces"
          :key="idx"
          :test-id="iface.wifi_id"
          class="cursor-pointer mx-1"
          type="primary"
          @click="selectedInterfaces.splice(getSelectedIndex(iface), 1)"
        >
          {{ iface.ssid || iface.mesh_id }}
        </tlt-badge>
        <div class="mx-1 text-body-secondary">
          <tlt-button
            button-id="clearAll"
            type="text"
            color="primary"
            size="md"
            :disabled="false"
            @click="selectedInterfaces = []"
          >
            {{ $t('Clear all filters') }}
          </tlt-button>
        </div>
      </div>
    </template>
  </tlt-table>
</template>

<script>
export default {
  data() {
    return {
      ifaceCols: [
        { dataIndex: 'status', title: this.$t('Status') },
        { dataIndex: 'standard', title: this.$t('Standard') },
        { dataIndex: 'mode', title: this.$t('Mode') },
        { dataIndex: 'encryption', title: this.$t('Encryption') },
        { dataIndex: 'num_assoc', title: this.$t('Clients') }
      ],
      clientCols: [
        { dataIndex: 'hostname', title: this.$t('Hostname'), help: this.$t('A name assigned to a client/device.') },
        { dataIndex: 'ipaddr', title: this.$t('IP Address'), help: this.$t('IP address of the client.') },
        { dataIndex: 'macaddr', title: this.$t('MAC Address'), help: this.$t("Client's MAC address.") },
        { dataIndex: 'ssid', title: this.$t('SSID'), help: this.$t('SSID of the interface client belongs to.') },
        { dataIndex: 'band', title: this.$t('Band'), help: this.$t('Operational band of the client and used standard.'), actions: { filter: { type: 'uniqueValues' } } },
        {
          dataIndex: 'signal',
          title: this.$t('Signal'),
          help: this.$t('Signal strength.')
        },
        { dataIndex: 'rx_rate', title: this.$t('RX Rate'), help: this.$t('Download speed.') },
        { dataIndex: 'tx_rate', title: this.$t('TX Rate'), help: this.$t('Upload speed.') }
      ],
      wifiInterfaceStatus: [],
      deviceStatus: [],
      wifiInterfaceConfig: [],
      interfaceStatus: [],
      selectedInterfaces: []
    }
  },
  computed: {
    clients() {
      return this.wifiInterfaceStatus
        .filter(iface => (iface.ssid || iface.mesh_id) && (this.selectedInterfaces.length > 0 ? this.checkSelected(iface) : true))
        .map(this.$wireless.getParsedClients)
        .flat()
    },
    parsedInterfaceStatus() {
      return this.wifiInterfaceStatus.map(ifaceStatus => this.parseInterfaceStatus(ifaceStatus))
    }
  },
  created() {
    this.$spin()
    return this.getDevices()
      .then(this.getStatus)
      .then(() => {
        this.$timer.start({ method: this.getStatus, time: 2000, autostart: true, immediate: false })
      })
      .finally(() => {
        this.$spin(false)
      })
  },
  methods: {
    checkSelected(iface) {
      return this.selectedInterfaces.some(siface => siface.wifi_id === iface.wifi_id)
    },
    getSelectedIndex(iface) {
      return this.selectedInterfaces.findIndex(siface => siface.wifi_id === iface.wifi_id)
    },
    selectInterface(iface) {
      const ifaceIdx = this.getSelectedIndex(iface)
      if (ifaceIdx !== -1) return this.selectedInterfaces.splice(ifaceIdx, 1)
      this.selectedInterfaces.push(iface)
    },
    isCardSelectable(iface) {
      return ['Access Point', 'Mesh'].includes(iface?.mode) && (!!iface.ssid || !!iface.mesh_id)
    },
    getDevices() {
      return this.$axios
        .get('/api/wireless/interfaces/config')
        .then(({ data }) => {
          this.wifiInterfaceConfig = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load wireless interface data'))
        })
    },
    getStatus() {
      return this.$axios
        .bulkGet(['/api/wireless/interfaces/basic/status', '/api/wireless/devices/basic/status', '/api/interfaces/basic/status'])
        .then(([wifiInterfaceStatus, deviceStatus, interfaceStatus]) => {
          if (wifiInterfaceStatus.success) this.wifiInterfaceStatus = wifiInterfaceStatus.data
          else this.$message.error(this.$t('Failed to load wireless interface status'))
          if (deviceStatus.success) this.deviceStatus = deviceStatus.data
          else this.$message.error(this.$t('Failed to load wireless device status'))
          if (interfaceStatus.success) this.interfaceStatus = interfaceStatus.data
          else this.$message.error(this.$t('Failed to load network interface status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    parseInterfaceStatus(ifaceData) {
      if (!ifaceData) return []
      const data = { ...ifaceData }
      const deviceNames = data.devices.map(dev => dev.name)
      const devices = this.deviceStatus.filter(device => deviceNames.includes(device.id))
      data.type = 'wifi'
      data.showSignal = true
      data.text = data.devices.map(dev => `${dev.quality}% (${dev.band})`).join(' | ')
      data.title = this.$wireless.getName(data)
      data.mode = this.$wireless.getMode(data.mode)
      data.signal = parseInt(Math.max(...data.devices.map(dev => dev.quality)))
      data.standard = devices.map(dev => (dev?.standard ? (dev.channel ? `${dev.standard} (ch: ${dev.channel})` : dev.standard) : '-')).join(', ') || '-'
      data.content = this.ifaceCols.map(col => ({ title: col.title, info: data[col.dataIndex] ?? '-', name: col.dataIndex }))
      data.content[0].status = ifaceData
      data.content[0].config = data.content[1].config = this.wifiInterfaceConfig.find(iface => iface.wifi_id === data.wifi_id) ?? {}
      data.content[0].networkStatus = this.interfaceStatus.find(iface => iface.name === data.content[0].config.network)
      if (data.mode === 'Client') data.content.pop()
      else data.content.shift()

      return data
    }
  }
}
</script>
