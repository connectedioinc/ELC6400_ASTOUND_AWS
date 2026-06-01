import { type Ref, type ComponentPublicInstance, ref, computed, inject } from 'vue'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import { mobile } from '@/plugins/mobile'
import { io } from '@/plugins/io'
import { capitalize } from '@ui-core/plugins/helper'
import type { MobileUtilitiesOptions, UtilitiesAction, SmsFormData, CallFormData, SmsUtilitiesSection, CallUtilitiesSection, UtilitiesParameter, UserGroup } from '@/types/mobileUtilitiesTypes'
import type { UCISection } from '@ui-core/types'
import type { Io } from '@/types/ioTypes'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'

export function useMobileUtilitiesUtils(isSmsView = false) {
  const injectedMobileUtilitiesOptions = inject<Ref<MobileUtilitiesOptions>>('mobileUtilitiesOptions') || ref({ ios: [] })

  const $t = useTranslate()
  const message = useMessages()
  const store = useMainStore()

  const mobileUtilitiesOptions: Ref<MobileUtilitiesOptions> = ref({
    actions: [],
    parameters: [],
    userGroups: [],
    schedulerInfo: [],
    mobileModems: [],
    ios: []
  })

  const actionTranslations = ref({
    reboot: $t('Reboot'),
    send_status: computed(() => (isSmsView ? $t('Send status') : $t('Get status'))),
    vpnstatus: $t('OpenVPN status'),
    mobile: $t('Switch mobile data on/off'),
    change_mobile_settings: $t('Change mobile settings'),
    reset_conn: $t('Reset mobile connection'),
    list_of_profile: $t('Get list of profiles'),
    vpn: $t('Manage OpenVPN'),
    change_profile: $t('Change profile'),
    ssh_access: $t('SSH access control'),
    web_access: $t('Web access control'),
    ip_unblock: $t('IP unblock'),
    firstboot: $t('Restore to default'),
    userdefaults: $t('Restore to user defaults'),
    fw_upgrade: $t('FW upgrade from server'),
    monitoring_status: $t('Monitoring status'),
    wifi: $t('Switch WiFi on/off'),
    uci: $t('UCI API'),
    rms_status: $t('RMS status'),
    rms_action: $t('RMS action'),
    rms_connect: $t('RMS connect'),
    more: $t('More'),
    iostatus: $t('I/O status'),
    io_set: $t('Change I/O state'),
    switch_sim: $t('Force SIM switch'),
    gps: $t('GPS control'),
    gps_coordinates: $t('GPS coordinates'),
    wol: $t('Wake on LAN'),
    data_usage_reset: $t('Mobile Data usage reset'),
    data_limit: $t('Mobile Data limit status'),
    exec: $t('Execute custom script'),
    config_reload: $t('Reload config'),
    api: $t('API'),
    dout: $t('Switch digital output on/off'),
    relay: $t('Open/Close relays'),
    esim_list: $t('eSIM list'),
    esim_change: $t('eSIM change'),
    esim_install: $t('eSIM install')
  })

  const gpios = computed(() => {
    return injectedMobileUtilitiesOptions.value?.ios.filter(io => io.type === 'gpio' && (io.direction === 'out' || io.bi_dir === '1'))
  })

  const relays = computed(() => {
    return injectedMobileUtilitiesOptions.value?.ios.filter(io => io.type === 'relay')
  })

  function handleDataLoad() {
    const apiRequests = [
      `/api/${isSmsView ? 'sms_utilities' : 'call_utilities'}/rules/options`,
      '/api/recipients/phone_groups/config',
      { endpoint: '/api/io/status', condition: store?.board?.hwinfo?.ios },
      { endpoint: '/api/io/scheduler/config', condition: store?.board?.hwinfo?.ios && store.hasPackages('vuci-app-io-scheduler-api.control') },
      { endpoint: '/api/sim_cards/status' }
    ]
    return axios
      .bulkGet(apiRequests)
      .then(([actionResponse, phoneResponse, ioResponse, ioSchedulerResponse, simCardsResponse]) => {
        if (!actionResponse.success) message.error($t('Failed to load SMS actions'))
        if (!phoneResponse.success) message.error($t('Failed to load phone groups'))
        if (!ioResponse.success) message.error($t('Failed to load I/O options'))
        if (!ioSchedulerResponse.success) message.error($t('Failed to load I/O scheduler info'))
        if (!simCardsResponse.success) message.error($t('Failed to load SIM card status'))
        else {
          const simCards: UCISection[] = simCardsResponse.data
          if (simCards.some(s => s.sms_limit_enabled === '1')) {
            message.info({
              title: $t('SMS limit is enabled'),
              text: $t('Make sure that you will not exceed the SMS limit when using SMS/Call utilities.')
            })
          }
        }

        let actions: UtilitiesAction[] = [],
          parameters: UtilitiesParameter[] = []
        if (actionResponse.success) {
          parameters = actionResponse.data.params
          actions = actionResponse.data.actions
          actions = store.hasPackages('mdcollectd.control') ? actions : actions.filter((action: UtilitiesAction) => action !== 'data_usage_reset' && action !== 'data_limit')
        }

        let userGroups: UserGroup[] = []
        if (phoneResponse.success) userGroups = phoneResponse.data

        let ios: Io[] = []
        if (ioResponse.success) ios = io.getFilteredPinsInfo(ioResponse.data).filter((io: Io) => filterTypes(io))

        let schedulerInfo: UCISection[] = []
        if (ioSchedulerResponse.success) schedulerInfo = ioSchedulerResponse.data

        mobileUtilitiesOptions.value = {
          actions,
          parameters,
          userGroups,
          schedulerInfo,
          mobileModems: mobile.parseModems(store?.board?.modems),
          ios
        }
      })
      .catch(() => {
        message.error($t('Failed to load option data'))
      })
  }

  function handleInitialDataUpdate(formRef: ComponentPublicInstance<typeof VuciForm> | null, uciData: SmsFormData | CallFormData) {
    if (!formRef) return
    formRef.initialForm = uciData
  }

  function getTranslatedAction(action: UtilitiesAction) {
    return actionTranslations.value?.[action] || capitalize(action.replace(/_/g, ' '))
  }

  function getTranslatedActions(actions: UtilitiesAction[]) {
    return actions?.map(action => [action, getTranslatedAction(action)])
  }

  function filterTypes(io: Io) {
    return ['gpio', 'dwi', 'relay', 'adc', 'acl'].includes(io.type)
  }

  function validateIO(section: SmsUtilitiesSection | CallUtilitiesSection) {
    const { enabled, action, io, pin } = section
    const sectionPinName = isSmsView ? io : pin

    if (
      !sectionPinName ||
      enabled === '0' ||
      (isSmsView && action !== 'io_set') ||
      (!isSmsView && action !== 'dout' && action !== 'relay') ||
      !mobileUtilitiesOptions.value.schedulerInfo.some(section => section.enabled === '1' && section.pin === sectionPinName)
    )
      return null
    return $t('Unable to turn on "%s" rule. Output scheduler rule is enabled for selected output pin').format(isSmsView ? $t('I/O set') : $t('Switch output on/off'))
  }

  function validateEnableIO(self: { uciSection: SmsUtilitiesSection | CallUtilitiesSection; model: string }) {
    const { uciSection: section } = self
    const errorMessageIO = validateIO(section)
    if (errorMessageIO) {
      message.error(errorMessageIO)
      self.model = '0'
    }
  }

  function validateSmsNoSpace(value: string) {
    return {
      isValid: /^[a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.[\]]+$/.test(value),
      message: $t('Following characters are accepted: %s').format('a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.[]')
    }
  }

  function validateSmsTextInstance(value: string, smsSections: SmsUtilitiesSection, filterSelf = (section: SmsUtilitiesSection) => true) {
    const exsitingSmsTexts = smsSections.filter((section: SmsUtilitiesSection) => filterSelf(section)).map((section: SmsUtilitiesSection) => section.smstext)
    return {
      isValid: !exsitingSmsTexts.find((text: string) => text === value),
      message: $t('Such SMS text already exists')
    }
  }

  function handleBeforeSave(section: SmsUtilitiesSection | CallUtilitiesSection) {
    if (section.enabled !== '1') return Promise.resolve()
    const errorMessageIO: string | null = validateIO(section)
    if (errorMessageIO) {
      return Promise.reject(errorMessageIO)
    }
    return Promise.resolve()
  }

  return {
    gpios,
    relays,
    handleDataLoad,
    handleInitialDataUpdate,
    mobileUtilitiesOptions,
    getTranslatedAction,
    getTranslatedActions,
    validateEnableIO,
    validateSmsNoSpace,
    validateSmsTextInstance,
    handleBeforeSave
  }
}
