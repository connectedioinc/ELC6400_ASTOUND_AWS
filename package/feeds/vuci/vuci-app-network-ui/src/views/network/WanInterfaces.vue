<template>
  <interface-section
    v-bind="sectionOptions"
    ref="interfaceSection"
    page-type="wan"
  >
    <template #mobile-rows="{ status, config }">
      <template v-if="['wwan', 'connm'].includes(status.proto)">
        <cell-row
          label="APN"
          :value="getApn(config, status)"
        />
        <cell-row
          label="SIM"
          :value="getSimModem(config, status)"
        />
      </template>
    </template>
    <template #enable="{ s, uciData }">
      <cell-row
        class="mb-2 only:mb-0 justify-between"
        :only-mobile-label="!isFailover"
        :label="$t('Enable')"
      >
        <template #value>
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :readonly="modemInUse(s, ifaceSection.formOptions?.modemList)"
            :hints="editHints(s)"
            :save="saveData"
            :show-text="!isFailover"
            @change="self => enableChange(self, s, uciData)"
          />
        </template>
      </cell-row>
      <cell-row
        v-if="isFailover"
        class="justify-between"
        :label="$t('Failover')"
        :class="{ 'invisible h-0 -mt-2': excludedMwan3Configs.includes(s.id) }"
      >
        <template #value>
          <tlt-tooltip
            v-if="!$session.hasAccess('network/failover/mwan', 'write') && isFailover && !excludedMwan3Configs.includes(s.id)"
            :target="`#failover-switch-${s.id}`"
            :content="$t(`No '%s' write access`).format(`${$t('Network')} > ${$t('Failover')} > ${$t('Multiwan')}`)"
          />
          <vuci-form-item-switch
            :id="`failover-switch-${s.id}`"
            :uci-section="mwan3"
            :name="s.id"
            :save="saveData"
            :show-text="false"
            :readonly="!$session.hasAccess('network/failover/mwan', 'write')"
            no-write
          />
        </template>
      </cell-row>
    </template>
    <template #edit="{ s, openEdit }">
      <tlt-hint :hints="editHints(s)">
        <tlt-button
          class="edit-button-margin gap-1!"
          button-id="edit"
          type="text"
          :icon-left="$store.readOnlyPage ? 'password' : 'edit'"
          :disabled="editHints(s).length > 0"
          @click="openEdit(s.id)"
        >
          {{ $store.readOnlyPage ? $t('View') : $t('Edit') }}
        </tlt-button>
      </tlt-hint>
    </template>
  </interface-section>
</template>

<script>
import InterfaceSection from './InterfaceSection'
import commonFunctions from '@/components/network/commonFunctions'
import { copy } from '@ui-core/utils/vue-helpers'

