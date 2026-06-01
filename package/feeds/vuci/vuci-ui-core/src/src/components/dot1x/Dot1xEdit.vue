<template>
  <tlt-modal
    :open="showModal"
    size="big"
    :nav-bar="[$t('Configuration')]"
    @close="back"
  >
    <vuci-form
      v-slot="{ uciData }"
      v-model="formData"
      config="dot1x_client"
      :before-save="beforeSave"
      :edit-multiple="selectedPortsNames"
    >
      <vuci-named-section
        v-slot="{ s }"
        :title="$t('&quot;%&quot; 802.1X settings').format(selectedPortsPrettyIds.join(', '))"
        :uci-data="uciData"
        :name="selectedPortsNames?.[0]"
        :endpoints="[{ endpoint: 'dot1x/ports/config' }]"
        data-key="dot1x"
        :after-save="onAfterSave"
      >
        <tlt-inline-message
          v-show="configsDiffer"
          id="config-mismatch"
          :message="
            $t('Selected ports have different configurations. %s settings are used as a template. Saving this configuration will be applied for all selected ports.').format(selectedPortsPrettyIds[0])
          "
          type="warning"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          name="enabled"
          :help="$t('Toggle 802.1x on or off.')"
          :readonly="portDisabled()"
          :hints="portDisabled() ? [{ info: $t('Cannot enable instance(s) because the corresponding port(s) are disabled in the port settings.') }] : []"
        />
        <vuci-form-item-radio-group
          v-if="hasClientAndServer"
          :uci-section="s"
          :label="$t('Role')"
          :help="$t('Toggle 802.1x role.')"
          name="role"
          :options="roleOptions"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable dynamic VLANs')"
          name="use_vlans"
          :depend="s.role === 'server' && vlanOptions.length > 0 && ((dsa && s.id.includes('lan')) || store.isSwitch)"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Authentication type')"
          name="auth_type"
          :help="$t('Select authentication type for 802.1x server service.')"
          :options="authType"
          :depend="s.role === 'client'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Identity (Username)')"
          name="identity"
          :help="$t('Used as the username for authentication.')"
          maxlength="253"
          required
          :depend="s.role === 'client'"
        />
        <tlt-inline-message
          v-show="['md5', 'ttls', 'peap', 'pwd'].includes(s.auth_type) && s.role === 'client' && session.hideSensitive() && displayInfoMessage('password')"
          id="password-info"
          :message="$t('Leaving the \'%s\' field unchanged will retain the original values for the selected instances.').format($t('Password'))"
          type="info"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Password')"
          :help="$t('Used for authentication.')"
          name="password"
          :depend="['md5', 'ttls', 'peap', 'pwd'].includes(s.auth_type) && s.role === 'client'"
          password
          sensitive
          maxlength="112"
          required
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Inner authentication')"
          name="inner_authentication"
          :options="innerAuthOptions"
          :depend="(s.auth_type === 'ttls' || s.auth_type === 'peap') && s.role === 'client'"
        />
        <vuci-form-item-radio-group
          v-if="s.auth_type === 'peap' && s.role === 'client'"
          :uci-section="s"
          :label="$t('Peap version')"
          :help="$t('Version of Protected Extensible Authentication Protocol.')"
          name="peap_version"
          initial="auto"
          :options="peapVersionOptions"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Anonymous identity')"
          :help="$t('Shown as username outside the encrypted tunnel. Not used for authentication.')"
          name="anonymous_identity"
          maxlength="253"
          :depend="(s.auth_type === 'ttls' || s.auth_type === 'peap') && s.role === 'client'"
          required
        />
        <vuci-form-item-upload
          :uci-section="s"
          name="ca_cert"
          :label="$t('CA Certificate')"
          :help="$t('Radius server CA certificate.')"
          max-size="16MB"
          :depend="['tls', 'ttls', 'peap'].includes(s.auth_type) && s.role === 'client'"
        >
          <template #fileName="{ fileName }">
            {{ normalizeFileName(fileName) }}
          </template>
        </vuci-form-item-upload>
        <vuci-form-item-upload
          :uci-section="s"
          name="client_cert"
          option="client_cert"
          :label="$t('User certificate')"
          :help="$t('TLS client certificate.')"
          max-size="16MB"
          :depend="s.auth_type === 'tls' && s.role === 'client'"
          required
        >
          <template #fileName="{ fileName }">
            {{ normalizeFileName(fileName) }}
          </template>
        </vuci-form-item-upload>
        <vuci-form-item-upload
          :uci-section="s"
          name="private_key"
          option="private_key"
          :label="$t('Private Key')"
          :help="$t('TLS Private Key.')"
          max-size="16MB"
          required
          :depend="s.auth_type === 'tls' && s.role === 'client'"
        >
          <template #fileName="{ fileName }">
            {{ normalizeFileName(fileName) }}
          </template>
        </vuci-form-item-upload>
        <tlt-inline-message
          v-show="s.auth_type === 'tls' && s.role === 'client' && session.hideSensitive() && displayInfoMessage('private_key_pass')"
          id="password-info"
          :message="$t('Leaving the \'%s\' field unchanged will retain the original values for the selected instances.').format($t('Private Key Password'))"
          type="info"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="private_key_pass"
          :label="$t('Private Key Password')"
          :help="$t('TLS Private Key Password.')"
          :depend="s.auth_type === 'tls' && s.role === 'client'"
          password
          sensitive
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Radius server')"
          name="radius"
          :depend="s.role === 'server'"
          :options="formOptions.radiusOptions.value"
        >
          <template #help>
            {{ $t('Select radius server for 802.1x server service.') }}
            {{ $t('Configure it') }}
            <router-link to="/network/ports/port_security_server/radius"> {{ $t('here') }} </router-link>.
          </template>
        </vuci-form-item-select>
        <tlt-form-accordion
          v-if="serverOptions(s)"
          name="dot1x_accordion"
        >
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Guest VLAN')"
            name="guest_vlan"
            :help="$t('Select guest VLAN for 802.1x server service.')"
            :depend="!!store.board?.port_security?.guest_vlan"
            :options="vlanOptionsWithDisabled"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Fallback VLAN')"
            name="fallback_vlan"
            :help="$t('Select fallback VLAN 802.1x for server service.')"
            :depend="!!store.board?.port_security?.fallback_vlan"
            :options="vlanOptionsWithDisabled"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Authenticated VLAN')"
            name="authenticated_vlan"
            :help="$t('Select authenticated VLAN 802.1x for server service.')"
            :depend="!!store.board?.port_security?.authenticated_vlan"
            :options="vlanOptionsWithDisabled"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Reject VLAN')"
            name="reject_vlan"
            :help="$t('Select reject VLAN 802.1x for server service.')"
            :options="vlanOptionsWithDisabled"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Accept VLAN')"
            name="accept_vlan"
            :help="$t('Select accept VLAN 802.1x for server service.')"
            :options="[['radius_assigned', $t('Radius assigned')]].concat(vlanOptions)"
          />
        </tlt-form-accordion>
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('EAP retransmission timeout')"
          placeholder="30"
          :help="$t('How long to wait (in seconds) for an EAP response before re-transmitting the request. Default is 30.')"
          name="eap_retrans_timeout"
          rules="irange(1,300)"
          :depend="!!store.isSwitch"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('EAP retransmission count')"
          placeholder="2"
          :help="$t('Maximum amount of EAP request retransmissions before aborting authentication. Default is 2.')"
          name="eap_retrans_count"
          rules="irange(1,10)"
          :depend="!!store.isSwitch"
        />
      </vuci-named-section>
    </vuci-form>
  </tlt-modal>
