<template>
  <vuci-form
    ref="vuciFormRef"
    v-slot="{ uciData }"
    config="call_utils"
    :after-load="handleDataLoad"
    :extra-load="extraLoad"
  >
    <modem-full-control-message />
    <vuci-named-section
      v-slot="{ s }"
      :title="$t('Call utilities')"
      :help="$t('This section provides control over Call Utilities, allowing you to enable or disable them.')"
      :uci-data="uciData"
      data-key="call_enable"
      :endpoints="[{ endpoint: 'call_utilities/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable Call Utilities.')"
        :readonly="isPhoneSettingsEnabled"
        name="enabled"
      />
      <tlt-inline-message
        v-show="isPhoneSettingsEnabled"
        type="warning"
      >
        {{ $t('Call Utility settings are currently disabled. To enable them, first disable the') }}
        <router-link to="/services/mobile_utilities/call_utilities/phone_settings"> {{ $t('Phone Settings') }} </router-link>.
      </tlt-inline-message>
    </vuci-named-section>
    <utilities-overview-section
      :uci-data="uciData"
      :edit-form="markRaw(EditForm)"
      endpoint="call_utilities/rules/config"
      :title="$t('Call rules')"
      :help="
        $t(
          'This section displays rules that execute certain actions when triggered by a phone call. \
            In order to trigger a \'Call Rule\', simply call the router\'s SIM card\'s number from your phone.'
        )
      "
      data-key="call_utilities"
      @update-initial-data="handleInitialDataUpdate(vuciFormRef, uciData)"
    />
    <vuci-named-section
      v-slot="{ s }"
      :title="$t('Incoming calls')"
      :help="$t('This section is used to control how the router will handle incoming calls.')"
      :uci-data="uciData"
      data-key="calls"
      :endpoints="[{ endpoint: 'call_utilities/global' }]"
    >
      <vuci-form-item-select
        :uci-section="s"
        name="action"
        :label="$t('Action')"
        :help="$t('The action to be performed on incoming calls. Call utilities rules will keep getting executed while the call is active.')"
        :options="callActions"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="line_close_time"
        :label="$t('Answer and hangup after time period (s)')"
        :help="$t('Time interval (seconds) until line will be closed after answering the call (0-100).')"
        rules="irange(0,100)"
        :depend="s.action === 'answer'"
        required
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script setup lang="ts">
import EditForm from './CallUtilitiesEdit'
import UtilitiesOverviewSection from '@/components/shared/MobileUtilities/MobileUtilitiesOverviewSection.vue'
import ModemFullControlMessage from '@/components/shared/ModemFullControlMessage'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import { useMobileUtilitiesUtils } from '@/composables/useMobileUtilities'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { type Ref, type ComponentPublicInstance, ref, markRaw, provide } from 'vue'

const { handleDataLoad, mobileUtilitiesOptions, handleInitialDataUpdate } = useMobileUtilitiesUtils()
provide('mobileUtilitiesOptions', mobileUtilitiesOptions)

const $t = useTranslate()
const message = useMessages()

const vuciFormRef: Ref<ComponentPublicInstance<typeof VuciForm> | null> = ref(null)
const isPhoneSettingsEnabled = ref(false)

const callActions = [
  ['reject', $t('Reject')],
  ['answer', $t('Answer')],
  ['ignore', $t('Ignore')]
]

function extraLoad() {
  return axios
    .get('/api/phone_settings/config/general', { condition: 'vuci-app-phone-settings-api.control' })
    .then(({ data }) => {
      isPhoneSettingsEnabled.value = data.enabled === '1'
    })
    .catch(() => {
      message.error($t('Failed to load Phone Settings data'))
    })
}
</script>
