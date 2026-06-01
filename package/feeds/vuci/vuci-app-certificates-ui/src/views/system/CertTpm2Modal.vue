<template>
  <tlt-modal
    :open="props.open"
    :nav-bar="[$t('Move key to TPM2')]"
    @close="closeModal"
  >
    <tlt-form
      ref="moveKeyForm"
      :model="formData"
      sid="move_key_to_tpm2"
      :title="$t('Move key to TPM2')"
      :toggleable="false"
    >
      <template #title-content>
        {{
          $t(
            'Please select a key from the dropdown that you want to move to TPM2. This action cannot be undone. To remove the selected key from TPM2, you will need to delete it from the certificates list.'
          )
        }}
      </template>
      <tlt-form-item-select
        v-model="formData.keyFile"
        :label="$t('Key')"
        :options="keyFileOptions"
        prop="key_file"
        required
      />
    </tlt-form>
    <div class="flex justify-end mb-4">
      <tlt-button
        button-id="cancel"
        color="secondary"
        class="mr-2"
        @click="closeModal"
      >
        {{ $t('Cancel') }}
      </tlt-button>
      <tlt-button
        button-id="move-selected"
        color="primary"
        @click="moveKeyToTPM"
      >
        {{ $t('Move selected') }}
      </tlt-button>
    </div>
  </tlt-modal>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, usePrompt } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { axios } from '@ui-core/plugins/axios'
import type { ComponentPublicInstance } from 'vue'
import type TltForm from '@ui-core/tlt-design/form/core/TltForm.vue'
import type { GeneratedCert } from '@/types/certTypes'
import { normalizeFileName } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'

interface Props {
  open: boolean
  keyFiles: GeneratedCert[]
}

const props = defineProps<Props>()
const emit = defineEmits(['close'])

const $t = useTranslate()
const message = useMessages()
const prompt = usePrompt()
const store = useMainStore()
const certificatesStore = useCertificatesStore()

const moveKeyForm = ref<ComponentPublicInstance<typeof TltForm> | null>(null)

const formData = ref({
  keyFile: ''
})

const keyFileOptions = computed(() => {
  return props.keyFiles
    .filter(item => !item.tpm2 && item.fullname !== 'uhttpd.key')
    .map(file => ({
      key: file.fullname,
      value: normalizeFileName(file.fullname)
    }))
})

const moveKeyToTPM = (): Promise<void> => {
  return moveKeyForm.value?.validate?.().then((validationResult: { valid: boolean; message: string }) => {
    if (!validationResult.valid) {
      return message.error($t('Please select a key file'))
    }
    store.spin()
    return axios
      .post('/api/certificates/actions/import_tpm2', {
        data: {
          key: formData.value.keyFile
        }
      })
      .then(() => {
        message.success($t('Key successfully moved to TPM2'))
        certificatesStore.getCertificates(true)
      })
      .catch(() => {
        message.error($t('Failed to move key to TPM2 storage'))
      })
      .finally(() => {
        store.spin(false)
        resetForm()
        emit('close')
      })
  })
}

const resetForm = (): void => {
  formData.value = {
    keyFile: ''
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
