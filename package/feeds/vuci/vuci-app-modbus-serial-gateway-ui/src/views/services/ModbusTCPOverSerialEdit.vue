<template>
  <vuci-form
    v-model="formData"
    config="rs_modbus"
    editing
    :after-load="loadInitial"
    :before-save="validate"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :name="section.id"
        data-key="overSerial"
        :endpoints="[{ endpoint: 'modbus/tcp_over_serial/config' }]"
        :title="$utils.getModalTitle($t('device Modbus TCP over serial'), section.name)"
        :help="$t('Settings for modbus tcp over serial configuration.')"
        :error-handlers="{ edit: returnErrorMessage }"
      >
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enable')"
          rawhtml
          :help="$t('Enable service.')"
          :readonly="!canSerialDeviceBeUsed && s.enabled !== '1'"
        />
        <serial-inline-warning
          :serial-status="formOptions().status"
          :serial-devices="formOptions().serial"
          :initial-device="initialDevice"
          :device="s.device"
          service="Modbus TCP over Serial Gateway"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Name')"
          :help="$t('Instance name.')"
          maxlength="200"
          name="name"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Timeout')"
          :help="$t('Set the timeout in seconds to ensure reliable communication.')"
          rules="irange(1, 60)"
          initial="10"
          name="timeout"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Device')"
          :help="$t('Which serial port will be used for serial communication.')"
          name="device"
          :options="formOptions().device"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Baud rate')"
          :help="$t('Select supported baud rate.')"
          name="baudrate"
          :options="serialOptions.baudRate"
          initial="9600"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Data bits')"
          :help="$t('Select how many bits will be used for character.')"
          name="databits"
          :options="serialOptions.dataBits"
          initial="8"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Stop bits')"
          :help="$t('Select how many stop bits will be used to detect the end of character.')"
          name="stopbits"
          :options="serialOptions.stopBits"
          initial="1"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Parity')"
          :help="$t('Select what kind of parity bit to use for error detection.')"
          name="parity"
          initial="none"
          :options="serialOptions.parity"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Flow control')"
          :help="$t('Select what kind of characters to use for flow control.')"
          name="flowcontrol"
          initial="none"
          :options="serialOptions.flowControl"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Listening IP')"
          :help="$t('IP address on which Modbus Gateway should listen for incoming connections.')"
          name="modbus_ip"
          required
          rules="ip4addr"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Port')"
          :help="$t('Port number for Modbus gateway.')"
          name="modbus_port"
          rules="port"
          required
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="broadcasts"
          :label="$t('Broadcasts')"
          :help="$t('Enables Modbus TCP broadcast over a serial gateway, allowing messages to be sent to all connected Modbus RTU devices simultaneously.')"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Server ID configuration type')"
          :help="$t('Redirects Modbus TCP to RTU.')"
          name="server_id_config"
          :options="serverIdOptions"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Server ID')"
          :help="$t('Redirect packets to Modbus server ID.')"
          :depend="s.server_id_config === 'single'"
          name="single_server_id"
          rules="irange(1,247)"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          name="multi_server_id"
          :label="$t('Permitted server IDs')"
          :help="$t('Redirect packets whose server IDs is on the list. Individual IDs are separated by \',\' (comma) and range is specifed by \'-\' (hyphen).')"
          :depend="s.server_id_config === 'multiple'"
          :rules="validateMultiServerID"
          required
          initial="1-247"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('CRC verification')"
          :help="$t('Checks if sent serial message is not disturbed.')"
          name="crc_enabled"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Full Duplex')"
          :help="$t('Check to enable rs485 Full-Duplex.')"
          name="full_duplex_enabled"
          :depend="serialOptions.duplex?.includes('half') && serialOptions.duplex?.includes('full')"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Repeat serial message')"
          :help="$t('How many times serial message is repeated if CRC has failed.')"
          name="crc_repeat"
          :depend="s.crc_enabled === '1'"
          :options="repeatOptions"
        />
      </vuci-named-section>
      <vuci-typed-section
        :title="$t('IP filter')"
        :table-actions="['column-list', 'search']"
        type="rule"
        :uci-data="uciData"
        :columns="ipFilterCollumns"
        :data-key="section.id"
        :endpoints="[{ endpoint: `modbus/tcp_over_serial/${section.id}/filters/config` }]"
      >
        <template #interface="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            name="src"
          />
        </template>
        <template #allow_ip="{ s }">
          <vuci-form-item-list
            :uci-section="s"
            name="src_ip"
            rules="ipmask4"
          />
        </template>
        <template #addForm="{ addModel }">
          <tlt-form-item-select
            v-model="addModel.src"
            :label="$t('Interface')"
            prop="src"
            :options="formOptions().zones"
          />
        </template>
      </vuci-typed-section>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          :readonly="!anyDeviceExists"
          @click="save"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script>
import SerialInlineWarning from '@/components/shared/SerialInlineWarning'

export default {
  components: { SerialInlineWarning },
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      serverIdOptions: [
        ['single', this.$t('User defined')],
        ['multiple', this.$t('Obtained from TCP')]
      ],
      repeatOptions: ['0', '1', '2', '3'],
      ipFilterCollumns: [
        { name: 'interface', label: this.$t('Interface') },
        {
          name: 'allow_ip',
          label: this.$t('Allow IP'),
          help: this.$t('Allow ip connecting to server, 0.0.0.0/0 for allowing all.')
        }
      ],
      initialDevice: ''
    }
  },
  computed: {
    serialOptions() {
      return this.$serial.filterOptions(this.formOptions().serial, this.section.device, this.section)
    },
    canSerialDeviceBeUsed() {
      return this.$serial.canDeviceBeUsed({
        serialDevices: this.formOptions().serial,
        serialStatus: this.formOptions().status,
        initialDevice: this.initialDevice,
        device: this.section.device,
        service: 'Modbus TCP over Serial Gateway'
      })
    },
    anyDeviceExists() {
      return !!this.formOptions().device.length
    }
  },
  methods: {
    loadInitial() {
      this.initialDevice = this.section.device
    },
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    validate() {
      return this.$serial.validateBeforeSave(this.formOptions().status, this.formData.overSerial, 'Modbus TCP over Serial Gateway')
    },
    validateSingleID(value) {
      this.$VuciValidator.value = value
      return this.$VuciValidator.irange(1, 247)
    },
    validateRangeID(value) {
      const rangeParts = value.split('-')
      if (rangeParts.length !== 2) {
        return { isValid: false, message: this.$t('Specified range is incorrect') }
      }
      const [rangeStartStr, rangeEndStr] = rangeParts

      let valid = this.validateSingleID(rangeStartStr)
      if (!valid.isValid) return valid
      const rangeStart = parseInt(rangeStartStr)

      valid = this.validateSingleID(rangeEndStr)
      if (!valid.isValid) return valid
      const rangeEnd = parseInt(rangeEndStr)

      if (rangeStart > rangeEnd) {
        return { isValid: false, message: this.$t("Range start can't be larger than the end") }
      }

      return { isValid: true }
    },
    validateMultiServerID(value) {
      for (const rangeOrSingle of value.split(',')) {
        let result
        if (rangeOrSingle.includes('-')) {
          result = this.validateRangeID(rangeOrSingle)
        } else {
          result = this.validateSingleID(rangeOrSingle)
        }
        if (!result.isValid) return result
      }

      return { isValid: true }
    }
  }
}
</script>
