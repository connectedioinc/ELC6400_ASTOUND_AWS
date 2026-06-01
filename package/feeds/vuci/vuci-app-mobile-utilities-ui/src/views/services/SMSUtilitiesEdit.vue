<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="sms_utils;user_groups"
    :before-save="() => handleBeforeSave(section)"
    editing
  >
    <utilities-edit-section
      :uci-data="uciData"
      :name="section.id"
      :section="section"
      :title="$utils.getModalTitle($t('SMS rule'))"
      :help="$t('This section is used to customize how a \'SMS Rule\' will function. Scroll your mouse pointer over field names in order to see helpful hints.')"
      data-key="sms_utilities"
      endpoint="sms_utilities/rules/config"
      is-sms-edit
    >
      <template #io="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="io"
          :label="$t('I/O')"
          :options="outputs"
          :depend="s.action === 'io_set' && iomanExists"
        />
      </template>
      <template #smsText="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="smstext"
          :label="$t('SMS text')"
          :help="
            $t(
              'Text that will trigger the rule. Enter this text in your message preceded by the selected \'Authorization Method\' (device\'s password, custom password, serial number or nothing if no authorization is selected) and send it to the device in order to trigger the rule. Allowed characters: &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.'
            )
          "
          :rules="[validateSmsNoSpace, (v: string) => validateSmsTextInstance(v, formData.sms_utilities, (section: SmsUtilitiesSection) => section.id !== s.id)]"
          maxlength="160"
          placeholder="sms"
          :required="s.enabled === '1'"
        />
        <ActionHint
          :section="s"
          show-example
        />
      </template>
      <template #phoneNumber="{ s }">
        <vuci-form-item-list
          :uci-section="s"
          name="to_number"
          :label="$t('Phone number(s)')"
          :help="$t('The response message will get forwarded to the specified number(s). Allowed characters: &quot;0-9#*+)&quot;.')"
          rules="phonedigit"
          :depend="
            (['reboot', 'send_status', 'vpnstatus', 'list_of_profile', 'monitoring_status', 'iostatus', 'uci', 'rms_status', 'gps_coordinates', 'exec'].includes(s.action) || s.status_sms === '1') &&
            s.to_other_phone === '1'
          "
          :required="s.enabled === '1'"
        />
      </template>
      <template #general="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Methods')"
          :placeholder="$t('-- All methods are allowed --')"
          :help="$t('Accessible API methods. All methods are allowed if a list is empty.')"
          name="methods"
          :options="methodsOptions"
          :depend="s.action === 'api'"
          multiple
        />
        <vuci-form-item-select
          :uci-section="s"
          name="acl_mode"
          :label="$t('ACL mode')"
          :help="$t('Mode that allows or denies selected API methods.')"
          :depend="s.action === 'api'"
          :options="aclOptions"
          initial="allowed"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="simcard"
          :label="$t('SIM card')"
          :help="$t('SIM card for which mobile data settings will be changed.')"
          :options="mobile.getModemSimCardOptions(store?.board?.modems, s.info_modem_id)"
          :depend="s.action === 'change_mobile_settings' && simCount > 1"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="ssh_access_enabled"
          :label="$t('Enable SSH access')"
          :help="$t('Selects whether the rule should turn SSH access from LAN on or off.')"
          :depend="s.action === 'ssh_access'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="ssh_access_remote"
          :label="$t('Enable remote SSH access')"
          :help="$t('Selects whether the rule should turn SSH access from WAN on or off.')"
          :depend="s.action === 'ssh_access' && s.ssh_access_enabled === '1'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="web_access_enabled"
          :label="$t('Enable HTTP access')"
          :help="$t('Selects whether the rule should turn HTTP access from LAN on or off.')"
          :depend="s.action === 'web_access'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="webs_access_enabled"
          :label="$t('Enable HTTPS access')"
          :help="$t('Possibility to reach the device via HTTPS from LAN (Local Area Network).')"
          :depend="s.action === 'web_access'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="web_access_http"
          :label="$t('Enable remote HTTP access')"
          :help="$t('Selects whether the rule should turn HTTP access from WAN on or off.')"
          :depend="s.action === 'web_access' && s.web_access_enabled === '1'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="web_access_https"
          :label="$t('Enable remote HTTPS access')"
          :help="$t('Selects whether the rule should turn HTTPS access from WAN on or off.')"
          :depend="s.action === 'web_access' && s.webs_access_enabled === '1'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="redirect_https"
          :label="$t('Redirect to HTTPS')"
          :help="$t('Force HTTPS by redirecting HTTP to HTTPS.')"
          :depend="s.action === 'web_access'"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="mac"
          :label="$t('MAC address')"
          :help="$t('MAC address of the device that will be \'woken up\'.')"
          rules="macaddr"
          placeholder="11:22:33:44:55:66"
          :depend="s.action === 'wol'"
          :required="s.enabled === '1'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="status_code"
          :label="$t('Enable status code')"
          :help="$t('Selects whether the status code should be returned via SMS.')"
          :depend="s.action === 'exec'"
        />
        <vuci-form-item-text-area
          :uci-section="s"
          name="script"
          :label="$t('Custom script')"
          :help="$t('Script to be executed.')"
          :initial="$session.group !== 'root' ? '' : '#!/bin/sh\n'"
          :depend="s.action === 'exec'"
          :rules="validateScript"
          :required="s.enabled === '1'"
          :readonly="$session.group !== 'root'"
        >
          <template
            v-if="$session.group !== 'root'"
            #after-content="{ controlRef }"
          >
            <tlt-tooltip
              :target="() => controlRef"
              placement="bottom-start"
              fallback-placements="top-start"
              :content="$t('Current user is unauthorized to edit scripts.')"
            />
          </template>
        </vuci-form-item-text-area>
      </template>
      <template #auth>
        <sms-authorization :s="section" />
      </template>
    </utilities-edit-section>
  </vuci-form>
