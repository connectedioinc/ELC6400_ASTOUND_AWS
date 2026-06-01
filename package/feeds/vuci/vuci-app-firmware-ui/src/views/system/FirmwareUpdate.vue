<template>
  <tlt-card
    :title="title"
    :help="help"
    title-space-between
  >
    <template
      v-if="brand.text('subscribeURL')"
      #title-content
    >
      <tlt-hint
        class="self-center"
        :hints="[{ info: $t('Subscribe to newsletter and receive notifications about new firmware updates.') }]"
        show-icon="mobile"
      >
        <a
          :href="brand.text('subscribeURL')"
          target="_blank"
          class="no-underline self-center"
        >
          <tlt-button
            button-id="subscribe"
            type="text"
            color="primary"
            icon-left="mail"
          >
            {{ $t('Subscribe') }}
          </tlt-button>
        </a>
      </tlt-hint>
    </template>
    <tlt-form-item-radio-group
      :model-value="selectedFrom"
      :label="$t('Update from')"
      :help="$t('Selects whether the firmware will be downloaded from the server or uploaded manually.')"
      :prop="propPrefix + '_source'"
      :disabled="readOnlyPage"
      :options="fromOptionsComputed"
      @update:model-value="$emit('update:selectedFrom', $event)"
    >
      <template #after="{ option }">
        <tlt-hint
          v-if="option.disabled && type === 'modem'"
          :hints="[{ info: !fileUpdatesSupported ? $t('Modem updates from the file are not supported for this device.') : $t('Modem updates from the server are not supported for this device.') }]"
        >
          <tlt-icon
            icon="info"
            class="text-theme-text-info size-5 ml-2"
          />
        </tlt-hint>
      </template>
    </tlt-form-item-radio-group>
    <!-- Device-specific: Version selection -->
    <tlt-form-item-radio-group
      v-if="type === 'device'"
      :model-value="selectedVersion"
      :label="$t('Update to')"
      :help="$t('Type of firmware to download.')"
      prop="latest"
      :options="versionOptions"
      :depend="selectedFrom !== 'file'"
      @update:model-value="$emit('update:selectedVersion', $event)"
    />
    <!-- Modem-specific: Modem selection -->
    <tlt-form-item-radio-group
      v-if="type === 'modem' && modemOptions.length > 1"
      :model-value="selectedModem"
      :label="$t('Update for')"
      :help="$t('Select which modem to update.')"
      prop="modem_selection"
      :options="modemOptions"
      @update:model-value="$emit('update:selectedModem', $event)"
    />
    <!-- Modem-specific: Mobile connection message -->
    <tlt-inline-message
      v-if="type === 'modem' && selectedFrom === 'server' && showMobileMsg"
      id="dfota-mobile-message"
      type="info"
      :message="$t('Modem firmware update is only available using mobile connection.')"
    />
    <!-- Device-specific: Keep settings switch -->
    <tlt-form-item-switch
      v-if="type === 'device'"
      :model-value="keepSettings"
      :help="$t('Specifies whether to keep the current configuration after the firmware update.')"
      :label="$t('Keep settings')"
      prop="firmware_keep_settings"
      @update:model-value="$emit('update:keepSettings', $event)"
    />
    <tlt-form-model-item
      v-show="selectedFrom === 'file'"
      :label="$t('Image')"
      :help="uploadHelp"
    >
      <tlt-upload
        ref="upload"
        instant
        name="firmware"
        :action="uploadAction"
        :path="uploadPath"
        max-size="128MB"
        :errors="(code: number) => $emit('uploadError', code)"
        @uploaded="$emit('uploaded', $event)"
      />
    </tlt-form-model-item>
    <tlt-form-model-item
      v-show="selectedFrom === 'server'"
      :label="$t('Flash image')"
      :element-id="type === 'device' ? 'update' : 'modem-update'"
    >
      <tlt-button
        :disabled="readOnlyPage || !infoLoaded"
        @click="$emit('download')"
      >
        {{ $t('Update') }}
      </tlt-button>
    </tlt-form-model-item>
  </tlt-card>
  <grid-layout
    borders="row"
    class="grid-cols-fit-96"
  >
    <tlt-card
      class="md:flex-1"
      :title="currentInfoTitle"
      :help="currentInfoHelp"
    >
      <tlt-value-list
        :id="currentTableId"
        :data-source="currentData"
      >
        <template #fw_version_with_config_title="{ item }">
          <tlt-hint show-icon="mobile">
            {{ item.item.title }}
            <template #hintBox>
              <ul>
                <li
                  v-for="(hintItem, index) in item.item.customHints"
                  :key="index"
                >
                  <strong>{{ hintItem.title }}</strong
                  ><br />
                  {{ hintItem.info }}
                </li>
              </ul>
            </template>
          </tlt-hint>
        </template>
        <template #modem_version_with_config_title="{ item }">
          <tlt-hint show-icon="mobile">
            {{ item.item.title }}
            <template #hintBox>
              <ul>
                <li
                  v-for="(hintItem, index) in item.item.customHints"
                  :key="index"
                >
                  <strong>{{ hintItem.title }}</strong
                  ><br />
                  {{ hintItem.info }}
                </li>
              </ul>
            </template>
          </tlt-hint>
        </template>
      </tlt-value-list>
    </tlt-card>
    <tlt-card
      v-if="!!serverData.length"
      class="md:flex-1"
      :title="serverInfoTitle"
      :help="serverInfoHelp"
    >
      <tlt-value-list
        :id="serverTableId"
        :data-source="serverData"
      >
        <!-- Device-specific slots -->
        <template
          v-if="type === 'device'"
          #stable_fw_version_value="{ item }"
        >
          <firmware-version-row
            :value="item.value"
            type="stable"
            :download-url="parsedStableFwDownloadUrl"
            :firmware-update-info="firmwareUpdateInfo"
            :changelog-url="changelogUrl"
          />
        </template>
        <template
          v-if="type === 'device'"
          #latest_fw_version_value="{ item }"
        >
          <firmware-version-row
            :value="item.value"
            type="latest"
            :download-url="parsedLatestFwDownloadUrl"
            :firmware-update-info="firmwareUpdateInfo"
            :changelog-url="changelogUrl"
          />
        </template>
        <template
          v-if="type === 'device'"
          #fw_sdk_value
        >
          <span
            v-if="fwSdkUrl"
            class="min-w-0 flex text-theme-text-secondary-subtle"
          >
            {{ $t('View all') }}
            <a
              :href="fwSdkUrl"
              target="_blank"
            >
              <tlt-button
                button-id="external-link-fw_sdk"
                class="ml-2 pb-0"
                type="text"
                icon="external-link"
                color="primary"
              />
            </a>
          </span>
        </template>
        <template
          v-if="type === 'device'"
          #changelog_value
        >
          <span
            v-if="changelogUrl"
            class="min-w-0 flex text-theme-text-secondary-subtle"
          >
            {{ $t('View all') }}
            <a
              :href="changelogUrl"
              target="_blank"
            >
              <tlt-button
                button-id="external-link-changelog"
                class="ml-2 pb-0"
                type="text"
                icon="external-link"
                color="primary"
              />
            </a>
          </span>
        </template>
        <!-- Modem-specific slots -->
        <template
          v-if="type === 'modem'"
          #modem_value="{ item }"
        >
          <span class="min-w-0 flex text-theme-text-secondary-subtle">
            {{ item.value }}
            <tlt-hint
              :hints="[{ info: $t('The update from server may not always be the latest version, so you might need to perform update several times to ensure to have the latest modem firmware.') }]"
            >
              <tlt-icon
                icon="info"
                class="ml-2 text-theme-text-info size-5"
              />
            </tlt-hint>
          </span>
        </template>
      </tlt-value-list>
    </tlt-card>
  </grid-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import FirmwareVersionRow from './FirmwareVersionRow.vue'
