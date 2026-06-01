<template>
  <vuci-form
    v-slot="{ uciData }"
    config="sshfs"
    :after-load="() => refreshStatus().then(() => timer.start())"
  >
    <!-- timer restart to wait for a bit before getting status as it is not well done and will return error if pulled to quicly -->
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'sshfs/config' }]"
      name="general"
      :title="$t('SSHFS')"
      :help="$t('SSHFS allows you to mount a remote filesystem using SFTP.')"
      :uci-data="uciData"
      data-key="sshfs"
      :after-save="() => timer.restart()"
    >
      <tlt-form-item-inline
        :uci-section="s"
        :label="$t('Status')"
        name="status"
      >
        <basic-status :status="sshfsStates[sshfsStatus?.status ?? 'default']" />
      </tlt-form-item-inline>
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enabled')"
        :help="$t('Enable SSHFS.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Hostname')"
        :help="$t('Connection address.')"
        name="hostname"
        rules="host"
        placeholder="example.com"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Port')"
        :help="$t('Port for the connection. If left empty a default of 22 will be used.')"
        name="port"
        placeholder="22"
        rules="port"
        :placeholder-prefix="false"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Username')"
        name="username"
        rules="credentials_validate('allow-space')"
        maxlength="512"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Password')"
        name="password"
        rules="credentials_validate('allow-space')"
        maxlength="512"
        password
        :required="s.enabled === '1'"
        sensitive
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Mount point')"
        :help="$t('A folder in device. Mount points will reside in system\'s provided folder.')"
        name="mount_point"
        placeholder="/sshmount"
        initial="/sshmount"
        :rules="(v: Validators) => [v.prefix.bind(v, '/'), validateMountPoint.bind(v)]"
        :required="s.enabled === '1'"
      >
        <template #before>
          <div class="text-theme-text-subtle">/tmp/sshfs</div>
        </template>
      </vuci-form-item-input>
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Mount path')"
        :help="$t('A remote mount path that will be mounted.')"
        name="mount_path"
        placeholder="/home/"
        initial="/home/"
        rules="string"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import type { Status } from '@/components/shared/BasicStatus.vue'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useTimer } from '@ui-core/composables/useTimer'
import { axios } from '@ui-core/plugins/axios'
import { ref } from 'vue'
import BasicStatus from '@/components/shared/BasicStatus.vue'
import { type Validators, rules } from '@/validation-rules'

const $t = useTranslate()
const message = useMessages()

type SshfsStatus = {
  id: string
  mount_point: string
  status: '0' | '1' | '2' | '3'
}

const sshfsStatus = ref<SshfsStatus | undefined>(undefined)

const timer = useTimer({ method: refreshStatus, immediate: false, autostart: false, time: 5000 })
function refreshStatus() {
  return axios
    .get('/api/sshfs/status')
    .then(({ data }) => {
      sshfsStatus.value = data[0]
    })
    .catch(() => message.error($t('Failed to update SSHFS status')))
}

const sshfsStates = {
  0: { status: $t('Disabled') },
  1: { status: $t('Connecting'), type: 'warning' },
  2: { status: $t('Connected'), type: 'success' },
  3: { status: $t('Failed to connect'), helpTitle: $t('Failed to connect'), help: $t('Check the configuration and ensure that the server is reachable.'), type: 'error' },
  default: undefined
} satisfies Record<string, Status | undefined>

function validateMountPoint(value: string) {
  // Checking for prefix simplifies error when no prefix is provided
  return rules.posix_filename(value[0] === '/' ? value.slice(1) : value)
}
</script>
