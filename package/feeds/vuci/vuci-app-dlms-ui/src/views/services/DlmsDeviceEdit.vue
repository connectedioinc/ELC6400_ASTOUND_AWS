<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    :before-save="validate"
    :after-load="afterLoad"
    config="dlms_client"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      data-key="device"
      :endpoints="[{ endpoint: `dlms/devices/config` }]"
      :title="$utils.getModalTitle($t('DLMS physical device'), section.name)"
      :after-save="onAfterSave"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :help="$t('Physical device state.')"
        :label="$t('Enabled')"
        name="enabled"
      />
      <tlt-form-model-item
        :label="$t('Connection')"
        :help="$t('DLMS connection.')"
        element-id="connection"
      >
        <div class="flex">
          <vuci-form-item-select
            :uci-section="s"
            name="connection"
            class="mb-0! min-w-[350px] min-[500px]:mb-0"
            :options="connectionList"
            required
          />
          <tlt-button
            class="h-7 mr-2"
            @click="addAction"
            >{{ $t('Add') }}</tlt-button
          >
          <tlt-button
            v-if="connectionList.length !== 0"
            button-id="edit"
            class="h-7"
            :disabled="false"
            @click="editAction(s.connection)"
          >
            {{ $store.readOnlyPage ? $t('View') : $t('Edit') }}
          </tlt-button>
        </div>
      </tlt-form-model-item>
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Name')"
        :help="$t('Physical device name.')"
        name="name"
        maxlength="200"
        :rules="validateDeviceName"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Server address type')"
        :help="$t('Select \'Default\' for server address or \'Serial Number\' for addressing by a specific serial number.')"
        name="server_addr_type"
        :options="addressTypeList"
        initial="0"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Server address')"
        :help="$t('DLMS device server address.')"
        name="server_addr"
        initial="1"
        rules="irange(0, 16383)"
        required
        :depend="s.server_addr_type === '0'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Serial number')"
        :help="$t('DLMS device serial number. Uses formula \'SN % 10000 + 1000\'.')"
        name="server_addr"
        rules="uinteger"
        required
        :depend="s.server_addr_type === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Logical server address')"
        :help="$t('DLMS device logical server address.')"
        name="log_server_addr"
        required
        initial="0"
        rules="irange(0, 16383)"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Client address')"
        :help="$t('DLMS device client address.')"
        name="client_addr"
        rules="irange(0, 255)"
        initial="16"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Access security')"
        :help="$t('DLMS device authentication type.')"
        name="access_security"
        :options="authenticationList"
        initial="0"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Password')"
        :help="$t('DLMS device password if authentication is used.')"
        name="password"
        rules="string"
        password
        sensitive
        required
        :depend="!['0', '5'].includes(s.access_security)"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Interface type')"
        :help="$t('DLMS device interface type.')"
        name="interface"
        :options="interfaceTypeList"
        initial="0"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Transport security')"
        :help="$t('DLMS device message encryption.')"
        name="transport_security"
        :options="securityList"
        initial="0"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Invocation counter OBIS code')"
        :help="$t('DLMS device invocation counter OBIS code.')"
        name="invocation_counter"
        rules="string"
        maxlength="32"
        required
        :depend="s.transport_security !== '0'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Authentication key')"
        :help="$t('DLMS device authentication key.')"
        name="authentication_key"
        rules="string"
        maxlength="32"
        minlength="32"
        password
        sensitive
        required
        :depend="['16', '48'].includes(s.transport_security) || s.access_security === '5'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Block cipher key')"
        :help="$t('DLMS device block cipher key.')"
        name="block_cipher_key"
        rules="string"
        maxlength="32"
        minlength="32"
        password
        sensitive
        required
        :depend="['32', '48'].includes(s.transport_security) || s.access_security === '5'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Dedicated key')"
        :help="$t('DLMS device dedicated key.')"
        name="dedicated_key"
        rules="string"
        maxlength="32"
        minlength="32"
        password
        sensitive
        :depend="['32', '48'].includes(s.transport_security)"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :help="$t('Two types of referencing is available: short name and logical name. To determine what kind of referencing should be used, read device documentation.')"
        :label="$t('Logical name referencing')"
        name="use_ln_ref"
        initial="1"
      />
      <tlt-form-model-item>
        <vuci-form-item-button
          :uci-section="{}"
          type="button"
          :text="$t('Test')"
          :readonly="getTestHint().length > 0 || testInProgress"
          name="test"
          no-write
          :hints="getTestHint()"
          @click="test"
        />
      </tlt-form-model-item>
      <tlt-text-area
        v-model="testResponse"
        custom-id="test-output"
        :rows="textAreaHeight"
        readonly
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { scanStatuses, getConnectionTestData, getDeviceTestData, isConnectionValid, optionTranslations, useLnRefToCosemOption } from './dlmsUtils'

