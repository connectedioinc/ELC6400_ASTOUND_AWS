<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="etherwake"
    :after-load="loadInterfaces"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('Wake on LAN configuration')"
      :endpoints="[{ endpoint: 'wol/global' }]"
      data-key="general"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="broadcast"
        :label="$t('Broadcast')"
        :help="
          $t(
            'If checked, the WOL function sends a magic packet to the broadcast address (FF:FF:FF:FF:FF:FF) \
          whenever it is asked to wake a device. When you send a packet to the broadcast address it is received by all LAN devices.'
          )
        "
      />
      <vuci-form-item-select
        :uci-section="s"
        name="interface"
        :label="$t('Interface')"
        :options="interfaces"
      />
      <vuci-form-item-button
        :uci-section="s"
        name="wakeAllDevices"
        label=" "
        type="text"
        :text="$t('Wake all devices')"
        @click="wakeAllDevices"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      type="target"
      :title="$t('Wake on LAN devices')"
      :endpoints="[{ endpoint: 'wol/config' }]"
      :table-actions="['search', 'column-list']"
      data-key="target"
      :help="description"
      :columns="deviceColumns"
      :row-actions="rowActions"
    >
      <template #name="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="name"
          required
          :rules="['uciname', uniqueName]"
          @change="validate"
        />
      </template>
      <template #mac="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="mac"
          :rules="['macaddr', noDublicateValidate]"
          required
          @change="validate"
        />
      </template>
      <template #password="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="password"
          password
          sensitive
          :rules="v => [v.hexstring, v.exact_length.bind(v, [8, 12])]"
        />
      </template>
      <template #wakeonboot="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="wakeonboot"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      deviceColumns: [
        { name: 'name', label: this.$t('Name'), help: this.$t('Name for the target. The name should be unique for each configuration.'), width: 'md' },
        { name: 'mac', label: this.$t('MAC'), help: this.$t('Specifies the MAC address of the host to wake. The MAC address should be unique for each configuration.'), width: 'md' },
        { name: 'password', label: this.$t('Password'), help: this.$t('Values of specific lengths (8, 12) are accepted.'), width: 'md' },
        { name: 'wakeonboot', label: this.$t('Wake on Boot'), help: this.$t('Decide whether to send a Wake-On-Lan (WOL) packet when booting the system.') },
        { name: '__row-actions', width: 'sm' }
      ],
      formData: {},
      description: this.$t(
        'This section displays a list of devices that can be "woken up" by the device using Wake on LAN. The Wake on LAN (WOL) feature can "wake up" compliant computers from sleep mode by sending a special packet (called "magic packet") to the network interface adapter of the specified device. Click the "Add" button to add more devices.'
      ),
      wolErrors: {
        1: this.$t('Failed to wake device'),
        2: this.$t('Password validation failed'),
        3: this.$t('Failed to wake device(s) and password validation failed for device(s)'),
        default: this.$t('Wol packet sending failed')
      },
      interfaces: [],
      rowActions: [{ id: 'wakeSingleDevice', label: this.$t('Wake device'), callback: this.wakeSingleDevice }, 'delete']
    }
  },
  methods: {
    validate(self) {
      this.$nextTick(() => self?.vuciForm.validate())
    },
    findOtherRows(currentRow, rows) {
      return rows.filter(e => e !== currentRow)
    },
    noDublicateValidate(_, self) {
      const currentRow = self.uciSection
      const rows = self.vuciForm.uciData.target
      const validator = { isValid: true }
      const otherRows = this.findOtherRows(currentRow, rows)
      let validatorText = ''
      otherRows.forEach(otherRow => {
        if (this.fieldsOverlap(currentRow, otherRow)) {
          validatorText = this.$t('Configuration with MAC %s already exists').format(otherRow.mac)
          validator.isValid = false
        }
      })
      validator.message = validatorText
      return validator
    },
    fieldsOverlap(current, other) {
      return current.mac === other.mac
    },
    uniqueName(_, self) {
      const validator = { isValid: true, message: '' }
      const otherRow = self.vuciForm.uciData.target.find(row => row.id !== self.sectionTarget && row.name === self.model)
      if (otherRow !== undefined) {
        validator.message = this.$t('Configuration with name "%s" already exists').format(self.model)
        validator.isValid = false
      }
      return validator
    },
    wakeSingleDevice(self) {
      const { id: uciName, name, mac, password, wakeonboot } = self
      if (!name || !mac) {
        this.$message.error(this.$t('No target or MAC address specified'))
        return
      }
      this.$spin()
      return this.$axios
        .put(`/api/wol/config/${uciName}`, { data: { name, mac, password, wakeonboot } })
        .then(({ data }) => {
          return this.$axios
            .post('/api/wol/actions/wake_device', { data: { name: data.name, mac: data.mac } })
            .then(() => {
              this.$message.success(this.$t('Wol packet sent'))
            })
            .catch(e => {
              this.$message.error(this.wolErrors[e?.response?.data?.errors?.status] || this.wolErrors.default)
            })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to update Wol device configuration'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    wakeAllDevices() {
      return this.$axios
        .post('/api/wol/actions/wake_all_devices')
        .then(() => {
          this.$message.success(this.$t('Wol packet sent'))
        })
        .catch(() => {
          this.$message.error(this.$t('Wol packet sending failed'))
        })
    },
    loadInterfaces() {
      return this.$axios
        .get('/api/wol/options')
        .then(({ data }) => {
          this.interfaces = data.interfaces
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load interfaces data'))
        })
    }
  }
}
</script>
