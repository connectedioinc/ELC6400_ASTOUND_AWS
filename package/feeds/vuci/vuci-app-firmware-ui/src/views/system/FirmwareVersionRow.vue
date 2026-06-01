<template>
  <span class="min-w-0 flex text-theme-text-secondary-subtle">
    <tlt-overflow-hint>
      {{ value }}
    </tlt-overflow-hint>
    <a
      v-if="downloadUrl"
      :href="downloadUrl"
      target="_blank"
    >
      <tlt-button
        button-id="external-link-fw_sdk"
        class="ml-2 pb-0"
        type="text"
        icon="download-import"
        color="primary"
      />
    </a>
    <tlt-hint class="shrink-0">
      <template #hintBox>
        <div class="flex flex-col">
          <strong>{{ type === 'stable' ? $t('Stable firmware') : $t('Latest firmware') }}</strong>
          <br />
          <span>
            {{ firmwareDescription }}
          </span>
          <br v-if="promotionText" />
          <span v-if="promotionText">
            {{ promotionText }}
          </span>
          <br v-if="downloadUrl" />
          <span v-if="downloadUrl">
            {{ downloadHintText }}
          </span>
          <div class="flex gap-2.5 text-theme-text-primary font-semibold mt-2">
            <a
              :href="type === 'latest' ? changelogUrl : stableChangeLogURL"
              target="_blank"
              class="no-underline text-theme-text-primary! font-semibold"
            >
              <tlt-button
                button-id="external-link-fw_sdk"
                type="text"
                icon="external-link"
                color="primary"
              />
              {{ $t('More about firmware') }}
            </a>
          </div>
        </div>
      </template>
      <tlt-icon
        icon="info"
        class="ml-2 size-5 text-theme-text-info"
      />
    </tlt-hint>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'

interface FirmwareUpdateInfo {
  stable_version?: string
  version?: string
  date?: string
  stable_date?: string
}

interface Props {
  value: string
  type: 'stable' | 'latest'
  downloadUrl?: string | null
  firmwareUpdateInfo?: FirmwareUpdateInfo
  changelogUrl: string
}

const props = withDefaults(defineProps<Props>(), {
  downloadUrl: null,
  firmwareUpdateInfo: () => ({}),
  changelogUrl: ''
})

const $t = useTranslate()

const isStable = computed(() => {
  return props.type === 'stable'
})

const firmwareDescription = computed(() => {
  return isStable.value
    ? $t(
        'This version has been tested through both internal QA processes and large-scale user deployments. All known issues have been resolved based on user reports and testing feedback. It is also deployed in mass production.'
      )
    : $t(
        'This is the most recent firmware release, featuring the latest updates, features, and fixes. While it has passed internal testing, it has not yet undergone widespread deployment or user validation. It may still contain undiscovered issues. We recommend testing on a small number of devices before considering broader updates.'
      )
})

const stableChangeLogURL = computed(() => {
  if (!props.changelogUrl || !props.firmwareUpdateInfo?.stable_version || !props.firmwareUpdateInfo?.stable_date || props.firmwareUpdateInfo?.stable_date === 'N/A') {
    return props.changelogUrl
  }
  const baseUrl = props.changelogUrl.replace('#Changelog', '')
  const version = props.firmwareUpdateInfo.stable_version.replace(/-/g, '.')
  const date = props.firmwareUpdateInfo.stable_date.replace(/-/g, '.')

  return `${baseUrl}#${version}_|_${date}`
})

const promotionText = computed(() => {
  return !isStable.value ? $t('If no critical issues are found, the latest firmware is promoted to stable after 4-6 weeks.') : null
})

const downloadHintText = computed(() => {
  const versionKey = isStable.value ? 'stable_version' : 'version'
  const version = props.firmwareUpdateInfo[versionKey]
  const typeText = isStable.value ? $t('New stable') : $t('Latest')
  return $t("%s firmware version '%s' is available for download.").format(typeText, version)
})
</script>
