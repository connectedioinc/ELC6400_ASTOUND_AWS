<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="simcard"
    :extra-load="extraLoad"
  >
    <vuci-typed-section
      :title="title"
      :edit-form="smsTab ? editSms : editData"
      :endpoints="[smsTab ? { endpoint: 'sim_cards/config' } : { endpoint: 'data_limit/config' }]"
      :form-methods="['get', 'edit']"
      :data-key="smsTab ? 'simcards' : 'dataLimit'"
      :type="smsTab ? 'sim' : 'interface'"
      :edit-form-props="smsTab ? {} : { interfaces }"
      :uci-data="uciData"
      :no-value-text="smsTab ? $t('There are no SMS limit instances.') : $t('There are no data limit instances. Create new mobile interface in WAN page')"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          :card-props="parseCard(s)"
          :index="index"
          class="mb-4 last:mb-0"
          :test-id="`rowCard-${s.id}`"
        >
          <name-cell
            class="lg:w-[23%]!"
            :index="index + 1"
            :value="smsTab ? 'SIM%s'.format(showSim(s.position, s.modem, s.esim_profile)) : $network.getName(interfaces?.find(i => i.id === s.id) || s)"
          />
          <card-cell
            v-for="(column, cIdx) in parseCard(s).columns"
            :key="cIdx"
            :columns="column"
          >
            <cell-row
              v-for="(row, rIdx) in column"
              :key="rIdx"
              :label="row.label"
              truncate
            >
              <template #value>
                <div class="flex">
                  <span
                    class="truncate"
                    :class="row.class"
                  >
                    {{ row.value }}
                  </span>
                </div>
              </template>
            </cell-row>
          </card-cell>
          <action-cell>
            <cell-row
              :label="$t('Actions')"
              only-mobile-label
            >
              <template #value>
                <div class="flex-col space-y-2">
                  <vuci-form-edit-delete
                    :id="s.id"
                    :actions="actions"
                    :delete-btn="false"
                  />
                  <tlt-button
                    button-id="clear-limit"
                    type="text"
                    icon-left="x-circle"
                    @click="showPrompt(smsTab, s.id)"
                  >
                    {{ $t('Clear limit') }}
                  </tlt-button>
                </div>
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <cell-row
              :label="$t('Enable')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-item-switch
                  :uci-section="s"
                  :name="smsTab ? 'enable_sms_limit' : 'enabled'"
                  initial
                  :readonly="!!disableSwitch(s)"
                  :hints="!!disableSwitch(s) ? [{ info: disableSwitch(s) }] : []"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import { useMobileLimitsUtils } from '@/composables/useMobileLimitsUtils'
import DataLimitEdit from './MobileDataLimitEdit.vue'
import SmsLimitEdit from './MobileSmsLimitEdit.vue'

