<template>
  <vuci-form
    ref="vuciFormRef"
    v-model="formData"
    config="package_restore"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        :uci-data="uciData"
        name="general"
        :title="$t('Package restore')"
        :endpoints="[{ endpoint: 'package_manager/restore/config' }]"
        data-key="package_restore"
        :initial-active="false"
      >
        <template #title-content>
          <UsageIndicator
            :label="$t('FLASH')"
            :used="flash.flash_used"
            :total="flash.flash_total"
            :free="flash.flash_free"
            reserved="100KB"
          />
        </template>
        <template #default="{ s }">
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable')"
            name="enabled"
            :help="$t('Enable automatic package installation after firmware upgrade with keep settings.')"
            @change="vuciFormRef?.save?.()"
          />
        </template>
      </vuci-named-section>
    </template>
    <template #form-buttons>
      <Empty />
    </template>
  </vuci-form>
  <package-table
    :packages="packages"
    :search-value="searchValue"
    :are-packages-loading="arePackagesLoading"
    :is-action-running="isActionRunning"
    :handle-package-list-refresh="handlePackageListRefresh"
    :reset-selected-packages="resetSelectedPackages"
    @reset-selected-packages="resetSelectedPackages = false"
    @update-packages="setPackageTypes"
    @open-prompt="openPrompt"
    @close-prompt="closePrompt"
  />
  <package-prompt
    :show-prompt="isPromptVisible"
    :prompt-context="promptContext"
    @update-packages="setPackageTypes"
    @update-prompt-context="setPromptContext"
    @package-installed="handlePackageInstalledEvent"
    @close-prompt="closePrompt"
  />
</template>

<script setup lang="ts">
import { type Ref, type ComponentPublicInstance, ref, watch, onMounted, onUnmounted } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useNotifications } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { brand } from '@ui-core/plugins/brand'
import { formBus } from '@ui-core/vuci-form'
import PackagePrompt from './PackagePrompt.vue'
import PackageTable from './PackageTable.vue'
import { usePackageConstants } from '../../components/services/composables/usePackageConstants'
import { usePackageStatus } from '../../components/services/composables/usePackageStatus'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import type { PromptContext } from '@/types/packageTypes'
import UsageIndicator from '@/components/UsageIndicator.vue'

interface FormData {
  enabled: boolean
}

const $t = useTranslate()
const store = useMainStore()
const notification = useNotifications()

const { packageTypes } = usePackageConstants()
const { flash, packages, arePackagesLoading, isActionRunning, handlePackageListRefresh, handlePackageInstalledEvent, handlePackageEvent, setPackageTypes } = usePackageStatus()

const vuciFormRef: Ref<ComponentPublicInstance<typeof VuciForm> | null> = ref(null)

const formData = ref<FormData | null>(null)
const promptContext = ref<PromptContext | null>(null)
const searchValue = ref('')
const isPromptVisible = ref(false)
const resetSelectedPackages = ref(false)

watch(packages, value => {
  const queuedPackageExists = value.some(pkg => pkg.type === packageTypes.PENDING)
  if (queuedPackageExists) return showNotification()
})

handlePackageListRefresh()

onMounted(() => {
  formBus.on('package-event', handlePackageEvent)
})

onUnmounted(() => {
  formBus.off('package-event', handlePackageEvent)
})

function openPrompt(data: PromptContext) {
  promptContext.value = { ...data }
  isPromptVisible.value = true
}

function closePrompt() {
  promptContext.value = {}
  resetSelectedPackages.value = true
  isPromptVisible.value = false
}

function setPromptContext(data: PromptContext) {
  promptContext.value = { ...data }
}

function showNotification() {
  return notification.info({
    id: 'internet-connection-notification',
    title: $t('Internet connection required'),
    text: $t('Queued packages require an internet connection for installation. If your device is offline, please download them manually and upload them for installation.'),
    action: {
      text: $t('Download packages'),
      href: brand.text('packageDownloadURL').format(store.device, store?.deviceInfo?.static.fw_version)
    }
  })
}
</script>