</template>

<script lang="ts" setup>
import { ref, computed, watch, inject, nextTick } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt } from '@/stores/messages'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/stores/main'
import { session } from '@ui-core/plugins/session'
import * as ports from '@/plugins/ports'
import { FormOptionKey, type Dot1xConfig, type FormModel, type VlanOption, type FormOptions, type VlanMessage } from './Dot1xCommon'
import { type ApiResponse, type ApiErrorResponse } from '@ui-core/plugins/axios'
import { normalizeFileName } from '@/plugins/certificates'
import { getBondName } from '@/plugins/ports'

const formOptions = inject(FormOptionKey) as FormOptions

const $t = useTranslate()
const store = useMainStore()
const message = useMessages()
const prompt = usePrompt()
const router = useRouter()

const modelValue = defineModel<Dot1xConfig[]>('modelValue', { default: () => [] })
const selectedPorts = defineModel<string[]>('selectedPorts', { default: () => [] })
const showModal = defineModel<boolean>('showModal')
const vlanMessages = ref<VlanMessage[]>([])
const formData = ref<FormModel>({ dot1x: [] })
const hashSelectedPorts = ref<string[]>([])
const configsDiffer = ref(false)

const roleOptions = [
  { name: $t('Client'), value: 'client' },
  { name: $t('Server'), value: 'server' }
]

const authType = [
  ['md5', 'MD5'],
  ['tls', 'TLS'],
  ['pwd', $t('Password %s').format('(EAP-PWD)')],
  ['ttls', $t('Tunneled TLS')],
  ['peap', $t('Protected EAP (PEAP)')]
]

const peapVersionOptions = [
  { name: $t('Auto'), value: 'auto' },
  { name: 'PEAPv0', value: '0' },
  { name: 'PEAPv1', value: '1' }
]

const innerAuthTls = [
  ['pap', 'PAP'],
  ['mschap', 'MSCHAP'],
  ['mschapv2', 'MSCHAPv2'],
  ['mschapv2noeap', $t('MSCHAPv2 (no EAP)')],
  ['chap', 'CHAP'],
  ['md5', 'MD5'],
  ['gtc', 'GTC']
]

