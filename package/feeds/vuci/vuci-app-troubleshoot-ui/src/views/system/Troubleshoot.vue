<template>
  <tlt-form
    ref="formRef"
    :model="form"
    sid="wireless_network_join"
    :title="$t('Troubleshoot')"
    :help="$t('This section is used to download various files that contain information used for troubleshooting the device.')"
  >
    <template #title-content>
      <div class="flex flex-wrap justify-start sm:ml-auto w-full sm:w-auto">
        <tlt-button
          button-id="system-logs"
          color="tertiary"
          icon-left="system"
          class="px-3!"
          :disabled="false"
          @click="showLog('system')"
        >
          <tlt-hint
            :hints="
              $t(
                'Displays the contents of the device\'s system log file. \
                  The system log contains records of various system related events, such as starts/stops of various services, errors, reboots, etc.'
              )
            "
            show-icon="mobile"
          >
            <span>{{ $t('System logs') }}</span>
          </tlt-hint>
        </tlt-button>
        <tlt-button
          button-id="kernel-logs"
          color="tertiary"
          icon-left="kernel-logs"
          class="px-3!"
          :disabled="false"
          @click="showLog('kernel')"
        >
          <tlt-hint
            :hints="
              $t(
                'Displays the contents of the device\'s kernel log file. The kernel log contains \
                records of various events related to the processes of the operating system (OS).'
              )
            "
            show-icon="mobile"
          >
            <span>{{ $t('Kernel logs') }}</span>
          </tlt-hint>
        </tlt-button>
      </div>
    </template>
    <tlt-form-model-item
      :label="$t('Troubleshoot file')"
      :help="
        $t(
          'Downloads the device\'s Troubleshoot file. It contains the device\'s configuration information, logs and some other files. \
             When requesting support, it is recommended to always provide the device\'s Troubleshoot file to %s engineers for analysis.'
        ).format(brand.text('companyShort'))
      "
    >
      <tlt-button
        button-id="download"
        :readonly="isDownloadDisabled"
        prop="get_troubleshoot"
        type="text"
        @click="generateTroubleshoot"
      >
        {{ $t('Download') }}
      </tlt-button>
    </tlt-form-model-item>
    <tlt-form-item-switch
      v-model="form.encrypt"
      :label="$t('Encrypt')"
      :help="$t('Turn on AES 256 encryption and archive Troubleshoot file using zip format.')"
      prop="encrypt"
      true-value="1"
      false-value="0"
    />
    <tlt-form-item-password
      ref="password"
      v-model="form.password"
      :label="$t('Password')"
      prop="password"
      :help="$t('Password that will be used to encrypt Troubleshoot file. It will have to be provided when extracting formatted zip archive to gain access to a tar file.')"
      password
      can-randomize
      :rules="['root_password', 'defaulttype']"
      minlength="8"
      :depend="form.encrypt === '1'"
      :required="form.encrypt === '1'"
      no-write
    />
    <tlt-logs-modal
      ref="logsModal"
      :title="modal.info.title"
      :help="modal.info.help"
      :logs="modal.info.logInfo"
      :open="modal.show"
      custom-id="log-output"
      :nav-bar="[modal.info.title]"
      @close="modal.show = false"
    >
    </tlt-logs-modal>
  </tlt-form>
</template>

<script lang="ts" setup>
import { type Ref, type ComponentPublicInstance, ref, computed, watch } from 'vue'
import VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { brand } from '@ui-core/plugins/brand'
import { utils } from '@/plugins/utils'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import { useTimer } from '@ui-core/composables/useTimer'
import tltLogsModal from '@ui-core/tlt-design/layout/TltLogsModal.vue'
import { useRoute } from 'vue-router'

interface ModalInfo {
  title: string
  help?: string
  logInfo: string
}

export interface Modal {
  show: boolean
  info: ModalInfo
}

interface Form {
  password: string
  encrypt: string
}

const store = useMainStore()
const $t = useTranslate()
const message = useMessages()
const route = useRoute()

const password: Ref<ComponentPublicInstance<typeof VuciForm> | null> = ref(null)

const logInfoTypes = {
  system: {
    title: $t('System Log'),
    help: $t(`The System Log section contains the contents of the system log file,
                which stores records of various system related events, such as starts/stops of various services,
                errors, reboots, etc.`),
    logInfo: ''
  },
  kernel: {
    title: $t('Kernel Log'),
    help: $t(`The Kernel Log section contains the contents of the kernel log file,
                which stores records of various events related to processes of the operating system (OS).`),
    logInfo: ''
  }
}

const currentLogType = ref<'system' | 'kernel' | null>(null)

const modal = ref<Modal>({
  show: false,
  info: { ...logInfoTypes.system }
})

const form = ref<Form>({
  password: '',
  encrypt: '0'
})

const logsModal = ref()

const isEncrypted = computed(() => form.value.encrypt === '1')

const isDownloadDisabled = computed(() => isEncrypted.value && !form.value.password)

function getLogData() {
  return axios
    .get(`/api/troubleshoot/${currentLogType.value}/status`)
    .then(({ data }) => {
      modal.value.info.logInfo = data.response
    })
    .catch(() => {
      return message.error($t('Failed to load troubleshoot log data'))
    })
}

function showLog(type: 'system' | 'kernel') {
  currentLogType.value = type
  modal.value.info = { ...logInfoTypes[type] }
  modal.value.show = true
  return getLogData().then(() => {
    timer.start()
  })
}

function generateTroubleshoot() {
  return password.value?.validate().then((valid: boolean) => {
    if (!valid) return message.error($t('Password is invalid'))
    store.spin($t('Generating file'))
    return axios
      .post(
        '/api/troubleshoot/actions/generate',
        {
          data: {
            encrypt: form.value.encrypt,
            password: form.value.password
          }
        },
        { cancellable: true }
      )
      .then(({ data }) => {
        const updatedData = {
          encrypt: form.value.encrypt,
          password: form.value.password,
          ...data
        }
        return downloadTroubleshoot(updatedData)
      })
      .catch(() => {
        message.error($t('Failed to generate file'))
      })
      .finally(() => {
        store.spin(false)
      })
  })
}

function downloadTroubleshoot(data: { encrypt: string; password: string }) {
  const request = '/api/troubleshoot/actions/download'
  const mimeType = data.encrypt === '1' ? 'application/x-zip-compressed' : 'application/x-tar'
  return utils
    .downloadFileApi(request, mimeType, 'POST', { type: 'troubleshoot' })
    .then(() => {
      message.success($t('Troubleshoot download was successful'))
    })
    .catch(() => {
      message.error($t('Failed to download file'))
    })
}

const timer = useTimer({
  method: getLogData,
  time: 3000,
  autostart: false
})

watch(
  () => modal.value.show,
  isOpen => {
    if (!isOpen) {
      timer.stop()
      currentLogType.value = null
    }
  }
)

const hashParts = route.hash.split('=')
function isLogId(id: string): id is 'system' | 'kernel' {
  return ['system', 'kernel'].includes(id)
}
if (hashParts[0] === '#log' && isLogId(hashParts[1])) {
  showLog(hashParts[1])
}
</script>
