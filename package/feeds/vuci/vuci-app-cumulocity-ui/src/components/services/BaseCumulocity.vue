<template>
  <vuci-form
    v-slot="{ uciData }"
    config="iot"
    :after-load="updateStatus"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="general"
      :title="props.title"
      :help="$t('%s configuration.').format(props.title)"
      :uci-data="uciData"
      :data-key="props.dataKey"
      :endpoints="[{ endpoint: props.name + '/config', sectionFilter: (section: Array<object>) => section[0] }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        name="enabled"
        :help="$t('Enable %s application.').format(props.title)"
        initial="0"
      />
      <tlt-form-model-item
        :label="$t('%s status').format(props.title)"
        name="status"
      >
        <div class="flex gap-x-4">
          <tlt-dummy-value
            :value="statusData[status][0]"
            :class="statusData[status][1]"
            test-id="status"
          />
          <tlt-icon
            v-if="status === 1 || status === 2"
            icon="spinner"
            class="text-theme-text-primary size-5"
            animate
          />
        </div>
      </tlt-form-model-item>
      <slot :s="s" />
      <vuci-form-item-input
        :uci-section="s"
        name="server"
        :label="$t('Server address')"
        :help="$t('%s server address.').format(props.title)"
        rules="host"
        placeholder="myserver.example.com"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="interval"
        :label="$t('Interval')"
        placeholder="60"
        rules="irange(1,32767)"
        :help="$t('Push connection interval in minutes.')"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-button
        :uci-section="s"
        name="resetAuth"
        :label="$t('Reset Auth')"
        :help="
          $t(
            'Reset authentication data so that device could be \
        re-registered on %s Device Management.'
          ).format(props.title)
        "
        :text="$t('Reset auth')"
        @click="resetAuthentification"
      />
      <tlt-form-accordion :name="props.name">
        <vuci-form-item-input
          :uci-section="s"
          name="port"
          :label="$t('Port')"
          :help="$t('%s server port.').format(props.title)"
          rules="port"
          initial="8883"
          placeholder="8883"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="qos"
          :label="$t('QoS')"
          :help="$t('Quality of Service.')"
          :options="qosOptions"
          initial="1"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="keepalive"
          :label="$t('Keepalive')"
          :help="$t('Keepalive time in seconds.')"
          placeholder="60"
          initial="60"
          rules="irange(0,2147483647)"
        />
      </tlt-form-accordion>
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import { axios } from '@ui-core/plugins/axios'
import { ref } from 'vue'

const $t = useTranslate()
const message = useMessages()
const status = ref<string | number>('default')

const props = defineProps<{ dataKey: string; title: string; name: string }>()
const qosOptions = [
  ['0', $t('At most once (0)')],
  ['1', $t('At least once (1)')],
  ['2', $t('Exactly once (2)')]
]
const statusData: { [key: string]: Array<string> } = {
  0: [$t('Not connected'), 'error'],
  1: [$t('Connecting'), 'text-theme-text-secondary-subtle'],
  2: [$t('Registering'), 'text-theme-text-secondary-subtle'],
  3: [$t('Connected'), 'success'],
  default: [$t('Disabled'), 'text-theme-text-secondary-subtle']
}

const timer = useTimer({
  method: updateStatus,
  time: 5000
})

function updateStatus() {
  timer.stop()
  return axios
    .get('/api/%s/status'.format(props.name))
    .then(({ data }) => {
      status.value = data?.state_id ?? 'default'
    })
    .catch(() => {
      message.error($t('Failed to load %s status.').format(props.title))
    })
    .finally(() => {
      timer.start()
    })
}

function resetAuthentification() {
  return axios
    .post('/api/%s/actions/reset_auth'.format(props.name))
    .then(() => {
      message.success($t('Authentication data cleared. Now you can re-register device on %s Device Management.').format(props.title))
    })
    .catch(() => {
      message.error($t('Authentication data clearing failed.'))
    })
}
</script>
