<template>
  <vuci-form
    v-model="formData"
    config="rs_ntrip"
    editing
    :after-load="loadInitial"
    :before-save="validate"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :endpoints="[{ endpoint: 'ntrip/config' }]"
        :name="section.id"
        :uci-data="uciData"
        data-key="ntrip"
        :error-handlers="{ edit: returnErrorMessage }"
      >
        <tlt-card :title="$utils.getModalTitle($t('NTRIP instance'), section.name)">
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
            service="NTrip"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Name')"
            :help="$t('Name of serial device.')"
            maxlength="200"
            name="name"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="device"
            :label="$t('Serial device')"
            :help="$t('Select serial device for data transmission.')"
            :options="formOptions().device"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Baud rate')"
            :help="$t('Select supported baud rate.')"
            name="baudrate"
            :options="serialOptions.baudRate"
            initial="115200"
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
            :options="serialOptions.parity"
            initial="none"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Flow control')"
            :help="$t('Select what kind of characters to use for flow control.')"
            name="flowcontrol"
            :options="serialOptions.flowControl"
            initial="none"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Full Duplex')"
            :help="$t(`Check to enable %s Full-Duplex`).format(device)"
            name="full_duplex_enabled"
            :depend="serialOptions.duplex?.includes('half') && serialOptions.duplex?.includes('full')"
          />
        </tlt-card>

        <tlt-card :title="$t('Server settings')">
          <vuci-form-item-input
            :uci-section="s"
            name="ntrip_ip"
            :label="$t('Server address')"
            :help="$t('NTRIP server address.')"
            rules="host"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="ntrip_port"
            :label="$t('Server port')"
            :help="$t('NTRIP server port number.')"
            rules="port"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="ntrip_mount_point"
            :label="$t('Mount point')"
            :help="$t('NTRIP server mount point.')"
            rules="string"
            :required="s.enabled === '1'"
            maxlength="128"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="ntrip_data_format"
            :label="$t('Data format')"
            :help="$t('NTRIP data format.')"
            :options="dataFormatOptions"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="ntrip_user"
            :label="$t('Username')"
            :help="$t('NTRIP server username.')"
            rules="credentials_validate"
            maxlength="512"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="ntrip_password"
            :label="$t('Password')"
            :help="$t('NTRIP server password.')"
            rules="credentials_validate"
            maxlength="512"
            password
          />
          <vuci-form-item-select
            :uci-section="s"
            name="nmea_source"
            :label="$t('NMEA source')"
            :help="$t('Select the source of NMEA.')"
            :options="nmeaSourceOptions"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="user_nmea"
            :label="$t('NMEA string')"
            :help="$t('GGA NMEA string to be used to initiate communication with the server.')"
            :depend="s.nmea_source === '1'"
            :rules="validateNMEA"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="lattitude"
            :label="$t('Latitude')"
            :help="$t('Latitude to be used to generate NMEA string for initiating communication with the server.')"
            :depend="s.nmea_source === '2'"
            rules="precision_range(-90.000000,90.000000)"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="longitude"
            :label="$t('Longitude')"
            :help="$t('Longitude to be used to generate NMEA string for initiating communication with the server.')"
            :depend="s.nmea_source === '2'"
            rules="precision_range(-180.000000,180.000000)"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="report_interval"
            :label="$t('Report interval')"
            :help="$t('Period in seconds of how often the NMEA is sent to server.')"
            rules="irange(1, 86400)"
            initial="10"
          />
        </tlt-card>
      </vuci-named-section>
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
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
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
      defaultNmeaOptions: [
        ['1', this.$t('Predefined string')],
        ['2', this.$t('Predefined coordinates')],
        ['4', this.$t('Serial device')]
      ],
      dataFormatOptions: [
        ['n', this.$t('NTRIP V1.0')],
        ['h', this.$t('NTRIP v2.0 TCP')],
        ['u', this.$t('NTRIP v2.0 UDP')]
      ],
      initialDevice: ''
    }
  },
  computed: {
    ...mapState(useMainStore, ['board']),
    isGPS() {
      return this.board.hwinfo.gps
    },
    device() {
      return this.$serial.deviceDisplayValue(this.section.device)
    },
    nmeaSourceOptions() {
      const options = [...this.defaultNmeaOptions]
      if (this.isGPS) options.push(['3', this.$t('Router GPS device')])
      return options
    },
    serialOptions() {
      return this.$serial.filterOptions(this.formOptions().serial, this.section.device, this.section)
    },
    canSerialDeviceBeUsed() {
      return this.$serial.canDeviceBeUsed({
        serialDevices: this.formOptions().serial,
        serialStatus: this.formOptions().status,
        initialDevice: this.initialDevice,
        device: this.section.device,
        service: 'NTrip'
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
    validateNMEA(val) {
      if (/^\$[^ ]{2}GGA,.*/.test(val)) {
        return { isValid: true }
      }
      return {
        isValid: false,
        message: this.$t('"$XXGGA," prefix is required. X represents a random symbol.')
      }
    },
    returnErrorMessage(errors) {
      return this.$serial.handleExternalDeviceErrors(errors)
    },
    validate() {
      return this.$serial.validateBeforeSave(this.formOptions().status, this.formData.ntrip, 'NTrip')
    }
  }
}
</script>