export default {
  components: { InterfaceSection },
  provide() {
    return {
      getModemApnList: this.getModemApnList
    }
  },
  data() {
    return {
      mwan3: {},
      mwan3Global: {},
      excludedMwan3Configs: [],
      simApnOff: [],
      sectionOptions: {
        sectionConfig: {
          title: this.$t('WAN interfaces'),
          afterDelete: this.afterDelete,
          afterSave: this.afterSave
        },
        formConfig: {
          beforeSave: this.beforeSave
        },
        additionalExtraEndpoints: [
          {
            endpoint: '/api/modems/status',
            condition: 'mobifd.control'
          },
          {
            endpoint: '/api/failover/interfaces/config',
            condition: this.$session.hasAccess('network/failover/mwan', 'read') ? '/mwan3.control' : false
          },
          {
            endpoint: '/api/failover/mode/config/globals',
            condition: this.$session.hasAccess('network/failover/mwan', 'read') ? '/mwan3.control' : false
          }
        ],
        additionalExtraLoad: this.additionalExtraLoad,
        additionalAfterEndpoints: [
          {
            endpoint: '/api/sim_cards/config',
            condition: 'mobifd.control'
          },
          '/api/date_time/ntp/client/config',
          {
            endpoint: '/api/modems/apns/status',
            condition: 'mobifd.control'
          }
        ],
        additionalAfterLoad: this.additionalAfterLoad,
        additionalUpdateEndpoints: [
          {
            endpoint: '/api/modems/apns/status',
            condition: 'mobifd.control'
          },
          {
            endpoint: '/api/modems/status',
            condition: 'mobifd.control'
          },
          {
            endpoint: '/api/data_limit/status',
            condition: ['quota_limit', 'mobifd']
          }
        ],
        additionalUpdateLoad: this.additionalUpdateLoad
      }
    }
  },
  computed: {
    ifaceSection() {
      return this.$refs.interfaceSection
    },
    isFailover() {
      return this.mwan3Global.mode === 'mwan'
    }
  },
  methods: {
    modemInUse: commonFunctions.modemInUse,
    additionalExtraLoad(form, formOptions, [mobileStatusRes, mwan3Res, mwan3globalRes]) {
      if (!mobileStatusRes.success) this.$message.error(this.$t('Failed to load modem data'))
      else formOptions.modemList = this.$mobile.parseModems(mobileStatusRes.data)
      if (!mwan3Res.success) this.$message.error(this.$t('Failed to load mwan3 data'))
      else {
        this.excludedMwan3Configs = form.interfaces.map(iface => iface.id).filter(ifaceId => !mwan3Res.data.find(mwan => mwan.id === ifaceId))
        mwan3Res.data.forEach(mwan => (this.mwan3[mwan.id] = mwan.enabled))
      }
      if (!mwan3globalRes.success) this.$message.error(this.$t('Failed to load mwan3 global data'))
      this.mwan3Global = mwan3globalRes.data
    },
    additionalAfterLoad(form, formOptions, [simcards, ntp, apns]) {
      if (!apns.success) this.$message.error(this.$t('Failed to load APN list'))
      else formOptions.apns = apns.data

      if (!simcards.success) this.$message.error(this.$t('Failed to load SIM cards data'))
      else formOptions.simcards = simcards.data

      if (!ntp.success) this.$message.error(this.$t('Failed to load ntp data'))
      else formOptions.ntpInfo = ntp.data[0]

      form.interfaces.forEach((iface, index) => {
        iface.metric = iface.metric || (index + 1).toString()
      })
    },
    additionalUpdateLoad(formOptions, [apns, mobileStatusRes, dataLimit]) {
      if (!apns.success) this.$message.error(this.$t('Failed to load APN list'))
      else formOptions.apns = apns.data
      if (!mobileStatusRes.success) this.$message.error(this.$t('Failed to load modem data'))
      else formOptions.modemList = this.$mobile.parseModems(mobileStatusRes.data)
      if (!dataLimit.success) this.$message.error(this.$t('Failed to load data limit status'))
      else formOptions.dataLimit = dataLimit.data
    },
    afterSave() {
      if (!this.isFailover || !this.$session.hasAccess('network/failover/mwan', 'write')) return Promise.resolve()
      this.$spin()
      this.mwan3Data = Object.entries(this.mwan3)
        .filter(([id]) => !this.excludedMwan3Configs.includes(id) && this.ifaceSection.formData.interfaces.some(iface => iface.id === id))
        .map(([id, enabled]) => ({ id, enabled }))
      return this.$axios
        .put('/api/failover/interfaces/config', { data: this.mwan3Data })
        .catch(() => {
          this.$message.error(this.$t('Failed to change failover options'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    // Remove auto apn validation logic with #10358 issue refactor
    beforeSave() {
      return new Promise((resolve, reject) => {
        this.$spin(true)
        return this.$axios
          .get('/api/modems/status', { condition: 'mobifd.control' })
          .then(res => {
            this.ifaceSection.formOptions.modemList = this.$mobile.parseModems(res.data)
            // Remove auto apn validation logic with #10358 issue refactor
            this.simApnOff = []
            for (const iface of this.ifaceSection.formData.interfaces) {
              const apnValidation = commonFunctions.validateDuplicateApns(
                iface,
                this.ifaceSection.formData.interfaces,
                this.ifaceSection.formOptions.interfaceStatus,
                this.getModemApnList(iface.modem)
              )
              if (!apnValidation.isValid) {
                return reject(apnValidation.message)
              }
              const sections = this.sameSimModemSections(iface)
              const moreThanOne = sections?.length > 1
              const atleastOneWithAutoAPN = sections.some(s => s.auto_apn === '1')
              const modemSim = `${iface.modem}_${iface.sim}_${iface.esim_profile}`
              if (moreThanOne && atleastOneWithAutoAPN) {
                if (!this.simApnOff.includes(modemSim)) this.simApnOff.push(modemSim)
              } else {
                this.simApnOff = this.simApnOff.filter(s => s !== modemSim)
              }
            }
            if (this.simApnOff.length === 0) return resolve(true)

            const titles = this.simApnOff
              .map(s => {
                let [offModem, offSim, offeSim] = s.split('_')
                if (offeSim === 'undefined') offeSim = undefined
                const modem = this.ifaceSection.formOptions.modemList?.find(modem => modem.id === offModem)
                const simText = 'SIM%s'.format(this.$mobile.getSimLabel(offSim, offeSim, offModem))
                return this.$mobile.shouldShowModemName(modem) ? '%s %s'.format(modem.name, simText) : simText
              })
              .join(', ')
            this.$spin(false)
            return this.$prompt.show({
              title: this.$t('Turn off Auto APN for all %s interfaces?').format(titles),
              content: this.$t('For multi APN to work correctly it needs all interfaces with same SIM to have Auto APN disabled.'),
              okText: this.$t('Yes'),
              cancelText: this.$t('Cancel'),
              onOk: () => {
                this.$spin(true)
                const showError = this.updateAutoApn()
                if (showError) reject(showError)
                resolve(true)
              }
            })
          })
          .catch(() => {
            reject(this.$t('Failed to load modem data'))
          })
          .finally(() => {
            this.$spin(false)
          })
      })
    },
    updateAutoApn() {
      let showError = false
      const interfacesCopy = copy(this.ifaceSection.formData.interfaces)
      for (const iface of this.ifaceSection.formData.interfaces) {
        for (const offSection of this.simApnOff) {
          let [offModem, offSim, offeSim] = offSection.split('_')
          if (offeSim === 'undefined') offeSim = undefined
          if (iface.modem === offModem && iface.sim === offSim && iface.esim_profile === offeSim) {
            iface.auto_apn = '0'
            const apnValidation = commonFunctions.validateDuplicateApns(iface, this.ifaceSection.formData.interfaces, this.ifaceSection.formOptions.interfaceStatus, this.getModemApnList(iface.modem))
            if (!apnValidation.isValid) {
              showError = apnValidation.message
              break
            }
          }
        }
      }
      if (showError) this.ifaceSection.formData.interfaces = interfacesCopy
      return showError
    },
    getApn(ifaceConfig, ifaceStatus) {
      if (!ifaceStatus?.sim || this.modemInUse(ifaceConfig, this.ifaceSection.formOptions.modemList)) return '-'
      if (ifaceConfig.auto_apn === '1') {
        return `${this.$t('Auto')}${ifaceStatus.apn ? ` (${ifaceStatus.apn})` : ''}`
      } else if (ifaceConfig.force_apn && ifaceConfig.force_apn !== '-1') {
        return this.getModemApnList(ifaceStatus.modem_id).find(s => s.id === parseInt(ifaceConfig.force_apn))?.apn || ifaceStatus.apn || '-'
      } else return ifaceStatus.apn || '-'
    },
    getSimModem(ifaceConfig, ifaceStatus) {
      let modem = this.ifaceSection.formOptions.modemList.find(modem => modem.id === ifaceStatus.modem_id)
      if (!modem) modem = { builtin: false, name: this.$t('External modem') }
      return this.$mobile.getSimModemLabel(modem, ifaceStatus?.sim, ifaceConfig.esim_profile)
    },
    getModemApnList(modemId) {
      return this.ifaceSection.formOptions.apns?.find(apnList => apnList.modem === modemId)?.apns || []
    },
    enableChange(self, section, uciData) {
      if (!['wwan', 'connm'].includes(section.proto)) return
      const modemValidation = commonFunctions.checkForSingleInterfaceModem(section, uciData.interfaces, this.ifaceSection.formOptions.modemList)
      if (!modemValidation.isValid) {
        this.$message.error(modemValidation.message)
        self.model = '0'
      }
      const apnValidation = commonFunctions.validateDuplicateApns(section, uciData.interfaces, this.ifaceSection.formOptions.interfaceStatus, this.getModemApnList(section.modem))
      if (!apnValidation.isValid) {
        this.$message.error(apnValidation.message)
        self.model = '0'
      }
    },
    sameSimModemSections(section) {
      return this.ifaceSection.formData.interfaces.filter(s => s.enabled === '1' && s.modem === section.modem && s.sim === section.sim && s.esim_profile === section.esim_profile)
    },
    saveData(_, data) {
      if (this.modemInUse(data, this.ifaceSection.formOptions.modemList)) delete data.enabled
      return data.enabled
    },
    editHints(s) {
      const hints = []
      if (this.modemInUse(s, this.ifaceSection.formOptions.modemList)) hints.push({ info: this.$t("This instance can't be edited because modem is blocked or disabled") })
      return hints
    },
    afterDelete(iface) {
      this.mwan3[iface.id] = undefined
    }
  }
}
</script>
