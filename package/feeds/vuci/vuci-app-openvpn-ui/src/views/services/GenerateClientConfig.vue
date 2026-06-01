<template>
  <tlt-card :title="$t('Generate client configuration')">
    <tlt-form
      ref="formRef"
      v-model="formData"
      sid="generate_client_config"
    >
      <tlt-form-item-input
        v-model="formData.remote"
        :label="$t('Remote host/IP address')"
        :help="$t('IP address or domain name of the OpenVPN server.')"
        placeholder="0.0.0.0"
        required
        :readonly="false"
        prop="remote"
        rules="host"
        :depend="isMissingField('remote')"
      />
      <tlt-form-item-select
        v-model="formData.ca"
        prop="ca"
        :label="$t('Certificate authority')"
        :help="$t('The certificate will be added to the generated client configuration file.')"
        :options="caCertOptions"
        required
        :depend="isMissingField('ca')"
      />
      <tlt-form-item-select
        v-model="formData.cert"
        prop="cert"
        :label="$t('Client certificate')"
        :help="$t('The certificate will be added to the generated client configuration file.')"
        :options="clientCertOptions"
        required
        :depend="isMissingField('cert')"
      />
      <tlt-form-item-select
        v-model="formData.key"
        prop="key"
        :label="$t('Client key')"
        :help="$t('The private key will be added to the generated client configuration file.')"
        :options="clientKeyOptions"
        required
        :depend="isMissingField('key')"
      />
      <tlt-form-item-select
        v-model="formData.user"
        prop="user"
        :label="$t('Username')"
        :help="$t('VPN client username. When \'none\' is selected, the credentials will be excluded from the configuration file.')"
        :options="userOptions"
        required
        :depend="isMissingField('user')"
      />
      <tlt-inline-message
        type="info"
        class="mb-4"
      >
        {{ $t('Ensure the remote server address is reachable from the client and that the selected certificates are compatible with the server configuration. You can manage certificates') }}
        <router-link to="/system/admin/certificates">{{ $t('here.') }}</router-link>
      </tlt-inline-message>
    </tlt-form>
    <div class="flex justify-end mt-4">
      <tlt-button
        button-id="download-client-config"
        @click="generateConfig"
      >
        {{ $t('Download') }}
      </tlt-button>
    </div>
  </tlt-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { utils } from '@/plugins/utils'
import { normalizeFileName } from '@/plugins/certificates'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { GeneratedCert } from '@/types/certTypes'

interface MissingField {
  source: string
  error?: string
  [key: string]: any
}

interface FormData {
  remote?: string
  ca?: string
  cert?: string
  key?: string
  user?: string
}

interface Props {
  serverId?: string
  missingFields?: MissingField[]
  certificates?: GeneratedCert[]
}

const props = withDefaults(defineProps<Props>(), {
  serverId: '',
  missingFields: () => [],
  certificates: () => []
})

const emit = defineEmits(['generated'])

const $t = useTranslate()
const $message = useMessages()
const formRef = useTemplateRef('formRef')

const formData = ref<FormData>({
  remote: '',
  ca: '',
  cert: '',
  key: '',
  user: ''
})

const isMissingField = (fieldName: string) => {
  return props.missingFields.some((f: MissingField) => f.source === fieldName)
}

const clientKeyOptions = computed(() => {
  const filteredCerts = props.certificates.filter(cert => (cert.cert_type === 'client' || cert.cert_type === 'import') && cert.type === 'key')
  return mapCertificateFiles(filteredCerts)
})

const clientCertOptions = computed(() => {
  const filteredCerts = props.certificates.filter(
    cert => (cert.cert_type === 'client' || cert.cert_type === 'import' || (cert.cert_type === 'scep' && !cert.fullname.startsWith('ca'))) && cert.type === 'cert'
  )
  return mapCertificateFiles(filteredCerts)
})

const caCertOptions = computed(() => {
  const filteredCerts = props.certificates.filter(
    cert => (cert.cert_type === 'ca' || cert.cert_type === 'import' || (cert.cert_type === 'scep' && cert.fullname.startsWith('ca'))) && cert.type === 'cert'
  )
  return mapCertificateFiles(filteredCerts)
})

const userOptions = computed(() => {
  const match = props.missingFields.find(err => err.error?.includes('available options'))?.error?.match(/available options: \[(.*?)\]/)
  if (!match) return []
  const users = match[1].split(',').map(user => {
    const name = user.trim()
    return [name, name]
  })
  return users.sort((a, b) => Number(b[0] === 'none') - Number(a[0] === 'none'))
})

const mapCertificateFiles = (files: GeneratedCert[]): [string, string][] => {
  return files.map(cert => [cert.path, normalizeFileName(cert.fullname)])
}

const generateConfig = async () => {
  try {
    const dataToSend = formRef.value?.getData() || formData.value
    await utils.downloadFileApi(`/api/openvpn/${props.serverId}/actions/generate`, 'text/plain', 'POST', dataToSend)
    $message.success($t('Client configuration download was successful'))
    emit('generated')
  } catch {
    $message.error($t('Failed to generate configuration'))
  }
}

const getWanIpAddress = async () => {
  try {
    const { data } = await axios.get('/api/interfaces/status')
    const wanInterface = data.find((iface: any) => iface.area_type === 'wan' && iface.up === true && iface.ipaddrs?.length > 0)
    if (wanInterface) {
      formData.value.remote = wanInterface.ipaddrs[0].split('/')[0]
    }
  } catch {
    $message.error($t('Failed to get WAN interface IP address'))
  }
}

onMounted(() => {
  if (isMissingField('remote')) {
    getWanIpAddress()
  }
})
</script>
