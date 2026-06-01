<template>
  <vuci-named-section
    v-slot="{ s }"
    :endpoints="[{ endpoint }]"
    :data-key="dataKey"
    :uci-data="uciData"
    :name="section.id"
    :title="title"
    :help="help"
    :error-handlers="{ edit: getHandleError }"
  >
    <tlt-tabs :tabs="tabs">
      <template #general>
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enable')"
          :help="$t('Turns the rule on or off.')"
          @change="validateEnableIO"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="action"
          :label="$t('Action')"
          :help="$t('The action to be performed when a rule is met.')"
          :options="getTranslatedActions(mobileUtilitiesOptions.actions)"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="modem_id"
          :label="$t('Receiving modem')"
          :help="$t('Modem, which is used to receive the %s.').format(isSmsView ? $t('message') : $t('call'))"
          :options="receivingModem"
          :depend="modems.length > 1"
          :disabled-options="disabledReceivingModem"
        />

        <slot
          name="io"
          :s="s"
        />

        <component
          v-bind="stateProps"
          :is="stateType"
          :uci-section="s"
          name="value"
          :label="$t('State')"
        />

        <slot
          name="smsText"
          :s="s"
        />

        <vuci-form-item-switch
          v-if="isSmsView"
          :uci-section="s"
          name="respond"
          :label="$t('Send response SMS')"
          :help="$t('Enable the sending of action response via SMS message.')"
          :depend="getActionDepends('respond', s.action)"
          initial="1"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="status_sms"
          :label="$t('Get status via SMS after reboot')"
          :help="
            $t('Turn on if you wish to receive an SMS message about the device\'s status after it is rebooted using the rule (you will not receive messages when it is rebooted using other methods).')
          "
          :depend="s.action === 'reboot'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="timeout"
          :label="$t('Active timeout')"
          :help="$t('Rule active for a specified time.')"
          :depend="getActionDepends('timeout', s.action)"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="seconds"
          :label="$t('Seconds')"
          :help="$t('Rule active for a specified time, format seconds.')"
          :rules="['range(1,999999)', 'uinteger']"
          initial="5"
          placeholder="5"
          :depend="s.timeout === '1'"
          :required="s.enabled === '1' && s.timeout === '1'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="write_config"
          :label="$t('Write to config')"
          :help="$t('Indicates whether the changes will be written to config.')"
          :depend="['dout', 'relay', 'io_set'].includes(s.action)"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="write_wifi"
          :label="$t('Write to config')"
          :help="
            $t(
              'Indicates whether the action should save the changed wireless state permanently by writing a new value into the wireless configuration. When turned off, the rule will switch the state temporarily meaning that WiFi will return to its previous state if the device or the wireless service restarts.'
            )
          "
          :depend="s.action === 'wifi'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="write_mobile"
          :label="$t('Write to config')"
          :help="$t('Permanently save mobile network state to configuration.')"
          :depend="s.action === 'mobile'"
        />
        <vuci-form-item-switch
          v-if="isSmsView"
          :uci-section="s"
          name="write_esim"
          :label="$t('Write to config')"
          :help="$t('Save eSIM profile change to configuration. When turned off, the profile will be changed only until the mobile service restarts or the device is rebooted.')"
          :depend="s.action === 'esim_change'"
        />
        <vuci-form-item-switch
          v-if="isSmsView"
          :uci-section="s"
          name="to_other_phone"
          :label="$t('Message forwarding')"
          :help="$t('If checked, command response will be sent to specified numbers.')"
          :depend="
            ['reboot', 'send_status', 'vpnstatus', 'list_of_profile', 'monitoring_status', 'iostatus', 'uci', 'rms_status', 'gps_coordinates', 'exec'].includes(s.action) || s.status_sms === '1'
          "
        />

        <slot
          name="phoneNumber"
          :s="s"
        />

        <vuci-form-item-select
          v-bind="infoModemProps"
          :uci-section="s"
          name="info_modem_id"
          :label="$t('Modem')"
          :options="modems"
          :depend="modems.length > 1 && (['send_status', 'change_mobile_settings', 'switch_sim', 'mobile', 'esim_list', 'esim_change', 'esim_install'].includes(s.action) || s.status_sms === '1')"
        />
        <vuci-form-item-select
          v-bind="sendModemProps"
          :uci-section="s"
          name="send_modem_id"
          :label="$t('Gateway modem')"
          :help="$t('Modem, which is used to send information from.')"
          :options="modems"
          :disabled-options="disabledModems"
        />
        <vuci-form-item-text-area
          v-bind="messageProps"
          :uci-section="s"
          name="message"
          :label="$t('Message text')"
          :help="
            $t(
              'Compose the contents of the \'status\' message. Use the helpers found below this field if you wish to include more router information. e.g., if you include the code %ss in the text, it will be replaced with the router\'s current signal strength value when the message is sent to the recipient(s).'
            )
          "
          :placeholder="messagePlaceholder"
          :rules="validateSms"
          :initial="textBoxPlaceholder"
          :required="s.enabled === '1'"
        />
        <vuci-form-item-dummy
          v-bind="messageProps"
          :uci-section="s"
          name="message_count"
          label=" "
          :display-value="() => getSmsCharacters(s.message || '')"
          no-write
        />
        <template v-if="messageProps.depend">
          <tlt-form-accordion
            name="parameter-list"
            :title="$t('text message parameter list')"
          >
            <tlt-form-model-item>
              <t-parameters class="w-full">
                <strong>{{ $t('Text message parameter list') }}:</strong>
                <t-parameters-list>
                  <t-parameters-list-item
                    v-for="param in formattedParameters"
                    :key="param.parameter"
                    v-bind="param"
                  />
                </t-parameters-list>
              </t-parameters>
            </tlt-form-model-item>
          </tlt-form-accordion>
        </template>

        <slot
          name="general"
          :s="s"
        />
      </template>
      <template #auth>
        <slot
          name="auth"
          :s="s"
        />
      </template>
    </tlt-tabs>
  </vuci-named-section>
