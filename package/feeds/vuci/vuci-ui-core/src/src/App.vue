<template>
  <router-view :key="store.rerenderKey" />
  <confirm
    :open="$prompt.promptShown"
    v-bind="$prompt.promptOptions"
    @close="$prompt.hide"
  />
  <tlt-spin />
</template>

<script setup lang="ts">
import { ref, watchEffect, onMounted } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useMessages } from './stores/messages'
import { useMainStore } from './stores/main'
import { brand } from '@ui-core/plugins/brand'
import { analytics } from './plugins/analytics'
import { i18n } from '@ui-core/plugins/i18n'
import { axios } from '@ui-core/plugins/axios'
import { log } from '@ui-core/plugins/log'
import Confirm from '@/components/Messenger/Confirm.vue'

const store = useMainStore()
const messages = useMessages()

const deviceInfo = ref<{
  device_name: string
  api_version: string
  lang: string
} | null>(null)

watchEffect(() => {
  const name = store.deviceInfo?.static.device_name
  document.title = (name ? name + ' - ' : '') + brand.text('company')
})

// Open CLI with Alt+Ctrl+Shift+Q
useEventListener(window, 'keydown', e => {
  if (e.altKey && e.ctrlKey && e.code === 'KeyQ') {
    const address = location.origin + '/cgi-bin/cli'
    const win = window.open(address, '_blank')
    win?.focus()
  }
})

function preventDataTransfer(e: Event) {
  if (!e) return
  e.preventDefault()
  e.stopPropagation()
}

function closeEventSource() {
  store.eventSource?.abort()
}

useEventListener(window, 'dragover', preventDataTransfer)
useEventListener(window, 'drop', preventDataTransfer)
useEventListener(window, 'beforeunload', closeEventSource)

let cleanup = () => {}
watchEffect(() => {
  const shouldPrevent = store.spinner.spinning > 0
  cleanup()
  if (shouldPrevent) {
    cleanup = useEventListener(document.body, 'keydown', e => e.key === 'Tab' && e.preventDefault())
  }
})

watchEffect(
  () =>
    analytics.state.loaded &&
    deviceInfo.value &&
    analytics.addData({
      // device_name is excluded from analytics due to it being PII
      api_version: deviceInfo.value.api_version,
      lang: deviceInfo.value.lang
    })
)

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/unauthorized/status', { preventCancel: true })
    await i18n.loadLang(data.filename)
    deviceInfo.value = {
      device_name: data.device_model,
      api_version: data.api_version,
      lang: data.lang
    }
    store.securityBanner.title = data.security_banner?.title
    store.securityBanner.message = data.security_banner?.message
  } catch (e) {
    if (e instanceof Error) log(e.message, true)
    messages.error(i18n.t('Failed to load device language'))
  }
})
</script>
