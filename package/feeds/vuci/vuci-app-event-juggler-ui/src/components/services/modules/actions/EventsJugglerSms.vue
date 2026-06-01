<template>
  <events-juggler-retry-options
    :uci-section="s"
    :is-type-selected="isTypeSelected"
  />
  <vuci-form-item-text-area
    :uci-section="s"
    name="sms_text"
    :label="$t('Text message')"
    :help="$t('Text parameters to be sent with the message.')"
    initial="Router name - %rn; Time stamp - %ts"
    placeholder="Router name - %rn; Time stamp - %ts"
    required
    :rules="validateSms"
    :depend="isTypeSelected"
  />
  <vuci-form-item-dummy
    :uci-section="s"
    name="sms_count"
    label=" "
    :display-value="() => getSmsCharacters(s?.sms_text || '')"
    :depend="isTypeSelected"
    no-write
  />
  <EventsJugglerParamList
    v-if="isTypeSelected"
    :title="$t('text message parameter list')"
    :list-parameters="getListParameters()"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="sms_modem_id"
    :label="$t('Gateway modem')"
    :help="$t('Select the modem used to send the SMS message.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="sms_info_modem_id"
    :label="$t('Modem')"
    :help="$t('Select the modem used to gather information.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="sms_recipient_format"
    :label="$t('Recipients')"
    :help="$t('Choose whether to add a single phone number or use a phone group list.')"
    :options="recipientFormatOptions"
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="sms_phone"
    :label="$t('Phone number')"
    :help="$t('Enter the phone number to which the message will be sent.')"
    placeholder="+37000000000"
    rules="phonedigit"
    required
    :depend="isTypeSelected && s?.sms_recipient_format === 'single'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="sms_group"
    :label="$t('Phone group')"
    :options="phoneGroupOptions"
    required
    :depend="isTypeSelected && s?.sms_recipient_format === 'group'"
  >
    <template #help>
      {{ $t("Recipient's phone number group. Configure groups") }}
      <router-link to="/system/admin/group/phone"> {{ $t('here') }} </router-link>.
    </template>
  </vuci-form-item-select>
</template>
<script setup lang="ts">
import EventsJugglerParamList from '../../EventsJugglerParamList.vue'
import EventsJugglerRetryOptions from '../../EventsJugglerRetryOptions.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'
import { useMessageValidation } from '@/composables/useMessageValidation'

const props = defineProps(moduleProps)

const { isTypeSelected, getListParameters } = useEventsJugglerModuleData(props)
const { validateSms, getSmsCharacters } = useMessageValidation()

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const { modemOptions = [], phoneGroupOptions = [] } = eventsJugglerOptions?.value || {}

const $t = useTranslate()
const recipientFormatOptions = [
  ['single', $t('Single')],
  ['group', $t('Group')]
]
</script>
