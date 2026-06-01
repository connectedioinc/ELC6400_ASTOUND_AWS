<template>
  <vuci-form
    v-model="formData"
    config="bacnet_router"
    bulk-request
    :after-load="afterLoad"
    :before-save="validate"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :title="$t('General configuration')"
        name="general"
        :endpoints="[{ endpoint: 'bacnet/config' }]"
        data-key="general"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          name="enabled"
          :help="$t('Enables BACnet router function.')"
          :readonly="!validateInterfaces(1)"
        />
        <tlt-inline-message
          v-show="!validateInterfaces(1)"
          type="warning"
          :message="
            $t(
              'To use the BACnet Router function, you must have either two BACnet interfaces (any combination of BIP or MSTP), or one BACnet interface with BBMD enabled. BBMD counts as one interface.'
            )
          "
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable BBMD')"
          name="bbmd_enabled"
          :help="$t('Enables BACnet broadcast management function.')"
          :readonly="bbmdDisabledEnabled"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('BBMD port')"
          :help="$t('BACnet broadcast management devices port.')"
          name="bbmd_port"
          :depend="s.bbmd_enabled === '1'"
          initial="47809"
          rules="port"
          required
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('BBMD interface')"
          name="bbmd_interface"
          :help="$t('Select interface for BBMD function. IP address of this interface should be reachable from WAN.')"
          :depend="s.bbmd_enabled === '1'"
          :rules="validateInterfaceBBMD"
          :options="deviceOptions"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Allow Remote Access from WAN')"
          name="allow_ra"
          :help="$t('Creates firewall rule to make application port reachable from WAN.')"
          :depend="s.bbmd_enabled === '1'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Force gateway')"
          name="force_gateway"
          :help="$t('Adds configured gateway IP address and port to bbmd packages sent.')"
          :depend="s.bbmd_enabled === '1'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Gateway address')"
          :help="$t('Gateway IP address.')"
          name="gateway_address"
          rules="ip4addr"
          :depend="s.bbmd_enabled === '1' && s.force_gateway === '1'"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Gateway port')"
          :help="$t('Gateway port number.')"
          name="gateway_port"
          rules="port"
          :depend="s.bbmd_enabled === '1' && s.force_gateway === '1'"
          required
        />
      </vuci-named-section>
      <vuci-typed-section
        :show="formData?.general?.[0]?.bbmd_enabled === '1'"
        type="bdt_entry"
        :title="$t('BDT configuration')"
        :help="
          $t(
            'This section contains Broadcast Distribution Table (BDT) configuration, where you specify the list of BBMDs (BACnet Broadcast Management Devices) responsible for forwarding broadcast messages between different subnets in a BACnet/IP network.'
          )
        "
        :table-actions="['column-list', 'search']"
        :columns="bdtColumn"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'bacnet/bdt/config' }]"
        fixed-table
        data-key="bdt"
      >
        <template #address="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="address"
            placeholder="192.168.1.1"
            rules="ip4addr"
          />
        </template>
        <template #port="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="port"
            placeholder="20000"
            rules="port"
          />
        </template>
        <template #mask="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="mask"
            placeholder="255.255.255.0"
            rules="netmask"
          />
        </template>
      </vuci-typed-section>
      <vuci-typed-section
        type="port"
        :title="$t('BIP configuration')"
        :help="$t('This configuration section configures network settings to enable communication and routing within a BACnet/IP network.')"
        :columns="bipColumn"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'bacnet/bip/config' }]"
        data-key="bip"
        :row-actions="
          s => [
            {
              id: 'delete',
              buttonProps: { readonly: s.id === 'general' || deleteDisabled(s) },
              hints: returnDeleteHints(s)
            }
          ]
        "
        :error-handlers="{
          delete: handleDeleteError
        }"
      >
        <template #network="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="network"
            placeholder="1"
            :rules="['irange(1,65534)', validateDuplicateNetworkID]"
          />
        </template>
        <template #port="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="port"
            initial="47808"
            rules="port"
            required
          />
        </template>
        <template #device="{ s }">
          <vuci-form-item-select
            :uci-section="s"
            name="device"
            :rules="validateInterface"
            :options="deviceOptions"
          />
        </template>
        <template #enabled="{ s }">
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :readonly="!validateInterfaces(2) && s.enabled === '1' && formData?.general?.[0]?.enabled === '1'"
          />
        </template>
      </vuci-typed-section>
      <vuci-typed-section
        :show="supportsMSTP"
        type="port"
        :title="$t('MSTP configuration')"
        :columns="mstpColumn"
        :uci-data="uciData"
        :endpoints="supportsMSTP ? [{ endpoint: 'bacnet/mstp/config' }] : []"
        :edit-form="editModal"
        data-key="mstp"
        :row-actions="
          s => [
            'edit',
            {
              id: 'delete',
              buttonProps: { readonly: deleteDisabled(s) },
              hints: returnDeleteHints(s)
            }
          ]
        "
        :error-handlers="{
          delete: handleDeleteError
        }"
      >
        <template #network="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="network"
            :display-value="displayDefault"
          />
        </template>
        <template #mac="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="mac"
            :display-value="displayDefault"
          />
        </template>
        <template #device="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="device"
            :display-value="displayDevices"
          />
        </template>
        <template #enabled="{ s }">
          <tlt-hint :hints="getEnableHint(canSerialDeviceToggleEnable, s)">
            <serial-hint
              v-slot="{ disabled }"
              :serial-status="formOptions.status"
              :serial-devices="formOptions.serial"
              :device="s.device"
              :hidden="s.enabled === '1' || !canSerialDeviceToggleEnable(s)"
              service="BACnet"
            >
              <vuci-form-item-switch
                :uci-section="s"
                name="enabled"
                :readonly="disabled || !canSerialDeviceToggleEnable(s) || canMSTPDeviceBeDisabled(s)"
              />
            </serial-hint>
          </tlt-hint>
        </template>
      </vuci-typed-section>
    </template>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import MstpEdit from './MstpEdit.vue'
