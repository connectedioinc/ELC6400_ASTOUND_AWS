<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="sim_switch"
    editing
    :before-save="beforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('switch'), `SIM${$mobile.getSimLabel(section.position, section.esim_profile, section.modem)}`)"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'sim_switch/config' }]"
      data-key="sim"
      :after-save="afterSave"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="interval"
        :label="$t('Check interval')"
        :help="$t('Check interval in seconds.')"
        rules="irange(3,3600)"
        placeholder="30"
        initial="30"
        :required="s.enabled === '1' && !onlyEnableBack(s)"
      />
      <vuci-form-item-input
        name="retry_count"
        :label="$t('Check count')"
        :help="$t('Check count before switching to other SIM.')"
        :uci-section="s"
        rules="irange(1,10)"
        placeholder="3"
        initial="3"
        :required="s.enabled === '1' && !onlyLimitsEnabled(s) && !onlyEnableBack(s)"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="on_signal"
        :label="$t('On weak signal')"
        :help="$t('Perform a SIM card switch when a signal\'s strength drops below a certain threshold.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="weak_signal"
        :label="$t('Signal strength (dBm)')"
        :help="
          $t('Lowest signal\'s strength value (RSSI) in dBm below which a SIM card switch should occur. %s More information %s').format('<a href=\'' + $brand('mobileRSSIWikiURL') + '\'>', '</a>')
        "
        :depend="s.on_signal === '1'"
        rules="irange(-120,-50)"
        initial="-90"
        :required="s.enabled === '1'"
        rawhtml
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="data_limit"
        :label="$t('On data limit')"
      >
        <template #help>
          {{ $t('Perform a SIM card switch when mobile data limit for your current SIM card is exceeded.') }}
          <router-link :to="`/network/mobile/limits/data?edit=${dataLimitIface}`"> {{ $t('Data limit configuration') }} </router-link>.
        </template>
      </vuci-form-item-switch>
      <tlt-inline-message
        v-show="!dataLimitConfigured && s.data_limit === '1'"
        id="data-limit-message"
        :type="s.enabled === '1' && !dataLimitConfigured ? 'warning' : 'info'"
      >
        {{
          s.enabled === '1'
            ? $t('Mobile data limit on one of SIM%s interfaces is not enabled').format($mobile.getSimLabel(section.position, section.esim_profile, section.modem))
            : $t('Make sure you have enabled mobile data limit on one of SIM%s interfaces.').format($mobile.getSimLabel(section.position, section.esim_profile, section.modem))
        }}
        <router-link
          :to="`/network/mobile/limits/data?edit=${dataLimitIface}`"
          test-id="data-limit-message-link"
        >
          {{ $t('Configure Data limit here') }}
        </router-link>
      </tlt-inline-message>

      <vuci-form-item-switch
        :uci-section="s"
        name="sms_limit"
        :label="$t('On SMS limit')"
      >
        <template #help>
          {{ $t('Perform a SIM card switch when sent SMS limit for your current SIM card is exceeded.') }}
          <router-link :to="`/network/mobile/limits/sms?edit=${smsLimit}`"> {{ $t('SMS limit configuration') }} </router-link>.
        </template>
      </vuci-form-item-switch>
      <tlt-inline-message
        v-show="!smsLimitConfigured && s.sms_limit === '1'"
        id="sms-limit-message"
        :type="s.enabled === '1' && !smsLimitConfigured ? 'warning' : 'info'"
      >
        {{
          s.enabled === '1'
            ? $t('SMS limit on SIM%s is not enabled').format($mobile.getSimLabel(section.position, section.esim_profile, section.modem))
            : $t('Make sure you have enabled SMS limit on SIM%s.').format($mobile.getSimLabel(section.position, section.esim_profile, section.modem))
        }}
        <router-link
          :to="`/network/mobile/limits/sms?edit=${smsLimit}`"
          test-id="sms-limit-message-link"
        >
          {{ $t('Configure SMS limit here') }}
        </router-link>
      </tlt-inline-message>
      <vuci-form-item-switch
        :uci-section="s"
        name="roaming"
        :label="$t('On roaming')"
        :help="$t('Perform a SIM card switch when roaming is detected.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="no_network"
        :label="$t('No network')"
        :help="$t('Perform a SIM card switch when network isn\'t detected.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="denied"
        :label="$t('On network denied')"
        :help="$t('Perform a SIM card switch when network is denied.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="fail_flag"
        :label="$t('On data connection fail')"
        :help="$t('Perform a SIM card switch when data connection fails.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="data_fail"
        :label="$t('Method')"
        :help="$t('Failure determination method.')"
        :options="methodOptions"
        :depend="s.fail_flag === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="data_fail_host"
        :label="$t('Health monitor ICMP host')"
        :help="$t('A remote host to ping (send an ICMP (Internet Control Message Protocol) packet to) and determine when connection goes down.')"
        :depend="s.fail_flag === '1' && s.data_fail === '2'"
        rules="host"
        placeholder="8.8.8.8"
        initial="8.8.8.8"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="data_fail_timeout"
        :label="$t('Health monitor ICMP timeout')"
        :help="$t('A timeout value for ICMP (Internet Control Message Protocol) packet.')"
        :depend="s.fail_flag === '1' && s.data_fail === '2'"
        initial="3"
        :options="timeoutOptions"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="sim_not_ready"
        :label="$t('On SIM not inserted')"
        :help="$t('Perform a SIM card switch if no SIM or a blocked SIM is inserted.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="opcode_enabled"
        :label="$t('On operator or country code')"
        :help="$t('Perform a SIM switch based on the current operator or country code.')"
        :depend="showOpCodeRule"
      />
      <vuci-form-item-radio-group
        :uci-section="s"
        name="opcode_filter"
        :label="$t('Type')"
        :options="opcodeFilterOptions"
        :depend="s.opcode_enabled === '1' && showOpCodeRule"
        initial="1"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Select the filter type.')"
            :choice-hint="$t('Possible types')"
            :hints="[
              {
                option: $t('Allowlist'),
                hint: $t('stay on the current SIM until the operator or country code matches a code in the selected list.')
              },
              {
                option: $t('Blocklist'),
                hint: $t('switch SIM when the operator or country code matches a code in the selected list.')
              }
            ]"
          />
        </template>
      </vuci-form-item-radio-group>
      <vuci-form-item-select
        :uci-section="s"
        name="opcode_list"
        :label="$t('List')"
        initial="1"
        :options="opListOptions()"
        :depend="s.opcode_enabled === '1' && showOpCodeRule"
        :required="s.enabled === '1'"
      >
        <template #help>
          {{ $t('Select a list of operator or country codes to use for filtering.') }}
          <br />
          {{ $t('Configure it') }}
          <router-link to="/network/mobile/operators/list"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-select>
      <tlt-inline-message
        v-if="s.opcode_enabled === '1' && opListOptions()[0][0] === ''"
        id="empty-list-message"
        type="info"
      >
        {{ $t('No operator lists available, you can create one in') }}
        <router-link
          :to="'/network/mobile/operators/list'"
          test-id="operator-list-link"
        >
          {{ $t('Operator Lists page') }}
        </router-link>
      </tlt-inline-message>
      <vuci-form-item-switch
        :uci-section="s"
        name="enable_back"
        :label="$t('Switch to next SIM after delay')"
        :help="$t('Switch to next SIM after delay has been reached.')"
        @change="$refs.vuciForm.validate()"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="switch_back"
        :label="$t('Initial delay (min)')"
        :help="$t('An initial delay in minutes after which a SIM will be switched to the next one.')"
        :depend="s.enable_back === '1'"
        :rules="['uinteger', 'min(1)']"
        initial="5"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import HintHelper from '@/components/shared/HintHelper.vue'
