<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="modbus_client"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      :title="$utils.getModalTitle($t('Modbus request'), section.name)"
      :endpoints="[{ endpoint }]"
      :data-key="`${parentSectionId}_request`"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enabled')"
        :help="$t('If disabled, the request will not be sent to server.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Request name')"
        :help="$t('Name of the request (only used for easier identification of the request or its meaning).')"
        name="name"
        placeholder="Request Name"
        :rules="['uciname', validateRequest]"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Data type')"
        :help="$t('Select data type that will be used for storing the response data (only for read requests).')"
        :options="listModbusDataTypes(s.function, true)"
        name="data_type"
        @change="$utils.validate"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Function')"
        :help="$t('Select Modbus function code for the request.')"
        name="function"
        :options="functionOptions"
        @change="(self, newVal, oldVal) => onFunctionChange(self, newVal, oldVal, s)"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('First register number')"
        :help="$t('Start Register/Coil/Input (1-65536).')"
        name="first_reg"
        placeholder="1"
        rules="irange(1,65536)"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Register count / Values')"
        :help="$t('Number of Registers/Coils/Inputs or actual values to be written (Multiple values must be separated by space character).')"
        name="reg_count"
        :initial="s.data_type !== 'hex' ? '1' : ''"
        :rules="validateRegisters"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-switch
        v-if="!isModbusWriteFunction(s.function)"
        :uci-section="s"
        :label="$t('No brackets')"
        :help="$t('Removes the starting and ending brackets from the request (only for read requests).')"
        name="no_brackets"
      />
      <vuci-form-item-switch
        v-if="isModbusWriteFunction(s.function)"
        :uci-section="s"
        :label="$t('Broadcast')"
        :help="$t('Enable to broadcast the request to all devices (only for write requests).')"
        name="broadcast"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Store on change only')"
        :help="$t('Store the response only if the value has changed.')"
        name="store_on_change_only"
        @change="clearToleranceValues(s)"
      />
      <vuci-form-item-input
        v-if="showTolerance"
        :uci-section="s"
        :label="$t('Tolerance')"
        :help="$t('Tolerance for the value change to be considered as a change.')"
        name="store_tolerance"
        :rules="validateTolerance"
      />
      <vuci-form-item-input
        v-if="showTolerance"
        :uci-section="s"
        :label="$t('Tolerance timeout')"
        :help="$t('Timeout for the value change to be considered as a change.')"
        name="store_tolerance_timeout"
        rules="irange(1, 65536)"
      >
      </vuci-form-item-input>
      <tlt-form
        :title="$t('Request configuration test results')"
        :help="$t('Here you can get information about your request configuration test results.')"
        sid="requestTestForm"
      >
        <vuci-form-item-button
          :uci-section="{}"
          type="button"
          :text="$t('Test')"
          name="test"
          size="sm"
          no-write
          label=" "
          :readonly="isTestButtonDisabled"
          @click="onTestClick"
        />
        <tlt-form-model-item
          :label="$t('Test response')"
          inline
        >
          <tlt-text-area
            v-model="testResponse"
            custom-id="test-output"
            readonly
          />
        </tlt-form-model-item>
      </tlt-form>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import ModbusUtils from '@/components/shared/ModbusUtils.vue'

