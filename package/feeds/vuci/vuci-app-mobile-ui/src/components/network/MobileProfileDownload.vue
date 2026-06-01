<template>
  <tlt-form
    ref="profileAddForm"
    sid="esim_profile_addForm"
    :title="$t('New eSIM profile configuration')"
    :model="addForm"
  >
    <tlt-form-item-input
      v-model="addForm.name"
      prop="name"
      :label="$t('Name')"
      :help="$t('Name of profile.')"
      :rules="['uciname', validateName]"
      maxlength="64"
    />
    <tlt-form-item-input
      v-model="addForm.code"
      prop="activation_code"
      :label="$t('Activation code')"
      :help="$t('eSIM profile activation code.')"
      placeholder="LPA:1$operator.com$ABCDE12345"
      :rules="validateCode"
      required
    />
    <tlt-form-model-item
      :label="$t('QR code')"
      :help="$t('Upload eSIM profile activation QR code.')"
    >
      <tlt-upload
        :model-value="addForm.qrCode"
        name="qrcode"
        action=""
        :valid="validCode"
        @update:model-value="decodeQrCode"
      />
    </tlt-form-model-item>
    <tlt-form-item-input
      v-model="addForm.confirmationCode"
      prop="confirmation_code"
      :label="$t('Confirmation code')"
      :help="$t('eSIM profile confirmation code.')"
      rules="string"
      :required="showConfCode"
    />
    <tlt-form-model-item>
      <tlt-button
        id="download"
        button-id="download"
        :readonly="downloadBtn.disabled"
        :loading="downloadBtn.loading"
        @click="downloadProfile"
      >
        {{ downloadBtn.text || $t('Download') }}
      </tlt-button>
      <tlt-tooltip
        v-if="downloadBtn.hint"
        target="#download"
      >
        {{ downloadBtn.hint }}
      </tlt-tooltip>
    </tlt-form-model-item>
  </tlt-form>
</template>

<script setup lang="ts">
import type TltForm from '@ui-core/tlt-design/form/core/TltForm.vue'
import { type Ref, type ComponentPublicInstance, ref, computed, nextTick } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { useRoute } from 'vue-router'
import { axios } from '@ui-core/plugins/axios'
import { grayscale, binarize, Detector, Decoder } from '@nuintun/qrcode'
import type { EsimConfig } from '@/types/mobileTypes'

interface Props {
  profiles: Array<EsimConfig>
  modemId: string
  downloadBtn: { text: string; hint: string; disabled: boolean; loading: boolean }
}

const props = withDefaults(defineProps<Props>(), {
  downloadBtn: () => ({ text: '', hint: '', disabled: false, loading: false })
})

const emit = defineEmits(['disableDownload'])

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()
const route = useRoute()

type AddFormValues = {
  name: string
  code: string
  confirmationCode?: string
  qrCode: File
}
const initialAddFormValues = (): AddFormValues => ({
  name: '',
  code: '',
  confirmationCode: undefined,
  qrCode: new File([], '')
})
const addForm = ref(initialAddFormValues())
const validCode = ref(true)

const showConfCode = computed(() => {
  return !!addForm.value.code.endsWith('$1')
})

function validateName(val: string) {
  if (props.profiles.some(s => s.name === val && s.modem === props.modemId)) {
    return { isValid: false, message: $t("Profile with name '%s' already exists").format(val) }
  }
  return { isValid: true }
}

function validateCode(val: string) {
  if (/^(LPA:|)\d\$[^$]+\$.*$/.test(val)) {
    return { isValid: true }
  }
  return { isValid: false, message: $t('Activation code must follow this format: LPA:1$operator.com$code123') }
}

const profileAddForm: Ref<ComponentPublicInstance<typeof TltForm> | null> = ref(null)

