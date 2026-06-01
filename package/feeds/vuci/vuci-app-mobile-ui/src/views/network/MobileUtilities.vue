<template>
  <NavigationTabs
    :tabs="tabs"
    @update:selected="tabChange"
  >
    <tlt-card
      sid="pin_management"
      :title="$t('SIM%s PIN management').format(simText)"
      :help="$t('Settings for PIN management.')"
    >
      <tlt-form-model-item
        :label="$t('SIM%s card lock status').format(simText)"
        :help="$t('Correct PIN code is required to enable or disable SIM card lock. Once SIM card lock is disabled you will not need to enter PIN code on any device to use SIM card.')"
        element-id="sim_lock"
      >
        <tlt-dummy-value
          :value="simLockStatus"
          :class="{ success: simLock, 'text-theme-text-secondary-subtle': simLock === undefined }"
        />
      </tlt-form-model-item>
      <tlt-form-model-item>
        <span class="flex gap-4">
          <tlt-button
            id="simCardLock"
            button-id="simCardLock"
            :readonly="!simInserted"
            @click="simLockModal"
          >
            {{ simLock ? $t('Unlock SIM card') : $t('Lock SIM card') }}
          </tlt-button>
          <tlt-button
            v-show="simInserted && simLock"
            id="pinChange"
            button-id="pinChange"
            color="secondary"
            :readonly="!simInserted"
            @click="showPinModal = true"
          >
            {{ $t('Change SIM PIN') }}
          </tlt-button>
        </span>
        <tlt-popover
          v-if="!simInserted"
          target="#simCardLock"
        >
          {{ disabledFieldMsg }}
        </tlt-popover>
        <tlt-popover
          v-if="simInserted && sectionSim.pin_lock_enabled === '0'"
          target="#pinChange"
        >
          {{ $t('PIN change is not available because SIM card lock is not enabled.') }}
        </tlt-popover>
      </tlt-form-model-item>
      <sim-pin-change
        :v-if="showPinModal"
        :show-modal="showPinModal"
        :modem="modem"
        :sim="$mobile.getSimLabel(sectionModem.active_sim || 1, undefined, sectionModem.id)"
        :current-pin="section.pincode"
        @close="showPinModal = false"
      />
      <sim-card-lock
        :v-if="showLockModal"
        :show-modal="showLockModal"
        :modem="modem"
        :pin-lock="sectionSim.pin_lock_enabled === '1'"
        :modal="lockModal"
        @close="showLockModal = false"
        @success="onSuccess"
      />
    </tlt-card>
    <tlt-form
      v-if="flightMode !== undefined && sectionModem.builtin"
      ref="modemForm"
      sid="modem_form"
      :title="$t('Modem configuration')"
      :help="$t('Section for modem configuration.')"
    >
      <tlt-form-model-item
        :label="$t('Flight mode status')"
        element-id="flight_mode"
      >
        <tlt-dummy-value :value="$mobile.getFlightMode(sectionModem)" />
      </tlt-form-model-item>
      <tlt-form-item-switch
        v-model="flightMode"
        :label="$t('Enable flight mode')"
        :help="$t('Enables flight mode for selected modem.')"
        true-value="1"
        false-value="0"
        prop="flightMode"
      />
      <tlt-inline-message
        v-if="flightMode === '1'"
        id="flight-mode-message"
        type="warning"
        :message="$t('Please note that enabling flight mode will turn off the mobile connection on this modem.')"
      />
    </tlt-form>
    <tlt-form
      v-if="Object.keys(sectionModem).length && !$mobile.modemLowPower(sectionModem) && !sectionModem.no_ussd && !$mobile.modemOffline(sectionModem)"
      ref="ussdForm"
      sid="ussd_section"
      title="USSD"
      :help="$t('Section for sending and reading USSD (Unstructured Supplementary Service Data) messages.')"
    >
      <tlt-form-item-input
        v-model="ussd"
        prop="ussd_code"
        label="USSD"
        :help="$t('Field for the USSD message/code.')"
        placeholder="*100#"
        rules="string"
        maxlength="182"
        required
        :readonly="!simInserted || disableUSSD"
      />
      <tlt-inline-message
        v-if="ussdMessage"
        id="ussd-message"
        type="info"
        :message="ussdMessage"
      />
      <tlt-form-model-item>
        <tlt-hint :hints="disabledFieldMsg">
          <tlt-button
            button-id="send"
            :readonly="!simInserted || disableUSSD"
            :loading="disableUSSD"
            @click="sendUSSD()"
          >
            {{ $t('Send') }}
          </tlt-button>
        </tlt-hint>
      </tlt-form-model-item>
      <tlt-form-item-text-area
        v-if="ussdParsedResponse"
        v-model="ussdParsedResponse"
        :label="$t('Response message')"
        :help="$t('Response received from the sent USSD code includes the time, sent code, response message, state, and coding scheme.')"
        :maxlength="null"
        copy-button
        readonly
        prop="ussd_response"
      />
      <div
        v-if="ussdParsedResponse"
        class="flex gap-2 justify-end"
      >
        <tlt-button
          button-id="clear"
          color="secondary"
          @click="clearUssd"
        >
          {{ $t('Clear') }}
        </tlt-button>
        <tlt-button
          button-id="export"
          icon-left="upload-export"
          color="secondary"
          @click="exportUssd"
        >
          {{ $t('Export') }}
        </tlt-button>
      </div>
    </tlt-form>
    <div
      v-if="sectionModem.builtin"
      class="flex justify-end"
    >
      <tlt-button
        button-id="saveandapply"
        @click="saveModemConfig"
      >
        {{ $t('Save & Apply') }}
      </tlt-button>
    </div>
  </NavigationTabs>
