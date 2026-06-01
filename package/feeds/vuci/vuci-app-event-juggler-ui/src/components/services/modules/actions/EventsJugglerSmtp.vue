<template>
  <events-juggler-retry-options
    :uci-section="s"
    :is-type-selected="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="smtp_subject"
    :label="$t('Subject')"
    :help="$t('Subject of the email.')"
    rules="subject_rule"
    :depend="isTypeSelected"
    required
  />
  <vuci-form-item-text-area
    :uci-section="s"
    name="smtp_text"
    :label="$t('Text message')"
    :help="$t('Body of the email.')"
    initial="Router name - %rn; Time stamp - %ts"
    placeholder="Router name - %rn; Time stamp - %ts"
    maxlength="4096"
    required
    :depend="isTypeSelected"
  />
  <EventsJugglerParamList
    v-if="isTypeSelected"
    :title="$t('text message parameter list')"
    :list-parameters="getListParameters()"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="smtp_email_group"
    :label="$t('Sender\'s email account')"
    :options="emailGroupOptions"
    required
    :depend="isTypeSelected"
  >
    <template #help>
      {{ $t("Sender's email configuration. Configure email account") }}
      <router-link to="/system/admin/group/email"> {{ $t('here') }} </router-link>.
    </template>
  </vuci-form-item-select>
  <vuci-form-item-list
    :uci-section="s"
    name="smtp_recipients"
    :label="$t('Recipient\'s email address')"
    :help="$t('Email addresses of the recipients.')"
    rules="email"
    placeholder="mail@domain.com"
    :depend="isTypeSelected"
    required
  />
  <vuci-form-item-select
    :uci-section="s"
    name="smtp_info_modem_id"
    :label="$t('Modem')"
    :help="$t('Select the modem used to gather information.')"
    :options="modemOptions"
    :depend="isTypeSelected && modemOptions.length > 1"
  />
</template>
<script setup lang="ts">
import EventsJugglerParamList from '../../EventsJugglerParamList.vue'
import EventsJugglerRetryOptions from '../../EventsJugglerRetryOptions.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject } from 'vue'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const { isTypeSelected, getListParameters } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const { emailGroupOptions = [], modemOptions = [] } = eventsJugglerOptions?.value || {}

const $t = useTranslate()
</script>
