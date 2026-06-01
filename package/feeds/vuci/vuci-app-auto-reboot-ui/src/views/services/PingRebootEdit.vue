<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="ping_reboot"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$t('Ping/Wget reboot instance settings')"
      :endpoints="[{ endpoint: 'auto_reboot/ping_wget/config' }]"
      :uci-data="uciData"
      data-key="ping_reboot"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turns the rule on or off.')"
        name="enable"
      />
      <vuci-form-item-switch
        v-if="$store.hasPackages('quota_limit.control')"
        :uci-section="s"
        :label="$t('No action on data limit')"
        :help="$t('Stop actions when mobile data limit is reached.')"
        name="stop_action"
        :depend="modemsList().length !== 0"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Type')"
        :help="$t('Ping/Wget.')"
        name="type"
        :options="types"
        :load="displayType"
        @change="setType"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Action if no echo is received')"
        :help="$t('Action that will be executed if there is no response after the specified amount of retries.')"
        name="action"
        :options="actions"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="modem_id_sms"
        :label="$t('Gateway modem')"
        :help="$t('Modem, which is used to send SMS from.')"
        :options="modemOptions"
        :depend="s.action === '6' && modemsList().length > 1"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Phone number')"
        :help="$t('Phone number for the SMS to be sent to.')"
        name="number"
        :depend="s.action === '6'"
        placeholder="+37000000000"
        rules="phonedigit"
        :required="s.enable === '1'"
      />
      <vuci-form-item-text-area
        :uci-section="s"
        name="message"
        :label="$t('Message text')"
        :help="$t('Message to be sent. Allowed characters: &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.')"
        :depend="s.action === '6'"
        rows="4"
        rules="fieldvalidation('^[a-zA-Z0-9!@#$%&*+-/=?^_`{|}~. ]+$',0)"
        :required="s.enable === '1'"
        maxlength="480"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Modem')"
        name="modem"
        :options="modemOptions"
        :depend="['2', '4', '5'].includes(s.action) && modemsList().length > 1"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Interval')"
        :help="$t('Time interval between two ping/wget requests (e.g., if 5 min is selected, action will be performed at every 5th minute).')"
        name="time"
        :options="intervals"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Interval count')"
        :help="$t('Number of failed to receive responses before selected action is executed. Range [1 - 9999].')"
        name="retry"
        placeholder="2"
        rules="irange(1,9999)"
        :required="s.enable === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Timeout (sec)')"
        :help="$t('Time interval (in seconds) to wait for a response. Range [1 - 9999].')"
        name="time_out"
        placeholder="10"
        initial="10"
        :required="s.enable === '1'"
        rules="irange(1,9999)"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Packet size')"
        :help="$t('ICMP packet size in bytes.')"
        name="packet_size"
        placeholder="56"
        initial="56"
        rules="irange(0,1000)"
        :depend="s.type === 'ping' || s.type === 'port'"
        :required="s.enable === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Interface')"
        name="interface"
        :depend="s.type === 'ping'"
        :options="interfaces"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Ping by')"
        :help="$t('Ping IP\'s by Port or by IP.')"
        name="ping_port_type"
        :options="pingUsing"
        :depend="s.type === 'port'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('IP type')"
        name="ip_type"
        :options="ipTypes"
        :depend="(s.type === 'ping' && s.interface === '1') || (s.type === 'port' && s.ping_port_type === 'ping_ip')"
        @change="updateValidations"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Action condition')"
        :help="$t('Select when the action will be executed.')"
        name="action_when"
        :depend="s.type === 'wget' || s.type === 'ping'"
        :options="actionWhenValues"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('URL')"
        :help="$t('URL to which the wget requests will be sent (e.g., http://www.host.com).')"
        name="url"
        :depend="s.type === 'wget'"
        placeholder="http://www.example.com"
        rules="protourl"
        :required="s.enable === '1'"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Host to ping')"
        :help="$t('Hostname or IP address to which the ping requests will be sent (e.g., 1.1.1.1 or www.host.com if DNS server is configured correctly).')"
        name="host"
        :depend="(s.type === 'ping' && s.interface === '1') || (s.type === 'port' && s.ping_port_type === 'ping_ip')"
        :placeholder="s.ip_type === 'ipv4' ? '8.8.8.8' : '0000:0000:0000:0000:0000:0000:0000:0000'"
        :rules="s.ip_type === 'ipv4' ? 'ipv4host' : 'ipv6host'"
        :required="s.enable === '1'"
      />
      <vuci-form-item-custom
        v-if="ports().length >= 1"
        :uci-section="s"
        name="port_host"
        :label="$t('Port to ping')"
        :help="$t('Port number and number of devices addresses to be pinged. (Number of devices connected must be less or equal to the actual number of connected devices to the port).')"
        placeholder="variable"
        :depend="s.type === 'port' && s.ping_port_type === 'ping_port'"
        :input-props="parameterInputProps"
        allow-create
        :write-parse="saveParameters"
        inputs="select,input"
        separator="="
        :maxlines="ports().length"
        :required="s.enable === '1'"
      >
        <template #input-select="{ rowId, column, props, rowValues, values, value }">
          <tlt-form-item-select
            v-bind="props"
            :ref="`form-model-item-${rowId}-${column}`"
            :key="column"
            v-model="rowValues[column]"
            class="custom-input md:w-full min-w-0"
            :options="portList(values, value)"
            @change="_unitChange(rowValues[column])"
          />
        </template>
      </vuci-form-item-custom>
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('IP type')"
        name="ip_type1"
        :options="ipTypes"
        :depend="s.type === 'ping' && s.interface === '2' && modemsList().length !== 0 && simCount() > 0"
        :required="s.enable === '1'"
        @change="updateValidations"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Host to ping from SIM 1')"
        :help="hostHint"
        name="host1"
        :depend="s.type === 'ping' && s.interface === '2' && modemsList().length !== 0 && simCount() > 0"
        :placeholder="s.ip_type1 === 'ipv4' ? '8.8.8.8' : '0000:0000:0000:0000:0000:0000:0000:0000'"
        :rules="s.ip_type1 === 'ipv4' ? 'ipv4host' : 'ipv6host'"
        :required="s.enable === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('IP type')"
        name="ip_type2"
        :options="ipTypes"
        :depend="s.type === 'ping' && s.interface === '2' && ((modemsList().length !== 0 && simCount() > 1) || builtInModemsCount > 1)"
        :required="s.enable === '1'"
        @change="updateValidations"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Host to ping from SIM 2')"
        :help="hostHint"
        name="host2"
        :depend="s.type === 'ping' && s.interface === '2' && ((modemsList().length !== 0 && simCount() > 1) || builtInModemsCount > 1)"
        :placeholder="s.ip_type2 === 'ipv4' ? '8.8.8.8' : '0000:0000:0000:0000:0000:0000:0000:0000'"
        :rules="s.ip_type2 === 'ipv4' ? 'ipv4host' : 'ipv6host'"
        :required="s.enable === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['modemsList', 'simCount', 'ports', 'renamePortList'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  emits: ['changedUnit'],
  data() {
    return {
      pingType: '',
      ipTypes: [
        ['ipv4', this.$t('IPv4')],
        ['ipv6', this.$t('IPv6')]
      ],
      pingUsing: [
        ['ping_port', this.$t('Port')],
        ['ping_ip', this.$t('IP')]
      ],
      actionWhenValues: [
        ['all', this.$t('When all requests fail')],
        ['any', this.$t('When any request fails')]
      ],
      formData: {},
      hostHints: {
        single: {
          all: this.$t('The device performs the selected action only if all defined hosts for the active SIM fail to respond.'),
          any: this.$t('The device performs the selected action if any defined host for the active SIM fails to respond.')
        },
        dual: {
          all: this.$t('The device performs the selected action only if all hosts for both SIMs fail to respond.'),
          any: this.$t('The device performs the selected action if any host from any SIM fails to respond.')
        }
      }
    }
  },
  computed: {
    types() {
      const typeOptions = [
        ['ping', 'Ping'],
        ['wget', 'Wget']
      ]
      if (this.ports().length > 0) {
        typeOptions.push(['port', this.$t('Port')])
      }
      return typeOptions
    },
    builtInModemsCount() {
      return this.modemsList().filter(e => e.builtin === true).length
    },
    hostHint() {
      const hint = this.builtInModemsCount > 1 ? this.hostHints.dual[this.section.action_when || 'all'] : this.hostHints.single[this.section.action_when || 'all']
      return this.$t('Hostname or IP address to which the ping requests will be sent (e.g., 1.1.1.1 or www.host.com if DNS server is configured correctly). %s').format(hint)
    },
    actions() {
      const actions = [['3', this.$t('None')]]
      if (this.section.type !== 'port') {
        actions.push(['1', this.$t('Device reboot')])
      }
      if (this.modemsList().length > 0 && this.section.type !== 'port') {
        actions.push(['2', this.$t('Modem reboot')], ['4', this.$t('(Re)register')], ['5', this.$t('Restart mobile connection')], ['6', this.$t('Send SMS')])
      }
      if (this.section.type === 'port') {
        actions.push(['7', this.$t('Restart port')])
      }
      return actions
    },
    intervals() {
      const intervals = []
      if (this.section.action !== '1') {
        intervals.push(['1', this.$t('1 min')], ['2', this.$t('2 mins')], ['3', this.$t('3 mins')], ['4', this.$t('4 mins')])
      }
      intervals.push(['5', this.$t('5 mins')], ['15', this.$t('15 mins')], ['30', this.$t('30 mins')], ['60', this.$t('1 hour')], ['120', this.$t('2 hours')])
      return intervals
    },
    interfaces() {
      const interfaces = [['1', this.$t('Automatically selected')]]
      if (this.modemsList().length > 0) interfaces.push(['2', this.$t('Ping from mobile')])
      return interfaces
    },
    modemOptions() {
      return this.$mobile.modemsOptions(this.modemsList())
    },
    parameterInputProps() {
      const selectProps = {
        prop: 'ParamSelect',
        options: []
      }
      const inputProps = {
        prop: 'ParamInput',
        rules: ['min(1)', 'uinteger'],
        required: true,
        initial: '1'
      }
      return [selectProps, inputProps]
    }
  },
  methods: {
    _unitChange(unit) {
      this.$emit('changedUnit', unit)
    },
    portList(usedPorts, value) {
      const ports = usedPorts.map(port => port[0])
      return this.renamePortList(
        this.ports().filter(port => port === value || !ports.includes(port)),
        true
      )
    },
    saveParameters(params) {
      return params ? params.join('=') : ''
    },
    displayType(self) {
      this.pingType = self.uciSection.type
      return this.pingType
    },
    setType(self, val) {
      this.pingType = val
    },
    updateValidations(self) {
      self.vuciSection.validate()
    }
  }
}
</script>
