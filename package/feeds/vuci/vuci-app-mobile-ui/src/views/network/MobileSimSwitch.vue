<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="sim_switch"
    :after-load="afterLoad"
    :before-save="beforeSave"
  >
    <tlt-card
      :title="$t('Status')"
      :help="$t('Mobile statuses.')"
      borderless
    >
      <mobile-modem-status
        :sim-slots="simSlots"
        :modem-status="sectionModem"
        :simcards="simcards"
        :hint-info="v => hintInfo(v)"
      >
        <template #left-side="{ sim }">
          <div v-if="switchWarning(sim)">
            <tlt-icon
              :id="`warning_${sim.id}`"
              class="icon text-theme-text-warning size-4"
              icon="warning"
              solid
            />
            <tlt-popover
              :target="`#warning_${sim.id}`"
              placement="bottom-start"
              :content="$t('Unable to switch SIM - data/SMS limit reached. To continue, adjust the limits or reset the counters.')"
            />
          </div>
        </template>
      </mobile-modem-status>
    </tlt-card>
    <vuci-typed-section
      :uci-data="uciData"
      name="sim"
      :title="$t('SIM switch')"
      :help="
        $t(
          'Section allows you to configure SIM switching conditions and set up the circumstances under which the device will switch from one SIM card to another. SIM switch cycles through enabled instances. When it reaches enabled instance with lowest priority, it will return to the highest priority instance.'
        )
      "
      :endpoints="[{ endpoint: 'sim_switch/config', sectionFilter: s => s.modem === modem }]"
      data-key="sim"
      type="sim"
      :columns="columns"
      :form-methods="['edit', 'get']"
      :edit-form="simSwitchEdit"
      :edit-form-props="{ showOpCodeRule }"
      :exception-options="['order']"
      sort-by="order"
      sortable
      borderless
    >
      <template #before>
        <drag-hint :element-name="$t('instances')" />
      </template>
      <template #title-content>
        <TableAction
          id="logs"
          :hints="[
            {
              info: $t(`Displays SIM switch logs. The logs contains records of SIM switch events, including to which SIM was switched, the time of the switch, and the reason for it.`)
            }
          ]"
          icon="system"
          @click="logsModal"
        >
          {{ $t('SIM switch logs') }}
        </TableAction>
      </template>
      <template #priority="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="order"
          :display-value="() => (enabledInstance(s) ? s.order : '-')"
        />
      </template>
      <template #sim="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="sim"
          :display-value="() => displaySimSlot(s)"
        />
      </template>
      <template #condition="{ s }">
        <div class="flex items-center w-full">
          <div class="grid">
            <span class="truncate">
              {{ getConditions(s).join(', ') || '-' }}
            </span>
          </div>
          <div
            v-if="getConditions(s).length > 0"
            :id="`${s.id}_condition`"
            class="ml-auto"
          >
            <tlt-icon
              icon="info"
              class="text-theme-text-info size-5"
            />
            <tlt-popover :target="`#${s.id}_condition`">
              <b>{{ $t('Conditions (current/total count):') }}</b>
              <div class="grid grid-cols-2 gap-3 pt-4">
                <div class="space-y-1">
                  <tlt-badge type="success">
                    {{ $t('Enabled') }}
                  </tlt-badge>
                  <div
                    v-for="(condition, idx) in getConditions(s)"
                    :key="idx"
                  >
                    {{ condition }}
                  </div>
                </div>
                <div class="space-y-1">
                  <tlt-badge type="inactive">
                    {{ $t('Disabled') }}
                  </tlt-badge>
                  <div
                    v-for="(condition, idx) in getConditions(s, false).length > 0 ? getConditions(s, false) : ['-']"
                    :key="idx"
                  >
                    {{ condition }}
                  </div>
                </div>
              </div>
            </tlt-popover>
          </div>
        </div>
      </template>
      <template #interval="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="interval"
        />
      </template>
      <template #retry_count="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="retry_count"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :readonly="!!disableSwitch(s)"
          :hints="!!disableSwitch(s) ? [{ info: disableSwitch(s) }] : []"
        />
      </template>
    </vuci-typed-section>
    <tlt-modal
      :open="showLogs"
      size="medium"
      @close="closeLogs"
    >
      <tlt-table
        id="sim_switch_logs"
        :columns="logColumns"
        :data-source="logList"
        :title="$t('SIM switch logs')"
        :no-value-text="$t('Currently no logs available')"
        :toggleable="false"
        @refresh="logsModal"
      />
    </tlt-modal>
  </vuci-form>
</template>

<script>
import { markRaw, h } from 'vue'
import mobileSimSwitchEdit from './MobileSimSwitchEdit'
import MobileModemStatus from '../../components/network/MobileModemStatus'
import DragHint from '@/components/shared/DragHint.vue'
import { RouterLink } from 'vue-router'