import { brand } from '@ui-core/plugins/brand'
import type { Option } from '@ui-core/tlt-design/form/core/TltRadioGroup.vue'

interface TableDataItem {
  title: string
  value?: string
  slotName?: string
  hint?: string
  customHints?: Array<{ title: string; info: string }>
}

interface ModemOption {
  name: string
  value: string
}

interface FirmwareUpdateInfo {
  stable_version?: string
  version?: string
  date?: string
  stable_date?: string
}

interface Props {
  type: 'device' | 'modem'
  selectedFrom: 'server' | 'file'
  selectedVersion?: 'stable' | 'latest'
  selectedModem?: string
  keepSettings?: boolean
  readOnlyPage?: boolean
  infoLoaded?: boolean
  showMobileMsg?: boolean
  currentData: TableDataItem[]
  serverData: TableDataItem[]
  modemOptions?: ModemOption[]
  companyShort?: string
  fileUpdatesSupported?: boolean
  parsedStableFwDownloadUrl?: string
  parsedLatestFwDownloadUrl?: string
  firmwareUpdateInfo?: FirmwareUpdateInfo
  fwSdkUrl?: string
  changelogUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedVersion: 'stable',
  selectedModem: 'all',
  keepSettings: true,
  readOnlyPage: false,
  infoLoaded: false,
  showMobileMsg: false,
  modemOptions: () => [],
  companyShort: '',
  fileUpdatesSupported: true,
  parsedStableFwDownloadUrl: '',
  parsedLatestFwDownloadUrl: '',
  firmwareUpdateInfo: () => ({}),
  fwSdkUrl: '',
  changelogUrl: ''
})