export default {
  mixins: [ModbusUtils],
  props: {
    section: {
      type: Object,
      required: true
    },
    parentSectionId: {
      type: String,
      required: true
    },
    endpoint: {
      type: String,
      required: true
    },
    onTestRequest: {
      type: Function,
      default: null
    },
    parentTestDisabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      formData: {},
      functionOptions: [
        ['1', this.$t('Read coils (1)')],
        ['2', this.$t('Read input coils (2)')],
        ['3', this.$t('Read holding registers (3)')],
        ['4', this.$t('Read input registers (4)')],
        ['5', this.$t('Set single coil (5)')],
        ['6', this.$t('Set single holding register (6)')],
        ['15', this.$t('Set multiple coils (15)')],
        ['16', this.$t('Set multiple holding registers (16)')]
      ],
      requestColumns: [
        {
          name: 'name',
          label: this.$t('Name'),
          help: this.$t('Name of this request (only used for easier identification of the request or its meaning).')
        },
        {
          name: 'data_type',
          label: this.$t('Data type'),
          help: this.$t('Select data type that will be used for storing the response data (only for read requests).'),
          width: 'w-70'
        },
        {
          name: 'function',
          label: this.$t('Function'),
          help: this.$t('Select Modbus function code for the request.'),
          width: 'w-58'
        },
        {
          name: 'first_reg',
          label: this.$t('First register number'),
          help: this.$t('Start Register/Coil/Input (1-65536).')
        },
        {
          name: 'reg_count',
          label: this.$t('Register count / Values'),
          help: this.$t('Number of Registers/Coils/Inputs or actual values to be written (Multiple values must be separated by space character).')
        },
        {
          name: 'no_brackets',
          label: this.$t('No brackets'),
          help: this.$t('Removes the starting and ending brackets from the request (only for read requests).')
        },
        {
          name: 'store_on_change_only',
          label: this.$t('Store on change only'),
          help: this.$t('Store the response only if the value has changed.')
        },
        {
          name: 'broadcast',
          label: this.$t('Broadcast'),
          help: this.$t('Enable to broadcast the request to all devices (only for write requests).')
        },
        {
          name: 'enabled',
          label: this.$t('Enabled'),
          help: this.$t('If disabled, the request will not be sent to server.')
        }
      ],
      previousBroadcastsById: {},
      testResponse: '',
      localTestDisabled: false
    }
  },
  computed: {
    tagConsumersByRequestId() {
      const tagStatus = this.formOptions()?.tagStatus || {}
      return Object.entries(tagStatus).reduce((acc, [service, tags]) => {
        Object.values(tags || {}).forEach(tag => {
          const tagId = tag?.tag_id
          if (!tagId) return
          const [clientId, reqId] = tagId.split('.')
          if (clientId === this.parentId) {
            acc[reqId] ||= []
            acc[reqId].push(service)
          }
        })
        return acc
      }, {})
    },
    isTestButtonDisabled() {
      return this.localTestDisabled || this.parentTestDisabled || this.section.data_type === 'pdu' || typeof this.onTestRequest !== 'function'
    },

    showTolerance() {
      const validDataTypes = ['8bit', '16bit', '32bit', '64bit']
      const isValidDataType = validDataTypes.some(prefix => this.section.data_type.startsWith(prefix))
      const isReadRequest = this.isModbusReadFunction(this.section.function)

      return this.section.store_on_change_only === '1' && isReadRequest && isValidDataType
    }
  },
  methods: {
    validateRequest(value) {
      const requests = this.formData[`${this.parentSectionId}_request`] || []

      return {
        isValid: !requests.some(sec => sec.name === value && sec.id !== this.section.id),
        message: this.$t('Request with the same name already exists')
      }
    },
    validateRegisters(v, self) {
      const section = self.uciSection
      return this.validateModbusValue(v, section.function, section.data_type)
    },
    onFunctionChange(self, newVal, oldVal, s) {
      if (this.isModbusReadFunction(newVal) && this.isModbusWriteFunction(oldVal)) {
        this.previousBroadcastsById[s.id] = s.broadcast
        s.broadcast = '0'
      } else if (this.isModbusWriteFunction(newVal) && this.isModbusReadFunction(oldVal)) {
        s.broadcast = this.previousBroadcastsById[s.id] || '0'
      }

      if (this.showTolerance === false) {
        this.clearToleranceValues(s)
      }

      self.vuciSection.validate()
    },
    isRequestOverlapping(section) {
      const sourcedRegisters = (this.formOptions()?.sourcedRegisters || []).filter(reg => reg.enabled === '1' && reg.tag_source === 'modbus_client')
      return this.isRequestOverlappingRegisters(section, { tags: sourcedRegisters })
    },
    validateTolerance(value, self) {
      const tolerance = value
      if (!tolerance) return { isValid: true }

      const validatorEntries = [
        { key: 'double', validatorName: 'ufloat' },
        { key: 'float', validatorName: 'ufloat' },
        { key: 'int', validatorName: 'uinteger' }
      ]

      const dataType = (self?.uciSection?.data_type || '').toLowerCase()

      const validatorName = validatorEntries.find(entry => dataType.includes(entry.key))?.validatorName
      if (!validatorName || !this.$VuciValidator[validatorName]) {
        return { isValid: false, message: this.$t('Invalid data type.') }
      }

      this.$VuciValidator.value = tolerance
      return this.$VuciValidator[validatorName]()
    },
    clearToleranceValues(section) {
      section.store_tolerance = ''
      section.store_tolerance_timeout = ''
    },
    onTestClick() {
      if (this.isTestButtonDisabled) return
      this.testResponse = ''
      const payload = {
        ...this.section,
        requestId: this.section.id,
        requestName: this.section.name
      }
      this.localTestDisabled = true

      const maybePromise = typeof this.onTestRequest === 'function' ? this.onTestRequest(payload) : null

      return Promise.resolve(maybePromise)
        .then(message => {
          if (typeof message === 'string') {
            this.testResponse = message
          }
        })
        .finally(() => {
          this.localTestDisabled = false
        })
    }
  }
}
</script>
