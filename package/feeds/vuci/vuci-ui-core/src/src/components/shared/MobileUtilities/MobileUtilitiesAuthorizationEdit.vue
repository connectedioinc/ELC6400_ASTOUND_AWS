<template>
  <tlt-modal
    :open="open"
    @close="handleModalClose"
  >
    <tlt-form
      ref="tltFormRef"
      :title="$t('Set authorization')"
      :model="formData"
      sid="form"
    >
      <tlt-form-item-select
        v-if="isSmsView"
        v-model="formData.authorization"
        prop="authorization"
        :label="$t('Authorization method')"
        :help="
          $t(
            'When a message is received, its authenticity will be checked based on the selection in this field. \'SMS Rules\' can be authorized either by the device\'s password, custom password, serial number or not at all.'
          )
        "
        :options="getAuthorizationOptions()"
        :warnings="getAuthorizationWarning"
      />
      <tlt-form-item-input
        v-if="isSmsView"
        v-model="formData.password"
        prop="password"
        :label="$t('Password')"
        :help="
          $t(
            'When a message is received, its authenticity will be checked based on the selection in this field. \'SMS Rules\' can be authorized either by the device\'s password, custom password, serial number or no authentication at all.'
          )
        "
        rules="root_password"
        minlength="8"
        password
        sensitive
        required
        :depend="formData.authorization === 'local'"
        maxlength="80"
        can-randomize
      />
      <tlt-form-item-select
        v-model="formData.allowed_phone"
        prop="allowed_phone"
        :label="$t('Allowed number(s)')"
        :help="$t('Phone numbers which are allowed to trigger the rule.')"
        :options="phoneTypes"
      />
      <tlt-form-item-input
        v-model="formData.tel"
        prop="tel"
        :label="$t('Phone number')"
        :help="$t('A phone number that will be allowed to trigger the rule. The number must be specified in full format, country code included (e.g., +37000000000).')"
        rules="phonedigit"
        required
        placeholder="+37000000000"
        :depend="formData.allowed_phone === 'single'"
      />
      <tlt-form-item-select
        v-model="formData.group"
        prop="group"
        :label="$t('Phone group')"
        :help="$t('Phone numbers which are allowed to trigger the rule.')"
        required
        :options="userGroupOptions"
        :depend="formData.allowed_phone === 'group'"
      >
        <template #help>
          {{ $t("Recipient's phone number users group. Configure it") }}
          <router-link to="/system/admin/group/phone"> {{ $t('here') }} </router-link>.
        </template>
      </tlt-form-item-select>
    </tlt-form>
    <div class="flex justify-end">
      <tlt-button
        button-id="saveandapply"
        @click="handleSave"
      >
        {{ $t('Save & Apply') }}
      </tlt-button>
    </div>
  </tlt-modal>
</template>

<script setup lang="ts">
import type TltForm from '@ui-core/tlt-design/form/core/TltForm.vue'
import { type Ref, type ComponentPublicInstance, ref, inject } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { useMessages, usePrompt } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { useMobileUtilitiesAuthorization } from '@/composables/useMobileUtilitiesAuthorization'
import type { AuthorizationOptions, PhoneOptions } from '@/types/mobileUtilitiesTypes'

interface AuthorizationEditProps {
  open: boolean
  endpoint: string
  selectedIds: string[]
}

interface AuthorizationFormData {
  authorization?: AuthorizationOptions
  password?: string
  allowed_phone: PhoneOptions
  tel: string
  group: string
}

const props = defineProps<AuthorizationEditProps>()

const emit = defineEmits<{ close: [boolean] }>()

const isSmsView = inject<boolean>('isSmsView') || false

const { getAuthorizationOptions, getAuthorizationWarning, phoneTypes, userGroupOptions } = useMobileUtilitiesAuthorization()

const $t = useTranslate()
const message = useMessages()
const prompt = usePrompt()
const store = useMainStore()

const tltFormRef: Ref<ComponentPublicInstance<typeof TltForm> | null> = ref(null)

const defaultFormData: AuthorizationFormData = {
  allowed_phone: 'all',
  tel: '',
  group: userGroupOptions.value[0] || '',
  ...(isSmsView ? { authorization: 'password', password: '' } : {})
}

const formData: Ref<AuthorizationFormData> = ref({ ...defaultFormData })

function finalizeModalClose(onSave: boolean) {
  formData.value = { ...defaultFormData }
  emit('close', onSave)
}

function handleModalClose() {
  prompt.show({
    title: $t('Go back?'),
    content: $t('Unsaved changes will be discarded'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => finalizeModalClose(false)
  })
}

async function handleSave() {
  const { valid } = (await tltFormRef.value?.validate()) || { valid: false }
  if (!valid) return message.error($t('Some fields are not valid'))
  store.spin($t('Applying authorization settings'))
  const requestData = { data: props.selectedIds.map(id => ({ id, ...formData.value })) }
  return axios
    .put('/api/' + props.endpoint, requestData)
    .then(() => {
      message.success($t('Authorization settings applied successfully'))
      return finalizeModalClose(true)
    })
    .catch(() => message.error($t('Failed to save authorization settings')))
    .finally(() => store.spin(false))
}
</script>