</template>
<script setup lang="ts">
import { useMessageValidation } from '@/composables/useMessageValidation'
import { getAllParameters } from '@/utils/message-parameters'
import { useMobileUtilitiesUtils } from '@/composables/useMobileUtilities'
import { useTranslate } from '@ui-core/composables/useI18n'
import { type Ref, computed, ref, inject } from 'vue'
import { mobile } from '@/plugins/mobile'
import type { SmsUtilitiesSection, CallUtilitiesSection, MobileUtilitiesOptions, UciDataMap } from '@/types/mobileUtilitiesTypes'
import type { Io } from '@/types/ioTypes'

interface MobileUtilitiesEditSectionProps {
  uciData: UciDataMap
  section: SmsUtilitiesSection | CallUtilitiesSection
  endpoint: string
  title: string
  help: string
  dataKey: 'sms_utilities' | 'call_utilities'
}

const props = defineProps<MobileUtilitiesEditSectionProps>()

const mobileUtilitiesOptions = inject<Ref<MobileUtilitiesOptions>>('mobileUtilitiesOptions') || ref({ actions: [], ios: [], parameters: [], mobileModems: [] })
const isSmsView = inject<boolean>('isSmsView') || false

const { gpios, relays, getTranslatedActions, validateEnableIO } = useMobileUtilitiesUtils(isSmsView)
const { validateSms, getSmsCharacters } = useMessageValidation()

const $t = useTranslate()

const tabs = [
  { name: 'general', title: $t('General') },
  { name: 'auth', title: $t('Authorization') }
]

const textBoxPlaceholder = $t('Router name - %rn; WAN IPv4 - %wi; Data Connection state - %cs; Network type - %ct; Signal strength - %ss;')

const actionDepends = {
  stateType: ['mobile', 'wifi', 'vpn', 'gps', 'rms_action', 'dout'],
  stateProps: ['wifi', 'mobile', 'dout', 'relay', 'vpn', 'rms_action', 'gps', 'io_set'],
  message: ['send_status', 'iostatus'],
  gateway: ['send_status', 'vpnstatus', 'list_of_profile', 'monitoring_status', 'iostatus', 'uci', 'gps_coordinates', 'data_limit', 'rms_status', 'more', 'ip_unblock', 'wol'],
  timeout: ['dout', 'relay', 'io_set'],
  respond: [
    'reboot',
    'mobile',
    'change_mobile_settings',
    'reset_conn',
    'vpn',
    'change_profile',
    'ssh_access',
    'web_access',
    'ip_unblock',
    'firstboot',
    'userdefaults',
    'fw_upgrade',
    'uci',
    'rms_action',
    'exec',
    'config_reload',
    'api',
    'io_set',
    'switch_sim',
    'wol',
    'data_usage_reset',
    'wifi',
    'esim_change',
    'esim_install',
    'rms_connect',
    'gps'
  ]
}

