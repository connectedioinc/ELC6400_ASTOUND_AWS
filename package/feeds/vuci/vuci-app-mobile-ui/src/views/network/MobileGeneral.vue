<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="simcard"
    :extra-load="extraLoad"
    :after-load="afterLoad"
    bulk-request
  >
    <tlt-card
      :title="$t('Status')"
      :help="$t('Mobile statuses.')"
    >
      <template #title-content>
        <div class="flex gap-2 items-center h-8 ml-2">
          <span
            v-if="$mobile.modemOffline(sectionModem)"
            id="warning"
          >
            <tlt-icon
              icon="warning"
              class="text-theme-text-warning size-5"
            />
            <tlt-popover target="#warning">
              {{ modemOffline }}
            </tlt-popover>
          </span>
          <span
            v-if="sectionModem.sim_switch_enabled"
            id="sim-switch"
          >
            <tlt-icon
              icon="info"
              class="text-theme-text-info size-5"
            />
            <tlt-popover target="#sim-switch">
              <span>
                {{ $t('The default SIM and active SIM can be different because SIM switch is enabled.') }}
                <router-link :to="`/network/mobile/sim_switch/${sectionModem.id}`">
                  {{ $t('SIM switch configuration') }}
                </router-link>
              </span>
            </tlt-popover>
          </span>
        </div>
      </template>
      <mobile-modem-status
        :sim-slots="simSlots"
        :modem-status="sectionModem"
        :simcards="formData.simcards"
        :hint-info="v => hintInfo(v)"
        :selectable="simCount > 1 && !$store.readOnlyPage"
        :initial-selected="selectedSim"
        @selected="v => (selectedSim = v)"
      >
        <template #left-side="{ sim }">
          <div
            v-if="simRequiresAction(sim)"
            class="mt-0.5"
          >
            <tlt-icon
              :id="`lock_${sim.id}`"
              class="icon size-4 text-theme-text-primary"
              icon="lock"
            />
            <tlt-popover
              :target="`#lock_${sim.id}`"
              placement="bottom-start"
              :content="simRequiresAction(sim)"
            />
          </div>
        </template>
      </mobile-modem-status>
      <div
        v-if="simCount > 1"
        class="flex gap-4 justify-end mt-4"
      >
        <tlt-hint :hints="makeDefaultHint">
          <tlt-button
            button-id="defaultSim"
            :readonly="Object.keys(selectedSimConfig).length === 0 || selectedSimConfig?.primary === '1' || esimDownloading"
            @click="makeDefaultPrompt(selectedSimConfig)"
          >
            {{ $t('Set as default SIM') }}
          </tlt-button>
        </tlt-hint>
        <tlt-hint :hints="makeActiveHint">
          <tlt-button
            button-id="activeSim"
            :readonly="Object.keys(selectedSimConfig).length === 0 || selectedSimConfig?.primary === '0' || checkActiveSim(selectedSimConfig) || $mobile.modemOffline(sectionModem) || esimDownloading"
            @click="makeActivePrompt(selectedSimConfig)"
          >
            {{ $t('Make active') }}
          </tlt-button>
        </tlt-hint>
      </div>
    </tlt-card>
    <vuci-typed-section
      :title="$t('SIM configuration')"
      :help="$t('Settings for the inserted SIM card.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'sim_cards/config', sectionFilter: s => s.modem === modemId }]"
      data-key="simcards"
      type="sim"
      :form-methods="['get', 'edit']"
    >
      <tlt-tabs v-model:selected="section">
        <tab-content
          v-for="s in simSlots"
          :key="s.id"
          :name="s.id"
          :title="'SIM%s'.format($mobile.getSimModemLabel({ id: s.modem }, s.position, s.esim_profile))"
        >
          <vuci-form-item-switch
            :uci-section="s"
            name="deny_roaming"
            :label="$t('Deny data roaming')"
            :help="$t('Do not establish data connection when network roaming is in use.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="pincode"
            label="PIN"
            rules="pincode"
            password
            sensitive
            :readonly="checkActiveSim(s) && $mobile.requiresPuk(sectionModem)"
          >
            <template #help>
              {{ $t("SIM card's PIN (Personal Identification Number) is a secret numeric password shared between a user and a system that can be used to authenticate the user.") }}
              {{ $t('SIM card PIN can be changed') }}
              <router-link to="/network/mobile/utilities"> {{ $t('here') }} </router-link>.
            </template>
          </vuci-form-item-input>
          <tlt-inline-message
            v-if="checkActiveSim(s) && $mobile.requiresPuk(sectionModem)"
            type="warning"
            :message="$t('PIN field is disabled because SIM card is blocked')"
          />
          <tlt-form-model-item v-if="checkActiveSim(s) && $mobile.requiresPuk(sectionModem)">
            <tlt-hint :hints="!$mobile.shouldAllowSimUnblock(sectionModem) ? simRequiresAction(s) : ''">
              <tlt-button
                button-id="pinPuk"
                :readonly="!$mobile.shouldAllowSimUnblock(sectionModem)"
                @click="showModal = true"
              >
                {{ $t('Unblock SIM') }}
              </tlt-button>
            </tlt-hint>
          </tlt-form-model-item>
        </tab-content>
      </tlt-tabs>
    </vuci-typed-section>
    <tlt-card
      v-show="loaded"
      :title="interfaceTitle"
      :help="$t('Displays the selected SIM mobile interface with the highest priority.')"
    >
      <template #title-content>
        <span
          id="interface_warning"
          class="flex ml-2 items-center h-8"
        >
          <link-to-page
            v-if="interfaceSection.id"
            class="text-sm"
            :path="servicesPath"
            inline
          />
          <template v-else>
            <tlt-icon
              icon="warning"
              class="text-theme-text-warning size-5"
            />
            <tlt-popover target="#interface_warning">
              {{ $t('No active mobile interfaces for this SIM were found.') }}
              {{ $t('Go to') }}
              <router-link to="/network/wan">WAN</router-link>
              {{ $t('page to create or enable an interface.') }}
            </tlt-popover>
          </template>
        </span>
      </template>
      <tlt-inline-message
        v-show="$mobile.modemOffline(sectionModem)"
        id="modem-offline-message"
        type="warning"
        :message="$t(`Interface can't be edited because modem is blocked or disabled`)"
      />
      <vuci-named-section
        v-slot="{ s }"
        :visible="showInterfaceSection"
        :name="interfaceSection?.id"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'interfaces/config', sectionFilter: filterInterface }]"
        :form-methods="hasWriteAccess ? ['get', 'edit'] : ['get']"
        data-key="interfaces"
        :exception-options="['apn', 'force_apn']"
        :after-save="onAfterSave"
      >
        <mobile-fields
          :uci-data="uciData"
          :s="s"
          :initial-apn="initialIfaces.find(i => i.id === interfaceSection.id)?.apn || ''"
          :sim-cards="formData.simcards"
          :modem-options="$mobile.modemsOptions(modemList)"
          :interface-apns="checkActiveSim(currentSection) && sectionModem.iccid !== 'N/A' ? apnList : []"
          :initial-interfaces="initialIfaces"
          :readonly="!hasWriteAccess"
          mobile-general
        />
      </vuci-named-section>
    </tlt-card>
    <sim-card-unblock
      :id="modemId"
      :open="showModal"
      :type="2"
      @close="showModal = false"
    />
  </vuci-form>
