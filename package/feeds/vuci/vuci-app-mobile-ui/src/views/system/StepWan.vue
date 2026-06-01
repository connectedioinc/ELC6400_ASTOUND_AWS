<template>
  <vuci-form
    ref="form"
    v-model="formData"
    config="network;simcard"
    :after-load="afterLoad"
    bulk-request
  >
    <template #default="{ uciData }">
      <template
        v-for="(iface, idx) in mobileInterfaces"
        :key="iface.id"
      >
        <tlt-card :title="$t('Mobile configuration%s').format(modemSimText(iface))">
          <div v-if="Object.keys(iface).length === 0">
            {{ $t('No mobile interfaces available') }}
          </div>
          <template v-else>
            <template v-if="bootstrapAvailable && idx === 0">
              <tlt-inline-message
                id="bootstrap-msg"
                type="info"
              >
                {{ bootstrapMsg(iface) }}
              </tlt-inline-message>
              <tlt-form-model-item>
                <tlt-button
                  id="switch-sim"
                  button-id="switch-sim"
                  :readonly="disableDownload"
                  @click="switchPrompt(iface.modem, iface.esim_profile)"
                >
                  {{ iface.esim_profile ? $t('Switch to SIM') : $t('Switch to eSIM') }}
                </tlt-button>
                <tlt-tooltip
                  v-if="disableDownload"
                  target="#switch-sim"
                >
                  {{ downloadInProgress }}
                </tlt-tooltip>
              </tlt-form-model-item>
            </template>
            <mobile-statuses
              :modem-status="modems.find(modem => modem.id === iface.modem) || {}"
              :sim-section="findSimSection(iface)"
            />
          </template>
          <vuci-named-section
            v-slot="{ s }"
            class="mb-6"
            :uci-data="uciData"
            :endpoints="[
              {
                endpoint: 'sim_cards/config',
                sectionFilter: sections => sections.find(section => section.modem === iface.modem && section.position === iface.sim)
              }
            ]"
            data-key="simcards"
            :visible="Object.keys(iface).length > 0 && !haveBootstrap(iface, idx)"
          >
            <vuci-form-item-input
              :uci-section="s"
              label="PIN"
              name="pincode"
              :help="$t('A PIN made out of numbers between 4 and 8 symbols is accepted.')"
              rules="pincode"
            />
          </vuci-named-section>
        </tlt-card>
        <mobile-profile-download
          v-if="haveBootstrap(iface, idx)"
          :profiles="esimData"
          :modem-id="iface.modem"
          :download-btn="downloadStatus"
          @disable-download="disableDownload = true"
        />
        <tlt-card
          v-show="!haveBootstrap(iface, idx) && Object.keys(iface).length !== 0"
          :title="$t('Interface %s APN configuration').format(iface.id)"
        >
          <tlt-inline-message
            v-show="iface.modemOffline"
            id="modem-offline-message"
            type="warning"
            :message="$t(`Interface can't be edited because modem is blocked or disabled`)"
          />
          <vuci-named-section
            v-slot="{ s }"
            :uci-data="uciData"
            :endpoints="[{ endpoint: 'interfaces/config' }]"
            data-key="interfaces"
            :name="iface.id"
            :visible="!iface.modemOffline && Object.keys(iface).length > 0"
            :exception-options="['apn', 'force_apn']"
          >
            <mobile-fields
              :uci-data="uciData"
              :s="s"
              :initial-apn="iface.apn || ''"
              :sim-cards="formData.simcards"
              :modem-options="modemOptions"
              :interface-apns="filterModemApnList(s)"
              :initial-interfaces="formData.interfaces"
            />
          </vuci-named-section>
        </tlt-card>
      </template>
    </template>
    <template #form-buttons="{ save }">
      <setup-wizard-steps :save="save" />
    </template>
  </vuci-form>
</template>

<script>
import MobileFields from '@/components/network/MobileFields'
import MobileStatuses from '../../components/network/MobileStatuses'
import MobileProfileDownload from '../../components/network/MobileProfileDownload'
import SetupWizardSteps from '@/components/system/SetupWizardSteps.vue'