export default {
  components: { HintHelper },
  inject: ['simcards', 'dataLimits', 'interfaces', 'initialSimSwitch', 'promptContent', 'findDefaultSim', 'setSection', 'onlyEnableBack', 'onlyLimitsEnabled', 'opListOptions'],
  props: {
    section: {
      type: Object,
      required: true
    },
    showOpCodeRule: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      methodOptions: [
        ['1', this.$t('LCP echo')],
        ['2', this.$t('ICMP echo')]
      ],
      opcodeFilterOptions: [
        { value: '1', name: this.$t('Allowlist') },
        { value: '2', name: this.$t('Blocklist') }
      ]
    }
  },
  computed: {
    dataLimitIface() {
      return this.interfaces().find(s => s.modem === this.section.modem && s.sim === this.section.position && s.esim_profile === this.section.esim_profile)?.id || ''
    },
    dataLimitConfigured() {
      return this.dataLimits().some(option => option.enabled === '1' && option.id === this.dataLimitIface)
    },
    smsLimit() {
      return this.simcards().find(option => option.position === this.section.position && option.modem === this.section.modem && option.esim_profile === this.section.esim_profile)?.id || ''
    },
    smsLimitConfigured() {
      return this.simcards().some(option => option.enable_sms_limit === '1' && option.id === this.smsLimit)
    },
    timeoutOptions() {
      return ['1', '2', '3', '4', '5', '10'].map(s => [s, this.$t('%s sec.').format(s)])
    }
  },
  methods: {
    beforeSave() {
      return new Promise(resolve => {
        const enabled = this.initialSimSwitch()?.sim?.filter(s => s.enabled === '1' && s.id !== this.section.id && s.modem === this.section.modem)
        if (enabled.length === 0 && this.section.enabled !== '1') return resolve()
        if (enabled.length > 1 || (enabled.length === 1 && this.section.enabled === '1')) {
          if (this.findDefaultSim(enabled, this.simcards(), this.section)) return resolve()
          return this.$prompt.show({
            title: this.$t('SIM switch instance is not enabled for default SIM'),
            content: this.promptContent(),
            okText: this.$t('Continue'),
            cancelText: this.$t('Cancel'),
            onOk: () => {
              return resolve()
            }
          })
        } else {
          const state = this.section.enabled === '1'
          const action = state ? this.$t('Disable') : this.$t('Enable')
          return this.$prompt.show({
            title: this.$t('%s instance to save changes?').format(action),
            content: this.$t('You currently have this instance %s. To save changes, at least two SIM switch instances must be enabled. Do you want to %s this instance to proceed?').format(
              state ? this.$t('enabled') : this.$t('disabled'),
              state ? this.$t('disable') : this.$t('enable')
            ),
            okText: action,
            cancelText: this.$t('Cancel'),
            onOk: () => {
              this.setSection(section => {
                section.enabled = state ? '0' : '1'
              })
              resolve()
            }
          })
        }
      })
    },
    afterSave(_, res) {
      this.setSection(section => {
        if (!res.data.interval) section.interval = ''
        if (!res.data.retry_count) section.retry_count = ''
        if (!res.data.switch_back) section.switch_back = ''
        if (!res.data.weak_signal) section.weak_signal = ''
        if (!res.data.data_fail_host) section.data_fail_host = ''
      })
    }
  }
}
</script>
