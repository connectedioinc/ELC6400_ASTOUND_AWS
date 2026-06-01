<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="sms_gateway;user_groups"
    :after-load="loadData"
    bulk-request
  >
    <modem-full-control-message />
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'sms_gateway/sms_forwarding/to_http/config' }]"
      :type="sectionName.http"
      :title="$t('SMS forwarding to HTTP configuration')"
      :uci-data="uciData"
      :data-key="sectionName.http"
      :exception-options="['extra_name1', 'extra_value1', 'extra_name2', 'extra_value2']"
    >
      <forwarding-section
        :s="s"
        :user-group-options="userGroupOptions"
        :section-name="sectionName.http"
        :switch-help="$t('Enable/disable SMS forwarding to HTTP.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="message_encode_b64"
        :label="$t('Encode message text to Base64')"
        :help="$t('Message text will be encoded to a Base64 string. Enable this to preserve Unicode characters in the message text.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="verify_cert"
        :label="$t('HTTPS certificate verification')"
        :help="$t('Select whether to ignore or verify server certificate.')"
        :options="verificationOptions"
        initial="ignore"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="method"
        :label="$t('Method')"
        :help="$t('Choose witch HTTP request method will be used.')"
        :options="methodOptions"
        initial="get"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="url"
        :label="$t('URL')"
        :help="$t('URL to which message is going to be forwarded.')"
        rules="url"
        placeholder="www.example.com"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="message_name"
        :label="$t('Message value name')"
        :help="$t('Message codename for query string name/value pair.')"
        :placeholder="$t('Name')"
        maxlength="16"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-custom
        :uci-section="s"
        name="extra_data_pair_1"
        :label="$t('Extra data pair 1')"
        :help="$t('Extra html query name/value pair. Enter name to the left field and value to right.')"
        inputs="input,input"
        :input-props="extraDataProps"
        :load-parse="() => loadExtraDataPair('1')"
        :save="saveExtraDataPair"
        initial=","
      />
      <vuci-form-item-custom
        :uci-section="s"
        name="extra_data_pair_2"
        :label="$t('Extra data pair 2')"
        :help="$t('Extra html query name/value pair. Enter name to the left field and value to right.')"
        inputs="input,input"
        :input-props="extraDataProps"
        :load-parse="() => loadExtraDataPair('2')"
        :save="saveExtraDataPair"
        initial=","
      />
    </vuci-named-section>
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'sms_gateway/sms_forwarding/to_sms/config' }]"
      :type="sectionName.sms"
      :title="$t('SMS forwarding to SMS configuration')"
      :uci-data="uciData"
      :data-key="sectionName.sms"
    >
      <forwarding-section
        :s="s"
        :user-group-options="userGroupOptions"
        :section-name="sectionName.sms"
        :switch-help="$t('Enable/disable SMS forwarding to SMS configuration.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="send_modem_id"
        :label="$t('Gateway modem')"
        :help="$t('Modem, which is used to send information from.')"
        :options="modemOptions"
        :depend="modemOptions.length > 1"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="fwd_number"
        :label="$t('Recipients phone numbers')"
        :help="$t('Number(s) to which received messages will be forwarded to.')"
        rules="phonedigit"
        placeholder="+37000000000"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'sms_gateway/sms_forwarding/to_smtp/config' }]"
      :type="sectionName.email"
      :title="$t('SMS forwarding to email configuration')"
      :uci-data="uciData"
      :data-key="sectionName.email"
    >
      <forwarding-section
        :s="s"
        :user-group-options="userGroupOptions"
        :section-name="sectionName.email"
        :switch-help="$t('Enable/disable SMS forwarding to email configuration.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="subject"
        :label="$t('Subject')"
        :help="$t('Subject of an email. Allowed characters: &quot;a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.&quot;.')"
        rules="subject_rule"
        maxlength="256"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="email_name"
        :label="$t('Sender\'s email account')"
        :placeholder="$t('No email accounts created')"
        :options="emailGroupOptions"
        :required="s.enabled === '1'"
      >
        <template #help>
          {{ $t("Sender's email configuration.") }}
          {{ $t('Configure it') }}
          <router-link to="/system/admin/group/email"> {{ $t('here') }} </router-link>.
        </template>
      </vuci-form-item-select>
      <vuci-form-item-list
        :uci-section="s"
        name="recipemail"
        :label="$t('Recipient\'s email address')"
        :help="$t('For whom you want to send an email to. Allowed characters: &quot;a-zA-Z0-9._%+-&quot;.')"
        rules="email"
        placeholder="mail@domain.com"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script setup lang="ts">