const innerAuthPeapFast = [
  ['mschapv2', 'MSCHAPv2'],
  ['md5', 'MD5'],
  ['gtc', 'GTC']
]

const configSettings = [
  'enabled',
  'role',
  'auth_type',
  'identity',
  'password',
  'inner_authentication',
  'peap_version',
  'anonymous_identity',
  'ca_cert',
  'client_cert',
  'private_key',
  'private_key_pass',
  'radius',
  'guest_vlan',
  'fallback_vlan',
  'reject_vlan',
  'accept_vlan',
  'eap_retrans_timeout',
  'eap_retrans_count'
] as (keyof Dot1xConfig)[]

const selectedPortsNames = computed(() => {
  const portsToUse = hashSelectedPorts.value.length > 0 ? hashSelectedPorts.value : selectedPorts.value
  return portsToUse?.length ? portsToUse : ['_lan1']
})

const selectedPort = computed(() => formData.value.dot1x?.find((x: Dot1xConfig) => x.id === selectedPortsNames.value[0]))

const selectedPortsPrettyIds = computed(() => selectedPortsNames.value.map(x => getBondName(formOptions.portStatus.value, x)))

const innerAuthOptions = computed(() => (selectedPort.value?.auth_type === 'peap' ? innerAuthPeapFast : innerAuthTls))

const vlanOptions = computed(() => formOptions.vlanOptions.value?.map((i: VlanOption) => (!store.isSwitch ? [i.vid, `VLAN ${i.vid}`] : [i.vlan, i.name])))

const vlanOptionsWithDisabled = computed(() => [['disabled', $t('Disabled')]].concat(vlanOptions.value))

const hasClientAndServer = computed(() => store.hasPackages('dot1x-client.control') && store.hasPackages(['dsa-dot1x-server.control', 'dot1x-server.control'], false))

const dsa = computed(() => store.board?.hwinfo?.dsa && store.device !== 'x86_64')

const maxVlans = computed(() => store.board?.network_options?.vlans)

function portDisabled(): boolean {
  const ports = formOptions.portStatus.value?.filter(port => selectedPortsNames.value.find(id => port.id === id))
  return ports?.some(x => x.enabled === '0')
}

function displayInfoMessage(field: string): boolean {
  if (selectedPorts.value.length < 2) return false
  const foundItem = formData.value.dot1x.find((x: Dot1xConfig) => x.id === selectedPorts.value[0])
  const value = foundItem && foundItem[`${field}:set`]
  return value === '1'
}

function serverOptions(s: Dot1xConfig): boolean {
  return s.role === 'server' && !!vlanOptions.value.length && (s.use_vlans === '1' || (!dsa.value && !store.isSwitch))
}

function beforeSave(): Promise<void> {
  const isEnabled = formData.value.dot1x.find((x: Dot1xConfig) => x.id === selectedPorts.value[0])?.enabled === '1'
  if (!isEnabled || maxVlans.value === undefined) return Promise.resolve()
  const vlans = selectedPorts.value.length + formOptions.vlanOptions.value.length - maxVlans.value
  if (vlans > 0) return Promise.reject($t('Too many VLANs used to enable 802.1X server on these ports. Please remove %s VLAN(s) to use this feature.').format(vlans))
  return Promise.resolve()
}

async function onAfterSave(_: never, res: (ApiResponse<any> & { messages: VlanMessage[] }) | ApiErrorResponse) {
  if (!res.success) {
    message.error($t('Failed to save port configurations'))
    return
  }
  if ('messages' in res && Array.isArray(res.messages)) vlanMessages.value.unshift(...res.messages)
  formOptions.vlanError(vlanMessages.value)
  const updatedModel = modelValue.value.map(item => {
    const replacement = res.data.find(i => i.id === item.id)
    return replacement || item
  })
  modelValue.value = updatedModel
  showModal.value = false
  router.push({ hash: '' })
}

function back() {
  prompt.show({
    title: $t('Go back?'),
    content: $t('Unsaved changes will be discarded'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => {
      showModal.value = false
      router.push({ hash: '' })
    }
  })
}

watch(
  () => showModal.value,
  val => {
    if (!val) {
      router.push({ hash: '' })
      hashSelectedPorts.value = []
      return
    }
    if (hashSelectedPorts.value.length === 0) router.push({ hash: `#${selectedPortsNames.value.join(',')}` })
    const { differs } = ports.getPortsConfig(selectedPorts.value, modelValue.value, configSettings)
    configsDiffer.value = differs
    vlanMessages.value = []
  }
)

watch(
  () => window.location.hash,
  newVal => {
    const patterns = ['_lan', '_wan', 'sfp', 'port']
    if (patterns.some(i => newVal.includes(i))) {
      const portsFromHash = newVal.substring(1).split(',')
      hashSelectedPorts.value = portsFromHash
      selectedPorts.value = portsFromHash
      nextTick(() => (showModal.value = true))
    }
  },
  { immediate: true }
)

defineExpose({ showModal })
</script>
