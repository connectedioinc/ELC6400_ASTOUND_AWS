<template>
  <div
    ref="zoomEl"
    class="zoomist-container relative cursor-grab active:cursor-grabbing w-full overflow-hidden"
  >
    <div class="absolute flex flex-col right-0 top-0 z-10 items-center bg-theme-bg-secondary-subtle rounded-bl-md">
      <tlt-hint
        :hints="maxScale <= zoomLevel ? [] : [{ info: $t('Zoom in.') }]"
        expand-to="left"
      >
        <tlt-button
          button-id="zoom-in"
          icon="add-circle"
          color="tertiary"
          :disabled="maxScale <= zoomLevel"
          class="p-2! md:p-3!"
          @click="zoomIn"
        />
      </tlt-hint>
      <tlt-hint
        :hints="minScale >= zoomLevel ? [] : [{ info: $t('Zoom out.') }]"
        expand-to="left"
      >
        <tlt-button
          button-id="zoom-out"
          icon="remove-circle"
          color="tertiary"
          :disabled="minScale >= zoomLevel"
          class="p-2! md:p-3!"
          @click="zoomOut"
        />
      </tlt-hint>
      <tlt-hint
        :hints="[{ info: isWheelLocked ? $t('Unlocks scrollable zoom') : $t('Locks scrollable zoom') }]"
        expand-to="left"
      >
        <tlt-button
          button-id="lock"
          :icon="isWheelLocked ? 'unlock' : 'lock'"
          color="tertiary"
          class="p-2! md:p-3!"
          @click="lock"
        />
      </tlt-hint>
      <tlt-hint
        :hints="[{ info: $t('Reset view.') }]"
        expand-to="left"
      >
        <tlt-button
          button-id="zoom-reset"
          icon="recenter"
          color="tertiary"
          class="p-2! md:p-3!"
          @click="resetZoomAndScale"
        />
      </tlt-hint>
    </div>
    <div class="zoomist-wrapper">
      <div class="zoomist-image">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
// https://zoomist.vercel.app/guides/parameters-options
import Zoomist from 'zoomist'
import 'zoomist/css'
import type { ZoomistOptions } from 'zoomist/types'
import { onMounted, onUnmounted, computed, ref } from 'vue'

interface Props {
  zoomButtons?: boolean
  maxScale?: number
  minScale?: number
  initScale?: number
  zoomRatio?: number
  wheelable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  zoomButtons: true,
  maxScale: 2, // max 10
  minScale: 0.5, // min 1
  initScale: 1, // <= maxScale && >= minScale
  zoomRatio: 0.25,
  wheelable: true
})
const $t = useTranslate()

const zoomEl = ref()
const zoomInstance = ref()
const zoomLevel = ref(1)
const isWheelLocked = ref(props.wheelable)

onMounted(() => {
  reinitZoomist(defaultOptions.value)
  resetZoomAndScale()
})
onUnmounted(() => {
  if (zoomInstance?.value) zoomInstance.value.destroy()
})

const defaultOptions = computed(() => {
  const { minScale, maxScale, initScale, zoomRatio } = props
  return {
    minScale,
    maxScale,
    initScale,
    zoomRatio,
    bounds: false,
    wheelable: isWheelLocked.value,
    on: {
      wheel: onWheel
    }
  }
})

function reinitZoomist(instanceOptions: ZoomistOptions) {
  zoomInstance.value?.destroy()
  zoomInstance.value = new Zoomist(zoomEl.value, instanceOptions)
}

function resetZoomAndScale(): void {
  zoomInstance.value.reset()
  zoomLevel.value = props.initScale > props.maxScale ? props.maxScale : props.initScale < props.minScale ? props.minScale : props.initScale
  zoomInstance.value.zoomTo(zoomLevel.value)
}

function zoomIn(): void {
  zoomLevel.value += props.zoomRatio
  if (zoomLevel.value > props.maxScale) zoomLevel.value = props.maxScale
  zoomInstance.value.zoomTo(zoomLevel.value)
}

function zoomOut(): void {
  zoomLevel.value -= props.zoomRatio
  if (zoomLevel.value < props.minScale) zoomLevel.value = props.minScale
  zoomInstance.value.zoomTo(zoomLevel.value)
}

function onWheel(): void {
  zoomLevel.value = zoomInstance.value.transform.scale
}

function lock(): void {
  // a bit of a workouround is done since update() method doesn't work for some reason
  isWheelLocked.value = !isWheelLocked.value
  const {
    options,
    transform: { scale, translateX, translateY }
  } = zoomInstance.value
  reinitZoomist({ ...options, initScale: scale, wheelable: isWheelLocked.value, on: { wheel: onWheel } })
  zoomInstance.value.moveTo({ x: translateX, y: translateY })
}

defineExpose({
  zoomInstance,
  resetZoomAndScale
})
</script>

<style scoped>
/* unsets default grey background */
.zoomist-wrapper {
  background-color: unset;
}
</style>
