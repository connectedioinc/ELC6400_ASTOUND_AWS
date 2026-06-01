<template>
  <vuci-form
    ref="form"
    v-model="formData"
    config="dnp3_client"
    :after-load="loadInitial"
    :before-save="validate"
    editing
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :name="section.id"
        :title="$utils.getModalTitle($t('serial client'), section.name)"
        :uci-data="uciData"
        data-key="dnp3"
        :endpoints="[{ endpoint: 'dnp3/serial/config' }]"
        :error-handlers="{ edit: returnErrorMessage }"
      >
        <dnp-3-common-edit-fields
          :form-data="uciData"
          :section="s"
          :initial-device="initialDevice"
          :devices="formOptions().serial"
          :status="formOptions().status"
        >
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Serial port')"
            :help="$t('Which serial port will be used for serial communication.')"
            name="device"
            :options="formOptions().devices"
            required
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
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Open Delay')"
            :help="$t('Some physical layers need time to \'settle\' so that the first tx isn\'t lost.')"
            name="time_duration"
            placeholder="1"
            rules="irange(1,10000)"
            required
          />
        </dnp-3-common-edit-fields>
      </vuci-named-section>
      <dnp-3-common-interface-fields
        :tcp-client="false"
        :uci-data="uciData"
        :section="section"
      />
      <dnp-3-testing-element
        :section="section"
        :tcp-client="false"
        :form-data="uciData"
        :form-ref="$refs.form"
      />
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
import Dnp3TestingElement from './Dnp3TestingElement.vue'
import Dnp3CommonInterfaceFields from './Dnp3CommonInterfaceFields.vue'
import Dnp3CommonEditFields from './Dnp3CommonEditFields.vue'
export default {
  components: {
    Dnp3TestingElement,
    Dnp3CommonInterfaceFields,
    Dnp3CommonEditFields
  },
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
      initialDevice: '',
      requestColumns: [
        { name: 'name', label: this.$t('Name'), help: this.$t('Name of the instance.') },
        { name: 'index', label: this.$t('Start Index'), help: this.$t('Start index of the data subarray.') },
        { name: 'count', label: this.$t('End Index'), help: this.$t('End index of the data subarray.') },
        { name: 'data_type', label: this.$t('Data type'), help: this.$t('Data type.') },
        { name: 'enabled', lable: this.$t('Enabled') }
      ]
    }
  },
  computed: {
    device() {
      return this.$serial.deviceDisplayValue(this.section.device)
    },
    serialOptions() {
      return this.$serial.filterOptions(this.formOptions().serial, this.section.device, this.section)
    },
    anyDeviceExists() {
      return !!this.formOptions().devices.length
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
      return this.$serial.validateBeforeSave(this.formOptions().status, this.formData.dnp3, 'DNP3 Serial Client')
    }
  }
}
</script>