export default {
  components: {
    MobileFields,
    MobileStatuses,
    MobileProfileDownload,
    SetupWizardSteps
  },
  data() {
    return {
      formData: {
        interfaces: [],
        simcards: []
      },
      /** @type {import('@/types/networkTypes').InterfaceStatus[]} */
      statuses: [],
      modems: [],
      apns: [],
      disableDownload: false,
      esimData: [],
      esimStatus: [],
      simSwitchData: [],
      initialModems: [],
      bootstrapAvailable: false,
      profileDownloaded: false,
      downloadInProgress: this.$t('eSIM profile download in progress')
    }
  },
  computed: {
    modemOptions() {
      return this.$mobile.modemsOptions(this.modems)
    },
    mobileInterfaces() {
      const ifaces = []
      this.initialModems.forEach((modem, idx) => {
        const currentModem = this.modems.find(m => m.id === modem.id)
        const section = this.formData.interfaces.find(
          s => ['wwan', 'connm'].includes(s.proto) && (modem.id === s.modem || modem.id === s.modem_id) && modem.sim === s.sim && (!modem.esim_profile || modem.esim_profile === s.esim_profile)
        )
        if (section) ifaces.push({ id: section.id, modem: modem.id, sim: section.sim, esim_profile: section.esim_profile, apn: section.apn, modemOffline: this.$mobile.modemOffline(currentModem) })
        else if (this.$mobile.modemOffline(currentModem)) {
          const sim = this.formData.simcards.find(sim => sim.modem === modem.id && sim.primary === '1')
          if (sim) {
            ifaces.push({
              sim: sim.position,
              esim_profile: sim.esim_profile,
              modem: modem.id,
              modemOffline: true
            })
            this.initialModems[idx].sim = sim.position
            this.initialModems[idx].esim_profile = sim.esim_profile
          }
        }
      })
      return ifaces.length > 0 ? ifaces : [{}]
    },
    networkConnectionAvailable() {
      return this.statuses.some(s => s.area_type === 'wan' && s.is_up)
    },
    downloadStatus() {
      const modem = this.modems[0]
      const iface = this.mobileInterfaces[0]
      if (modem && iface && modem?.active_sim !== Number(iface?.sim)) {
        return { text: this.$t('Download'), hint: this.$t('Please wait until SIM switch is completed'), disabled: true, loading: false }
      }
      if (this.disableDownload) {
        return { text: this.$t('Downloading'), hint: '', disabled: true, loading: true }
      }
      if (!this.networkConnectionAvailable) {
        return { text: this.$t('Download'), hint: this.$t('Internet connection required to download profile'), disabled: true, loading: false }
      }
      return { text: this.$t('Download'), hint: '', disabled: false, loading: false }
    }
  },
  mounted() {
    this.$bus.on('esim_profile_status', this.profileEvent)
  },
  beforeUnmount() {
    this.$bus.off('esim_profile_status', this.profileEvent)
  },
  methods: {
    profileEvent(data) {
      if (data.event_id === 6 && data.status !== 14) {
        if (data.status !== 0) {
          this.disableDownload = false
          return this.$message.error(this.$mobile.getFailedEsimMessage(data.status))
        }
        this.profileDownloaded = true
        this.checkEsimStatus(true)
      } else if (data.event_id === 103) {
        this.profileDownloaded = true
        this.checkEsimStatus(true, true)
      }
    },
    haveBootstrap(iface, idx) {
      return this.bootstrapAvailable && iface.esim_profile && idx === 0
    },
    bootstrapMsg(iface) {
      return this.$t('Bootstrap eSIM profile detected. This profile provides limited mobile connectivity, intended only for downloading a new eSIM profile. %s').format(
        iface.esim_profile ? this.$t('Currently eSIM is active. If you want to use a physical SIM instead, please switch to it.') : this.$t('Please switch to eSIM to proceed with the download.')
      )
    },
    filterModemApnList(section) {
      return this.apns.find(apnList => apnList.modem === section.modem)?.apns || []
    },
    findSimSection(iface) {
      return this.formData.simcards?.find(sim => sim.modem === iface.modem && sim.position === iface.sim && sim.esim_profile === iface.esim_profile) || {}
    },
    modemSimText(iface) {
      const modem = this.modems.find(modem => modem?.id === iface.modem)
      if (!modem) return ''
      const simText = modem.sim_count > 1 ? ` (SIM${this.$mobile.getSimLabel(iface.sim, iface.esim_profile, modem.id, true)})` : ''
      const modemName = this.$mobile.shouldShowModemName(modem) ? ` (${modem.name})` : ''
      return `${simText}${modemName}`
    },
    afterLoad() {
      return this.$axios
        .bulkGet([
          '/api/interfaces/basic/status',
          {
            endpoint: '/api/modems/status',
            condition: 'mobifd.control'
          },
          {
            endpoint: '/api/modems/apns/status',
            condition: 'mobifd.control'
          },
          {
            endpoint: '/api/esim/config',
            condition: !!this.$store.board?.hwinfo?.esim
          },
          {
            endpoint: '/api/esim/status',
            condition: !!this.$store.board?.hwinfo?.esim
          },
          {
            endpoint: '/api/sim_switch/config',
            condition: 'sim_switch.control'
          }
        ])
        .then(([statusesData, modemData, apns, esimData, esimStatus, simSwitchData]) => {
          if (statusesData.success) this.statuses = statusesData.data
          else this.$message.error(this.$t('Failed to load interfaces status'))
          if (esimData.success) this.esimData = esimData.data
          else this.$message.error(this.$t('Failed to load eSIM profiles'))
          if (modemData.success) {
            this.modems = this.$mobile.parseModems(modemData.data)
            this.initialModems = this.modems.map(modem => ({
              id: modem.id,
              sim: modem.active_sim?.toString() || '1',
              esim_profile: modem.esim_profile
            }))
            this.bootstrapAvailable = this.modems.some(m => m.esim_bootstrap) || this.esimData.some(e => e.bootstrap === '1')
          } else this.$message.error(this.$t('Failed to load modem data'))
          if (apns.success) this.apns = apns.data
          else this.$message.error(this.$t('Failed to load APN list'))
          if (esimStatus.success) {
            this.esimStatus = esimStatus.data
            this.checkEsimStatus()
          } else this.$message.error(this.$t('Failed to load eSIM status'))
          if (simSwitchData.success) this.simSwitchData = simSwitchData.data
          else this.$message.error(this.$t('Failed to load SIM switch data'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$timer.start({ method: this.updateData, time: 3000, autostart: true, immediate: true })
        })
    },
    updateData() {
      return this.$axios
        .bulkGet([
          '/api/interfaces/basic/status',
          {
            endpoint: '/api/modems/status',
            condition: 'mobifd.control'
          },
          {
            endpoint: '/api/esim/status',
            condition: !!this.$store.board?.hwinfo?.esim
          }
        ])
        .then(([statusesData, modemStatus, esimStatus]) => {
          if (statusesData.success) this.statuses = statusesData.data
          else this.$message.error(this.$t('Failed to load interfaces status'))
          if (modemStatus.success) this.modems = this.$mobile.parseModems(modemStatus.data)
          else this.$message.error(this.$t('Failed to load modem status'))
          if (esimStatus.success) {
            this.esimStatus = esimStatus.data
            this.checkEsimStatus()
          } else this.$message.error(this.$t('Failed to load eSIM status'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    checkEsimStatus(spinner, refreshData) {
      if (!this.bootstrapAvailable) return

      const pendingDownload = this.esimStatus.some(s => s.pending_jobs?.includes('DOWNLOAD'))
      const pendingDelete = this.esimStatus.some(s => s.pending_jobs?.includes('DELETE'))
      const showSpinner = () => {
        if (this.$store.spinner.spinning === 0) this.$spin(this.$t('Updating eSIM status'))
      }

      if (pendingDownload) {
        this.disableDownload = true
      } else if (pendingDelete || (spinner && !refreshData)) {
        this.disableDownload = true
        showSpinner()
      } else if (this.profileDownloaded && !pendingDelete) {
        showSpinner()
        if (refreshData) {
          this.disableDownload = false
          this.profileDownloaded = false
          this.bootstrapAvailable = false
          this.formData.simcards = []
          this.formData.interfaces = []
          this.$refs.form.loadData(true).finally(() => {
            this.$spin(false)
            this.$message.success(this.$t('eSIM profile added'))
          })
        }
      }
    },
    switchPrompt(modemId, currentEsim) {
      const title = this.$t('Switch to %s?').format(currentEsim ? 'SIM' : 'eSIM')
      let content = this.$t('After switch, default SIM will become eSIM and SIM switch rules used for bootstrap profile will be disabled.')
      if (currentEsim) {
        content = this.$t('After switch, default SIM will become physical SIM and SIM switch rules used for bootstrap profile will be enabled.')
      }
      return this.$prompt.show({
        title,
        content,
        okText: this.$t('Proceed'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.changeDefaultSim(modemId, currentEsim)
        }
      })
    },
    changeDefaultSim(modemId, currentEsim) {
      let switchData = this.simSwitchData?.filter(s => s.modem === modemId)?.map(s => ({ id: s.id, enabled: currentEsim ? '1' : '0' })) || []
      const simSection = this.formData.simcards?.find(sim => {
        if (currentEsim) return sim.modem === modemId && sim.position === '1'
        return sim.modem === modemId && sim.esim_profile
      })
      if (!simSection) return this.switchErrorMsg(currentEsim)

      this.$spin()
      return this.$axios
        .bulk([
          {
            method: 'PUT',
            endpoint: '/api/sim_switch/config',
            data: switchData
          },
          {
            method: 'PUT',
            endpoint: `/api/sim_cards/config/${simSection.id}`,
            data: { primary: '1' }
          }
        ])
        .then(() => {
          this.$message.success(currentEsim ? this.$t('Default SIM switched to physical SIM') : this.$t('Default SIM switched to eSIM'))
          this.initialModems[0].sim = simSection.position
          this.initialModems[0].esim_profile = simSection.esim_profile
        })
        .catch(() => {
          this.switchErrorMsg(currentEsim)
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    switchErrorMsg(currentEsim) {
      return this.$message.error(currentEsim ? this.$t('Failed to switch default SIM to eSIM') : this.$t('Failed to switch default SIM to physical SIM'))
    }
  }
}
</script>
