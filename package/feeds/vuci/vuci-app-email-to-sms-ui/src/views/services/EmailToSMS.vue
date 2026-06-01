<template>
  <vuci-form
    v-slot="{ uciData }"
    config="email_to_sms"
    :after-load="loadData"
  >
    <modem-full-control-message />
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'sms_gateway/email_to_sms/config' }]"
      name="pop3"
      :title="$t('Email to SMS forwarding')"
      :help="$t('POP3 email server configuration.')"
      :uci-data="uciData"
      data-key="email_to_sms"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable/disable email forwarding to SMS.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="host"
        :label="$t('POP3 server')"
        rules="host"
        placeholder="pop.domain.com"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="port"
        :label="$t('Server port')"
        rules="port"
        placeholder="80"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="username"
        :label="$t('Username')"
        :help="$t('Username for authentication on POP3 server. All characters are allowed except ` and space.')"
        rules="credentials_validate"
        maxlength="64"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        :label="$t('Password')"
        :help="$t('Password for authentication on POP3 server. All characters are allowed except ` and space.')"
        rules="credentials_validate"
        maxlength="512"
        password
        sensitive
        :required="s.enabled === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ssl"
        :label="$t('Secure connection (TLS)')"
        :help="$t('Accepting TLS 1.2 and up.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ssl_verify"
        :label="$t('Verify TLS certificate validity')"
        :help="$t('Verifies the validity of the POP3 server certificate.')"
        :depend="s.ssl === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="limit"
        :label="$t('SMS PDU limit')"
        :help="$t('Longer email text will be sent in multiple PDUs (Protocol Data Units), each of them is approximately 130 characters. Specify maximum allowed PDU count.')"
        rules="irange(1,10)"
        placeholder="5"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="time"
        :label="$t('Interval')"
        :help="$t('Type of time interval.')"
        :options="intervalOptions"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="min"
        :label="$t('Check email every')"
        :help="$t('Step in minutes to how often check email.')"
        :options="minutelyEmailOptions"
        :depend="s.time === 'min'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="hour"
        :label="$t('Check email every')"
        :help="$t('Step in hours to how often check email.')"
        :options="hourlyEmailOptions"
        :depend="s.time === 'hour'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="day"
        :label="$t('Check email every')"
        :help="$t('Step in days to how often check email.')"
        :options="dailyEmailOptions"
        :depend="s.time === 'day'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="modem_id"
        :label="$t('Gateway modem')"
        :help="$t('Modem, which is used to send information from.')"
        :options="modems"
        :depend="modems.length > 1"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script setup lang="ts">
import ModemFullControlMessage from '@/components/shared/ModemFullControlMessage'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { mobile } from '@/plugins/mobile'
import { axios } from '@ui-core/plugins/axios'
import { ref } from 'vue'
import type { ModemInfo } from '@/types/mobileTypes'

const $t = useTranslate()
const $message = useMessages()

const modems = ref<ModemInfo[]>([])

const intervalOptions = [
  ['min', $t('Minutes')],
  ['hour', $t('Hours')],
  ['day', $t('Days')]
]
const minutelyEmailOptions = ['1', '2', '5', '10', '15', '20', '30']
const hourlyEmailOptions = ['1', '2', '4', '6', '8', '12']
const dailyEmailOptions = ['1', '2', '3', '5', '10', '15']

function loadData() {
  return axios
    .get('/api/modems/status')
    .then(({ data }) => {
      modems.value = mobile.modemsOptions(data)
    })
    .catch(() => {
      $message.error($t('Failed to load modem options'))
    })
}
</script>
