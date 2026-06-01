<template>
  <tlt-card :title="pinoutData?.title">
    <div class="flex flex-wrap lg:flex-nowrap gap-8">
      <img
        :src="pinoutData?.image"
        :class="['flex-shrink-0', pinoutData?.style]"
      />
      <div class="flex items-center">
        <div :class="['gap-4', getPinColumnCount(Object.keys(pinoutData?.pinMap || {}).length)]">
          <div
            v-for="[pin, color] in Object.entries(pinoutData?.pinColors || {})"
            :key="pin"
            class="flex items-center gap-2 break-inside-avoid mb-2 text-xs"
          >
            <div :class="['w-5 h-5 shrink-0 text-center rounded-xs text-white', color]">
              <span
                v-if="showPins"
                class="flex justify-center items-center h-full w-full"
                >{{ pin }}</span
              >
            </div>
            <div>{{ pinoutData?.pinMap[pin] }}</div>
          </div>
        </div>
      </div>
    </div>
  </tlt-card>
</template>

<script setup lang="ts">
import { type IoPinoutBlock } from './useIoPinoutBlocks'

interface PinoutProps {
  pinoutData?: IoPinoutBlock
  showPins?: boolean
}

withDefaults(defineProps<PinoutProps>(), {
  pinoutData: undefined,
  showPins: true
})

function getPinColumnCount(entryLength?: number) {
  if (!entryLength || entryLength < 8) return 'columns-1'
  if (entryLength < 16) return 'columns-1 md:columns-2'
  return 'columns-1 md:columns-2 xl:columns-3'
}
</script>
