<template>
  <div>
    <tlt-hint
      v-if="isSmallScreen || !hintModal"
      class="size-5"
      :hints="disableMessage ? [{ info: disableMessage }] : []"
    >
      <button
        test-id="button-qrCode"
        class="w-full h-full rounded-xs bg-inherit flex justify-center items-center"
        @click="toggle()"
      >
        <tlt-icon
          icon="qr-code"
          :class="disableMessage ? 'text-theme-text-secondary-subtle' : 'text-theme-text-primary'"
          class="size-5"
        />
      </button>
    </tlt-hint>
    <component
      :is="hintComponent.is"
      v-bind="hintComponent.bind"
      @close="hintComponent.close"
    >
      <template #button>
        <tlt-hint
          class="size-5"
          :hints="disableMessage ? [{ info: disableMessage }] : []"
        >
          <button
            test-id="button-qrCode"
            class="w-full h-full rounded-xs bg-inherit flex justify-center items-center"
            @click="toggle()"
          >
            <tlt-icon
              icon="qr-code"
              :class="disableMessage ? 'text-theme-text-secondary-subtle' : 'text-theme-text-primary'"
              class="size-5"
            />
          </button>
        </tlt-hint>
      </template>
      <div
        class="flex justify-center items-center gap-5 font-sans max-sm:flex-wrap"
        :class="{ 'mb-8 grow': !hintModal || isSmallScreen }"
      >
        <qr-code
          id="qrCode"
          :value="wifiUrl"
          :size="qrSize"
        />
        <div class="flex flex-col items-start justify-center gap-4 min-w-max w-full">
          <div
            id="wifi-text"
            class="flex flex-col gap-4"
            :class="{ 'text-theme-text-subtle': !showCredentials }"
          >
            <div>
              <div class="text-header font-semibold">
                {{ networkText }}
              </div>
              <div class="text-content normal-case max-w-[150px] overflow">
                {{ content.ssid }}
              </div>
            </div>
            <div v-if="content.key">
              <div class="text-header font-semibold">
                {{ passwordText }}
              </div>
              <div class="text-content normal-case max-w-[150px] overflow">
                {{ content.key }}
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-1 w-full">
            <tlt-button
              button-id="downloadCard"
              size="sm"
              :disabled="false"
              block
              @click="createCard()"
            >
              {{ $t('Download QR code') }}
            </tlt-button>
            <tlt-check-box
              v-model="showCredentials"
              custom-id="showCredentials"
              :text="$t('Include credentials')"
              class="normal-case"
              :readonly="false"
            />
          </div>
        </div>
      </div>
    </component>
  </div>
</template>
<script lang="ts" setup>
import { useCard } from './WifiQrCard'
import { computed, nextTick, ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { session } from '@ui-core/plugins/session'
import QrCode, { escapeMecard } from '@/components/QrCode.vue'
import { useMediaQuery } from '@vueuse/core'
import type { WifiInterface } from '@/types/wirelessTypes'

export interface Props {
  content: WifiInterface
  hintModal?: boolean
  keepOpen?: boolean
}
const props = withDefaults(defineProps<Props>(), { hintModal: true, keepOpen: false })
const emit = defineEmits<{
  toggle: [boolean]
}>()

const $t = useTranslate()

const showCredentials = ref(true)
const showModal = ref(false)

const qrSize = 190

const networkText = $t('Network').toUpperCase()
const passwordText = $t('Password').toUpperCase()

const { download } = useCard(networkText, passwordText)
function createCard() {
  download(props.content, showCredentials.value)
}

const wifiUrl = computed(() => {
  let url = 'WIFI:'
  if (props.content.ssid) {
    url += `S:${escapeMecard(props.content.ssid)};`
  }
  if (props.content.key) {
    url += `T:WPA;P:${escapeMecard(props.content.key)};`
  }
  if (props.content.hidden === '1') {
    url += 'H:true;'
  }
  return url + ';'
})

const disableMessage = computed(() => {
  if (!session.hasAccess('network/wireless/ssids', 'read')) {
    return $t(`No '%s' read access`).format(`${$t('Network')} > ${$t('Wireless')} > ${$t('SSIDs')}`)
  }
  if (props.content['key:set'] === '1') {
    return $t('No sensitive information read access')
  }
  if (props.content.mode && props.content.mode !== 'ap') {
    return $t('QR code generation is only supported for Access Points.')
  }
  if (['wpa', 'wpa2', 'wpa3', 'wpa3-mixed'].includes(props.content.encryption)) {
    return $t('QR code generation is not supported with enterprise encryption.')
  }
  if (!props.content.ssid) {
    return $t('SSID is required for QR code generation.')
  }
  if (props.content.radius_ppsk === '1') {
    return $t('QR code generation is not supported with RADIUS PPSK mode.')
  }
  return false
})

const isSmallScreen = useMediaQuery('not all and (min-width: 640px)')
const hintComponent = computed(() => {
  if (props.hintModal && !isSmallScreen.value) {
    return {
      is: 'tltHintModal',
      bind: {
        open: showModal.value || props.keepOpen
      },
      close: close
    }
  }
  return {
    is: 'tltModal',
    bind: {
      open: showModal.value,
      size: 'small',
      containerClass: 'qr__modal-container'
    },
    close: close
  }
})

function close() {
  if (disableMessage.value) return
  showModal.value = false
  emit('toggle', false)
  nextTick(() => (document.body.style.overflow = 'auto'))
}

function toggle() {
  if (disableMessage.value) return
  showModal.value = props.keepOpen ? false : !showModal.value
  emit('toggle', showModal.value)
  if (!showModal.value) nextTick(() => (document.body.style.overflow = 'auto'))
}
</script>
<style>
.overflow {
  overflow-wrap: anywhere;
}

.qr__modal-container {
  width: min-content !important;
  padding-inline: 1rem !important;
  padding-bottom: 0.5rem !important;
}
</style>
