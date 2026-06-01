<template>
  <tlt-modal
    :open="props.open"
    :nav-bar="[$t('Create')]"
    @close="confirmClose"
  >
    <tlt-form
      ref="formRef"
      :model="form"
      custom-save
      sid="certificate_generation"
      :title="$t('Create certificate')"
    >
      <tlt-form-item-select
        v-model="form.type"
        :label="$t('File type')"
        prop="type"
        :options="fileTypes"
        @change="updateCertList"
      >
        <template #help>
          <hint-helper v-bind="typeHint" />
        </template>
      </tlt-form-item-select>
      <tlt-form-item-select
        v-model="form.key"
        :help="$t('Certificate key size.')"
        :label="$t('Key size')"
        prop="key"
        :warnings="getKeySizeWarning"
        :options="keyOptions"
        :depend="showKeySelection"
      />
      <tlt-form-item-input
        v-model="form.name"
        :help="$t('Common name of the certificate.')"
        :label="$t('Common name')"
        prop="name"
        placeholder="teltonika"
        rules="no_prefix(\'../\')"
        maxlength="64"
        required
        :depend="form.type === 'scep'"
      />
      <tlt-form-item-input
        v-model="form.scep_server"
        :help="$t('URL of the SCEP server.')"
        :label="$t('SCEP server URL')"
        prop="scep_server"
        placeholder="http://example/cgi-bin/pkiclient.exe"
        rules="protourl"
        required
        :depend="form.type === 'scep'"
      />
      <tlt-form-item-input
        v-model="form.password"
        :help="
          $t('It\'s recommended to use a high-entropy shared-secret authentication string, such as a base64-encoded key from EAP or DNP3-SA protocols, for the initial SCEP certificate generation.')
        "
        :label="$t('Challenge')"
        password
        prop="password"
        maxlength="64"
        :depend="form.type === 'scep'"
      />
      <tlt-form-item-input
        v-model="form.name"
        :help="$t('Hostname that is linked to the device\'s public IP address.')"
        :label="$t('Domain')"
        prop="name"
        placeholder="cert.ddns.net"
        initial="cert"
        rules="hostname"
        required
        :depend="form.type === 'letsencrypt'"
      />
      <tlt-form-item-switch
        v-model="form.renew"
        :label="$t('Automatically renew')"
        :help="$t('Certificates will be automatically renewed every 60 days.')"
        prop="renew"
        :depend="form.type === 'letsencrypt'"
      />
      <tlt-form-item-input
        v-model="form.name"
        :help="$t('Common name and file name of the certificate.')"
        :label="$t('Name (CN)')"
        prop="name"
        placeholder="cert"
        initial="cert"
        rules="no_prefix(\'../\')"
        maxlength="64"
        required
        :depend="showNameField && form.type !== 'scep' && form.type !== 'letsencrypt'"
      />
      <tlt-form-item-switch
        v-model="showSubjectInfo"
        :help="$t('Check this to enter custom subject information.')"
        :label="$t('Subject information')"
        prop="certificate_generation_subject"
        :depend="isCaClientServer"
      />
      <tlt-form-item-input
        v-model="form.subject_cc"
        :label="$t('Country code (CC)')"
        prop="subject_cc"
        placeholder="LT"
        maxlength="2"
        :depend="showSubjectInfo && isCaClientServer"
      />
      <tlt-form-item-input
        v-model="form.subject_st"
        :label="$t('State or province name (ST)')"
        prop="subject_st"
        :depend="showSubjectInfo && isCaClientServer"
      />
      <tlt-form-item-input
        v-model="form.subject_l"
        :label="$t('Locality name (L)')"
        prop="subject_l"
        :depend="showSubjectInfo && isCaClientServer"
      />
      <tlt-form-item-input
        v-model="form.subject_o"
        :label="$t('Organization name (O)')"
        :placeholder="$brand('companyShort')"
        prop="subject_o"
        :depend="showSubjectInfo && isCaClientServer"
      />
      <tlt-form-item-input
        v-model="form.subject_ou"
        :label="$t('Organizational unit name (OU)')"
        prop="subject_ou"
        :depend="showSubjectInfo && isCaClientServer"
      />
      <tlt-form-item-switch
        v-model="shouldSign"
        :help="$t('Check this to sign the generated certificate with CA file.')"
        :label="$t('Sign the certificate')"
        prop="certificate_generation_sign"
        :depend="isCaClientServer"
        @change="validateSign"
      />
      <tlt-form-item-input
        v-model="form.days"
        :help="$t('Days until certificate expires.')"
        :label="$t('Days valid')"
        placeholder="3650"
        required
        :rules="['uinteger', 'irange(1, 3650)']"
        prop="days"
        :depend="shouldSign && isCaClientServer"
      />
      <tlt-form-item-select
        v-model="form.ca_name"
        :help="$t('Certificate authority file (used for signing client and server certificates).')"
        :label="$t('CA file name')"
        :options="caCerts"
        :warnings="(v: string) => getCertificateWarning(v, certificates)"
        prop="ca_name"
        :depend="shouldSign && (form.type === 'server' || form.type === 'client')"
      />
      <tlt-form-item-select
        v-model="form.ca_key"
        :help="$t('Certificate authority key for matching certificate authority file.')"
        :label="$t('CA key')"
        :options="caKeys"
        prop="certificate_generation_ca_key"
        :depend="shouldSign && (form.type === 'server' || form.type === 'client')"
      />
      <tlt-form-item-switch
        v-model="form.delete"
        :help="$t('Delete certificate signing request after signing.')"
        :label="$t('Delete signing request')"
        prop="certificate_generation_delete_sign"
        :depend="shouldSign && isCaClientServer"
      />
      <tlt-form-item-switch
        v-model="useDecryptionPassword"
        :help="$t('Add private key decryption password.')"
        :label="$t('Private key decryption password')"
        prop="certificate_generation_private_key"
        :depend="form.type === 'client'"
      />
      <tlt-form-item-input
        v-model="form.pass"
        :help="$t('Private key decryption password.')"
        :label="$t('Password')"
        placeholder="pass"
        password
        prop="pass"
        :depend="useDecryptionPassword && form.type === 'client'"
      />
      <tlt-form-item-select
        v-model="form.host"
        :label="$t('Hosts')"
        :help="$t('Enter all hostnames, domains, subdomains, you want to protect with this certificate. Each entry will be added as a Subject Alternative Name (SAN) to your certificate.')"
        prop="host"
        rules="hostname"
        allow-create
        multiple
        :placeholder="$t('-- Please select --')"
        :depend="form.type === 'simple'"
      />
      <tlt-form-item-select
        v-model="form.ip_address"
        :label="$t('IP addresses')"
        :help="$t('Enter all IP addresses you want to protect with this certificate. Each entry will be added as a Subject Alternative Name (SAN) to your certificate.')"
        prop="ip_address"
        rules="ip4addr"
        allow-create
        multiple
        :placeholder="$t('-- Please select --')"
        :depend="form.type === 'simple'"
      />
    </tlt-form>
    <div class="flex justify-end list-layout--ignore">
      <tlt-button
        button-id="generate"
        @click="generateCertificates"
      >
        {{ $t('Create') }}
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
import { useCertificatesStore } from '@/stores/certificates'
import { getCertificateWarning, getKeySizeWarning } from '@/plugins/certificates'
import HintHelper, { type Props as HintHelperProps, type OptionHint } from '@/components/shared/HintHelper.vue'
import type { GeneratedCert } from '@/types/certTypes'
import type { SelectOption } from '@ui-core/tlt-design/form/core/select/TltSelect.vue'