</template>
<script setup lang="ts">
import UtilitiesEditSection from '@/components/shared/MobileUtilities/MobileUtilitiesEditSection.vue'
import SmsAuthorization from '@/components/shared/MobileUtilities/MobileUtilitiesAuthorization.vue'
import ActionHint from '../../components/services/SmsUtilitiesActionHint.vue'
import { useMobileUtilitiesUtils } from '@/composables/useMobileUtilities'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { mobile } from '@/plugins/mobile'
import { type Ref, inject, ref, computed } from 'vue'
import type { MobileUtilitiesOptions, SmsUtilitiesSection, SmsFormData } from '@/types/mobileUtilitiesTypes'
import type { Io } from '@/types/ioTypes'

interface SMSUtilitiesEditProps {
  section: SmsUtilitiesSection
}

defineProps<SMSUtilitiesEditProps>()

const mobileUtilitiesOptions = inject<Ref<MobileUtilitiesOptions>>('mobileUtilitiesOptions') || ref({ actions: [], mobileModems: [] })

const { gpios, relays, validateSmsNoSpace, validateSmsTextInstance, handleBeforeSave } = useMobileUtilitiesUtils(true)

const $t = useTranslate()
const store = useMainStore()

const formData: Ref<SmsFormData> = ref({ sms_utilities: [] })

const methodsOptions = [
  ['get', $t('GET')],
  ['post', $t('POST')],
  ['put', $t('PUT')],
  ['delete', $t('DELETE')]
]
const aclOptions = [
  ['allowed', $t('Allowed')],
  ['denied', $t('Denied')]
]

const outputs = computed(() => {
  return [
    ...gpios.value.map((output: Io) => [output.id, `${output.io_name} (${output.block_pins.join()})`]),
    ...relays.value.map((output: Io) => [output.id, `${output.io_name} (${output.block_pins.join()})`])
  ]
})
const iomanExists = computed(() => {
  return mobileUtilitiesOptions.value.actions.some(action => action === 'iostatus' || action === 'io_set')
})
const simCount = computed(() => {
  return mobile.simCount(mobileUtilitiesOptions.value.mobileModems)
})

function validateScript(value: string) {
  return {
    isValid: /^#!\/bin\/sh\n/.test(value),
    message: $t('Script must start with "#!/bin/sh" and a new line.')
  }
}
</script>
