<template>
  <vuci-form
    v-slot="{ uciData }"
    config="sms_gateway;user_groups"
    :after-load="loadData"
  >
    <modem-full-control-message />
    <vuci-named-section
      v-slot="{ s }"
      name="reply"
      type="reply"
      :title="$t('Auto reply configuration')"
      :help="$t('Auto reply allows you to configure automatic replies for SMS messages received by the device.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'sms_gateway/auto_reply/config' }]"
      data-key="auto_reply"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        name="enabled"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Reply SMS-Utilities rules')"
        :help="$t('It will reply to SMS rules, from SMS-Utilities.')"
        name="every_sms"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Do not save received message')"
        :help="$t('If enabled, the device will delete received SMS messages.')"
        name="delete_sms"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="send_modem_id"
        :label="$t('Gateway modem')"
        :help="$t('Modem, which is used to send information from.')"
        :options="modemOptions"
        :depend="modemOptions.length > 1"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="mode"
        :label="$t('Mode')"
        :help="$t('To whom the configuration applies to.')"
        :options="modes"
        initial="everyone"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="tel"
        :label="$t('Recipient\'s phone number')"
        rules="phonedigit"
        placeholder="+37000000000"
        :depend="s.mode === 'list_number'"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="group"
        :label="$t('Phone group')"
        :placeholder="$t('No phone groups created')"
        :options="userGroupOptions"
        :depend="s.mode === 'user_group'"
        :required="s.enabled === '1'"
      >
        <template #help>
          {{ $t("Recipient's phone number users group.") }}
          {{ $t('Configure it') }}
          <router-link to="/system/admin/group/phone"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-select>
      <tlt-inline-message
        id="auto-reply-warning"
        type="warning"
        :message="$t('Be careful not to send SMS messages to yourself!')"
      />
      <vuci-form-item-text-area
        :uci-section="s"
        name="msg"
        :label="$t('Message text')"
        :help="$t('Message to be sent.')"
        rows="15"
        :rules="validateSms"
        :required="s.enabled === '1'"
        :initial="messagePlaceholder"
        :placeholder="messagePlaceholder"
      />
      <vuci-form-item-dummy
        :uci-section="s"
        name="sms_count"
        label=" "
        :display-value="() => getSmsCharacters(s.msg)"
        no-write
      />
      <tlt-form-accordion
        name="parameter-list"
        :title="$t('message text parameter list')"
      >
        <tlt-form-model-item>
          <t-parameters class="w-full">
            <strong>{{ $t('Message text parameter list') }}:</strong>
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
    </vuci-named-section>
  </vuci-form>
</template>
<script setup lang="ts">
import ModemFullControlMessage from '@/components/shared/ModemFullControlMessage'
import { useMessageValidation } from '@/composables/useMessageValidation'
import { getAllParameters, getMessages } from '@/utils/message-parameters'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { mobile } from '@/plugins/mobile'
import { axios } from '@ui-core/plugins/axios'
import { ref, computed } from 'vue'
import type { ModemInfo } from '@/types/mobileTypes'
import type { PhoneGroup } from '@/types/recipientTypes'

interface SmsTextParameter {
  id: string
  type: string
  description: string
}

const $t = useTranslate()
const $message = useMessages()

const { validateSms, getSmsCharacters } = useMessageValidation()

const modems = ref<ModemInfo[]>([])
const userGroups = ref<PhoneGroup[]>([])
const parameters = ref<SmsTextParameter[]>([])

const modes = [
  ['everyone', $t('Everyone')],
  ['list_number', $t('Listed numbers')],
  ['user_group', $t('From phone group')]
]
const defaultParams = [{ id: 'rn' }, { id: 'wi' }, { id: 'cs' }, { id: 'ct' }, { id: 'ss' }, { id: 'fs' }]

const userGroupOptions = computed(() => userGroups.value.map(u => u.name))
const modemOptions = computed(() => mobile.modemsOptions(modems.value))
const formattedParameters = computed(() =>
  getAllParameters(parameters.value).map(params => ({
    parameter: `%${params[0]}`,
    description: params[1]
  }))
)
const messagePlaceholder = computed(() => {
  const availableParams = defaultParams.filter(param => parameters.value.some(({ id }) => id === param.id))
  return getParametersMessage(availableParams, true)
})

function getParametersMessage(params: { id: string }[], isArray: boolean) {
  const parametersList = getAllParameters(params)
  const messages = getMessages(parametersList)
  return isArray ? messages.join('; ') : messages
}

function loadData() {
  return axios
    .bulkGet(['/api/recipients/phone_groups/config', '/api/modems/status', '/api/sms_utilities/rules/options'])
    .then(([phoneResponse, mobileResponse, parametersResponse]) => {
      if (phoneResponse.success) userGroups.value = phoneResponse.data
      else $message.error($t('Failed to load phone group options'))
      if (mobileResponse.success) modems.value = mobile.parseModems(mobileResponse.data)
      else $message.error($t('Failed to load modem options'))
      if (parametersResponse.success) parameters.value = parametersResponse.data?.params || []
      else $message.error($t('Failed to load SMS parameters'))
    })
    .catch(() => {
      $message.error($t('An unexpected error occurred'))
    })
}
</script>
