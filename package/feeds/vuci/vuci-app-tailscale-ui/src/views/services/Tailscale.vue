<template>
  <vuci-form
    v-slot="{ uciData }"
    ref="form"
    config="tailscale"
    :after-load="loadData"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('Tailscale configuration')"
      name="general"
      :endpoints="[{ endpoint: 'tailscale/config' }]"
      :after-save="onAfterSave"
      data-key="tailscale"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable Tailscale service.')"
        name="enabled"
      />
      <tlt-form-model-item
        :label="$t('Tailscale status')"
        name="status"
      >
        <div class="flex gap-x-4">
          <tlt-dummy-value
            :value="displayStatus"
            :class="statusColorClass"
          />
          <tlt-icon
            v-if="isLoading || status === ''"
            icon="spinner"
            class="text-theme-text-primary size-5"
            animate
          />
        </div>
      </tlt-form-model-item>
      <tlt-form-model-item
        v-if="isRunning"
        name="logout-button"
      >
        <tlt-button
          color="secondary"
          :disabled="disableLogout"
          @click="logout"
          >{{ disableLogout ? $t('Logging out...') : $t('Logout from Tailscale') }}</tlt-button
        >
      </tlt-form-model-item>
      <tlt-form-model-item
        v-show="showIpAddress"
        :label="$t('IP address')"
        name="ip"
      >
        <div class="flex items-center">
          <tlt-dummy-value
            :value="ipAddresses[0]"
            class="inline-block"
          />
          <tlt-hint
            :hints="[{ info: '%s: %s  %s %s: %s'.format('<strong>IPv4</strong>', `${ipAddresses[0]}`, '<br>', '<strong>IPv6</strong>', `${ipAddresses[1]}`) }]"
            align-right
            break-words
            rawhtml
          >
            <tlt-icon
              icon="info"
              class="ml-1 text-theme-text-info size-5"
            />
          </tlt-hint>
        </div>
      </tlt-form-model-item>
      <vuci-form-item-radio-group
        :uci-section="s"
        :label="$t('Authentication method')"
        :help="$t('Choose a method to authenticate your Tailscale network.')"
        :options="authOptions"
        name="auth_type"
        @change="updateAuthMethod"
      />
      <tlt-form-model-item
        v-show="s.auth_type === 'url' && status !== '1'"
        :label="$t('Tailscale login')"
        :help="$t('Sign in using your Tailscale account credentials. Clicking this button will open the Tailscale authentication page in a new window.')"
      >
        <tlt-hint :hints="!loginUrl ? [{ info: $t('Login URL is not available. Enable Tailscale to generate the login URL.') }] : []">
          <a
            :href="loginUrl"
            target="_blank"
            :class="!loginUrl ? 'text-theme-text-secondary-subtle' : 'text-theme-text-primary'"
            class="no-underline"
          >
            <tlt-button
              type="text"
              icon-right="external-link"
              :disabled="!loginUrl"
              size="md"
              >{{ $t('Click to open') }}</tlt-button
            >
          </a>
        </tlt-hint>
      </tlt-form-model-item>
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Authentication key')"
        :help="$t('Provide an auth key to automatically authenticate the node as your user account.')"
        :depend="s.auth_type === 'key'"
        :required="s.auth_type === 'key'"
        :readonly="s.auth_type === 'key' && status === '1'"
        name="auth_key"
        rules="fieldvalidation(\'^[a-zA-Z0-9-]+$\')"
        minlength="22"
        maxlength="64"
        password
        sensitive
      />
      <tlt-form-accordion name="tailscale_accordion">
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Login server')"
          :help="
            $t('Provide the base URL of a control server instead of %s. If you are using Headscale for your control server, use your Headscale instance\'s URL.').format(
              '<strong>https://controlplane.tailscale.com</strong>'
            )
          "
          rules="protourl"
          rawhtml
          name="login_server"
          placeholder="https://controlplane.tailscale.com"
        />
        <vuci-form-item-list
          :uci-section="s"
          :label="$t('Advertise routes')"
          :help="$t('Expose physical subnet routes to your entire Tailscale network.')"
          name="advert_routes"
          rules="subnet"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Default route')"
          :help="$t('Route traffic through another exit node. If disabled, the \'--accept-dns=false\' flag will be set automatically.')"
          name="default_route"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Exit node IP')"
          :help="$t('IP address of the exit node.')"
          :required="s.default_route === '1'"
          :depend="s.default_route === '1'"
          rules="ipaddr"
          name="exit_node_ip"
          placeholder="192.168.2.254"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Accept routes')"
          :help="$t('Accept subnet routes that other nodes advertise.')"
          name="accept_routes"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Exit node')"
          :help="$t('Offer to be an exit node for outbound internet traffic from the Tailscale network.')"
          :depend="s.default_route === '0'"
          name="exit_node"
        />
      </tlt-form-accordion>
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onUnmounted, useTemplateRef } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages, useNotifications, usePrompt } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import { axios } from '@ui-core/plugins/axios'
import { isArray } from '@ui-core/utils/inspect'

