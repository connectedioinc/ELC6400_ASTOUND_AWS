<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="modbus_client"
    :after-load="updateInitialValue"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :data-key="type"
      :endpoints="[{ endpoint: `modbus/client/tcp/${parent}/alarms/config` }]"
      :name="section.id"
      :title="$utils.getModalTitle($t('Alarm'))"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enabled')"
        :help="$t('Check to enable this alarm.')"
        name="enabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Function Code')"
        :help="$t('Modbus function code used to get the values.')"
        name="f_code"
        :options="functionOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :options="dataOptions(s.f_code)"
        :label="$t('Compared condition data type')"
        :help="$t('Select data type that will be used for checking conditions.')"
        name="data_type"
        initial="16bit_int_hi_first"
        @change="validateRefresh"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('First register number')"
        :help="$t('Modbus register or coil (1-65536).')"
        name="register"
        placeholder="1"
        :required="s.enabled === '1'"
        rules="irange(1,65536)"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Values')"
        :help="$t('Value to be compared with values read from server.')"
        name="value"
        :required="s.enabled === '1'"
        :rules="validateRead"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="condition"
        :label="$t('Condition')"
        :help="$t('Condition for comparing values read with configured values.')"
        :options="conditionOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Action frequency')"
        :help="$t('How frequently every action is triggered.')"
        name="actionfrequency"
        :options="freqOptions"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Redundancy protection')"
        :help="$t('Protection against executing a configured action too often.')"
        name="redundancy_protection"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Redundancy protection period')"
        :help="$t('Duration to activate redundancy protection for, in seconds (1-86400).')"
        name="redundancy_protection_period"
        :depend="s.redundancy_protection === '1'"
        placeholder="100"
        rules="irange(1,86400)"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Action')"
        :help="$t('Action triggered by this alarm.')"
        name="action"
        :options="actionOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Output')"
        :help="$t('Select output.')"
        name="output"
        :depend="s.action === '1'"
        :options="outputOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('I/O Action')"
        :help="$t('Action to be performed with selected output.')"
        name="io_action"
        :depend="s.action === '1'"
        :options="ioActionsOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Modem')"
        :help="$t('Modem, which is used to send information from.')"
        name="modem"
        :options="$mobile.modemsOptions(board.modems || [])"
        :depend="s.action === '0' && board.modems?.length > 1"
      />
      <vuci-form-item-text-area
        :uci-section="s"
        :label="$t('Message')"
        name="msg"
        maxlength="160"
        :depend="s.action === '0'"
        rules="string"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Recipients')"
        :help="$t('You can choose to add a single number or use a phone group list.')"
        name="recipient_format"
        :options="recipientFormatOptions"
        :initial="s.phone_group_id ? 'group' : 'single'"
        :depend="s.action === '0'"
        no-write
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Phone number')"
        :help="$t('Recipient\'s phone number.')"
        name="telnum"
        :depend="s.action === '0' && s.recipient_format === 'single'"
        placeholder="+37000000000"
        rules="phonedigit"
        :maxlines="16"
        :required="s.action === '0' && s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Phone group')"
        :placeholder="$t('No phone groups created')"
        name="phone_group_id"
        :depend="s.action === '0' && s.recipient_format === 'group'"
        :options="phoneGroupOptions"
        :required="s.action === '0' && s.enabled === '1'"
      >
        <template #help>
          {{ $t('Recipient groups, including their associated phone numbers, can be configured') }}
          <router-link to="/system/admin/group/phone"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Connection')"
        :help="$t('Reuse existing connection or create a new one.')"
        name="connection_type"
        :depend="s.action === '2'"
        no-write
        :options="connectionTypes"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('IP address')"
        :help="$t('Server device IP address or hostname.')"
        name="modbus_ip_addr"
        :depend="s.action === '2' && s.connection_type === '1'"
        placeholder="0.0.0.0"
        rules="host"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Port')"
        :help="$t('Server device port number.')"
        name="modbus_port"
        :depend="s.action === '2' && s.connection_type === '1'"
        placeholder="502"
        rules="port"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Timeout')"
        :help="$t('Time period for waiting of the tcp device response (in seconds, 1-30).')"
        name="modbus_timeout"
        :depend="s.action === '2'"
        placeholder="5"
        initial="5"
        rules="irange(1,30)"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('ID')"
        :help="$t('Server ID number.')"
        name="modbus_id"
        :depend="s.action === '2'"
        placeholder="1"
        rules="irange(1,255)"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Modbus function')"
        :help="$t('Modbus function code to be used for this request.')"
        name="modbus_function"
        :options="modemFunctionOptions"
        :depend="s.action === '2'"
        @change="validateRefresh"
      />
      <vuci-form-item-select
        :uci-section="s"
        :options="dataOptions(s.modbus_function)"
        :label="$t('Executed action data type')"
        :help="$t('Select data type that will be used for executing action.')"
        name="modbus_data_type"
        :depend="s.action === '2'"
        initial="16bit_int_hi_first"
        @change="validateRefresh"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('First register number')"
        :help="$t('Start Register/Coil/Input number (1-65536).')"
        name="modbus_first_reg"
        :depend="s.action === '2'"
        placeholder="1"
        rules="irange(1,65536)"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Values')"
        :help="modbusRegisterOptions[s.modbus_function] ? modbusRegisterOptions[s.modbus_function].help : ''"
        name="modbus_reg_count"
        :depend="isModbusWriteFunction(s.modbus_function) && s.action === '2'"
        :rules="validateWrite"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Subject')"
        :help="$t('Subject of an email. Allowed characters &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.')"
        name="subject"
        rules="fieldvalidation(\'^[a-zA-Z0-9!@#$%%&*+\/=?^_`{|}~. -]+$\',0)"
        :depend="s.action === '5'"
        maxlength="256"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-text-area
        ref="json_string"
        :uci-section="s"
        :label="s.action === '5' ? $t('Message text') : $t('JSON format')"
        :help="s.action === '5' ? $t('Message that will be sent if condition passes.') : $t('Allows to fully customize JSON segment.')"
        name="json"
        rules="string"
        :placeholder="jsonPlaceholder"
        :depend="s.action === '3' || s.action === '5'"
        :required="s.enabled === '1'"
      />
      <template v-if="s.action === '3' || s.action === '5'">
        <tlt-form-accordion
          name="text-parameters"
          :title="s.action === '5' ? $t('message text parameter list') : $t('JSON format list')"
        >
          <tlt-form-model-item>
            <t-parameters class="w-full">
              <strong>{{ s.action === '5' ? $t('Message text parameter list') : $t('JSON format list') }}:</strong>
              <t-parameters-list>
                <t-parameters-list-item
                  v-for="param in jsonParameters"
                  :key="param.parameter"
                  v-bind="param"
                />
              </t-parameters-list>
            </t-parameters>
          </tlt-form-model-item>
        </tlt-form-accordion>
      </template>
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Sender\'s email account')"
        name="email_group_id"
        :placeholder="$t('No email accounts created')"
        :options="emailGroupOptions"
        :depend="s.action === '5'"
        :required="s.enabled === '1'"
      >
        <template #help>
          {{ $t("Sender's email configuration.") }}
          {{ $t('Configure it') }}
          <router-link to="/system/admin/group/email"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-select>
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Recipient\'s email address')"
        :help="$t('For whom you want to send an email to. Allowed characters (a-zA-Z0-9._%+@-).')"
        name="recipEmail"
        placeholder="mail@domain.com"
        rules="email"
        :maxlines="16"
        :depend="s.action === '5'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        name="host"
        :label="$t('Hostname')"
        :help="$t('Specify address of the broker.')"
        placeholder="www.example.com"
        rules="host"
        :required="s.enabled === '1'"
        :uci-section="s"
        :depend="s.action === '3'"
      />
      <vuci-form-item-input
        name="port"
        :label="$t('Port')"
        :help="$t('Specify port of the broker.')"
        placeholder="1883"
        rules="port"
        initial="1883"
        :required="s.enabled === '1'"
        :uci-section="s"
        :depend="s.action === '3'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="keepalive"
        :label="$t('Keepalive')"
        :help="$t('The number of seconds after which the broker should send a PING message to the client if no other messages have been exchanged in that time.')"
        placeholder="60"
        rules="irange(5, 640)"
        :required="s.enabled === '1'"
        :depend="s.action === '3'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="topic"
        :label="$t('Topic')"
        :help="$t('MQTT topic to be used for publishing the data.')"
        :placeholder="$t('Topic')"
        :depend="s.action === '3'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="client_id"
        :label="$t('Client ID')"
        :help="$t('Client ID to send with the data. If empty, a random client ID will be generated.')"
        :placeholder="$t('Client ID')"
        :depend="s.action === '3'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="qos"
        :label="$t('QoS')"
        :help="
          $t(
            'Quality of Service. Allowed values: %s 0 - when we prefer that the message will not arrive at all rather than arrive twice %s \
                      1 - when we want the message to arrive at least once but don\'t care if it arrives twice (or more) %s \
                      2 - when we want the message to arrive exactly once. A higher QoS value means a slower transfer'
          ).format('<br/>', '<br/>', '<br/>')
        "
        rawhtml
        :options="qosOptions"
        :depend="s.action === '3'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="use_tls_root_ca"
        :label="$t('Use root CA')"
        :help="$t('Allow usage of root certificate authority for verifying that the servers certificate is trustworthy. Implies that server must use TLS.')"
        :depend="s.action === '3'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="tls_enabled"
        :label="$t('Use TLS')"
        :help="$t('Use TLS to encrypt the data sent.')"
        :depend="s.action === '3'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('TLS type')"
        :help="$t('Certificate or PSK based TLS.')"
        name="tls_type"
        :options="tlsTypes"
        :depend="s.action === '3' && s.tls_enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="preshared_key"
        :label="$t('Pre-Shared-Key')"
        :help="$t('Pre-shared key for TLS support.')"
        :depend="s.tls_enabled === '1' && s.tls_type === '0' && s.action === '3'"
        sensitive
        password
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="identity"
        :label="$t('Identity')"
        :help="$t('Identity for PSK based TLS support.')"
        :depend="s.tls_enabled === '1' && s.tls_type === '0' && s.action === '3'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="device_files"
        :label="$t('Certificate files from device')"
        :depend="s.tls_enabled === '1' && s.tls_type === '1' && s.action === '3'"
      >
        <template #help>
          {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
          <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
          >.
        </template>
      </vuci-form-item-switch>
      <!-- Upload certificates to router -->
      <vuci-form-item-upload
        :uci-section="s"
        name="ca_file"
        :label="$t('CA file')"
        :help="$t('Upload CA file.')"
        :depend="s.tls_type === '1' && s.tls_enabled === '1' && (s.device_files === '0' || !s.device_files) && s.action === '3'"
        max-size="16MB"
        required
        force-write
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="cert_file"
        :label="$t('Certificates file')"
        :help="$t('Upload certificates file.')"
        :depend="s.tls_type === '1' && s.tls_enabled === '1' && (s.device_files === '0' || !s.device_files) && s.action === '3'"
        max-size="16MB"
        force-write
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="key_file"
        :label="$t('Key file')"
        :help="$t('Upload key file.')"
        :depend="s.tls_type === '1' && s.tls_enabled === '1' && (s.device_files === '0' || !s.device_files) && s.action === '3'"
        max-size="16MB"
        force-write
      />
      <!-- Select Certificates from router -->
      <vuci-form-item-select
        :uci-section="s"
        name="ca_file"
        :label="$t('CA file')"
        :help="$t('Upload CA file.')"
        :options="caOptions"
        :depend="s.tls_type === '1' && s.tls_enabled === '1' && s.device_files === '1' && s.action === '3'"
        required
        force-write
      />
      <vuci-form-item-select
        :uci-section="s"
        name="cert_file"
        :label="$t('Certificates file')"
        :help="$t('Upload certificates file.')"
        :options="certOptions"
        :depend="s.tls_type === '1' && s.tls_enabled === '1' && s.device_files === '1' && s.action === '3'"
        force-write
      />
      <vuci-form-item-select
        :uci-section="s"
        name="key_file"
        :label="$t('Key file')"
        :help="$t('Upload key file.')"
        :options="keyOptions"
        :depend="s.tls_type === '1' && s.tls_enabled === '1' && s.device_files === '1' && s.action === '3'"
        force-write
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="use_credentials"
        :label="$t('Use credentials')"
        help="Use username and password for MQTT broker authentication"
        :depend="s.action === '3'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="username"
        :label="$t('Username')"
        :help="$t('Username for MQTT broker authentication.')"
        :placeholder="$t('Username')"
        rules="credentials_validate('allow-space')"
        maxlength="512"
        :depend="s.use_credentials === '1' && s.action === '3'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        :label="$t('Password')"
        :help="$t('Password for MQTT broker authentication.')"
        :placeholder="$t('Password')"
        rules="credentials_validate('allow-space')"
        maxlength="512"
        password
        sensitive
        :depend="s.use_credentials === '1' && s.action === '3'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import ModbusUtils from '@/components/shared/ModbusUtils.vue'

export default {
  mixins: [ModbusUtils],
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    },
    dataOptions: {
      type: Function,
      required: true
    },
    validate: {
      type: Function,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      freqOptions: [
        ['0', this.$t('Every trigger')],
        ['1', this.$t('First trigger')]
      ],
      modemFunctionOptions: [
        ['5', this.$t('Set Single Coil (5)')],
        ['6', this.$t('Set Single Register (6)')],
        ['15', this.$t('Set Multiple Coils (15)')],
        ['16', this.$t('Set Multiple Registers (16)')]
      ],
      functionOptions: [
        ['1', this.$t('Read Coil Status (1)')],
        ['2', this.$t('Read Input Status (2)')],
        ['3', this.$t('Read Holding Registers (3)')],
        ['4', this.$t('Read Input Registers (4)')]
      ],
      conditionOptions: [
        ['1', this.$t('More than')],
        ['2', this.$t('Less than')],
        ['4', this.$t('Equal to')],
        ['8', this.$t('Not Equal to')],
        ['16', this.$t('Less or equal')],
        ['32', this.$t('More or equal')]
      ],
      modbusRegisterOptions: {
        5: {
          help: this.$t('Coil value to be written.')
        },
        6: {
          help: this.$t('Register value to be written.')
        },
        15: {
          help: this.$t('Coil values to be written (multiple values must be separated by space character).')
        },
        16: {
          help: this.$t('Register values to be written (multiple values must be separated by space character).')
        }
      },
      tlsTypes: [
        ['1', this.$t('Certificate based')],
        ['0', this.$t('Pre-Shared-Key based')]
      ],
      qosOptions: [
        ['0', this.$t('At most once (0)')],
        ['1', this.$t('At least once (1)')],
        ['2', this.$t('Exactly once (2)')]
      ],
      recipientFormatOptions: [
        ['single', this.$t('Single')],
        ['group', this.$t('Group')]
      ],
      jsonPlaceholder: '{"TS": "%ts", "SN": "%sn"}',
      connectionTypes: [
        ['0', this.$t('Reuse connection')],
        ['1', this.$t('Create new connection')]
      ]
    }
  },
  computed: {
    ...mapState(useMainStore, ['board']),
    type() {
      const base = this.section['.type'].split('_')
      return `${base[1]}_${base[0]}`
    },
    parent() {
      const base = this.section['.type'].split('_')
      return base[1]
    },
    emailGroupOptions() {
      return this.formOptions().emailUsers.map(group => [group.id, group.name])
    },
    outputOptions() {
      const filtered = this.$io.getFilteredPinsInfo(this.formOptions().io).filter(io => io.direction === 'out' || io.type === 'relay')
      return filtered.map(io => [io.id, io.name_with_pins])
    },
    ioActionsOptions() {
      const firstArray = [
        ['1', this.$t('Close')],
        ['0', this.$t('Open')],
        ['2', this.$t('Invert')]
      ]
      const secondArray = [
        ['1', this.$t('Turn On')],
        ['0', this.$t('Turn Off')],
        ['2', this.$t('Invert')]
      ]
      return this.formOptions().io.find(pin => pin.id === this.section.output)?.type === 'relay' ? firstArray : secondArray
    },
    actionOptions() {
      const actionOptions = [
        ['2', this.$t('Modbus Write Request')],
        ['3', this.$t('MQTT message')],
        ['4', this.$t('Ubus event')],
        ['5', this.$t('Email')]
      ]
      if (this.board.hwinfo.ios && this.outputOptions.length !== 0) actionOptions.push(['1', this.$t('Trigger output')])
      if (this.board.hwinfo.mobile) actionOptions.push(['0', this.$t('SMS')])
      return actionOptions
    },

    caOptions() {
      const options = this.formOptions().certificates.filter(cert => (cert.cert_type === 'ca' || cert.cert_type === 'import' || cert.cert_type === 'root_ca') && cert.type === 'cert')
      return options.map(cert => (cert.cert_type !== 'root_ca' ? ['/etc/certificates/' + cert.fullname, cert.fullname] : ['/etc/ssl/certs/' + cert.fullname, cert.fullname]))
    },
    certOptions() {
      const options = this.formOptions().certificates.filter(cert => cert.type === 'cert')
      return options.map(cert => (cert.cert_type !== 'root_ca' ? ['/etc/certificates/' + cert.fullname, cert.fullname] : ['/etc/ssl/certs/' + cert.fullname, cert.fullname]))
    },
    keyOptions() {
      const options = this.formOptions().certificates.filter(cert => cert.type === 'key')
      return options.map(cert => ['/etc/certificates/' + cert.fullname, cert.fullname])
    },
    phoneGroupOptions() {
      return this.formOptions()
        .phoneGroups.filter(g => g.tel && g.tel.length <= 16)
        .map(g => [g.id, g.name])
    }
  },
  methods: {
    updateInitialValue() {
      if (this.section.modbus_port || this.section.modbus_ip_addr) this.formData[this.type].find(section => section.id === this.section.id).connection_type = '1'
    },
    validateRefresh(self) {
      if (!(!this.section.modbus_reg_count && !this.section.value)) self.vuciSection.validate()
    },
    validateRead(v) {
      return this.validateModbusValue(v, '16', this.section.data_type)
    },
    validateWrite(v) {
      return this.validateModbusValue(v, this.section.modbus_function, this.section.modbus_data_type)
    }
  }
}
</script>
