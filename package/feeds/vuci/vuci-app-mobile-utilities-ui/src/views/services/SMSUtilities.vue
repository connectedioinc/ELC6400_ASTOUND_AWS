<template>
  <vuci-form
    ref="vuciFormRef"
    v-slot="{ uciData }"
    config="sms_utils"
    :after-load="handleDataLoad"
  >
    <modem-full-control-message />
    <utilities-overview-section
      :uci-data="uciData"
      :edit-form="markRaw(EditForm)"
      endpoint="sms_utilities/rules/config"
      :title="$t('SMS rules')"
      :help="
        $t(
          'This section displays rules that execute certain actions when triggered by an SMS message. \
        In order to trigger a rule, send an SMS message containing the rule\'s \'SMS Text\' preceded by the \'Authorization Method\'. \
        e.g., sending \'admin01 reboot\' (without the quotes) will reboot the router. Replace \'admin01\' \
        with your router\'s actual password (or serial number if selected authorization is \'By Serial\'). \
        If no authorization is selected, simply send the \'SMS Text\'.'
        )
      "
      data-key="sms_utilities"
      :columns="[
        { name: 'smstext', label: $t('SMS text'), help: $t('The text of the rule responsible for triggering the action.'), actions: { sort: true } },
        {
          name: 'authorization',
          label: $t('Authorization method'),
          help: $t('The authorization method used to verify the authenticity of received communications.'),
          displayFn: getAuthorizationTranslate,
          actions: { filter: { type: 'uniqueValues' } }
        }
      ]"
      is-sms-view
      :exception-options="['enabled']"
      @update-initial-data="handleInitialDataUpdate(vuciFormRef, uciData)"
    >
      <!-- enabled is included into exception-options, due to pagination and not registered items being filtered-out out of payload. -->
      <template #action="{ s }">
        <div :ref="`action_${s.action}_${s.id}`">
          <vuci-form-item-dummy
            :uci-section="s"
            name="action"
            :display-value="getTranslatedAction"
          />
        </div>
        <tlt-popover
          :target="() => $refs[`action_${s.action}_${s.id}`]"
          triggers="hover"
          placement="right-start"
        >
          <ActionHint :section="s" />
        </tlt-popover>
      </template>
      <template #smstext="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="smstext"
        />
      </template>
      <template #add="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.smstext"
          :label="$t('SMS text')"
          prop="smstext"
          :rules="[validateSmsNoSpace, (v: string) => validateSmsTextInstance(v, uciData.sms_utilities)]"
          maxlength="160"
          required
        />
      </template>
    </utilities-overview-section>
  </vuci-form>
</template>
<script setup lang="ts">
import UtilitiesOverviewSection from '@/components/shared/MobileUtilities/MobileUtilitiesOverviewSection.vue'
import ActionHint from '../../components/services/SmsUtilitiesActionHint.vue'
import ModemFullControlMessage from '@/components/shared/ModemFullControlMessage'
import EditForm from './SMSUtilitiesEdit'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import { useMobileUtilitiesUtils } from '@/composables/useMobileUtilities'
import { useMobileUtilitiesAuthorization } from '@/composables/useMobileUtilitiesAuthorization'
import { useTranslate } from '@ui-core/composables/useI18n'
import { type Ref, type ComponentPublicInstance, ref, markRaw, provide } from 'vue'
import type { AuthorizationOptions } from '@/types/mobileUtilitiesTypes'

const { handleDataLoad, handleInitialDataUpdate, mobileUtilitiesOptions, getTranslatedAction, validateSmsNoSpace, validateSmsTextInstance } = useMobileUtilitiesUtils(true)
const { authorizationMethods } = useMobileUtilitiesAuthorization()

provide('mobileUtilitiesOptions', mobileUtilitiesOptions)

const $t = useTranslate()

const vuciFormRef: Ref<ComponentPublicInstance<typeof VuciForm> | null> = ref(null)

function getAuthorizationTranslate(value: AuthorizationOptions) {
  return authorizationMethods[value] || value
}
</script>
