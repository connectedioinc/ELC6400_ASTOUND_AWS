<template>
  <tlt-modal
    :open="props.open"
    :nav-bar="[$t('Configure Root CA')]"
    @close="closeModal"
  >
    <tlt-form
      :title="$utils.getModalTitle($t('Root CA'))"
      sid="root_ca_section"
    >
      <tlt-form-item-switch
        v-model="deviceCA"
        :label="$t('Root CA file from device')"
        :help="$t('Choose this option if you want to select certificate files from device.')"
        prop="ca_from_device"
      >
      </tlt-form-item-switch>
      <tlt-form-model-item
        v-if="!deviceCA"
        :label="$t('Root CA file')"
      >
        <tlt-upload
          instant
          name="ca_file"
          action="/api/certificates/root_ca/config"
          path="/etc/cacert.pem"
          :max-size="10240"
          @uploaded="onUpload"
        />
      </tlt-form-model-item>
      <tlt-form-item-select
        v-model="selectedFile"
        :label="$t('Root CA file')"
        :help="$t('Select Root CA file.')"
        :warnings="getWarning"
        prop="root_ca"
        :options="caFileOpts"
        :depend="deviceCA"
      />
    </tlt-form>
    <div class="flex justify-between list-layout--ignore">
      <tlt-button
        button-id="reset"
        color="secondary"
        @click="resetCa"
      >
        {{ $t('Reset') }}
      </tlt-button>
      <tlt-button
        button-id="saveandapply"
        @click="rootCaDevice()"
      >
        {{ $t('Save & Apply') }}
      </tlt-button>
    </div>
  </tlt-modal>
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue'
import { whenever } from '@vueuse/core'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt } from '@/stores/messages'
import type { GeneratedCert } from '@/types/certTypes'
import { getCertificateWarning } from '@/plugins/certificates'

interface CAFileOption {
  key: string
  value: string
}

interface Props {
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits(['close'])

const $t = useTranslate()
const prompt = usePrompt()
const message = useMessages()

const caFileOpts = ref<CAFileOption[]>([])
const deviceCA = ref<boolean>(false)
const selectedFile = ref<string>('')
const certificates = ref<GeneratedCert[]>([])

const errorMessages: Record<number | string, string> = {
  151: $t('The maximum allowed file size is %s.').format('10.00 KB'),
  defaultMessage: $t('Failed to save Root CA.')
}

const getCaFiles = (): Promise<void> => {
  return axios
    .get('/api/certificates/ca/config')
    .then(({ data }) => {
      certificates.value = data.certificates
      caFileOpts.value = data.certificates.map((item: GeneratedCert) => ({
        key: item.path,
        value: item.fullname
      }))
    })
    .catch(() => {
      message.error($t('Failed to get certificates'))
    })
}

const rootCaDevice = (): Promise<void> => {
  return axios
    .post('/api/certificates/root_ca/actions/change', { data: { certificate: selectedFile.value } })
    .then(() => {
      message.success($t('Configuration has been applied'))
    })
    .catch(() => {
      message.error('Failed to save Root CA')
    })
    .finally(() => {
      resetForm()
      emit('close')
    })
}

const onUpload = (): void => {
  message.success($t('File uploaded successfully'))
  nextTick(() => emit('close'))
}

const resetCa = (): Promise<void> => {
  return axios
    .post('/api/certificates/root_ca/actions/reset')
    .then(() => {
      message.success($t('Root CA has been reset to default certificate'))
    })
    .catch(err => {
      const res = err?.response?.data?.errors[0]?.code
      message.error(errorMessages[res] || errorMessages.defaultMessage)
    })
    .finally(() => {
      resetForm()
      emit('close')
    })
}

const getWarning = (val: string): string | undefined => {
  return getCertificateWarning(val, certificates.value)
}

const resetForm = (): void => {
  deviceCA.value = false
  selectedFile.value = ''
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

whenever(() => props.open, getCaFiles)
</script>
