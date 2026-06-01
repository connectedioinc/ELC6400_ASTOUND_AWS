<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="modbus_client"
    :before-save="validateBeforeSave"
    editing
    bulk-request
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      data-key="modbusSerialServer"
      :endpoints="[{ endpoint: 'modbus/client/serial/servers/config' }]"
      :title="$utils.getModalTitle($t('Modbus device'), section.name)"
      :help="$t('Modbus Device Configuration.')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enabled')"
        :help="$t('Check to enable this Modbus server device configuration.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Name')"
        :help="$t('Name of the server device. Used for easier device management purposes only.')"
        name="name"
        :placeholder="$t('Name')"
        maxlength="200"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Serial device')"
        :help="$t('Serial device for rtu server.')"
        name="rtu_device"
        :options="rtuDevices"
      />
      <vuci-form-item-input
        ref="server_id"
        :uci-section="s"
        :label="$t('Server ID')"
        :help="$t('Modbus server ID number (1-255). Note: ID 0 is a broadcast address that will target a specific server. If a true broadcast is desired request(s) must have Broadcast enabled.')"
        name="server_id"
        placeholder="1"
        rules="irange(0,255)"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Number of timeouts')"
        :help="$t('Skip pending request after number of request failures.')"
        name="skip_on_many_tmos"
        placeholder="0"
        initial="0"
        required
        rules="irange(0,10)"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Frequency')"
        :help="$t('Select which timing method will be used to send requests.')"
        name="frequency"
        :options="frequencyOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Period')"
        :help="$t('Interval in seconds for sending requests to this device.')"
        name="period"
        placeholder="60"
        required
        :depend="s.frequency === 'period'"
        rules="irange(1,99999)"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Schedule requests')"
        :help="$t('Schedule request time in format: Hours:Minutes:Seconds.')"
        name="schedule"
        required
        :maxlines="255"
        :depend="s.frequency === 'schedule'"
        :rules="validateSchedule"
      />
      <vuci-form-item-input
        ref="timeout"
        :uci-section="s"
        :label="$t('Timeout')"
        :help="$t('Serial device response timeout.')"
        name="timeout"
        rules="irange(1,60)"
      />
    </vuci-named-section>
    <modbus-requests
      :section="section"
      :uci-data="uciData"
      :endpoint="`modbus/client/serial/servers/${section.id}/requests/config`"
      :on-test-request="testRequest"
      :test-disabled="testDisabled"
    />
    <tlt-form
      :title="$t('Request configuration test results')"
      :help="$t('Here you can get information about your request configuration test results.')"
      sid="testForm"
    >
      <br />
      <div
        v-if="testResponse"
        class="bg-theme-bg-secondary-subtle border rounded-lg mt-2.5 font-mono pt-2.5 pl-2.5 pr-9 break-words"
        test-id="text-test-response"
      >
        <div class="font-mono break-words">
          {{ testResponse }}
        </div>
      </div>
    </tlt-form>
    <vuci-typed-section
      :uci-data="uciData"
      :type="`alarm_${section.id}`"
      :columns="alarmColumns"
      :edit-form="editModal"
      :data-key="`${section.id}_alarm`"
      :endpoints="[{ endpoint: `modbus/client/serial/servers/${section.id}/alarms/config` }]"
      :title="$utils.getModalTitle($t('Alarms'))"
      :table-actions="['column-list', 'search']"
      :edit-form-props="{
        dataOptions: f => listModbusDataTypes(f),
        validate: (value, self) => validateRegisters(value, self)
      }"
    >
      <template #f_code="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="f_code"
          :display-value="displayFunction"
        />
      </template>
      <template #register="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="register"
          :display-value="displayGeneric"
        />
      </template>
      <template #condition="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="condition"
          :display-value="displayCondition"
        />
      </template>
      <template #value="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="value"
          :display-value="displayGeneric"
        />
      </template>
      <template #action="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="action"
          :display-value="displayAction"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './ModbusSerialAlarmEdit'
import ModbusRequests from '@/components/shared/ModbusRequests.vue'
import ModbusUtils from '@/components/shared/ModbusUtils.vue'

