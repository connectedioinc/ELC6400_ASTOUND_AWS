<template>
  <vuci-form
    ref="form"
    v-model="formData"
    config="siteman"
    :after-load="afterLoad"
  >
    <template #default="{ uciData }">
      <tlt-card :title="$t('General')">
        <tlt-form-item-switch
          v-model="enabled"
          :help="$t('Enable or disable Site manager service')"
          :label="$t('Enable')"
          prop="enabled"
          @change="updateUciData"
        />
      </tlt-card>
      <vuci-named-section
        v-slot="{ s }"
        :uci-data="uciData"
        :title="$t('Change password')"
        :help="$t('Changes passwords across all devices. Device password will be updated upon pairing.')"
        type="siteman"
        :endpoints="[{ endpoint: 'site_manager/global' }]"
        :error-handlers="{ edit: handleEditErrors }"
        data-key="settings"
        :exception-options="['enabled']"
        :after-save="onAfterSave"
      >
        <vuci-form-item-input
          :uci-section="s"
          name="password"
          password
          :label="$t('New password')"
          maxlength="256"
          :minlength="passwordMinLength"
          :can-randomize="{ length: randomPasswordLength }"
          :rules="v => [v.renew_password.bind(v, passwordPolicy)]"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="password_confirm"
          password
          :label="$t('Confirm new password')"
          :required="s.password !== ''"
          maxlength="256"
          :minlength="passwordMinLength"
          :rules="v => [v.renew_password.bind(v, passwordPolicy), isMatchingPasswords]"
        />
        <tlt-inline-message
          type="info"
          :message="infoMessage"
        />
      </vuci-named-section>
    </template>
    <template #form-buttons="{ save }">
      <tlt-button
        class="ml-auto"
        button-id="saveandapply"
        @click="save"
      >
        {{ $t('Save & Sync') }}
      </tlt-button>
    </template>
  </vuci-form>
</template>
<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import type { DevmanGlobalConfig, DevmanDeviceConfig } from './SitemanTypes'
import { useDevmanCommonFunction } from './SitemanCommon'
import { useMainStore } from '@/stores/main'
import type { PasswordPolicy } from '@/types/passwordPolicyTypes'
import { isArray } from '@ui-core/utils/inspect'

const { composeAlert, editErrors } = useDevmanCommonFunction()

const $t = useTranslate()
const message = useMessages()
const mainStore = useMainStore()

const enabled = ref(false)
const isPasswordSet = ref(false)
const formData = ref<{ settings: DevmanGlobalConfig[] }>({
  settings: [{ enabled: '0', password: '', password_confirm: '' }]
})
const pairedDevices = ref<DevmanDeviceConfig[]>([])

type ExtendedPasswordPolicy = PasswordPolicy & { password_length?: string }

const passwordPolicy = computed<ExtendedPasswordPolicy>(() => mainStore.passwordPolicy as ExtendedPasswordPolicy)

const passwordMinLength = computed(() => {
  const length = Number(passwordPolicy.value.password_length)
  return Number.isFinite(length) && length > 0 ? length : 8
})

const randomPasswordLength = computed(() => Math.max(16, passwordMinLength.value))

type ErrorItem = {
  code: number
  value: any[]
}

type Data = {
  errors: ErrorItem[]
}

const infoMessage = computed(() => {
  if (isPasswordSet.value) {
    return $t('The password is set and will be applied to all devices.')
  }
  return $t('Please set a password as it has not been configured yet. Updated password will be applied to all devices.')
})

function ensurePasswordPolicy() {
  if (Object.keys(passwordPolicy.value).length) return
  axios
    .get('/api/password_policy/config')
    .then(({ data }) => {
      if (isArray(data) && data.length !== 0) {
        mainStore.passwordPolicy = { ...data[0] }
      }
    })
    .catch(() => {
      message.error($t('Failed to load password policy data'))
    })
}

function afterLoad(form: { settings: DevmanGlobalConfig[] }) {
  ensurePasswordPolicy()
  return axios
    .get('/api/site_manager/devices/config')
    .then(({ data }) => {
      pairedDevices.value = data
    })
    .catch(() => {
      message.error($t('Failed to load Site manager devices'))
    })
    .finally(() => {
      enabled.value = form.settings[0]?.enabled === '1'
      if (form.settings[0]?.password) {
        isPasswordSet.value = form.settings[0].password === 'set'
        form.settings[0].password = ''
      }
      return form
    })
}

function onAfterSave(_: unknown, { data }: { data: DevmanGlobalConfig }) {
  isPasswordSet.value = data.password === 'set'
  data.password = ''
  data.password_confirm = ''
}

function handleEditErrors({ data }: { data: Data }): string | undefined {
  const errorCode = data.errors[0].code
  const errorValues = data.errors[0].value
  if (errorCode === 21 && errorValues.length !== 0) {
    composeAlert(errorValues, getDeviceNames)
  }
  formData.value.settings[0].password = ''
  formData.value.settings[0].password_confirm = ''
  return editErrors[errorCode] || editErrors.default
}

function getDeviceNames(data: { device_name: string }[]) {
  return data.map(device => device.device_name)
}

function isMatchingPasswords() {
  if (formData.value.settings[0].password === formData.value.settings[0].password_confirm) {
    return { isValid: true }
  }
  return {
    isValid: false,
    message: $t('New password confirmation must match new password')
  }
}

function updateUciData() {
  formData.value.settings[0].enabled = enabled.value ? '1' : '0'
}

onMounted(() => {
  ensurePasswordPolicy()
})
</script>