function downloadProfile() {
  profileAddForm.value?.validate().then((validationResult: { message: string; valid: boolean }) => {
    if (!validationResult.valid) return message.error($t('Some fields are invalid'))
    let data = { name: addForm.value.name, modem: props.modemId, activation_code: addForm.value.code, confirmation_code: '' }
    if (addForm.value.confirmationCode) data.confirmation_code = addForm.value.confirmationCode
    store.spin($t('Initiating profile download'))
    return axios
      .post('/api/esim/actions/download', { data })
      .then(() => {
        addForm.value = initialAddFormValues()
        let msg = $t('Profile download started and may take a while.')
        if (route.path.includes('system/wizard/step_wan')) {
          msg = '%s %s'.format($t('Profile download started and may take a while.'), $t('You can continue with the next steps in the Setup Wizard.'))
        }
        message.success(msg)
        emit('disableDownload')
        nextTick(() => profileAddForm.value?.setValid(true))
      })
      .catch(() => {
        message.error($t('Failed to start profile download'))
      })
      .finally(() => {
        store.spin(false)
      })
  })
}

function resizeDimensions(width: number, height: number, resizeTo: number) {
  const longestSide = Math.max(width, height)
  if (longestSide < resizeTo) return { newWidth: width, newHeight: height }
  const ratio = resizeTo / longestSide
  const newWidth = Math.round(width * ratio)
  const newHeight = Math.round(height * ratio)
  return { newWidth, newHeight }
}

function decodeQrCode(qrCode: File) {
  validCode.value = true
  addForm.value.qrCode = new File([], qrCode.name || '')
  if (!qrCode || qrCode.size === 0) return
  if (!qrCode.type?.includes('image')) return showQrCodeError($t('Only image files allowed'))

  store.spin($t('Trying to detect and decode QR code'))
  const reader = new FileReader()
  reader.readAsDataURL(qrCode)
  reader.onload = () => {
    const img = new window.Image()
    img.src = reader.result as string
    img.onload = () => {
      const { width, height } = img
      const attempts = [
        { resize: 800, blur: false },
        { resize: 800, blur: true },
        { resize: 600, blur: false },
        { resize: 600, blur: true },
        { resize: 400, blur: false }
      ]
      let response = { detected: false, decoded: false }
      let cachedCanvas: OffscreenCanvas | HTMLImageElement = img

      for (const [index, attempt] of attempts.entries()) {
        if (attempt.resize > Math.max(width, height) && attempts.length !== index + 1) continue

        const { newWidth, newHeight } = resizeDimensions(width, height, attempt.resize)
        const canvas = new OffscreenCanvas(newWidth, newHeight)
        const context = canvas.getContext('2d')
        // Skips loop iteration if browser doesn't support canvas filter or context is null
        if (!context || (!context.filter && attempt.blur)) continue
        if (attempt.blur) context.filter = `blur(2px)`
        context.drawImage(cachedCanvas, 0, 0, newWidth, newHeight)
        cachedCanvas = canvas

        response = tryDecodeQrCode(canvas, context)
        if (response.detected && response.decoded) break
      }
      store.spin(false)
      if (response.detected && response.decoded) return

      let msg = $t('Ensure the QR code is clearly visible and in focus.')
      if (Date.now() - qrCode.lastModified <= 60000) {
        msg = '%s %s'.format($t('Try taking image from a bit further away or closer to the QR code.'), msg)
      }

      return showQrCodeError('%s. %s'.format(response.detected ? $t('Failed to decode QR code') : $t('Failed to detect QR code'), msg))
    }
  }
}

function tryDecodeQrCode(canvas: OffscreenCanvas, context: OffscreenCanvasRenderingContext2D): { detected: boolean; decoded: boolean } {
  const luminances = grayscale(context.getImageData(0, 0, canvas.width, canvas.height))
  const binarized = binarize(luminances, canvas.width, canvas.height)

  const detector = new Detector()
  const detected = detector.detect(binarized)
  const decoder = new Decoder()
  let current = detected.next()
  if (!current.value && current.done) {
    return { detected: false, decoded: false }
  }
  if (!current.done) {
    const detect = current.value
    try {
      const decoded = decoder.decode(detect.matrix)
      addForm.value.code = decoded.content
      return { detected: true, decoded: true }
    } catch {
      return { detected: true, decoded: false }
    }
  }
  return { detected: false, decoded: false }
}

function showQrCodeError(text: string) {
  validCode.value = false
  return message.error(text)
}
</script>
