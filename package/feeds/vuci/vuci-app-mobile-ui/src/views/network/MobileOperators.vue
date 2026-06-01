<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="simcard"
    :after-load="afterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="currentSection?.id"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'sim_cards/config' }]"
      data-key="simcards"
      :exception-options="['operator']"
      :form-methods="activeSimAvailable ? ['get', 'edit'] : ['get']"
      :after-save="onAfterSave"
    >
      <tlt-card
        :title="$t('Status and configuration')"
        :help="$t('Section for choosing how to find operators.')"
      >
        <template #title-content>
          <span
            id="warning"
            class="flex items-center h-8 ml-2"
          >
            <tlt-icon
              v-if="$mobile.modemOffline(currentModem)"
              icon="warning"
              class="text-theme-text-warning size-5"
            />
            <tlt-popover target="#warning">
              {{ $t(`Instance can't be edited because modem is blocked or disabled`) }}
            </tlt-popover>
          </span>
        </template>
        <tlt-tabs
          v-model:selected="modem"
          :tabs="modemTabs"
        >
          <template
            v-for="tab in modemTabs"
            #[tab.name]
            :key="tab.name"
          >
            <GridLayout
              borders="column"
              class="grid-cols-1 lg:grid-cols-3 pb-5"
              :class="{ 'border-b': activeSimAvailable }"
            >
              <tlt-card-new
                v-for="(card, idx) in cards"
                :key="idx"
                :item="card"
                borderless
              />
            </GridLayout>
            <template v-if="activeSimAvailable">
              <vuci-form-item-select
                :uci-section="s"
                name="operator_mode"
                :label="$t('Operator selection mode')"
                :help="$t('Auto - selects the operator automatically. Manual - requires you to select the operator manually.')"
                :options="modeOptions"
                no-write
                @change="s.operator = s.operator_mode"
              />
              <vuci-form-item-select
                :uci-section="s"
                name="opermode"
                :label="$t('Operator list mode')"
                :help="$t('Select operator list mode.')"
                :options="listModeOptions"
                :disabled-options="disabledListModes"
                :depend="s.operator_mode === 'manual' && !$mobile.modemLowPower(currentModem)"
              />
              <vuci-form-item-switch
                :uci-section="s"
                name="fallback"
                :help="$t('Fallback to auto if it\'s not possible to connect to selected operator.')"
                :label="$t('Fallback to auto')"
                :depend="s.operator_mode === 'manual' && s.opermode === ''"
                no-write
                @change="updateFallback(s)"
              />
              <tlt-inline-message
                v-if="s.operator_mode === 'manual'"
                id="list-mode-description"
                type="info"
                :message="listModeDescription()"
              />
              <vuci-form-item-select
                :uci-section="s"
                name="opernum"
                :label="$t('Operator code')"
                :help="$t('Operator\'s code used to identify a network operator.')"
                :options="operatorCodes"
                :depend="s.operator_mode === 'manual' && s.opermode === ''"
                :rules="v => [v.number_leading_zeros, v.exact_length.bind(v, [5, 6])]"
                allow-create
                required
              />
              <vuci-form-item-select
                :uci-section="s"
                name="operlist_name"
                :label="$t('Operator list')"
                :options="operatorOptions"
                :depend="s.operator_mode === 'manual' && s.opermode !== ''"
                required
                allow-create
                @change="createNewList"
              >
                <template #help>
                  {{ $t("Operator's code list name.") }}
                  <br />
                  {{ $t('Configure it') }}
                  <router-link to="/network/mobile/operators/list"> {{ $t('here') }} </router-link>.
                </template>
              </vuci-form-item-select>
              <tlt-inline-message
                v-if="s.operator_mode === 'manual' && s.opermode !== '' && operatorOptions[0][0] === ''"
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
              <tlt-form-model-item
                v-if="!$mobile.modemOffline(currentModem)"
                v-show="s.operator_mode !== 'auto' && s.opermode === '' && currentModem?.operators_scan"
                label=" "
              >
                <span class="flex">
                  <tlt-button
                    :id="`scanOp_${tab.name}`"
                    button-id="scan"
                    :readonly="!!scanDisabled(currentModem)"
                    type="button"
                    color="primary"
                    icon-left="mobile"
                    @click="showOpTable = true"
                  >
                    {{ $t('Operator scan list') }}
                  </tlt-button>
                  <tlt-popover
                    v-if="scanDisabled(currentModem)"
                    :target="`#scanOp_${tab.name}`"
                  >
                    {{ scanDisabled(currentModem) }}
                  </tlt-popover>
                </span>
              </tlt-form-model-item>
            </template>
          </template>
        </tlt-tabs>
        <mobile-scan-list-modal
          v-if="showOpTable"
          :show-modal="showOpTable"
          :modem-list="[currentModem]"
          :scan-list="scanList"
          :code-list="[opCode]"
          network-selection
          @add-operator="selectOperator"
          @close="scanListClosed"
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { useMobileOperatorUtils } from '@/composables/useMobileOperatorUtils'
import mobileScanListModal from '../../components/network/MobileScanListModal'