</template>
<script>
import MobileFields from '@/components/network/MobileFields'
import SimCardUnblock from '@conditional/vuci-app-mobile-ui/SimCardUnblock.vue'
import { h } from 'vue'
import LinkToPage from '@/components/shared/LinkToPage.vue'
import MobileModemStatus from '../../components/network/MobileModemStatus'
import { copy } from '@ui-core/utils/vue-helpers'

export default {
  components: {
    SimCardUnblock,
    MobileFields,
    LinkToPage,
    MobileModemStatus
  },
  data() {
    return {
      formData: { simcards: [], interfaces: [] },
      modemList: [],
      showModal: false,
      apnList: [],
      initialIfaces: [],
      simSwitch: [],
      loaded: false,
      esimStatus: [],
      section: this.$route.query?.simTab || '',
      selectedSim: '',
      simStatus: [],
      dataLimitStatus: []
    }
  },

  computed: {
    modemId() {
      return this.$route.path.split('/').at(-1)
    },
    sectionModem() {
      return this.modemList?.find(m => m.id === this.modemId) || {}
    },
    currentSection() {
      return this.formData.simcards?.find(sim => sim.id === this.section) || this.formData.simcards[0] || {}
    },
    selectedSimConfig() {
      return this.formData.simcards.find(s => this.selectedSim === s.id) || {}
    },
    interfaceSection() {
      return this.filterInterface(this.formData.interfaces) || { id: '' }
    },
    servicesPath() {
      return `/network/wan?edit=${this.interfaceSection.id || ''}`
    },
    modemOffline() {
      return this.$t('Status cannot be retrieved since the modem is %s').format(this.$mobile.getBlockedText(this.sectionModem))
    },
    simCount() {
      return this.formData.simcards.filter(sim => sim.modem === this.sectionModem.id).length
    },
    interfaceTitle() {
      if (!this.interfaceSection.id) return this.$t('APN configuration')
      return this.$t('Interface %s APN configuration').format(this.$network.getName(this.interfaceSection))
    },
    hasWriteAccess() {
      return this.$session.hasAccess('network/wan', 'write')
    },
    showInterfaceSection() {
      return !!this.interfaceSection.id && !this.$mobile.modemOffline(this.sectionModem)
    },
    switchInstances() {
      return this.simSwitch.filter(s => s.modem === this.currentSection.modem)
    },
    makeActiveHint() {
      if (this.$store.readOnlyPage) return ''
      if (Object.keys(this.selectedSimConfig).length === 0) return [{ info: this.$t('Select a SIM to set as active') }]
      if (this.esimDownloading) return [{ info: this.$t('eSIM profile download in progress') }]
      if (this.$mobile.modemOffline(this.sectionModem)) return [{ info: this.$t('Making default SIM active is unavailable when modem is blocked or disabled') }]
      if (this.checkActiveSim(this.selectedSimConfig)) return [{ info: this.$t('SIM is already active') }]
      return [{ info: this.$t('Set selected SIM as default first') }]
    },
    makeDefaultHint() {
      if (this.$store.readOnlyPage) return ''
      if (Object.keys(this.selectedSimConfig).length === 0) return [{ info: this.$t('Select a SIM to set as default') }]
      if (this.esimDownloading) return [{ info: this.$t('Changing default SIM is unavailable while an eSIM profile is being downloaded') }]
      if (this.selectedSimConfig.primary === '1') return [{ info: this.$t('SIM is already set as default') }]
      return [{ info: this.$t('Set selected SIM as a default') }]
    },
    esimDownloading() {
      return this.esimStatus.find(s => s.id === this.sectionModem?.id)?.pending_jobs?.includes('DOWNLOAD') || false
    },
    simSlots() {
      return this.formData.simcards?.filter(s => s.modem === this.sectionModem.id) || []
    },
    currentModemIfaces() {
      return this.formData?.interfaces.filter(s => s.modem === this.sectionModem.id) || []
    }
  },
  mounted() {
    this.$bus.on('update-pincode', (pin, modem) => {
      const section = this.formData.simcards.find(s => s.primary === '1')
      if (this.sectionModem?.id === modem && section) section.pincode = pin
    })
  },
  methods: {
    extraLoad(uciData) {
      return this.$axios
        .get('/api/modems/status')
        .then(res => {
          this.modemList = this.$mobile.parseModems(res.data)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem status'))
        })
        .finally(() => {
          const activeSim = uciData.simcards.find(s => s.primary === '1' && s.modem === this.sectionModem.id)
          this.selectedSim = activeSim?.id || ''
          this.initialIfaces = copy(uciData.interfaces || [])
        })
    },
    afterLoad() {
      return this.$axios
        .bulkGet(['/api/modems/apns/status', { endpoint: '/api/sim_switch/config', condition: 'sim_switch.control' }, { endpoint: '/api/esim/status', condition: !!this.$store.board?.hwinfo?.esim }])
        .then(([apns, simSwitchData, esim]) => {
          if (apns.success) this.apnList = apns.data.find(s => s.modem === this.currentSection?.modem)?.apns || []
          else this.$message.error(this.$t('Failed to load APN list'))
          if (simSwitchData.success) this.simSwitch = simSwitchData.data
          else this.$message.error(this.$t('Failed to load SIM switch data'))
          if (esim.success) this.esimStatus = esim.data
          else this.$message.error(this.$t('Failed to load eSIM status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$timer.start({ method: this.loadModemStatus, time: 3000, autostart: true, immediate: true })
          this.loaded = true
        })
    },
    loadModemStatus() {
      return this.$axios
        .bulkGet([
          '/api/modems/status',
          '/api/modems/apns/status',
          {
            endpoint: '/api/esim/status',
            condition: !!this.$store.board?.hwinfo?.esim
          },
          {
            endpoint: '/api/sim_cards/status',
            condition: !!this.sectionModem.sim_switch_enabled
          },
          {
            endpoint: '/api/data_limit/status',
            condition: !!this.sectionModem.sim_switch_enabled
          }
        ])
        .then(([modemData, apns, esim, simStatus, dataLimitStatus]) => {
          if (modemData.success) {
            this.modemList = this.$mobile.parseModems(modemData.data)
          } else this.$message.error(this.$t('Failed to load modem status'))
          if (apns.success) this.apnList = apns.data.find(s => s.modem === this.currentSection.modem)?.apns || []
          else this.$message.error(this.$t('Failed to load APN list'))
          if (esim.success) this.esimStatus = esim.data
          else this.$message.error(this.$t('Failed to load eSIM status'))
          if (simStatus.success) this.simStatus = simStatus.data
          else this.$message.error(this.$t('Failed to load SIM status'))
          if (dataLimitStatus.success) this.dataLimitStatus = dataLimitStatus.data
          else this.$message.error(this.$t('Failed to load data limit status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    filterInterface(sections) {
      const simSection = this.formData.simcards.find(s => s.id === this.currentSection?.id) || {}
      return (
        simSection &&
        sections?.find(s => ['wwan', 'connm'].includes(s.proto) && simSection.modem === s.modem && simSection.position === s.sim && simSection.esim_profile === s.esim_profile && s.enabled === '1')
      )
    },
    checkSim(s, sim) {
      const checkEsim = !s.esim_profile || sim.esim_profile === s.esim_profile
      return s.sim === sim.position && checkEsim
    },
    getReachedLimit(currentSection, switchInstance) {
      const smsLimitReached = this.simStatus.some(s => s.modem === this.sectionModem.id && s.sms_limit_enabled === '1' && this.checkSim(s, currentSection) && Number(s.sms_sent) >= Number(s.sms_limit))

      const enabledIfaces = this.currentModemIfaces.filter(iface => this.checkSim(iface, currentSection) && iface.enabled === '1')
      const dataLimitFiltered = this.dataLimitStatus.filter(s => enabledIfaces.find(iface => iface.id === s.id) && s.enabled === '1')
      const dataLimitReached = dataLimitFiltered.length > 0 && dataLimitFiltered.every(s => Number(s.data_used) >= Number(s.data_limit))

      if (switchInstance.data_limit === '1' && switchInstance.sms_limit === '1' && dataLimitReached && smsLimitReached) return this.$t('data and SMS limits')
      if (switchInstance.sms_limit === '1' && switchInstance.data_limit === '0' && smsLimitReached) return this.$t('SMS limit')
      if (switchInstance.data_limit === '1' && switchInstance.sms_limit === '0' && dataLimitReached) return this.$t('data limit')
      return ''
    },
    makeActivePrompt(currentSection) {
      let content = this.$t('After proceeding, you will lose current mobile connection. Connection will be reestablished with default SIM.')

      const instance = this.switchInstances.find(
        s => s.enabled === '1' && s.position === currentSection.position && s.esim_profile === currentSection.esim_profile && (s.data_limit === '1' || s.sms_limit === '1')
      )
      if (currentSection.primary === '1' && instance) {
        const limitText = this.getReachedLimit(currentSection, instance)
        if (limitText) {
          content = this.$t(
            'After proceeding, you will lose your current mobile connection. The selected SIM will be activated, but since SIM switch is enabled and %s have been reached, it may automatically switch to the next SIM.'.format(
              limitText
            )
          )
        }
      }

      return this.$prompt.show({
        title: this.$t('Make default SIM active?'),
        content,
        okText: this.$t('Proceed'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.makeActive()
        }
      })
    },
    makeActive() {
      this.$spin(this.$t('Changing active SIM'))
      return this.$axios
        .post(`/api/modems/${this.sectionModem.id}/actions/restart_connection`)
        .then(() => {
          this.$message.success(this.$t('Active SIM has been changed'))
        })
        .catch(err => {
          const error = err?.response?.data?.errors?.[0]?.code
          const errorMessages = {
            2: this.$t('Failed to change active SIM, modem not found'),
            4: this.$t('Failed to change active SIM, modem not ready'),
            default: this.$t('Failed to change active SIM')
          }
          this.$message.error(errorMessages[error] || errorMessages.default)
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    makeDefaultPrompt(currentSection) {
      const hasEnabledSimSwitch = this.switchInstances.some(s => s.enabled === '1')
      const hasDisabledCurrSimInstance = this.switchInstances.find(s => s.position === currentSection.position && s.esim_profile === currentSection.esim_profile && s.enabled === '0')

      const simLabel = this.$mobile.getSimLabel(currentSection.position, currentSection.esim_profile, this.sectionModem.id)
      let title = this.$t('Make SIM%s default SIM?').format(simLabel)
      let content = this.$t('After proceeding, you will lose current mobile connection. Connection will be reestablished with this SIM.')

      if (hasEnabledSimSwitch && hasDisabledCurrSimInstance) {
        title = this.$t('Changing default SIM to SIM%s will prevent SIM switch from being executed').format(simLabel)
        const link = h('a', { class: 'tlt-link mx-1', href: '/network/mobile/sim_switch' }, this.$t('SIM switch'))
        content = () => h('p', { class: 'flex-wrap' }, [this.$t('Go to'), link, this.$t('to adjust instance accordingly.')])
      }
      return this.$prompt.show({
        title,
        content,
        okText: this.$t('Proceed'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.makeDefault(simLabel, currentSection.id)
        }
      })
    },
    makeDefault(simLabel, sectionId) {
      this.$spin(this.$t('Changing default SIM'))
      return this.$axios
        .put(`/api/sim_cards/config/${sectionId}`, { data: { primary: '1' } })
        .then(() => {
          this.$message.success(this.$t('Default SIM has been changed to SIM%s').format(simLabel))
          this.formData.simcards?.forEach(sim => {
            if (sim.id === sectionId) sim.primary = '1'
            else sim.primary = '0'
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to change default SIM'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    checkActiveSim(sim) {
      const checkEsim = !sim.esim_profile || this.sectionModem.esim_profile === sim.esim_profile
      return this.sectionModem.active_sim === Number(sim.position) && checkEsim
    },
    hintInfo(section) {
      const toLowerCase = string => {
        return string === this.$t('N/A') ? this.$t('N/A') : string[0].toLowerCase() + string.slice(1)
      }
      const esimCheck = !section?.esim_profile || this.sectionModem.esim_profile === section?.esim_profile
      const activeSim = this.sectionModem.active_sim === parseInt(section?.position) && esimCheck
      let simState = this.$t('N/A')
      if (activeSim) {
        simState = toLowerCase(this.$mobile.getSimstate(this.sectionModem, true))
      } else if (!this.sectionModem.offline) simState = this.$t('not active SIM')

      const hints = [
        {
          id: 'sim_state',
          title: this.$mobile.getSimstateLabel(this.sectionModem),
          value: simState
        }
      ]
      if (this.checkActiveSim(section)) {
        hints.push(
          {
            id: 'operator',
            title: this.$t('Operator'),
            value: this.sectionModem.operator || this.$t('N/A')
          },
          {
            id: 'operator_state',
            title: this.$t('Operator state'),
            value: toLowerCase(this.$mobile.getOperatorState(this.sectionModem.operator_state))
          },
          {
            id: 'network_type',
            title: this.$t('Network type'),
            value: this.sectionModem.conntype ? toLowerCase(this.$mobile.getConntype(this.sectionModem.conntype)) : this.$t('N/A')
          },
          {
            id: 'data_connection_state',
            title: this.$t('Data connection state'),
            value: this.sectionModem.data_conn_state ? toLowerCase(this.$mobile.getDataConnState(this.sectionModem.data_conn_state)) : { value: this.$t('N/A') }
          }
        )
      }
      return hints
    },
    simRequiresAction(section) {
      if (!this.checkActiveSim(section)) return false
      const simText = this.$mobile.getSimLabel(section.position, section.esim_profile, this.sectionModem.id)
      return this.$mobile.getPinPukMessage(this.sectionModem, simText).message
    },
    onAfterSave(_, res) {
      const idx = this.initialIfaces.findIndex(s => s.id === res.data.id)
      this.initialIfaces[idx] = res.data
    }
  }
}
</script>