export default {
  provide() {
    return {
      formOptions: () => this.formOptions
    }
  },
  setup() {
    const { checkSimSwitchSmsRule, checkSimSwitchDataRule } = useMobileLimitsUtils()
    return { checkSimSwitchSmsRule, checkSimSwitchDataRule }
  },
  data() {
    return {
      formData: { simcards: [], dataLimit: [] },
      editSms: markRaw(SmsLimitEdit),
      editData: markRaw(DataLimitEdit),
      formOptions: {
        modemList: [],
        ntpInfo: {},
        simSwitch: []
      },
      modemList: [],
      simStatus: [],
      dataStatus: [],
      type: this.$route.path.substring(this.$route.path.lastIndexOf('/') + 1),
      interfaces: []
    }
  },

  computed: {
    title() {
      if (this.smsTab) return this.$t('SMS limit')
      return this.$t('Data limit')
    },
    smsTab() {
      return this.type === 'sms'
    }
  },
  methods: {
    extraLoad() {
      return this.getData().then(() => {
        this.$timer.start({ method: this.getData, time: 3000, autostart: true, immediate: true })
      })
    },
    getData() {
      return this.$axios
        .bulkGet([
          { endpoint: '/api/sim_cards/status', condition: this.smsTab },
          { endpoint: '/api/data_limit/status', condition: !this.smsTab },
          '/api/modems/status',
          '/api/date_time/ntp/client/config',
          { endpoint: '/api/sim_switch/config', condition: 'sim_switch.control' },
          { endpoint: '/api/interfaces/config', condition: !this.smsTab }
        ])
        .then(([simStatus, dataStatus, modemData, ntpData, simSwitchData, ifaceData]) => {
          if (simStatus.success) this.simStatus = simStatus.data
          else this.$message.error(this.$t('Failed to load SIM status'))
          if (dataStatus.success) this.dataStatus = dataStatus.data
          else this.$message.error(this.$t('Failed to load data limit status'))
          if (modemData.success) {
            this.modemList = this.$mobile.parseModems(modemData.data)
            this.formOptions.modemList = this.modemList
          } else this.$message.error(this.$t('Failed to load modem status'))
          if (ntpData.success) this.formOptions.ntpInfo = ntpData.data[0]
          else this.$message.error(this.$t('Failed to load ntp data'))
          if (simSwitchData.success) this.formOptions.simSwitch = simSwitchData.data
          else this.$message.error(this.$t('Failed to load SIM switch data'))
          if (ifaceData.success) this.interfaces = ifaceData.data.filter(s => ['wwan', 'connm'].includes(s.proto))
          else this.$message.error(this.$t('Failed to load interface data'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    parseCard(s) {
      if (!s) return {}
      if (this.smsTab) {
        const data = this.simStatus.find(status => status.section_name === s.id) || {}
        return {
          item: s,
          name: 'SIM%s'.format(data.sim),
          badge: data.sms_limit_enabled === '1' ? { type: 'success', size: 'sm', text: this.$t('On') } : { type: 'error', size: 'sm', text: this.$t('Off') },
          columns: this.parseSMSLimit(data)
        }
      }
      const data = this.dataStatus.find(status => status.id === s.id) || {}
      return {
        item: s,
        name: s.id,
        badge: s.mob_limit_enabled === '1' ? { type: 'success', size: 'sm', text: this.$t('On') } : { type: 'error', size: 'sm', text: this.$t('Off') },
        columns: this.parseMobileDataLimit(s, data)
      }
    },
    parseMobileDataLimit(config, status) {
      let dataUsed = status.data_used ? '%MB / %MB'.format(status.data_used, status.data_limit) : '-'
      let dataUsedHint = []
      if (status.data_used === 'N/A') {
        dataUsed = '%s / %MB'.format(status.data_used, status.data_limit)
        dataUsedHint = [{ info: this.$t('Data used not available when interface is down') }]
      }
      const columns = [
        [
          {
            label: this.$t('Status'),
            value: status.enabled === '1' ? this.$t('On') : this.$t('Off'),
            class: status.enabled === '1' ? 'success' : 'error'
          },
          {
            label: 'SIM',
            value: this.showSim(config.id)
          }
        ],
        [
          {
            label: this.$t('Reset period'),
            value: config.period ? this.$capitalize(config.period) : '-'
          },
          {
            label: this.$t('Data used / limit'),
            value: dataUsed,
            hint: dataUsedHint,
            class: status.enabled === '1' && status.data_used && status.data_used !== 'N/A' ? (status.data_used < status.data_limit ? 'success' : 'error') : ''
          }
        ],
        [
          {
            label: this.$t('Clear due'),
            value: config.period ? this.$localDate(status.due_reset_time) : '-'
          },
          {
            label: this.$t('SMS warning'),
            value: status.enabled === '1' ? (status.data_warning_enabled === '1' ? this.$t('Enabled') : this.$t('Disabled')) : '-',
            class: status.enabled === '1' ? (status.data_warning_enabled === '1' ? 'success' : 'error') : ''
          }
        ]
      ]
      return columns
    },

    parseSMSLimit(status) {
      return [
        [
          {
            label: this.$t('Status'),
            value: status.sms_limit_enabled === '1' ? this.$t('On') : this.$t('Off'),
            class: status.sms_limit_enabled === '1' ? 'success' : 'error'
          }
        ],
        [
          {
            label: this.$t('Reset period'),
            value: status.sms_limit_period ? this.$capitalize(status.sms_limit_period) : '-'
          },
          {
            label: this.$t('SMS sent / limit'),
            value: status.sms_sent ? '%s / %s'.format(status.sms_sent, status.sms_limit) : '-',
            class: status.sms_limit_enabled === '1' ? (Number(status.sms_sent) < Number(status.sms_limit) ? 'success' : 'error') : ''
          }
        ],
        [
          {
            label: this.$t('Clear due'),
            value: status.sms_due_reset_time ? this.$localDate(status.sms_due_reset_time) : '-'
          }
        ]
      ]
    },
    showPrompt(type, id) {
      return this.$prompt.show({
        title: this.$t('Clear %s counter?').format(this.title),
        content: this.$t('This process cannot be undone.'),
        okText: this.$t('Clear'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.clearLimit(type, id)
        }
      })
    },
    clearLimit(smsLimit, id) {
      let endpoint = '/api/data_limit/actions/clear'
      let data = { interface: id }
      if (smsLimit) {
        endpoint = `/api/sim_cards/${id}/actions/clear_sms_limit`
        data = {}
      }
      return this.$axios
        .post(endpoint, { data })
        .then(() => {
          this.$message.success(this.$t('%s cleared successfully').format(this.title))
        })
        .catch(() => {
          this.$message.error(smsLimit ? this.$t('SMS limit clear error') : this.$t('Interface is currently inactive, only available if interface is active'))
        })
    },
    showSim(id, modemId, esim) {
      let simText = this.$mobile.getSimLabel(id, esim, modemId)
      if (!this.smsTab) {
        const iface = this.interfaces.find(s => s.id === id)
        modemId = iface?.modem
        simText = this.$mobile.getSimLabel(iface?.sim, iface?.esim_profile, modemId)
      }
      let modem = this.modemList.find(modem => modem.id === modemId)
      if (!modem) modem = { builtin: false, name: this.$t('External modem') }
      if (modem && this.$mobile.shouldShowModemName(modem)) {
        simText = `${simText} (${modem.name})`
      }
      return simText
    },
    disableSwitch(s) {
      if (this.checkSimSwitchRule(s)) return this.$t('Disabled because SIM switch rule enabled')
      if (this.smsTab && !s.sms_limit_num) return this.$t('Disabled because limit is not configured')
      else if (!this.smsTab && (!s.data_limit || (s.enable_warning === '1' && (!s.warning_limit || !s.warning_num)))) return this.$t('Disabled because limit is not configured')
      return false
    },
    checkSimSwitchRule(s) {
      if ((this.smsTab && s.enable_sms_limit === '0') || s.enabled === '0') return false
      if (this.smsTab) {
        return !this.checkSimSwitchSmsRule(s, this.formOptions.simSwitch).isValid
      }
      const iface = this.interfaces.find(iface => iface.id === s.id)
      return !this.checkSimSwitchDataRule(iface, this.formOptions.simSwitch).isValid
    }
  }
}
</script>