export default {
  components: { ModbusRequests },
  mixins: [ModbusUtils],
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
      testDisabled: false,
      frequencyOptions: [
        ['period', this.$t('Period')],
        ['schedule', this.$t('Schedule')]
      ],
      actionDisplayValues: {
        0: this.$t('SMS'),
        1: this.$t('Output'),
        2: this.$t('Modbus write request'),
        3: this.$t('MQTT message'),
        4: this.$t('Ubus event'),
        5: this.$t('Email')
      },
      conditionDisplayValues: {
        1: this.$t('More than'),
        2: this.$t('Less than'),
        4: this.$t('Equal to'),
        8: this.$t('Not Equal to'),
        16: this.$t('Less or equal'),
        32: this.$t('More or equal')
      },
      functionDisplayValues: {
        1: this.$t('Read Coil Status (1)'),
        2: this.$t('Read Input Status (2)'),
        3: this.$t('Read Holding Registers (3)'),
        4: this.$t('Read Input Registers (4)')
      },
      selectedRequest: '',
      errors: {
        1: this.$t('Empty test register number, unable to enable the alarm'),
        2: this.$t('Empty phone number, unable to enable the alarm'),
        3: this.$t('Invalid Modbus write request: no IP, unable to enable the alarm'),
        4: this.$t('Invalid Modbus write request: no port, unable to enable the alarm'),
        5: this.$t('Invalid Modbus write request: no timeout, unable to enable the alarm'),
        6: this.$t('Invalid Modbus write request: no ID, unable to enable the alarm'),
        7: this.$t('Invalid Modbus write request: no register number, unable to enable the alarm'),
        8: this.$t('Invalid Modbus write request: no register values, unable to enable the alarm')
      },
      editModal: markRaw(EditForm),
      testResponse: '',
      alarmColumns: [
        { name: 'f_code', label: this.$t('Function'), help: this.$t('Modbus Function.') },
        {
          name: 'register',
          label: this.$t('Register'),
          help: this.$t('Register or coil number (or range) to be checked.')
        },
        {
          name: 'condition',
          label: this.$t('Condition'),
          help: this.$t('Condition for comparing values read with configured values.')
        },
        {
          name: 'value',
          label: this.$t('Value'),
          help: this.$t('Register or coil value used to check for the alarm conditions.')
        },
        { name: 'action', label: this.$t('Action'), help: this.$t('Action triggered by this alarm.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ]
    }
  },
  computed: {
    requestList() {
      if (this.formData && this.formData[`${this.section.id}_request`]) {
        const sourcedRegisters = this.formOptions().sourcedRegisters.filter(reg => reg.enabled === '1' && reg.tag_source === 'modbus_client')
        return this.formData[`${this.section.id}_request`]
          .filter(request => {
            return !this.isRequestOverlappingRegisters(request, { tags: sourcedRegisters })
          })
          .map(request => request.name)
      }
      return []
    },
    rtuDevices() {
      return this.formData?.modbusSerialClient?.map(instance => [instance.id, instance.name ? instance.name : instance.id])
    },
    mutatableSection() {
      return this.section
    }
  },
  created() {
    if (this.section.schedule && this.section.schedule.length > 255) {
      this.mutatableSection.schedule = this.section.schedule.slice(0, 255)
    }
  },
  methods: {
    validate(self) {
      self.vuciSection.validate()
    },
    displayFunction(value) {
      return this.functionDisplayValues[value] || this.$t('N/A')
    },
    validateSchedule(value) {
      const split = value.split(':')
      if (split.length !== 3) return { isValid: false, message: this.$t('Time of format hh:mm:ss is accepted.') }
      const mappedValue = split.map(v => (v === '*' ? '11' : v))
      this.$VuciValidator.value = `${mappedValue[0]}:${mappedValue[1]}:${mappedValue[2]}`
      return this.$VuciValidator.timehhmmss()
    },
    displayGeneric(value) {
      return value || this.$t('N/A')
    },
    validateRegisters(v, self) {
      const section = self.uciSection
      return this.validateModbusValue(v, section.function, section.data_type)
    },
    displayAction(value) {
      return this.actionDisplayValues[value] || this.$t('N/A')
    },
    displayCondition(value) {
      return this.conditionDisplayValues[value] || this.$t('N/A')
    },
    testRequest(requestData = {}) {
      const validations = ['server_id', 'timeout'].map(refName => {
        const ref = this.$refs[refName]
        if (!ref || typeof ref.validate !== 'function') return Promise.resolve(true)
        try {
          const result = ref.validate()
          return result instanceof Promise ? result : Promise.resolve(result)
        } catch (error) {
          return Promise.reject(error)
        }
      })

      return Promise.all(validations)
        .then(valid => {
          if (valid.includes(false)) throw new Error('invalid')
          if (requestData.data_type === 'pdu') throw new Error('pdu')

          const clientSection = this.formData.modbusSerialClient.find(section => section.id === this.section.rtu_device)
          const badValues = []
          const data = {
            timeout: this.section.timeout || badValues.push('timeout'),
            server_id: this.section.server_id || badValues.push('server id'),
            first_reg: requestData.first_reg || badValues.push('first register number'),
            function: requestData.function || badValues.push('function'),
            reg_count: requestData.reg_count || badValues.push('register count'),
            data_type: requestData.data_type || badValues.push('data type'),
            no_brackets: requestData.no_brackets ?? '0',
            broadcast: requestData.broadcast ?? '0',

            // serial options
            parity: clientSection.parity || badValues.push('client section parity'),
            stopbits: clientSection.stopbits || badValues.push('client section stopbits'),
            baudrate: clientSection.baudrate || badValues.push('client section baudrate'),
            databits: clientSection.databits || badValues.push('client section databits'),
            type: clientSection.device || badValues.push('client section device'),
            flowcontrol: clientSection.flowcontrol || badValues.push('client flow control')
          }

          if (badValues.length !== 0) throw new Error('missingValues', { cause: badValues })

          this.testDisabled = true
          return this.$axios.post(`/api/modbus/client/serial/servers/${this.section.id}/requests/actions/test_request`, { data })
        })
        .then(({ data }) => {
          let responseMessage = ''
          if (Array.isArray(data)) {
            responseMessage = this.$t('Failed to send test request, daemon is down')
          } else if (data.error === 0) {
            responseMessage = this.$t('Request successful, result: %s').format(data.result)
          } else {
            responseMessage = this.$t('Request failed, result: %s').format(data.result)
          }

          this.testResponse = responseMessage
          return responseMessage
        })
        .catch(error => {
          const messages = {
            missingValues: this.$t('Some values are missing (%s)'),
            noSection: this.$t('There are no request configurations to test'),
            invalid: this.$t('Values used for testing are invalid'),
            pdu: this.$t('Test requests are not allowed with PDU data type'),
            timeout: this.$t('Test request timed out'),
            default: this.$t('Failed to test request, check your configuration')
          }

          let message = messages.default

          if (error && error.message && messages[error.message]) {
            message = messages[error.message]
            if (error.cause) message = message.format(error.cause.toString())
          } else if (error && error.response?.data?.errors?.[0]?.code === 2) {
            message = messages.timeout
          }

          this.testResponse = ''
          this.$message.error(message)
          return null
        })
        .finally(() => {
          this.testDisabled = false
        })
    },
    validateBeforeSave() {
      return new Promise((resolve, reject) => {
        const alarms = this.formData[`${this.section.id}_alarm`].filter(alarm => alarm.enabled === '1')
        if (alarms.length === 0) resolve()
        const globalMissing = alarms.some(alarm => !alarm.action)
        const modbusOptionsAvailable = alarms.some(alarm => alarm.action === '2' && (!alarm.modbus_timeout || !alarm.modbus_id || !alarm.modbus_first_reg || !alarm.modbus_reg_count))
        const smsOptionsAvailable = alarms.some(alarm => alarm.action === '0' && (!alarm.msg || !alarm.telnum))
        const emailOptionsAvailable = alarms.some(alarm => alarm.action === '5' && (!alarm.subject || !alarm.json || !alarm.email_group_id || !alarm.recipEmail))
        if (globalMissing) reject(this.$t('Missing global required options'))
        if (modbusOptionsAvailable) reject(this.$t('Missing modbus action required options'))
        if (smsOptionsAvailable) reject(this.$t('Missing sms action required options'))
        if (emailOptionsAvailable) reject(this.$t('Missing email action required options'))
        resolve()
      })
    }
  }
}
</script>