defineEmits<{
  'update:selectedFrom': [value: 'server' | 'file']
  'update:selectedVersion': [value: 'stable' | 'latest']
  'update:selectedModem': [value: string]
  'update:keepSettings': [value: boolean]
  uploadError: [code: number]
  uploaded: [event: any]
  download: []
}>()

const $t = useTranslate()

const title = computed(() => (props.type === 'device' ? $t('Update device firmware') : $t('Update modem firmware')))

const help = computed(() =>
  props.type === 'device' ? $t("This section is used to update the device's firmware to another version.") : $t("This section is used to update the modem's firmware to another version.")
)

const currentInfoTitle = computed(() => (props.type === 'device' ? $t('Current firmware information') : $t('Current modem information')))

const currentInfoHelp = computed(() =>
  props.type === 'device'
    ? $t('This section displays information about the software currently installed on the device.')
    : $t('This section displays information about the modem firmware currently installed on the device.')
)

const serverInfoTitle = computed(() => (props.type === 'device' ? $t('Available firmware updates') : $t('Available modem firmware updates')))

const serverInfoHelp = computed(() =>
  props.type === 'device'
    ? $t('This section displays information on the firmware that is currently available for download from %s servers.').format(props.companyShort)
    : $t('This section displays information on the modem firmware that is currently available for download from %s servers.').format(props.companyShort)
)

const currentTableId = computed(() => (props.type === 'device' ? 'current_fw_table' : 'current_modem_table'))

const serverTableId = computed(() => (props.type === 'device' ? 'server_fw_table' : 'server_modem_table'))

const propPrefix = computed(() => (props.type === 'device' ? 'firmware' : 'modem_firmware'))

const uploadAction = computed(() => (props.type === 'device' ? '/api/firmware/actions/upload_device_firmware' : '/api/firmware/actions/upload_modem_firmware'))

const uploadPath = computed(() => (props.type === 'device' ? '/tmp/firmware.img' : '/storage/modemfw/modem_upgrade.bin'))

const uploadHelp = computed(() => (props.type === 'device' ? $t('Uploads a firmware image file.') : $t('Uploads a modem firmware image file.')))

const fromOptionsComputed = computed<Option<'server' | 'file'>[]>(() => {
  const options: Option<'server' | 'file'>[] = [
    {
      name: $t('Server'),
      value: 'server',
      disabled: props.type === 'modem' && props.fileUpdatesSupported
    },
    {
      name: $t('File'),
      value: 'file',
      disabled: props.type === 'modem' && !props.fileUpdatesSupported
    }
  ]
  return options
})

const versionOptions: Option<'stable' | 'latest'>[] = [
  { name: $t('Stable version'), value: 'stable' },
  { name: $t('Latest version'), value: 'latest' }
]
</script>
