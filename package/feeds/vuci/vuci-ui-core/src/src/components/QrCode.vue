<template>
  <canvas
    ref="qrCodeRef"
    class="size-fit"
  />
</template>

<script lang="ts">
/**
 * Used to escape values when generating qr code. Be carefull do not escape whole qr code only values.
 *
 * MECARD is dead standart that was reused for wifi qr codes. There is no original left but here it is well respected convention how to encode.
 * https://github.com/zxing/zxing/wiki/Barcode-Contents#:~:text=MECARD%20encoding
 *
 * WPA3 spec also proposes percent-encoding but as of now qr scanners do not support this
 * https://www.wi-fi.org/system/files/WPA3%20Specification%20v3.1.pdf#[{%22num%22%3A95%2C%22gen%22%3A0}%2C{%22name%22%3A%22XYZ%22}%2C33%2C734%2C0]
 */

export function escapeMecard(text: string) {
  return text.replace(/[\\;,":]/g, '\\$&')
}
</script>

<script lang="ts" setup>
import { useMessages } from '@/stores/messages'
import { Encoder, Byte, Charset, type Encoded } from '@nuintun/qrcode'
import { useTranslate } from '@ui-core/composables/useI18n'
import { ref, watchEffect } from 'vue'

export interface Props {
  /** Value to generate QR code from */
  value: string
  /** Standard QR code error correction values:
   * - L - low
   * - M - medium
   * - Q - quartile
   * - H - high
   **/
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  /** QR code size target. Depending on sizeRounding this might not be exact size */
  size: number
  /** How size should be controlled:
   * - add-margin - same as floor but differance between size and target size is filled with margin
   * - floor - QR code size should be no bigger then target size
   * - ceil - QR code size should be no smaller then target size
   **/
  sizeRounding?: 'add-margin' | 'floor' | 'ceil'
}

const message = useMessages()
const $t = useTranslate()

const props = withDefaults(defineProps<Props>(), { errorCorrectionLevel: 'L', sizeRounding: 'floor' })
const qrCodeRef = ref<HTMLCanvasElement | null>(null)

watchEffect(() => {
  const ctx = qrCodeRef.value?.getContext('2d')
  const qrCodeRefLocal = qrCodeRef.value
  if (!qrCodeRefLocal || !ctx) return

  const encoder = new Encoder({ level: props.errorCorrectionLevel })
  let qrcode: Encoded
  try {
    qrcode = encoder.encode(new Byte(props.value, Charset.UTF_8))
  } catch (e) {
    if (e instanceof Error && e.message === 'data too big for all versions') {
      message.error({ title: $t('QR code generation failed'), text: $t('too much data') })
    } else message.error({ title: $t('QR code generation failed'), text: $t('unexpected error') })
    return
  }

  const moduleSize = props.sizeRounding === 'ceil' ? Math.ceil(props.size / qrcode.size) : Math.floor(props.size / qrcode.size)

  const size = props.sizeRounding === 'add-margin' ? props.size : moduleSize * qrcode.size

  const img = new Image()
  img.src = qrcode.toDataURL(moduleSize, { margin: 0 })
  img.onload = () => {
    // Clears old QR code and set size. If size is handled by vue it can delete QR code
    qrCodeRefLocal.width = size
    qrCodeRefLocal.height = size
    // Better to handle margin ourselves to always make them integer
    const margin = props.sizeRounding === 'add-margin' ? Math.floor((props.size % qrcode.size) / 2) : 0
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, margin, margin)
  }
})
</script>
