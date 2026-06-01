<template>
  <confirm
    :open="!!confirmCardData && showPrompt"
    :title="confirmCardData?.title"
    :content="confirmCardData?.subtitle || promptContext?.error || ''"
    :ok-text="confirmCardData?.submitText"
    :on-ok="confirmCardData?.submitAction"
    :on-cancel="handleModalClose"
    :cancel-text="$t('Cancel')"
    :icon="confirmCardData?.icon"
  />
  <verify-modal
    id="packageUpload"
    :open="!!uploadCardData && showPrompt"
    :title="uploadCardData?.title"
    :message="uploadCardData?.installText"
    :proceed-text="uploadCardData?.submitText || $t('Submit')"
    :show-actions="promptContext?.actionName === 'uploadInstall'"
    @proceed="uploadCardData?.submitAction"
    @cancel="handleModalClose()"
    @close="handleModalClose()"
  >
    <template v-if="promptContext?.actionName === 'uploadInstall'">
      <status-row
        :has-accordion="!matches"
        :status="promptContext.verified ? 'success' : 'error'"
        :icon="promptContext.verified ? 'authorized' : 'unauthorized'"
        :header="promptContext.verified ? $t('Authorized file') : $t('Unauthorized file')"
        name="auth"
      >
        <template #content>
          <div class="lg:mr-[calc(20%-1rem)]">
            {{
              promptContext.verified
                ? $t('Uploaded package is digitally signed and authorized by %s').format(brand.text('company'))
                : $t('Uploaded package is NOT digitally signed and authorized by %s').format(brand.text('company'))
            }}
          </div>
        </template>
      </status-row>
      <status-row
        :has-accordion="!matches"
        icon="validation"
        :header="$t('Validation succeeded')"
        name="validation"
      >
        <template #content>
          {{ $t('Please compare checksums listed below with the original file to ensure data integrity') }}
          <collapsable-list
            :items="[
              { label: 'MD5', value: promptContext.checksum },
              { label: 'SHA256', value: promptContext.sha256 }
            ]"
            :expand-text="$t('Show checksums')"
            :collapse-text="$t('Hide checksums')"
          />
        </template>
      </status-row>
      <div v-if="getFollowUpAction(promptContext)">
        <tlt-alert
          id="restart"
          inline
          type="info"
          :text="$t('After proceeding, the device will be temporary unreachable')"
        />
      </div>
    </template>
    <template v-if="promptContext?.actionName === 'upload'">
      <tlt-form-model-item :label="$t('Package')">
        <tlt-upload
          ref="uploadPackageRef"
          name="package_file"
          path="/tmp/package.tar.gz"
          action="/api/package_manager/actions/upload_package"
          :errors="handleUploadError"
          instant
          @uploaded="setPromptToInstall"
        />
      </tlt-form-model-item>
      <tlt-form-model-item label=" ">
        <tlt-alert
          id="redirect"
          class="max-w-xs"
          type="info"
          inline
        >
          {{ $t('Packages and their firmware range must be suitable for this device.') }}
          <div class="flex gap-2.5 text-theme-text-primary font-semibold mt-2">
            <tlt-icon
              icon="external-link"
              class="shrink-0"
            />
            <a
              :href="brand.text('packageDownloadURL').format($store.device, store?.deviceInfo?.static.fw_version)"
              target="_blank"
              class="visited:text-theme-text-primary! no-underline text-inherit"
              >{{ $t('View packages repository') }}</a
            >
          </div>
        </tlt-alert>
      </tlt-form-model-item>
    </template>
  </verify-modal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { axios } from '@ui-core/plugins/axios'
import { useMessages, usePrompt } from '@/stores/messages'
import { brand } from '@ui-core/plugins/brand'
import { usePackageTableActions } from '../../components/services/composables/actions/usePackageTableActions'
import { getActionErrorTranslate } from '../../components/services/packageSharedUtils'
import Confirm from '@/components/Messenger/Confirm.vue'
import StatusRow from '@ui-core/tlt-design/customComponents/StatusRow.vue'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import { usePackageUploadActions } from '../../components/services/composables/actions/usePackageUploadActions'
import { usePackageFollowUpActions } from '../../components/services/composables/actions/usePackageFollowUpActions'
import type { PackageData, PromptContext, PackageActions } from '@/types/packageTypes'
import VerifyModal from '@/components/VerifyModal.vue'