</template>
<script>
import simPinChange from '../../components/network/SimPinChange'
import simCardLock from '../../components/network/SimCardLock'

export default {
  components: { simPinChange, simCardLock },
  layout: 'none',
  data() {
    return {
      section: {},
      modem: '',
      modemList: [],
      simStatus: [],
      showPinModal: false,
      showLockModal: false,
      lockModal: {
        title: '',
        content: '',
        okText: '',
        fieldText: ''
      },
      initialPrimary: '0',
      ussd: '',
      ussdResponse: [],
      ussdParsedResponse: null,
      disableUSSD: false,
      flightMode: undefined,
      simLock: undefined,
      parsedStateId: {
        0: this.$t('No further user action required'),
        1: this.$t('Further user action required'),
        2: this.$t('USSD terminated by network'),
        3: this.$t('Another local client has responded'),
        4: this.$t('Operation not supported'),
        5: this.$t('Network time out'),
        6: this.$t('USSD state unknown')
      }
    }
  },
  computed: {
    tabs() {
      return this.modemList.map(m => ({ name: m.id, title: m.name }))
    },
    sectionModem() {
      return this.modemList.find(m => m.id === this.modem) || {}
    },
    simInserted() {
      return this.sectionModem?.pinstate === 'Inserted'
    },
    ussdMessage() {
      return this.$t('An USSD message will be sent on active SIM, response can take up to 3 minutes. %s').format(
        this.supportedModes.length > 1 ? this.$t('The connection might fallback to lower network type when sending message.') : ''
      )
    },
    supportedModes() {
      if (!this.sectionModem.service_modes) return []
      return Object.keys(this.sectionModem.service_modes).filter(mode => mode !== 'NB')
    },
    disabledFieldMsg() {
      if (this.simInserted) return ''
      if (this.$mobile.modemOffline(this.sectionModem)) return this.$t('Disabled because modem is blocked or disabled.')
      let state = this.$t('not inserted')
      if (this.$mobile.shouldAllowSimUnlock(this.sectionModem)) state = this.$t('locked')
      else if (this.$mobile.requiresPuk(this.sectionModem)) state = this.$t('blocked')
      return this.$t('Disabled because SIM card is %s.').format(state)
    },
    sectionSim() {
      return (
        this.simStatus.find(s => {
          const checkEsim = !s.esim_profile || this.sectionModem.esim_profile === s.esim_profile
          return s.modem === this.modem && parseInt(s.sim) === this.sectionModem.active_sim && checkEsim
        }) || {}
      )
    },
    simText() {
      return this.$mobile.getSimLabel(this.sectionModem.active_sim, this.sectionSim.esim_profile, this.sectionModem.id)
    },
    simLockStatus() {
      if (this.simLock === undefined) return this.$t('Waiting')
      return this.simLock ? this.$t('Locked') : this.$t('Unlocked')
    }
  },
  mounted() {
    this.$spin()
    this.getData().then(() => {
      this.modem = this.modemList[0]?.id
      this.flightMode = this.sectionModem.mobile_stage === 23 ? '1' : '0'
      this.$spin(false)
      this.$timer.start({ method: this.getData, time: 3000, autostart: true, immediate: false })
    })
  },
  methods: {
    getData() {
      return this.$axios
        .bulkGet(['/api/modems/status', '/api/sim_cards/status'])
        .then(([modemList, simStatus]) => {
          if (modemList.success) this.modemList = this.$mobile.parseModems(modemList.data)
          else this.$message.error(this.$t('Failed to load modem options'))
          if (simStatus.success) this.simStatus = simStatus.data
          else this.$message.error(this.$t('Failed to load SIM status'))
          if (!this.showLockModal) this.simLock = this.simInserted ? this.sectionSim.pin_lock_enabled === '1' : undefined
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    sendUSSD() {
      return this.$refs.ussdForm.validate().then(validationResult => {
        if (!validationResult.valid) return this.$message.error(this.$t('USSD is invalid'))
        this.disableUSSD = true
        const ussd = this.ussd
        return this.$axios
          .post(`/api/modems/${this.modem}/actions/send_ussd`, {
            data: {
              ussd
            }
          })
          .then(({ data }) => {
            this.ussdResponse.unshift([this.$localDate(data.timestamp), ussd, data.message, this.parsedStateId[data.state_id] || data.state_id, data.coding_scheme])
            this.ussdParsedResponse = this.ussdResponse.map(row => row.join(' ; ')).join('\n\n')
            this.$message.success(this.$t('USSD code sent successfully'))
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to send USSD code'))
          })
          .finally(() => {
            this.disableUSSD = false
          })
      })
    },
    clearUssd() {
      this.ussdParsedResponse = ' '
      this.ussdResponse = []
    },
    exportUssd() {
      const deviceName = this.$store.deviceInfo?.static?.device_name || ''
      const rows = [...this.ussdResponse]
      rows.unshift([this.$t('Time'), 'USSD', this.$t('Response'), this.$t('State id'), this.$t('Coding scheme')])
      const esimProfile = this.sectionModem.esim_profile ? `-esim${this.sectionModem.esim_profile}` : ''
      const simText = `sim${this.$mobile.adjustSimNumber(this.sectionModem.active_sim, this.sectionModem.id)}${esimProfile}`
      const fileName = `ussd-data-${simText}-${deviceName}`
      this.$utils.generateCsv(fileName, rows)
    },
    simLockModal() {
      if (!this.simInserted || this.showLockModal) return
      this.lockModal.okText = this.sectionSim.pin_lock_enabled === '1' ? this.$t('Unlock') : this.$t('Lock')
      this.lockModal.fieldText = this.$t('SIM%s PIN').format(this.simText)
      this.lockModal.title = this.$t('SIM%s card lock configuration').format(this.simText)
      if (this.sectionSim.pin_lock_enabled === '1') {
        this.lockModal.content = this.$t(
          'The correct PIN code is required to disable the SIM card lock (3 attempts allowed). Once the SIM card lock is disabled, the PIN code will not be required on any device to use that SIM card.'
        )
      } else {
        this.lockModal.content = this.$t(
          'The correct PIN code is required to enable the SIM card lock (3 attempts allowed). Once the SIM card lock is enabled, the PIN code will be required on any device to use that SIM card.'
        )
      }
      this.showLockModal = true
    },
    onSuccess(val) {
      this.simLock = val === '1'
      this.simStatus.find(s => s.modem === this.modem && parseInt(s.sim) === this.sectionModem.active_sim).pin_lock_enabled = val
    },
    saveModemConfig() {
      return this.$refs.modemForm.validate().then(validationResult => {
        if (!validationResult.valid) return this.$message.error(this.$t('Some fields are invalid'))
        this.$spin()
        const data = { flight_mode: this.flightMode }
        return this.$axios
          .put(`/api/modems/${this.modem}/global`, { data })
          .then(() => {
            this.$message.success(this.$t('Configuration has been applied'))
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to edit configuration'))
          })
          .finally(() => {
            this.$spin(false)
          })
      })
    },
    tabChange(tab) {
      this.modem = tab
      this.ussd = ''
      this.ussdResponse = []
      this.ussdParsedResponse = null
      this.simLock = this.simInserted ? this.sectionSim.pin_lock_enabled === '1' : undefined
      this.flightMode = this.sectionModem.mobile_stage === 23 ? '1' : '0'
      this.$nextTick(() => {
        this.$refs.ussdForm?.setValid(true)
      })
    }
  }
}
</script>