export default {
  inject: ['scanStatusByDevice'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      authenticationList: [
        ['0', this.$t('None')],
        ['1', this.$t('Low')],
        ['2', this.$t('High')],
        ['3', this.$t('HIGH MD5')],
        ['4', this.$t('HIGH SHA1')],
        ['5', this.$t('HIGH GMAC')],
        ['6', this.$t('HIGH SHA256')]
      ],
      defaultInterfaceTypeList: [
        ['0', this.$t('HDLC')],
        ['1', this.$t('WRAPPER')]
      ],
      securityList: [
        ['0', this.$t('NONE')],
        ['16', this.$t('Authentication')],
        ['32', this.$t('Encryption')],
        ['48', this.$t('Authentication encryption')]
      ],
      addressTypeList: [
        ['0', this.$t('Default')],
        ['1', this.$t('Serial Number')]
      ],
      testInProgress: false,
      testResponse: '',
      connectionChanged: false,
      scanStatuses
    }
  },
  computed: {
    interfaceTypeList() {
      const options = [...this.defaultInterfaceTypeList]
      if (!this.connectionList.length) return options
      const connection = this.connectionList.some(item => item[0] === this.section.connection) ? this.section.connection : this.connectionList[0][0]
      const section = this.formData?.connection?.find(section => section.id === connection)
      const isConnectionSerial = section && section.connection_type === '1'
      if (isConnectionSerial) {
        // Use slice to insert "HDLC with mode E" to be immediately after "HDLC"
        options.splice(1, 0, ['4', this.$t('HDLC with mode E')])
      }
      return options
    },
    connectionList() {
      if (!this.formData.connection) return []
      return this.formData.connection.map(connection => [connection.id, connection.name || this.$t('Name not provided')])
    },
    connectionObject() {
      const connection = this.connectionList.some(item => item[0] === this.section.connection) ? this.section.connection : this.connectionList[0]?.[0]
      return this.formData?.connection?.find(section => section.id === connection)
    },
    textAreaHeight() {
      return Math.max(3, Math.min(this.testResponse.split('\n').length, 20))
    }
  },
  beforeUnmount() {
    if (this.connectionChanged) this.$bus.emit('close-modal')
  },
  methods: {
    afterLoad(uciData) {
      const device = uciData.device.find(d => d.id === this.section.id)
      if (device) {
        device.enabled = '1'
      }
      return uciData
    },
    addAction() {
      if (this.connectionList.length > 29) return this.$message.error(this.$t('Maximum number of connections has been reached'))
      return this.$axios
        .post('/api/dlms/connections/config', { data: {} })
        .then(({ data }) => {
          this.$bus.emit('redirect-to-tab', data.id, this.section.id)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to add DLMS connection'))
        })
    },
    editAction(con) {
      this.connectionChanged = true
      this.$bus.emit('redirect-to-tab', con, this.section.id)
    },
    validateDeviceName(value) {
      const devices = Object.keys(this.formData)
        .filter(key => key.includes('device'))
        .flatMap(key => this.formData[key])
      const exists = devices.some(dev => dev.name === this.section.name && dev.id !== this.section.id)
      if (exists) return { isValid: false, message: this.$t('Device with %s name already exists').format(this.section.name) }
      return { isValid: !value.match(/"/), message: 'A string of any characters is accepted except "' }
    },
    validate() {
      const section = this.formData.device.find(dev => dev.id === this.section.id)
      if (!this.connectionList.length) section.connection = ''
      return Promise.resolve()
    },
    async test(self) {
      if (!(await self.vuciForm.validate())) {
        this.$message.error(this.$t('Values used for testing are invalid'))
        return
      }

      this.testInProgress = true

      try {
        const data = {
          ...getConnectionTestData(this.connectionObject),
          ...getDeviceTestData(this.section)
        }

        const response = await this.$axios.post(`/api/dlms/devices/actions/test`, { data })
        this.testResponse = JSON.stringify(response.data, null, 2)
      } catch (error) {
        this.$message.error(this.$t('Failed to test request, encountered an unexpected error.'))
        console.error(error)
      }

      this.testInProgress = false
    },
    onAfterSave(_, res) {
      if (this.isCosemReferencingOptionMissing()) {
        this.$message.warning(
          this.$t('Some COSEM objects are missing %s option based on the selected name referencing type. Recheck COSEM configurations.').format(
            this.section.use_ln_ref === '1' ? optionTranslations.logical_name() : optionTranslations.short_name()
          )
        )
      }
      if (!this.testInProgress && !this.wasScanStarted()) {
        this.$prompt.show({
          title: this.$t('Configuration saved'),
          content: this.$t('Do you wish to scan device parameters?'),
          okText: this.$t('Scan'),
          cancelText: this.$t('Cancel'),
          onOk: () => {
            this.$bus.emit('start-device-scan', res.data.id)
          }
        })
      }
    },
    wasScanStarted() {
      const deviceScanStatus = this.scanStatusByDevice()[this.section.id]
      return deviceScanStatus && deviceScanStatus.status !== this.scanStatuses.idle
    },
    getTestHint() {
      if (this.scanStatusByDevice()[this.section.id]?.status === this.scanStatuses.inProgress) {
        return [{ info: this.$t('Scan is in progress') }]
      } else if (!this.connectionObject) {
        return [{ info: this.$t('Connection section is missing') }]
      } else if (!isConnectionValid(this.connectionObject)) {
        return [{ info: this.$t('Connection section is missing required values') }]
      }
      return []
    },
    isCosemReferencingOptionMissing() {
      const missingRefOptionCosems = this.formData.cosem_group
        .flatMap(group => this.formData[`${group.id}_cosem`])
        ?.filter(cosem => cosem.physical_device?.includes(this.section.id) && !cosem[useLnRefToCosemOption[this.section.use_ln_ref]])
      return !!missingRefOptionCosems.length
    }
  }
}
</script>