const $t = useTranslate()
const message = useMessages()
const notification = useNotifications()
const prompt = usePrompt()

interface TailscaleData {
  status: keyof typeof statusDisplayValues
  url: string
  ip: string[] | string
  message: string[]
}

const disableLogout = ref(false)
const isLoading = ref(false)
const previousStatus = ref<keyof typeof statusDisplayValues>('')
const status = ref<keyof typeof statusDisplayValues>('')
const loginUrl = ref('')
const ipAddresses = ref<string[] | string>([''])
const messages = ref<string[]>([])
const isReverting = ref(false)
const formRef = useTemplateRef('form')

const authOptions = [
  { name: $t('Use login URL'), value: 'url' },
  { name: $t('Use authentication key'), value: 'key' }
]

const statusDisplayValues = {
  '0': $t('Disconnected'),
  '1': $t('Connected'),
  '2': $t('Stopped'),
  '3': $t('Disabled'),
  '': $t('Loading...')
} as const

const statusColors = {
  '0': 'error',
  '1': 'success',
  '2': 'error',
  '3': 'text-theme-text-secondary-subtle',
  '': 'text-theme-text-secondary-subtle'
} as const

const isRunning = computed(() => status.value === '1')
const showIpAddress = computed(() => isRunning.value && ipAddresses.value[0] !== '')

const displayStatus = computed(() => {
  if (isLoading.value && previousStatus.value) {
    return statusDisplayValues[previousStatus.value]
  }
  return statusDisplayValues[status.value]
})

const statusColorClass = computed(() => {
  if (isLoading.value) {
    return 'text-theme-text-secondary-subtle'
  }
  return statusColors[status.value]
})

const displayedMessages = computed(() => messages.value.slice(0, 5))

const timer = useTimer({
  method: updateStatus,
  autostart: false,
  immediate: false,
  time: 5000
})

const shownMessages = ref(new Set<string>())

watch(
  [status, loginUrl, displayedMessages],
  ([newStatus, , newMessages], [oldStatus]) => {
    if (isLoading.value && (newStatus !== oldStatus || newStatus !== '')) {
      isLoading.value = false
      status.value = newStatus
    }
    const currentMessages = new Set(newMessages || [])
    shownMessages.value.forEach(msg => {
      if (!currentMessages.has(msg)) {
        notification.remove(msg)
        shownMessages.value.delete(msg)
      }
    })
    currentMessages.forEach(msg => {
      if (!shownMessages.value.has(msg)) {
        notification.warning(msg)
        shownMessages.value.add(msg)
      }
    })
  },
  {
    deep: true,
    immediate: false
  }
)

function updateTailscaleData(data: TailscaleData) {
  status.value = data.status
  loginUrl.value = data.url || ''
  ipAddresses.value = isArray(data.ip) ? data.ip : ['', '']
  messages.value = isArray(data.message) ? data.message : []
}

function loadData() {
  isLoading.value = true
  return axios
    .get('/api/tailscale/status')
    .then(({ data }) => {
      timer.start()
      updateTailscaleData(data[0])
      timer.start()
    })
    .catch(() => {
      message.error($t('Failed to load Tailscale status data'))
    })
    .finally(() => {
      isLoading.value = false
    })
}

function updateStatus() {
  return axios
    .get('/api/tailscale/status')
    .then(res => {
      updateTailscaleData(res.data[0])
    })
    .catch(() => {
      message.error($t('Failed to load Tailscale status'))
    })
}

function updateAuthMethod() {
  if (isReverting.value) {
    isReverting.value = false
    return
  }
  if (status.value === '1') {
    return prompt.show({
      title: $t('Logout required'),
      content: $t('Please log out to change your authentication method.'),
      okText: $t('Logout'),
      cancelText: $t('Cancel'),
      onOk: () => logout(),
      onCancel: () => {
        isReverting.value = true
        const originalAuthType = formRef.value.uciData.tailscale[0].auth_type === 'url' ? 'key' : 'url'
        formRef.value.uciData.tailscale[0].auth_type = originalAuthType
      }
    })
  }
}

function onAfterSave(_: any, res: any) {
  previousStatus.value = status.value
  isLoading.value = true
  if (res?.success) {
    const enabledChanged = res.data?.tailscale?.[0]?.enabled === '0' && previousStatus.value === '1'
    if (enabledChanged) {
      updateStatus()
    }
  }
}

function logout() {
  disableLogout.value = true
  isLoading.value = true
  previousStatus.value = status.value
  return axios
    .post('/api/tailscale/actions/logout')
    .then(() => {
      status.value = '0'
      message.success($t('Logged out successfully'))
    })
    .catch(() => {
      return message.error($t('Something went wrong while logging out'))
    })
    .finally(() => {
      disableLogout.value = false
      isLoading.value = false
    })
}

onUnmounted(() => {
  shownMessages.value.forEach(id => {
    notification.remove(id)
  })
  shownMessages.value.clear()
})
</script>