import SerialHint from '@/components/shared/SerialHint'

export default {
  components: { SerialHint },
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      serial: [],
      /** @type {import('@/types/networkDeviceTypes').DeviceStatus[]} */
      formData: {},
      networkDevices: [],
      bdtColumn: [
        { name: 'address', label: this.$t('IP address'), help: this.$t('IP addresses of the BBMDs in the network.') },
        { name: 'port', label: this.$t('Port'), help: this.$t('Port numbers on which the BBMDs listen for BACnet/IP messages.') },
        { name: 'mask', label: this.$t('Netmask'), help: this.$t('Subnet masks used by the BBMDs to determine the range of IP addresses within a subnet.') }
      ],
      bipColumn: [
        { name: 'network', label: this.$t('Network ID'), help: this.$t('Unique identifier for the BACnet/IP subnet within the entire BACnet internetwork.') },
        { name: 'port', label: this.$t('Port'), help: this.$t('This specifies the port number used by BACnet/IP devices for communication.') },
        { name: 'device', label: this.$t('Device'), help: this.$t('Select the network device to be used for BACnet/IP communication.') },
        { name: 'enabled', label: this.$t('Enabled'), help: this.$t('Enable BACnet BIP function.') }
      ],
      mstpColumn: [
        { name: 'network', label: this.$t('Network ID'), help: this.$t('Unique identifier for the BACnet MSTP network.') },
        { name: 'mac', label: this.$t('MAC'), help: this.$t('Router MSTP MAC address.') },
        { name: 'device', label: this.$t('Device'), help: this.$t('Bacnet MSTP serial device.') },
        { name: 'enabled', label: this.$t('Enabled'), help: this.$t('Enable MSTP router function.') }
      ],
      formOptions: {
        serial: [],
        device: [],
        status: []
      },
      editModal: markRaw(MstpEdit)
    }
  },
  computed: {
    deviceOptions() {
      return this.networkDevices
        .filter(dev => dev.name && dev.name !== 'lo' && !dev.name.includes('sit') && !dev.name.startsWith('wwan') && !dev.name.startsWith('rmnet') && dev.type !== 'vrf')
        .map(devi => devi.name)
    },
    supportsMSTP() {
      return this.$store.board.hwinfo.usb || this.$store.board.hwinfo.rs485
    },
    devices() {
      return this.$serial.listDeviceNameTuples(this.formOptions.serial)
    },
    bbmdDisabledEnabled() {
      return this.formData?.general?.[0]?.bbmd_enabled === '1' && this.formData?.general?.[0]?.enabled === '1' && !this.validateInterfaces(2)
    }
  },
  methods: {
    deleteDisabled(s) {
      if (!this.formData?.general?.[0] || s.enabled !== '1') return false
      return this.formData?.general?.[0]?.enabled === '1' && !this.validateInterfaces(2)
    },
    displayDefault(value) {
      return value || '-'
    },
    returnDeleteHints(s) {
      if (s.id === 'general') return [{ info: this.$t('Cannot delete the general section') }]
      return this.deleteDisabled(s) && s.enabled === '1' ? [{ info: this.$t('Cannot delete the section when BACnet router is enabled') }] : []
    },
    displayDevices(value) {
      const device = this.$serial.deviceDisplayValue(value)
      return device && device !== 'undefined' ? device : '-'
    },
    validateInterfaceBBMD(val) {
      if (this.formData?.bip?.some(bip => bip.enabled === '1' && bip.device === val)) {
        return { isValid: false, message: this.$t('Interface is already used in BIP configuration') }
      }
      return { isValid: true }
    },
    getFormOptions() {
      return this.formOptions
    },
    validate() {
      if (!this.supportsMSTP) Promise.resolve()
      return this.$serial.validateBeforeSave(this.formOptions.status, this.formData.mstp, 'BACnet')
    },
    canSerialDeviceToggleEnable(section) {
      return section.device && section.baud && section.databits && section.stopbits && section.parity
    },
    canMSTPDeviceBeDisabled(section) {
      return this.formData?.general?.[0]?.enabled === '1' && section.enabled === '1' && !this.validateInterfaces(2)
    },
    getEnableHint(canToggleEnable, section) {
      return !canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    },
    validateInterfaces(limit) {
      const bipLength = this.formData?.bip?.filter(bip => bip.enabled === '1').length || 0
      const mstpLength = this.formData?.mstp?.filter(mstp => mstp.enabled === '1').length || 0
      const bbmdEnabled = this.formData?.general?.[0].bbmd_enabled === '1' ? 1 : 0
      const combinedLength = bipLength + mstpLength + bbmdEnabled
      return combinedLength > limit
    },
    validateInterface(val, s) {
      if ((this.formData?.bip?.filter(bip => bip.device === val).length > 1 || this.formData?.general?.[0]?.bbmd_interface === val) && s.uciSection.enabled === '1') {
        return { isValid: false, message: this.$t('Interface must be unique') }
      }
      return { isValid: true }
    },
    validateDuplicateNetworkID(val) {
      if (this.formData?.mstp?.some(mstp => mstp.network === val)) return { isValid: false, message: this.$t('Network ID is already used in MSTP configuration') }
      if (this.formData?.bip?.filter(bip => bip.enabled === '1' && bip.network === val) > 1) return { isValid: false, message: this.$t('Network ID is already used in BIP configuration') }
      return { isValid: true }
    },
    handleDeleteError(e) {
      const errorMessages = {
        106: this.$t('Failed to delete: BACnet is enabled. Disable BACnet and save your configuration first'),
        default: this.$t('An unexpected error occurred')
      }

      const code = e?.data?.errors?.[0]?.code
      return errorMessages[code] || errorMessages.default
    },
    afterLoad() {
      return this.$axios
        .bulkGet(['/api/basic/network/devices/status', '/api/system/device/status'])
        .then(([devices, info]) => {
          this.networkDevices = devices.success ? devices.data : []
          this.formOptions.serial = info.success && info.data.board.serial ? info.data.board.serial : []
          this.formOptions.device = this.devices || []
          if (!devices.success) this.$message.error(this.$t('Failed to load device data'))
          if (!info.success) this.$message.error(this.$t('Failed to load serial device info'))
          if (!this.supportsMSTP) return {}
          else return this.$axios.get('/api/serial/status')
        })
        .then(status => {
          this.formOptions.status = status.success ? status.data : []
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    }
  }
}
</script>
