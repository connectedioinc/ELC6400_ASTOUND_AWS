<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'sstp/config' }]"
      :name="section.id"
      :uci-data="uciData"
      :after-save="afterSave"
      :error-handlers="{ edit: handleEditErrors }"
      data-key="sstp"
      :title="utils.getModalTitle('SSTP', props.section.id)"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable SSTP tunnel.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Server IP address or host name')"
        :help="$t('IP address and port (optional, default 443) of the remote SSTP server (e.g., 1.2.3.4, 1.2.3.4:1234, example.com:12).')"
        name="server"
        placeholder="0.0.0.0"
        rules="url"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('User name')"
        name="username"
        :placeholder="$t('User')"
        rules="credentials_validate"
        maxlength="512"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Password')"
        :help="$t('All characters are allowed except ` and space.')"
        name="password"
        password
        sensitive
        :placeholder="$t('Password')"
        rules="credentials_validate"
        maxlength="512"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Certificate files from device')"
        name="device_files"
      >
        <template #help>
          {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
          <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
          >.
        </template>
      </vuci-form-item-switch>
      <vuci-form-item-upload
        :uci-section="s"
        name="ca"
        :label="$t('CA cert')"
        :help="$t('Upload CA certificate in PEM format.')"
        :depend="s.device_files === '0'"
        :warnings="getUploadWarning"
        max-size="16MB"
      >
        <template #fileName="{ fileName }">
          {{ normalizeFileName(fileName) }}
        </template>
      </vuci-form-item-upload>
      <vuci-form-item-select
        :uci-section="s"
        name="ca"
        :label="$t('CA cert')"
        :help="$t('Upload CA certificate in PEM format.')"
        :options="certificateOptions"
        :warnings="getWarning"
        :depend="s.device_files === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Default route')"
        :help="
          $t(`When selected, this connection will become the device's default route.
                This means that all traffic directed to the Internet will go through the SSTP
                server and the server's IP address will be seen as this device's source IP to other hosts on the Internet.`)
        "
        name="defaultroute"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="sstp_options"
        :label="$t('Auth options')"
        type="tlt-select"
        :options="authOptions"
        allow-create
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { utils } from '@/plugins/utils'
import { normalizeFileName, getCertificateWarning } from '@/plugins/certificates'

const $t = useTranslate()

const props = defineProps({
  section: {
    type: Object,
    required: true
  }
})

const certificates = inject('certificates', ref([]))
const warningMessages = inject('warningMessages', () => [])
const setWarningMessages = inject('setWarningMessages', () => {})

const formData = ref({})

const authOptions = [
  ['noauth', $t('Noauth')],
  ['refuse-pap', $t('Refuse-pap')],
  ['refuse-eap', $t('Refuse-eap')],
  ['refuse-chap', $t('Refuse-chap')],
  ['refuse-mschap', $t('Refuse-mschap')]
]

const certificateWarnings = {
  1: $t("It's recommended to use a minimum RSA key length of 2048 bits for the certificate."),
  2: $t("It's recommended to use a minimum ECC key length of 256 bits for the certificate."),
  3: $t(`It's recommended to use a minimum key length of 2048 bits for the certificate.`)
}

const certificateOptions = computed(() => {
  return certificates.value.map(certificate => [certificate.path, normalizeFileName(certificate.fullname)])
})

const editErrors = computed(() => {
  return {
    152: $t('Uploaded certificate is not valid'),
    default: $t('Failed to edit configuration')
  }
})

const getUploadWarning = val => {
  return utils.certificateWarnings(val, warningMessages(), formData.value.sstp, certificateWarnings)
}

const getWarning = val => {
  return getCertificateWarning(val, certificates.value)
}

const afterSave = (_, response) => {
  const updatedMessages = warningMessages().filter(message => !message.source.startsWith(response.data.id))
  return setWarningMessages(updatedMessages.concat(response?.messages || []))
}

const handleEditErrors = res => {
  const errorCode = res.data.errors[0].code
  return editErrors.value[errorCode] || editErrors.value.default
}
</script>
