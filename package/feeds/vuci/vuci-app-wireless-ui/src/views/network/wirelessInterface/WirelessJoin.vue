<template>
  <tlt-form
    ref="formRef"
    :model="form"
    sid="wireless_network_join"
    no-apply
  >
    <!-- maxlength null, to not show double error message, when length is more than 4096 -->
    <tlt-form-item-password
      v-if="props.network.encryption.wep || props.network.encryption.wpa"
      v-model="form.password"
      :label="$t('Password')"
      :help="$t('Custom passphrase used for authentication (at least 8 characters long).')"
      prop="key"
      rules="wpakey"
      :maxlength="null"
      required
    />
    <template #applyButton>
      <div class="flex justify-end">
        <tlt-button
          button-id="submit"
          @click="validate"
        >
          {{ $t('Submit') }}
        </tlt-button>
      </div>
    </template>
  </tlt-form>
</template>
<script lang="ts" setup>
import { ref } from 'vue'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import type TltForm from '@ui-core/tlt-design/form/core/TltForm.vue'
import type { ScanResult } from '@/types/wirelessTypes'

const props = defineProps<{ network: ScanResult }>()
const emit = defineEmits<{ submit: [JoinForm] }>()
const $t = useTranslate()
const message = useMessages()

export interface JoinForm {
  password: string
}

const form = ref<JoinForm>({ password: '' })

const formRef = ref<InstanceType<typeof TltForm> | null>(null)
function validate() {
  return formRef.value?.validate().then(({ valid }: { valid: boolean }) => {
    if (!valid) return message.error($t('Some fields are invalid'))
    emit('submit', form.value)
  })
}
</script>