export default {
  components: { DragHint, MobileModemStatus },
  provide() {
    return {
      simcards: () => this.simcards,
      dataLimits: () => this.dataLimits,
      interfaces: () => this.interfaces,
      initialSimSwitch: () => this.$refs.vuciForm?.initialForm,
      promptContent: () => this.promptContent,
      findDefaultSim: this.findDefaultSim,
      onlyEnableBack: this.onlyEnableBack,
      onlyLimitsEnabled: this.onlyLimitsEnabled,
      opListOptions: () => this.opListOptions
    }
  },
  data() {
    return {
      simSwitchEdit: markRaw(mobileSimSwitchEdit),
      formData: {},
      interfaces: [],
      dataLimits: [],
      simcards: [],
      modems: [],
      simStatus: [],
      limitStatus: [],
      operatorList: [],
      columns: [
        { name: 'priority', width: 'w-20', label: this.$t('Priority'), help: this.$t('Priority order in which SIM switch will be performed.') },
        { name: 'sim', width: 'xs', label: this.$t('SIM slot') },
        {
          name: 'condition',
          width: 'md',
          label: this.$t('Conditions'),
          help: this.$t(
            'List of enabled conditions. For SIM switch to be executed at least one of enabled conditions needs to exceed the set check count. If switched to an instance with no conditions, SIM will remain indefinitely.'
          )
        },
        { name: 'interval', width: 'xs', label: this.$t('Check interval'), help: this.$t('Check interval in seconds.') },
        { name: 'retry_count', width: 'xs', label: this.$t('Check count'), help: this.$t('Check count before switching to other SIM.') },
        { name: 'enabled', label: this.$t('Enabled'), locked: true }
      ],
      showLogs: false,
      logList: [],
      logColumns: [
        { dataIndex: 'timestamp', title: this.$t('Time'), displayFn: s => this.$localDate(s), actions: { sort: true } },
        {
          dataIndex: 'sim',
          title: this.$t('Switch to SIM'),
          displayFn: (_, dataRow) => this.$mobile.getSimLabel(dataRow.sim, dataRow.esim, this.sectionModem.id),
          actions: { sort: true }
        },
        { dataIndex: 'triggered_rules', title: this.$t('Triggered conditions'), displayFn: s => this.parseConditions(s), actions: { sort: true } }
      ],
      switchStatus: []
    }
  },
  computed: {
    modem() {
      return this.$route.path.split('/').at(-1)
    },
    promptContent() {
      const link = h(RouterLink, { class: 'mx-1', to: `/network/mobile/general/${this.sectionModem.id}` }, this.$t('General'))
      return () =>
        h('p', { class: 'flex-wrap' }, [
          this.$t('Enabled SIM switch instances will not have any impact because the instance for the Default SIM is not enabled. To change default SIM go to'),
          link,
          this.$t('page.')
        ])
    },
    sectionModem() {
      return this.modems.find(m => m.id === this.modem) || this.modems[0] || {}
    },
    simSlots() {
      return this.formData.sim?.filter(s => s.modem === this.sectionModem.id) || []
    },
    enabledSmsLimits() {
      return this.simStatus.filter(s => s.modem === this.sectionModem.id && s.sms_limit_enabled === '1')
    },
    currentModemIfaces() {
      return this.interfaces.filter(s => s.modem === this.sectionModem.id)
    },
    enabledDataLimits() {
      return this.limitStatus.filter(s => this.currentModemIfaces.find(iface => iface.id === s.id) && s.enabled === '1')
    },
    opListOptions() {
      if (this.operatorList.length > 0) return this.operatorList.map(s => s.name)
      return [['', this.$t('No operator lists available')]]
    },
    showOpCodeRule() {
      return !this.$mobile.modemLowPower(this.sectionModem)
    },
    conditions() {
      const list = [
        { index: 0, id: 'on_signal', name: this.$t('On weak signal') },
        { index: 1, id: 'data_limit', name: this.$t('On data limit') },
        { index: 3, id: 'sms_limit', name: this.$t('On SMS limit') },
        { index: 5, id: 'roaming', name: this.$t('On roaming') },
        { index: 6, id: 'no_network', name: this.$t('No network') },
        { index: 7, id: 'denied', name: this.$t('On network denied') },
        { index: 8, id: 'fail_flag', name: this.$t('On data connection fail') },
        { index: 10, id: 'sim_not_ready', name: this.$t('On SIM not inserted') }
      ]
      if (this.showOpCodeRule) {
        list.push({ index: 11, id: 'opcode_enabled', name: this.$t('On operator or country code') })
      }
      return [...list, { index: 9, id: 'enable_back', name: this.$t('Switch to next SIM after delay') }]
    }
  },
  mounted() {
    this.$timer.start({ method: this.getStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    afterLoad() {
      const supportsOpScan = this.$mobile.getModemById(this.modem)?.operator_scan || false
      return this.$axios
        .bulkGet(['/api/sim_cards/config', '/api/data_limit/config', '/api/interfaces/config', { endpoint: '/api/operator_lists/config', condition: supportsOpScan }])
        .then(([simcards, dataLimits, interfaces, operatorsList]) => {
          if (simcards.success) this.simcards = simcards.data
          else this.$message.error(this.$t('Failed to load SIM card data'))
          if (interfaces.success) this.interfaces = interfaces.data
          else this.$message.error(this.$t('Failed to load network configurations'))
          if (dataLimits.success) this.dataLimits = dataLimits.data
          else this.$message.error(this.$t('Failed to load data limit data'))
          if (operatorsList.success) this.operatorList = operatorsList.data
          else this.$message.error(this.$t('Failed to load operators'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    getStatus() {
      return this.$axios
        .bulkGet(['/api/modems/status', '/api/sim_cards/status', '/api/data_limit/status', '/api/sim_switch/status'])
        .then(([modems, simStatus, limitStatus, switchStatus]) => {
          if (modems.success) this.modems = modems.data
          else this.$message.error(this.$t('Failed to load modem status'))
          if (simStatus.success) this.simStatus = simStatus.data
          else this.$message.error(this.$t('Failed to load SIM status'))
          if (limitStatus.success) this.limitStatus = limitStatus.data
          else this.$message.error(this.$t('Failed to load data limit status'))
          if (switchStatus.success) this.switchStatus = switchStatus.data
          else this.$message.error(this.$t('Failed to load SIM switch status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    displaySimSlot(s) {
      return 'SIM%s'.format(this.$mobile.getSimLabel(s.position, s.esim_profile, s.modem))
    },
    getConditions(s, enabled = true) {
      const status = this.switchStatus.find(status => status.id === s.id)?.rules || []
      return this.conditions
        .filter(condition => {
          const value = s[condition.id]
          return enabled ? value === '1' : value !== '1'
        })
        .map(condition => {
          // excludes data_limit, sms_limit and enable_back conditions
          const stats = status.find(rule => rule.type === condition.index && ![1, 3, 9].includes(rule.type))
          return enabled && stats ? '%s (%s/%s)'.format(condition.name, stats.fail_count, stats.max_fail) : condition.name
        })
    },
    enabledInstance(s) {
      return this.$refs.vuciForm?.initialForm.sim?.find(initial => initial.id === s.id)?.enabled === '1' || false
    },
    onlyEnableBack(s) {
      return (
        s.enable_back === '1' &&
        s.on_signal !== '1' &&
        s.data_limit !== '1' &&
        s.sms_limit !== '1' &&
        s.roaming !== '1' &&
        s.no_network !== '1' &&
        s.denied !== '1' &&
        s.fail_flag !== '1' &&
        s.sim_not_ready !== '1'
      )
    },
    onlyLimitsEnabled(s) {
      return (s.data_limit === '1' || s.sms_limit === '1') && s.on_signal !== '1' && s.roaming !== '1' && s.no_network !== '1' && s.denied !== '1' && s.fail_flag !== '1' && s.sim_not_ready !== '1'
    },
    disableSwitch(s) {
      if ((s.enable_back === '1' && !s.switch_back) || (s.on_signal === '1' && !s.weak_signal) || (s.data_fail === '2' && !s.data_fail_host) || (s.opcode_enabled === '1' && !s.opcode_list))
        return this.$t('Disabled because SIM switch is not configured')
      if ((s.retry_count && s.interval) || (this.onlyEnableBack(s) && s.switch_back) || (s.interval && this.onlyLimitsEnabled(s))) return false
      return this.$t('Disabled because SIM switch is not configured')
    },
    findDefaultSim(instances, simcards, section) {
      const defaultSimcard = simcards.find(s => s.primary === '1' && s.modem === this.sectionModem.id)
      const defaultSimSection = section
        ? section.enabled === '1' && section.modem === defaultSimcard.modem && section.position === defaultSimcard.position && section.esim_profile === defaultSimcard.esim_profile
        : false
      return instances.some(s => s.modem === defaultSimcard.modem && s.position === defaultSimcard.position && s.esim_profile === defaultSimcard.esim_profile) || defaultSimSection
    },
    beforeSave() {
      return new Promise((resolve, reject) => {
        const enabledInstances = this.formData.sim.filter(s => s.enabled === '1' && s.modem === this.sectionModem.id)
        if (enabledInstances.length === 0) return resolve()
        if (enabledInstances.length > 1) {
          if (this.findDefaultSim(enabledInstances, this.simcards)) return resolve()
          return this.$prompt.show({
            title: this.$t('SIM switch instance is not enabled for default SIM'),
            content: this.promptContent,
            okText: this.$t('Continue'),
            cancelText: this.$t('Cancel'),
            onOk: () => {
              return resolve()
            }
          })
        }
        return reject(this.$t('At least 2 SIM switch instances must be enabled'))
      })
    },
    checkActiveSim(sim) {
      const checkEsim = !sim.esim_profile || this.sectionModem.esim_profile === sim.esim_profile
      return this.sectionModem.active_sim === Number(sim.position) && checkEsim
    },
    checkDefaultSim(sim) {
      return this.simcards.some(s => s.primary === '1' && s.modem === this.sectionModem.id && s.position === sim.position && s.esim_profile === sim.esim_profile)
    },
    simNumber(sim) {
      return sim.esim_profile ? sim.esim_profile : this.$mobile.adjustSimNumber(Number(sim.position), sim.modem)
    },
    hintInfo(sim) {
      const checkSim = (s, sim) => {
        const checkEsim = !s.esim_profile || sim.esim_profile === s.esim_profile
        return s.sim === sim.position && checkEsim
      }

      const activeSimSms = this.enabledSmsLimits.find(s => checkSim(s, sim))

      const activeSimDataLimits = this.enabledDataLimits.filter(s => {
        const iface = this.currentModemIfaces.find(iface => iface.id === s.id)
        return checkSim(iface, sim)
      })
      const mainDataLimit = activeSimDataLimits[0]

      const hints = [
        {
          id: 'data_limit',
          title: this.$t('Data used / limit'),
          value: mainDataLimit ? '%MB / %MB'.format(mainDataLimit.data_used, mainDataLimit.data_limit) : this.$t('N/A'),
          class: mainDataLimit ? (mainDataLimit.data_used < mainDataLimit.data_limit ? 'success' : 'error') : '',
          list: activeSimDataLimits.map(s => ({
            label: this.$network.getName(s),
            value: '%MB / %MB'.format(s.data_used, s.data_limit),
            class: s ? (s.data_used < s.data_limit ? 'success' : 'error') : ''
          }))
        },
        {
          id: 'sms_limit',
          title: this.$t('SMS sent / limit'),
          value: activeSimSms ? `${activeSimSms.sms_sent} / ${activeSimSms.sms_limit}` : this.$t('N/A'),
          class: activeSimSms ? (activeSimSms.sms_sent < activeSimSms.sms_limit ? 'success' : 'error') : ''
        }
      ]
      if (this.checkActiveSim(sim)) {
        hints.unshift(
          {
            id: 'operator',
            title: this.$t('Operator'),
            value: this.sectionModem.operator || this.$t('N/A')
          },
          {
            id: 'operator_state',
            title: this.$t('Operator state'),
            value: this.$mobile.getOperatorState(this.sectionModem.operator_state)
          },
          {
            id: 'rssi',
            title: 'RSSI',
            value:
              typeof this.sectionModem.rssi === 'number'
                ? `${this.sectionModem.rssi} dBm (${this.$mobile.rssiValue(this.sectionModem.rssi, this.$mobile.connectedTo4g5g(this.sectionModem)).value})`
                : this.$t('N/A'),
            hint: this.$t('Received signal strength indicator (RSSI) measured in dBm. Values closer to 0 indicate a better signal strength.')
          },
          {
            id: 'data_connection_state',
            title: this.$t('Data connection state'),
            value: this.sectionModem.data_conn_state ? this.$mobile.getDataConnState(this.sectionModem.data_conn_state) : { value: this.$t('N/A') }
          }
        )
      }
      return hints
    },
    logsModal() {
      this.showLogs = true
      this.$spin()
      return this.$axios
        .get(`/api/sim_switch/log/${this.sectionModem.id}`)
        .then(({ data }) => {
          this.logList = data
        })
        .catch(err => {
          if (err.response.data.errors[0].code === 113) this.$message.error(this.$t('No logs are available because the SIM switch might be turned off'))
          else this.$message.error(this.$t('Failed to load SIM switch logs'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    parseConditions(s) {
      if (!Array.isArray(s)) return this.$t('Unknown condition')
      if (s.length === 0) return this.$t('No conditions')
      return s.map(code => this.conditions.find(cond => cond.index === code)?.name || this.$t('Unknown condition')).join(', ')
    },
    closeLogs() {
      this.showLogs = false
      this.logList = []
    },
    switchWarning(sim) {
      const status = this.switchStatus.find(s => s.id === sim.id)
      return status && status.rules.some(s => s.triggered)
    }
  }
}
</script>