type UploadError = {
  response: {
    data: {
      errors: Array<{
        code: number
        value: string
      }>
    }
  }
}

const props = defineProps<{
  promptContext: PromptContext | null
  showPrompt: boolean
}>()

const emit = defineEmits<{
  (e: 'close-prompt'): void
  (e: 'submit'): void
  (e: 'update-prompt-context', data: PromptContext): void
  (e: 'package-installed', data: PackageData): void
}>()

const $t = useTranslate()
const store = useMainStore()
const message = useMessages()
const prompt = usePrompt()

const uploadPackageRef = ref()

const matches = useMediaQuery('(min-width: 1024px)')

const { uploadPackages } = usePackageUploadActions(emit as (event: string, ...args: any[]) => void, handleModalClose, setPromptContext)
const { tableActions } = usePackageTableActions(emit as (event: string, ...args: any[]) => void)
const { followUpActions, getFollowUpAction } = usePackageFollowUpActions()

const iconType = {
  info: { name: 'info', class: 'text-theme-text-info' },
  warning: { name: 'warning', class: 'text-theme-text-warning' },
  error: { name: 'error', class: 'text-theme-text-danger' }
} as const

const uploadErrorTranslates: Record<number | 'default', string> = {
  1: $t('Invalid file'),
  7: $t('Package service is busy, try again later'),
  150: $t('Not enough free space in RAM'),
  default: $t('Package installation failed')
}

function handleUploadError(code: number, err: UploadError) {
  if (code === 2) {
    uploadPackageRef.value?.resetInput?.()
    return nextTick(() => {
      setPromptAfterInstall('uploadError', code, { packageName: err.response.data.errors[0].value })
    })
  }
  return uploadErrorTranslates[code] || uploadErrorTranslates.default
}

const confirmCardActions: PackageActions = { ...tableActions, ...followUpActions }

const confirmCardData = computed(() => {
  let uploadPrompt
  const prompt = getPrompt(confirmCardActions)

  if (!prompt) {
    uploadPrompt = getUploadPrompt(true)
    if (!uploadPrompt) return
  }
  const { icon = 'info', ...restPrompt } = prompt || uploadPrompt || {}

  return {
    ...restPrompt,
    icon: iconType[icon]
  }
})

const uploadCardData = computed(() => {
  return getUploadPrompt()
})

function getPrompt(actions: PackageActions) {
  if (!props.promptContext) return
  const actionName = props.promptContext?.actionName || ''
  const { prompt } = actions?.[actionName]?.(props.promptContext) || {}
  return prompt
}

function getUploadPrompt(isConfirmCard = false) {
  const prompt = getPrompt(uploadPackages)
  if (!prompt || !prompt?.isConfirmCard === isConfirmCard) return
  return prompt
}

function handleModalClose(showConfirm = true) {
  if (!showConfirm || props.promptContext?.actionName !== 'uploadInstall') return emit('close-prompt')
  prompt.show({
    title: $t('Go back?'),
    content: $t('The package installation will be discarded, and you will need to re-upload the package.'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => handleInstallReset().then(() => emit('close-prompt'))
  })
}

function handleInstallReset() {
  store.spin($t('Removing package install files'))
  return axios
    .post('/api/package_manager/actions/delete_install_files')
    .catch(() => {
      message.error($t('Failed to remove installation files'))
    })
    .finally(() => store.spin(false))
}

function setPromptToInstall({ res }: { res: { data: PackageData } }) {
  const { name: packageName, ...restPackageData } = res?.data || {}
  nextTick(() => {
    setPromptContext('uploadInstall', { packageName, ...restPackageData })
  })
}

function setPromptAfterInstall(actionName: string, errorCode = 0, data?: PromptContext) {
  setPromptContext(actionName, data || {}, errorCode)
}

function setPromptContext(actionName: string, extraData: Record<string, any> = {}, errorCode?: number) {
  emit('update-prompt-context', {
    ...(errorCode !== undefined && errorCode !== 0 ? { error: getActionErrorTranslate(errorCode, 'upload') } : {}),
    ...extraData,
    actionName
  })
}
</script>