import ForwardingSection from '../../components/services/ForwardingSection.vue'
import ModemFullControlMessage from '@/components/shared/ModemFullControlMessage.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { mobile } from '@/plugins/mobile'
import { axios } from '@ui-core/plugins/axios'
import { type ComponentInstance, ref, computed } from 'vue'
import type { ModemInfo } from '@/types/mobileTypes'
import type { PhoneGroup, EmailGroup } from '@/types/recipientTypes'
import type VuciFormItemCustom from '@ui-core/vuci-form/src/VuciFormItemCustom.vue'

interface FormData {
  fwd_to_http: HttpSection[]
  fwd_to_sms: ForwardingSectionData[]
  fwd_to_smtp: ForwardingSectionData[]
}

interface HttpSection {
  id?: string
  extra_data_pair_1?: [string, string]
  extra_data_pair_2?: [string, string]
  extra_name1?: string
  extra_value1?: string
  extra_name2?: string
  extra_value2?: string
}

interface ForwardingSectionData {
  id?: string
}

const $t = useTranslate()
const $message = useMessages()

const modems = ref<ModemInfo[]>([])
const userGroups = ref<PhoneGroup[]>([])
const emailGroups = ref<EmailGroup[]>([])
const formData = ref<FormData>({
  fwd_to_http: [],
  fwd_to_sms: [],
  fwd_to_smtp: []
})

const sectionName = {
  http: 'fwd_to_http',
  sms: 'fwd_to_sms',
  email: 'fwd_to_smtp'
}

const extraDataProps = [
  {
    prop: 'extra_name',
    maxlength: '64',
    placeholder: $t('data')
  },
  {
    prop: 'extra_value',
    maxlength: '64',
    placeholder: '10'
  }
]

const verificationOptions = [
  ['ignore', $t('Ignore')],
  ['verify', $t('Verify')]
]

const methodOptions = [
  ['post', $t('Post')],
  ['get', $t('Get')]
]

const userGroupOptions = computed(() => userGroups.value.map(u => u.name))
const emailGroupOptions = computed(() => emailGroups.value.map(e => e.name))
const modemOptions = computed(() => mobile.modemsOptions(modems.value))

function loadData() {
  const apiRequests = ['/api/recipients/phone_groups/config', '/api/recipients/email_users/config', '/api/modems/status']
  return axios
    .bulkGet(apiRequests)
    .then(([pGroupRes, eUsersRes, mobileRes]) => {
      if (pGroupRes.success) userGroups.value = pGroupRes.data
      else $message.error($t('Failed to load phone groups'))
      if (eUsersRes.success) emailGroups.value = eUsersRes.data
      else $message.error($t('Failed to load email users'))
      if (mobileRes.success) modems.value = mobile.parseModems(mobileRes.data)
      else $message.error($t('Failed to load modem options'))
    })
    .catch(() => {
      $message.error($t('An unexpected error occurred'))
    })
}

function saveExtraDataPair(self: ComponentInstance<typeof VuciFormItemCustom>, section: HttpSection) {
  const [[extraName, extraValue]] = self.$data.modelValues
  if (self.name === 'extra_data_pair_1') {
    section.extra_name1 = extraName ?? ''
    section.extra_value1 = extraValue ?? ''
    delete section.extra_data_pair_1
  }
  if (self.name === 'extra_data_pair_2') {
    section.extra_name2 = extraName ?? ''
    section.extra_value2 = extraValue ?? ''
    delete section.extra_data_pair_2
  }
}

function loadExtraDataPair(componentNumber: string) {
  let [name, value] = ['', '']
  if (componentNumber === '1') {
    name = formData.value.fwd_to_http?.[0]?.extra_name1 ?? ''
    value = formData.value.fwd_to_http?.[0]?.extra_value1 ?? ''
  }
  if (componentNumber === '2') {
    name = formData.value.fwd_to_http?.[0]?.extra_name2 ?? ''
    value = formData.value.fwd_to_http?.[0]?.extra_value2 ?? ''
  }
  return [name, value]
}
</script>