const ioHints = computed(() => {
  return mobileUtilitiesOptions.value?.ios?.map(io => `${io.name_with_pins} - %${io.io_param}`) || []
})

const gpioDepends = computed(() => {
  return props.section.action === 'io_set' && gpios.value.some((output: Io) => output.id === props.section.io)
})

const relayDepends = computed(() => {
  return props.section.action === 'relay' || (props.section.action === 'io_set' && relays.value.some((relay: Io) => relay.id === props.section.io))
})

const stateType = computed(() => {
  if (getActionDepends('stateType', props.section.action)) return 'vuci-form-item-switch'
  return 'vuci-form-item-select'
})

const stateProps = computed(() => {
  if (relayDepends.value) {
    return {
      help: $t('State of the relay.'),
      options: [
        ['0', $t('Closed')],
        ['1', $t('Open')]
      ]
    }
  } else if (gpioDepends.value) {
    return {
      help: $t('State of the I/O.'),
      options: [
        ['0', $t('Low')],
        ['1', $t('High')]
      ]
    }
  }
  return {
    help: $t('State of the rule. It can be turned on or off.'),
    depend: getActionDepends('stateProps', props.section.action)
  }
})

const messagePlaceholder = computed(() => {
  if (props.section.action !== 'iostatus') return textBoxPlaceholder
  return ioHints.value.length >= 2 ? ioHints.value.slice(0, 2).join('; ') : ioHints.value[0]
})

const formattedParameters = computed(() => {
  const parameters = getAllParameters(mobileUtilitiesOptions.value.parameters)
  return parameters.map(params => ({ parameter: `%${params[0]}`, description: params[1] }))
})

const messageProps = computed(() => {
  return isSmsView
    ? { depend: props.section.status_sms === '1' || getActionDepends('message', props.section.action) }
    : { depend: props.section.status_sms === '1' || props.section.action === 'send_status' }
})

const modems = computed(() => {
  return mobile.modemsOptions(mobileUtilitiesOptions.value.mobileModems || [])
})

const disabledModems = computed(() => {
  return mobile.modemsOptions(mobileUtilitiesOptions.value.mobileModems?.filter(modem => modem.mode === 1 || modem.mode === 3) || [])
})

const receivingModem = computed(() => {
  return [['both', $t('Both modems')], ...modems.value]
})

const disabledReceivingModem = computed(() => {
  const disable = mobile.modemsOptions(mobileUtilitiesOptions.value.mobileModems?.filter(modem => /^EC25AFFD/.test(modem.version) || mobile.modemOffline(modem)) || [])
  if (disable.length > 0) {
    disable.push(['both', $t('Both modems')])
  }
  return disable
})

const infoModemProps = computed(() => {
  return {
    help: $t('Modem, which is used to get information from or managed for %s action.').format(isSmsView ? $t('change mobile settings') : $t('switch mobile data')),
    disabledOptions: !isSmsView ? disabledModems.value : []
  }
})

const sendModemProps = computed(() => {
  return {
    depend: modems.value.length > 1 && (props.section.status_sms === '1' || isSmsView ? getActionDepends('gateway', props.section.action) : props.section.action === 'send_status'),
    disabledOptions: !isSmsView ? disabledModems.value : []
  }
})

function getHandleError(error: { data: { errors: { code: number }[] } }) {
  const errCode = error.data.errors[0].code
  const errors = {
    1: $t('Unable to edit "I/O set" rule. Output scheduler is enabled for selected output pin'),
    103: $t('Such sms text already exists'),
    default: $t('An unexpected error occurred')
  }
  return errors[errCode as keyof typeof errors] || errors.default
}

function getActionDepends(key: string, action: string) {
  return actionDepends[key as keyof typeof actionDepends]?.includes(action)
}
</script>
