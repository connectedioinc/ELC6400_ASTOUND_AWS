<template>
  <tlt-modal
    :open="props.open"
    :nav-bar="[$t('Sign')]"
    @close="closeModal"
  >
    <tlt-form
      ref="signForm"
      :model="signing"
      sid="cert_generation_sign_toggle"
      :title="$t('Certificate signing')"
    >
      <tlt-form-item-input
        v-model="signing.name"
        :label="$t('Signed certificate name')"
        placeholder="Name"
        prop="cert_generation_sign_name"
        maxlength="64"
        rules="no_prefix(\'../\')"
        required
      />
      <tlt-form-item-radio-group
        v-model="signing.type"
        :label="$t('Type of certificate to sign')"
        prop="cert_generation_sign_type"
        :options="signingTypes"
        :disabled="$store.readOnlyPage"
      />
      <tlt-form-item-select
        v-model="signing.request_file"
        :label="$t('Certificate request file')"
        :options="certReqFiles"
        prop="cert_generation_sign_request"
        required
      />
      <tlt-form-item-input
        v-model="signing.valid"
        :label="$t('Days valid')"
        :help="$t('Days until certificate expires.')"
        placeholder="3650"
        required
        prop="valid"
        :rules="['uinteger', 'range(1, 3650)']"
      />
      <tlt-form-item-select
        v-model="signing.ca_name"
        :label="$t('Certificate authority file')"
        :options="caCerts"
        :warnings="getWarning"
        prop="cert_generation_sign_ca"
        :depend="signing.type === 'server' || signing.type === 'client'"
      />
      <tlt-form-item-select
        v-model="signing.ca_key"
        :label="$t('Certificate authority key')"
        :options="caKeys"
        :warnings="getKeyWarning"
        prop="cert_generation_sign_key"
      />
      <tlt-form-item-switch
        v-model="signing.delete"
        :help="$t('Delete certificate signing request after signing.')"
        :label="$t('Delete signing request')"
        true-value="1"
        false-value="0"
        prop="cert_generation_sign_delete_request"
      />
      <tlt-form-item-select
        v-model="signing.host"
        :label="$t('Hosts')"
        :help="$t('Enter all hostnames, domains, subdomains, you want to protect with this certificate. Each entry will be added as a Subject Alternative Name (SAN) to your certificate.')"
        prop="host"
        rules="hostname"
        allow-create
        multiple
        :placeholder="$t('-- Please select --')"
      />
      <tlt-form-item-select
        v-model="signing.ip_address"
        :label="$t('IP addresses')"
        :help="$t('Enter all IP addresses you want to protect with this certificate. Each entry will be added as a Subject Alternative Name (SAN) to your certificate.')"
        prop="ip_address"
        rules="ip4addr"
        allow-create
        multiple
        :placeholder="$t('-- Please select --')"
      />
    </tlt-form>
    <div class="flex justify-end list-layout--ignore">
      <tlt-button
        button-id="saveandapply"
        @click="signCertificate"
      >
        {{ $t('Sign') }}
      </tlt-button>
    </div>
  </tlt-modal>
</template>

<script lang="ts" setup>
import type TltForm from '@ui-core/tlt-design/form/core/TltForm.vue'
import { type Ref, type ComponentPublicInstance, ref, computed } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import type { GeneratedCert } from '@/types/certTypes'
import { filterFiles } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'
import { getCertificateWarning } from '@/plugins/certificates'

interface SigningData {
  name: string
  type: 'ca' | 'server' | 'client'
  request_file: string
  valid: string
  ca_name: string
  ca_key: string
  delete: string
  host: string[]
  ip_address: string[]
}

interface SigningType {
  value: 'ca' | 'server' | 'client'
  name: string
}

interface Props {
  open: boolean
  certificates: GeneratedCert[]
}
const props = defineProps<Props>()

const emit = defineEmits(['close'])

const $t = useTranslate()
const prompt = usePrompt()
const message = useMessages()
const store = useMainStore()
const certificatesStore = useCertificatesStore()

const signForm: Ref<ComponentPublicInstance<typeof TltForm> | null> = ref(null)

const signing = ref<SigningData>({
  name: '',
  type: 'ca',
  request_file: '',
  valid: '',
  ca_name: '',
  ca_key: '',
  delete: '',
  host: [],
  ip_address: []
})

const signingTypes = ref<SigningType[]>([
  { value: 'ca', name: $t('Authority') },
  { value: 'server', name: $t('Server') },
  { value: 'client', name: $t('Client') }
])

const caCerts = computed(() => certificatesStore.caCertFiles)

const caKeys = computed(() => certificatesStore.caKeyFiles)

const certReqFiles = computed(() => {
  const options = filterFiles(props.certificates, 'req')
    .filter(v => v.cert_type === signing.value.type || v.cert_type === 'import')
    .map(k => ({
      key: k.fullname,
      value: k.fullname
    }))
  return options.length > 0 ? options : [{ key: '', value: $t('-- No request files to sign --') }]
})

const getWarning = (val: string): string | undefined => {
  return getCertificateWarning(val, filterFiles(props.certificates, 'cert'))
}

const getKeyWarning = (val: string): string | undefined => {
  return getCertificateWarning(val, filterFiles(props.certificates, 'key'))
}

const signCertificate = (): Promise<void> => {
  return signForm.value?.validate?.().then((validationResult: { message: string; valid: boolean }) => {
    if (!validationResult.valid) {
      return message.error($t('Some fields are invalid'))
    }
    const { type, name, request_file, valid, ca_key, ca_name, host, ip_address } = signing.value
    store.spin($t('Signing certificates...'))
    return axios
      .post('/api/certificates/actions/sign', {
        data: {
          type,
          name,
          req_file: request_file,
          days: valid || '3650',
          ca_key,
          ca: ca_name,
          delete: signing.value.delete,
          host,
          ip_address
        }
      })
      .then(() => {
        message.success($t('Certificate signed successfully'))
        certificatesStore.getCertificates(true)
      })
      .catch(error => {
        if (error.response) {
          switch (error.response.data.errors[0].code) {
            case 1:
              message.error($t('No arguments to sign the certificate provided'))
              break
            case 6:
              message.error($t('File %s already exists.').format(error.response.data.errors[0].source.split(': ')[1]))
              break
            case 122:
              message.error($t('Failed to sign certificate'))
              break
            default:
              message.error($t('An unexpected error has occurred'))
          }
        }
      })
      .finally(() => {
        store.spin(false)
        resetForm()
        emit('close')
      })
  })
}

const resetForm = (): void => {
  signing.value = {
    name: '',
    type: 'ca',
    request_file: '',
    valid: '',
    ca_name: '',
    ca_key: '',
    delete: '',
    host: [],
    ip_address: []
  }
}

const closeModal = (): void => {
  prompt.show({
    title: $t('Go back?'),
    content: $t('Unsaved changes will be discarded'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => {
      resetForm()
      emit('close')
    }
  })
}
</script>