export default {
  components: { mobileScanListModal },
  setup() {
    const { scanDisabled, getPreviousScan, operators } = useMobileOperatorUtils()
    return { scanDisabled, getPreviousScan, operators }
  },
  data() {
    return {
      formData: {},
      modemList: [],
      modem: '',
      scanResults: [],
      operatorCodes: [['', this.$t('N/A')]],
      operatorList: [],
      modeOptions: [
        ['auto', this.$t('Auto')],
        ['manual', this.$t('Manual')]
      ],
      listModeOptions: [
        ['', this.$t('Single operator')],
        ['whitelist', this.$t('Allowlist')],
        ['blacklist', this.$t('Blocklist')]
      ],
      scanList: [],
      showOpTable: false
    }
  },
  computed: {
    currentModem() {
      return this.modem ? this.modemList?.find(md => md.id === this.modem) : this.modemList[0]
    },
    currentSection() {
      return this.formData.simcards?.find(s => this.modem === s.modem && this.currentModem?.active_sim === parseInt(s.position) && s.primary === '1') || this.formData.simcards?.[0]
    },
    opCode() {
      return this.currentSection?.opernum || ''
    },
    activeSimPlmn() {
      return this.currentModem?.cell_info?.[0]?.mcc ? this.currentModem?.cell_info?.[0]?.mcc + this.currentModem?.cell_info?.[0]?.mnc : ''
    },
    operatorOptions() {
      if (this.operatorList.length > 0) {
        return this.operatorList.map(s => s.name)
      }
      return [['', this.$t('No operator lists available')]]
    },
    disabledListModes() {
      return this.currentModem?.operators_scan
        ? []
        : [
            ['whitelist', this.$t('Allowlist')],
            ['blacklist', this.$t('Blocklist')]
          ]
    },
    activeSimAvailable() {
      return !!this.currentModem?.active_sim
    },
    cards() {
      return {
        sim: { name: 'sim', columns: this.parseSim() },
        operator: { name: 'operator', columns: this.parseOperator() },
        connection: { name: 'connection', columns: this.parseConnection() }
      }
    },
    modemTabs() {
      return this.modemList.map(modem => ({
        name: modem.id,
        title: modem.name
      }))
    }
  },
  watch: {
    modem(newVal) {
      if (newVal) this.updateCode()
    }
  },
  timers: {
    updateModems: { time: 3000, repeat: true }
  },
  methods: {
    afterLoad() {
      return this.$axios
        .bulkGet(['/api/modems/status', { endpoint: '/api/operator_lists/config', condition: this.$store.board.modems?.[0]?.operator_scan }, '/api/modems/scan/status'])
        .then(([modemList, operatorsList, scanList]) => {
          if (modemList.success) {
            this.modemList = this.$mobile.parseModems(modemList.data)
            this.modem = this.modemList[0].id
          } else this.$message.error(this.$t('Failed to load modem status'))
          if (operatorsList.success) this.operatorList = operatorsList.data
          else this.$message.error(this.$t('Failed to load operators'))
          if (scanList.success) {
            this.scanList = scanList.data
            this.operators = this.getPreviousScan(this.scanList, this.currentModem)
          } else this.$message.error(this.$t('Failed to load scanned operator list'))
          this.formData.simcards.forEach(s => {
            this.updateOperatorMode(s)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.updateCode()
          this.$timer.start('updateModems')
        })
    },
    updateModems() {
      return this.$axios
        .bulkGet(['/api/modems/status', '/api/modems/scan/status'])
        .then(([modemList, scanList]) => {
          if (modemList.success && scanList.success) {
            this.modemList = this.$mobile.parseModems(modemList.data)
            this.scanList = scanList.data
            this.operators = this.getPreviousScan(scanList.data, this.currentModem)
          } else this.$message.error(this.$t('Failed to load modem status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    updateCode() {
      this.operators = this.getPreviousScan(this.scanList, this.currentModem)
      const opList = this.operators.map(op => [op.numName, `${op.numName} (${op.opName})`])
      this.operatorCodes = [['', this.$t('N/A')]]
      if (this.opCode) {
        const opName = this.operators.find(op => op.numName === this.opCode)?.opName || ''
        const operator = this.currentSection?.fallback === '1' && this.opCode !== this.activeSimPlmn ? opName : this.currentModem.operator
        this.operatorCodes = [[this.opCode, `${this.opCode} ${operator ? `(${operator})` : ''}`]]
      } else if (this.activeSimPlmn) {
        this.operatorCodes = [[this.activeSimPlmn, `${this.activeSimPlmn} (${this.currentModem.operator})`]]
      }
      if (opList.length && this.operatorCodes[0][0] === '') {
        this.operatorCodes = opList
      } else {
        this.operatorCodes = [...new Set([...this.operatorCodes, ...opList.filter(op => op[0] !== this.operatorCodes[0][0])])]
      }
    },
    selectOperator(operator) {
      this.formData.simcards.find(s => s.id === this.currentSection?.id).opernum = operator.numName
      this.scanListClosed()
    },
    listModeDescription() {
      const config = this.formData.simcards?.find(sim => sim.id === this.currentSection?.id)?.opermode
      if (config === 'blacklist') return this.$t('Blocklist - block all operators in the selected list.')
      else if (config === 'whitelist') return this.$t('Allowlist - only allow operators in the selected list.')
      return this.$t("Single operator - requires you to enter operator code and select if you want to fallback to auto if it's not possible to connect to selected operator.")
    },
    createNewList(self) {
      if (self.model && !this.operatorOptions.includes(self.model)) {
        this.$spin(true)
        return this.$axios
          .post('/api/operator_lists/config', { data: { name: self.model } })
          .then(() => {
            this.$router.push({ path: '/network/mobile/operators/list', hash: `#name=${self.model}` })
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to create operator list'))
          })
      }
    },
    updateOperatorMode(s) {
      s.operator_mode = s.operator || 'auto'
      if (s.operator === 'manual-auto') {
        s.operator_mode = 'manual'
        s.fallback = '1'
      }
      if ((!s.opermode && s.operator !== 'auto') || this.$mobile.modemLowPower(this.currentModem)) s.opermode = ''
    },
    onAfterSave(_, { data }) {
      this.updateOperatorMode(data)
    },
    updateFallback(section) {
      if (section.fallback === '1') {
        section.operator = 'manual-auto'
      } else if (section.fallback === '0') {
        section.operator = 'manual'
      }
    },
    parseSim() {
      return [
        {
          name: 'active_sim',
          label: this.$t('Active SIM'),
          value: this.currentModem.active_sim ? 'SIM%s'.format(this.$mobile.getSimLabel(this.currentModem.active_sim, this.currentModem.esim_profile, this.currentModem.id)) : this.$t('N/A'),
          hint: this.$t('Shows which SIM card slot is currently in use.')
        },
        {
          name: 'sim_card_state',
          label: this.$mobile.getSimstateLabel(this.currentModem),
          value: this.$mobile.getSimstate(this.currentModem, true),
          hint: this.$t('The current SIM card state.')
        },
        {
          name: 'modem_state',
          label: this.$t('Modem state'),
          value: this.$mobile.getModemBusyState(this.currentModem),
          hint: this.$t('Shows current modem state.')
        }
      ]
    },
    parseOperator() {
      const mcc = this.currentModem.cell_info?.[0]?.mcc || 'N/A'
      const mnc = this.currentModem.cell_info?.[0]?.mnc || 'N/A'
      const plmn = mcc !== 'N/A' && mnc !== 'N/A' ? `${mcc}${mnc}` : this.$t('N/A')

      return [
        {
          name: 'operator',
          label: this.$t('Current operator'),
          value: this.currentModem.operator || this.$t('N/A'),
          hint: this.$t('Shows the name of the operator to which the device is currently connected.')
        },
        {
          name: 'operator_state',
          label: this.$t('Operator state'),
          value: this.$mobile.getOperatorState(this.currentModem.operator_state),
          hint: this.$t('Shows whether the network has currently indicated the registration of the mobile device.')
        },
        {
          name: 'plmn',
          label: 'PLMN',
          value: plmn,
          hint: this.$t('Public Land Mobile Network (PLMN) - consisting of MCC (Mobile Country Code) and MNC (Mobile Network Code) values.')
        }
      ]
    },
    parseConnection() {
      const showBadge = this.currentModem.data_conn_state
        ? { badge: { size: 'md', text: this.$mobile.getDataConnState(this.currentModem.data_conn_state), type: this.currentModem.data_conn_state === 'Connected' ? 'success' : 'error' } }
        : { value: this.$t('N/A') }

      return [
        { name: 'data_connection_state', label: this.$t('Data connection state'), hint: this.$t('Indicates whether the device has a mobile data connection or not.'), ...showBadge },
        {
          name: 'mobile_connection_stage',
          label: this.$t('Connection stage'),
          value: this.$mobile.getMobileStage(this.currentModem),
          hint: this.$t('Indicates current mobile connection stage.')
        },
        {
          name: 'network_type',
          label: this.$t('Network type'),
          value: this.$mobile.getConntype(this.currentModem.conntype),
          hint: this.$t('Mobile network type.')
        }
      ]
    },
    scanListClosed() {
      this.showOpTable = false
      this.operators.forEach(operator => {
        if (!this.operatorCodes.some(code => code[0] === operator.numName)) {
          this.operatorCodes.push([operator.numName, `${operator.numName} (${operator.opName})`])
        }
      })
      if (this.operatorCodes.length > 1) {
        this.operatorCodes = this.operatorCodes.filter(code => code[0] !== '')
      }
    }
  }
}
</script>