type CertificateType = 'simple' | 'ca' | 'server' | 'client' | 'dh' | 'letsencrypt' | 'scep'

interface CertFormData {
  type: CertificateType
  key: string
  name: string
  days: string
  ca_name: string
  ca_key: string
  pass: string
  delete: boolean
  subject_cc: string
  subject_st: string
  subject_l: string
  subject_o: string
  subject_ou: string
  host: string[]
  ip_address: string[]
  scep_server?: string
  password?: string
  renew?: boolean
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

const formRef: Ref<ComponentPublicInstance<typeof TltForm> | null> = ref(null)
const shouldSign = ref(false)
const useDecryptionPassword = ref(false)
const showSubjectInfo = ref(false)

const form = ref<CertFormData>({
  type: 'simple',
  key: '2048',
  name: '',
  days: '',
  ca_name: '',
  ca_key: '',
  pass: '',
  delete: false,
  subject_cc: '',
  subject_st: '',
  subject_l: '',
  subject_o: '',
  subject_ou: '',
  host: [],
  ip_address: []
})

const keyOptions: SelectOption[] = [
  { key: '512', value: '512' },
  { key: '1024', value: '1024' },
  { key: '2048', value: '2048' },
  { key: '4096', value: '4096' }
]

const isCaClientServer = computed((): boolean => {
  return ['ca', 'client', 'server'].includes(form.value.type)
})

const showKeySelection = computed((): boolean => {
  return isCaClientServer.value || form.value.type === 'dh' || form.value.type === 'scep'
})

const showNameField = computed((): boolean => {
  return isCaClientServer.value || form.value.type === 'dh'
})

const typeHint = computed<HintHelperProps>(() => {
  const baseOptions: OptionHint[] = [
    {
      hint: $t('generates CA, server & client certificates & keys.'),
      option: $t('Simple')
    }
  ]
  const letsEncryptOption: OptionHint = {
    hint: $t('generates SSL certificates.'),
    option: $t("Let's encrypt")
  }
  const scepOption: OptionHint = {
    hint: $t('generates SCEP (Simple Certificate Enrollment Protocol) certificate.'),
    option: $t('SCEP')
  }
  let options = [...baseOptions]
  if (store.hasPackages('letsencrypt.control')) {
    options.push(letsEncryptOption)
  }
  if (store.hasPackages('scep.control')) {
    options.push(scepOption)
  }
  return {
    mainHint: $t('Type of file to be generated.'),
    hints: options
  }
})

const fileTypes = computed((): SelectOption[] => {
  const types: SelectOption[] = [
    { key: 'simple', value: $t('Simple') },
    { key: 'ca', value: $t('CA') },
    { key: 'server', value: $t('Server') },
    { key: 'client', value: $t('Client') },
    { key: 'dh', value: $t('DH Parameters') }
  ]
  if (store.hasPackages('letsencrypt.control')) {
    types.push({ key: 'letsencrypt', value: $t("Let's encrypt") })
  }
  if (store.hasPackages('scep.control')) {
    types.push({ key: 'scep', value: $t('SCEP') })
  }
  return types
})

const caCerts = computed(() => certificatesStore.caCertFiles)

const caKeys = computed(() => certificatesStore.caKeyFiles)

const updateCertList = (type: string): void => {
  if (type === 'server' || type === 'client') {
    form.value.ca_name = ''
    form.value.ca_key = ''
    shouldSign.value = false
  }
}

const resetForm = (): void => {
  form.value = {
    type: 'simple',
    key: '2048',
    name: '',
    days: '',
    ca_name: '',
    ca_key: '',
    pass: '',
    delete: false,
    subject_cc: '',
    subject_st: '',
    subject_l: '',
    subject_o: '',
    subject_ou: '',
    host: [],
    ip_address: []
  }
  shouldSign.value = false
  useDecryptionPassword.value = false
  showSubjectInfo.value = false
}

const confirmClose = (): void => {
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

const validateSign = () => {
  if (['server', 'client'].includes(form.value.type) && (!caCerts.value.length || !caKeys.value.length)) {
    shouldSign.value = false
    return message.error($t('Please generate CA certificate and CA key to sign certificate.'))
  }
}

const generateCertificates = (): void => {
  formRef.value?.validate().then((validationResult: { message: string; valid: boolean }) => {
    if (!validationResult.valid) {
      return message.error($t('Some fields are invalid'))
    }
    const data = formRef.value!.getData()
    const subject =
      (data.subject_cc ? `/C=${data.subject_cc}` : '') +
      (data.subject_st ? `/ST=${data.subject_st}` : '') +
      (data.subject_l ? `/L=${data.subject_l}` : '') +
      (data.subject_o ? `/O=${data.subject_o}` : '') +
      (data.subject_ou ? `/OU=${data.subject_ou}` : '')
    const postData: Record<string, any> = {
      type: data.type,
      name: data.name,
      subject
    }
    if (data.type !== 'letsencrypt') {
      if (['server', 'ca', 'client', 'scep', 'dh', 'simple'].includes(data.type)) {
        Object.assign(postData, {
          sign: data.certificate_generation_sign ? '1' : '0',
          key_size: data.key,
          ca: data.ca_name,
          ca_key: data.certificate_generation_ca_key,
          delete: data.certificate_generation_delete_sign ? '1' : '0',
          pass: data.pass,
          password: data.password,
          host: data.host,
          ip_address: data.ip_address,
          scep_server: data.scep_server
        })
        if (['server', 'ca', 'client'].includes(data.type)) {
          postData.days = Number(data.days)
        }
      }
    } else {
      postData.renew = data.renew ? '1' : '0'
    }
    resetForm()
    emit('close')
    if (postData.scep_server) {
      message.success($t('Started certificate generation'))
    }
    axios
      .post('/api/certificates/actions/generate', { data: postData })
      .then(() => {
        message.success($t('Certificate(s) created successfully'))
        certificatesStore.getCertificates(true)
      })
      .catch(e => {
        if (e.response) {
          switch (e.response.data.errors[0].code) {
            case 6:
              message.error($t('File %s already exists.').format(e.response.data.errors[0].source.split(': ')[1]))
              break
            case 7:
              message.error($t('CA certificate and CA key are required for certificate signing'))
              break
            case 8:
              message.error($t('Invalid domain provided'))
              break
            case 9:
              message.error($t('Could not resolve domain to device IP address, make sure domain is pointed to device public IP address'))
              break
            case 10:
              message.error($t('Failed to enroll certificate'))
              break
            case 150:
              message.error($t('Failed to generate certificate files (low memory)'))
              break
            default:
              message.error($t('Unexpected error has occurred'))
          }
        }
      })
  })
}
</script>
