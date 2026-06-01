<template>
  <tlt-form
    ref="diagnosticsFormRef"
    :model="diagnosticsForm"
    :title="$t('Diagnostics')"
    :help="$t('This section is used to execute simple network diagnostic tests, including ping, traceroute and nslookup.')"
    custom-apply
    sid="diagnostics"
  >
    <tlt-form-item-radio-group
      v-model="diagnosticsForm.method"
      :label="$t('Method')"
      :options="methods"
      prop="method_type"
    >
      <template #help>
        <strong>{{ $t('Ping') }}</strong> - {{ $t('sends ICMP requests to the specified address.') }}<br />
        <strong>{{ $t('Traceroute') }}</strong> - {{ $t('displays the path that packets have to take in order to reach the specified address.') }}<br />
        <strong>{{ $t('Nslookup') }}</strong> - {{ $t('obtains domain name address and IP address mapping information.') }}
      </template>
    </tlt-form-item-radio-group>
    <tlt-form-item-radio-group
      v-model="diagnosticsForm.proto"
      :label="$t('Protocol')"
      :help="$t('Selects the IP (Internet Protocol) version.')"
      :options="subMethods"
      prop="protocol_type"
    />
    <tlt-form-item-input
      v-model="diagnosticsForm.host"
      prop="host"
      :label="$t('Address')"
      :help="$t('IP address or hostname to perform the diagnostic test on.')"
      :rules="addressRule"
      :placeholder="diagnosticsForm.proto === 'ipv4' ? '8.8.8.8' : '0000:0000:0000:0000:0000:0000:0000:0000'"
      required
    />
    <tlt-form-model-item>
      <tlt-button
        button-id="perform"
        @click="runDiagnostics"
      >
        {{ $t('Perform') }}
      </tlt-button>
    </tlt-form-model-item>
    <tlt-form-item-text-area
      v-if="stdout !== ''"
      prop="output"
      rules="string"
      :label="$t('Diagnostics result')"
      rows="10"
      copy-button
      readonly
      :maxlength="null"
      :model-value="stdout"
    />
  </tlt-form>
</template>

<script lang="ts" setup>
import { type Ref, type ComponentPublicInstance, ref, computed, reactive } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'

interface RadioOption {
  value: string
  name: string
}

interface DiagnosticsForm {
  host: string
  method: 'ping' | 'traceroute' | 'nslookup'
  proto: 'ipv4' | 'ipv6'
}

const $t = useTranslate()
const store = useMainStore()
const message = useMessages()

const diagnosticsFormRef: Ref<ComponentPublicInstance<typeof VuciForm> | null> = ref(null)
const stdout = ref<string>('')

const methods = reactive<RadioOption[]>([
  { value: 'ping', name: $t('Ping') },
  { value: 'traceroute', name: $t('Traceroute') },
  { value: 'nslookup', name: $t('Nslookup') }
])

const subMethods = reactive<RadioOption[]>([
  { value: 'ipv4', name: 'IPv4' },
  { value: 'ipv6', name: 'IPv6' }
])

const diagnosticsForm = reactive<DiagnosticsForm>({
  host: '',
  method: 'ping',
  proto: 'ipv4'
})

const protoDepend = computed((): boolean => {
  return diagnosticsForm.method === 'ping' || diagnosticsForm.method === 'traceroute'
})

const addressRule = computed((): string => {
  if (!protoDepend.value) return 'host'
  return diagnosticsForm.proto === 'ipv4' ? 'ipv4host' : 'ipv6host'
})

const runDiagnostics = async (): Promise<void> => {
  const res = await diagnosticsFormRef.value?.validate()
  if (!res?.valid) {
    message.error($t('Some fields are invalid'))
    return
  }
  store.spin($t('Performing'))
  let requestData: Record<string, string> = {}
  if (diagnosticsForm.method === 'nslookup') {
    requestData = {
      host: diagnosticsForm.host
    }
  } else {
    requestData = {
      host: diagnosticsForm.host,
      proto: diagnosticsForm.proto
    }
  }
  return axios
    .post(`/api/diagnostics/actions/${diagnosticsForm.method}`, { data: requestData }, { cancellable: true })
    .then(({ data }) => {
      stdout.value = data.response
    })
    .catch(() => {
      message.error($t('Failed to run diagnostics'))
    })
    .finally(() => store.spin(false))
}

defineExpose({
  diagnosticsForm,
  protoDepend,
  addressRule
})
</script>
