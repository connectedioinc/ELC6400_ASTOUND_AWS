<template>
  <div
    class="relative z-9"
    :style="{
      height: containerHeight ? `${containerHeight}px` : ''
    }"
  >
    <transition-group
      ref="stack"
      tag="div"
      class="w-full clip-top"
      :class="{
        relative: floating && !isHovered,
        absolute: floating && isHovered
      }"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      leave-active-class="absolute! stack--leave"
      @mouseenter.passive="isHovered = true"
      @mouseleave.passive="isHovered = false"
      @leave="onLeave"
    >
      <div
        v-for="(item, index) of items"
        :key="item.id"
        class="w-full transition-all duration-300 relative"
        :class="[
          wrapperClass,
          {
            'mt-4': index > 0,
            'shadow-md': items.length > 1 && (isHovered || index === 0),
            'absolute! -bottom-3': index > 0 && !isHovered,
            'opacity-0': index > 1 && !isHovered
          }
        ]"
        :style="{
          'z-index': -index,
          scale: isHovered || index === 0 ? 1 : 0.98
        }"
      >
        <slot
          :item="item"
          :index="index"
        />
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string | number }">
import { ref, watchEffect } from 'vue'
import { unrefElement } from '@vueuse/core'

export interface Props<T> {
  items: T[]
  wrapperClass?: string
  floating?: boolean
}

const props = defineProps<Props<T>>()

const stack = ref<HTMLElement | null>(null)
const containerHeight = ref<number | null>(null)
const isHovered = ref(false)

function onLeave(el: Element) {
  if (!(el instanceof HTMLElement)) return
  if (!el.nextElementSibling) isHovered.value = false
  updateContainerHeight()
}

function updateContainerHeight() {
  if (!isHovered.value) return (containerHeight.value = null)
  const stackElement = unrefElement(stack)
  if (!stackElement) return
  const firstElement = Array.from(stackElement.children).find(el => !el.classList.contains('stack--leave'))
  if (!firstElement) return
  const { height } = firstElement.getBoundingClientRect()
  containerHeight.value = height
}

watchEffect(() => {
  if (!stack.value || !props.floating || !props.items.length) return
  updateContainerHeight()
})
</script>

<style scoped>
.clip-top {
  clip-path: inset(0 -9999px -9999px -9999px);
}
</style>
