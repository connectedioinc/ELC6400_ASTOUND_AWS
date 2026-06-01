<template>
  <vuci-form
    config="system"
    :after-load="getStatus"
  >
    <network-diagnostic />
    <tlt-form
      v-if="store.board?.hwinfo.mobile"
      ref="debugForm"
      sid="modem_debug"
      :title="$t('Modem debug')"
      :help="$t('Section for debugging modem by sending AT commands.')"
    >
      <tlt-form-item-select
        v-if="modemList?.length > 1"
        v-model="at.modem"
        prop="modem"
        :label="$t('Modem')"
        :help="$t('AT commands will be executed on the chosen modem.')"
        :options="modemList.map(m => [m.id, m.name])"
        :readonly="disableAT"
      />
      <tlt-form-item-input
        v-model="at.command"
        prop="command"
        :label="$t('AT command')"
        :help="$t('Field for the AT command.')"
        placeholder="AT+CPIN?"
        :readonly="mobile.modemOffline(currentModem) || disableAT"
        rules="string"
        required
      />
      <tlt-inline-message
        id="at-message"
        :type="mobile.modemOffline(currentModem) ? 'warning' : 'info'"
        :message="responseHint"
      />
      <tlt-form-model-item>
        <tlt-button
          button-id="send"
          :readonly="mobile.modemOffline(currentModem) || disableAT"
          :loading="disableAT"
          @click="sendCommand"
        >
          {{ $t('Send') }}
        </tlt-button>
      </tlt-form-model-item>
      <tlt-form-item-text-area
        v-if="at.parsedResponse !== null"
        v-model="at.parsedResponse"
        :label="$t('Response message')"
        :help="$t('Response received from the sent AT command.')"
        rows="10"
        copy-button
        readonly
        :maxlength="null"
        prop="at_response"
      />
      <div
        v-if="at.parsedResponse !== null"
        class="flex gap-2 justify-end"
      >
        <tlt-button
          button-id="clear"
          color="secondary"
          @click="clearModemDebug"
        >
          {{ $t('Clear') }}
        </tlt-button>
        <tlt-button
          button-id="export"
          icon-left="upload-export"
          color="primary"
          @click="exportModemDebug"
        >
          {{ $t('Export') }}
        </tlt-button>
      </div>
    </tlt-form>
  </vuci-form>
</template>

<script setup lang="ts">
import { type Ref, type ComponentPublicInstance, ref, computed } from 'vue'
import VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { utils } from '@/plugins/utils'
import { mobile } from '@/plugins/mobile'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import NetworkDiagnostic from '@/components/system/NetworkDiagnostic.vue'

interface Modem {
  id: string
  name: string
}

interface ATState {
  modem: string
  command: string
  response: Array<Array<string>>
  parsedResponse: string | null
}

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

const debugForm: Ref<ComponentPublicInstance<typeof VuciForm> | null> = ref(null)

const at = ref<ATState>({
  modem: '',
  command: '',
  response: [],
  parsedResponse: null
})

const modemList = ref<Array<Modem>>([])
const disableAT = ref<boolean>(false)
const systemTime = ref<string>('')

const currentModem = computed(() => {
  return at.value.modem ? modemList.value?.find(md => md.id === at.value.modem) : modemList.value[0]
})

const responseHint = computed<string>(() => {
  return mobile.modemOffline(currentModem.value)
    ? $t('Sending AT commands is not possible due to the modem being blocked or disabled.')
    : $t('It can take up to 3 minutes for an AT command response to be received.')
})

const getStatus = (): Promise<void> => {
  const requests = [{ endpoint: '/api/modems/status', condition: 'mobifd.control' }, '/api/system/device/usage/status?exclude=loadavg']
  return axios
    .bulkGet(requests)
    .then(([modemResponse, systemResponse]) => {
      if (modemResponse.success) modemList.value = mobile.parseModems(modemResponse.data)
      else message.error($t('Failed to load modem data'))
      if (systemResponse.success) systemTime.value = systemResponse.data.localtime
      else message.error($t('Failed to load system data'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

const sendCommand = () => {
  if (!currentModem.value) return
  return debugForm.value?.validate().then((validationResult: { valid: boolean }) => {
    if (!validationResult.valid) return message.error($t('Some fields are invalid'))
    disableAT.value = true
    const command = at.value.command
    const modemName = currentModem.value.name
    return axios
      .post(`/api/modems/${currentModem.value?.id}/actions/exec_at`, { data: { command } })
      .then(response => {
        const res = response.data.response.replace(/\s/g, ' ')
        const date = new Date().toLocaleTimeString(systemTime.value, { hour12: false })
        at.value.response.unshift([date, modemName, command, res])
        at.value.parsedResponse = at.value.response.map(row => row.join(' ; ')).join('\n\n')
        message.success($t('AT command sent successfully'))
      })
      .catch(() => {
        message.error($t('Failed to execute AT command'))
      })
      .finally(() => {
        disableAT.value = false
      })
  })
}

const exportModemDebug = () => {
  const deviceName = store.deviceInfo?.static?.device_name || ''
  const rows = [...at.value.response]
  rows.unshift([$t('Time'), $t('Modem'), $t('AT command'), $t('Response')])
  utils.generateCsv(`modemdebug-data-${deviceName}`, rows)
}

const clearModemDebug = () => {
  at.value.parsedResponse = null
  at.value.response = []
}
</script>
