<template>
  <TltHint
    :hints="overflowing ? text : undefined"
    class="inline-flex! max-w-full"
    :class="{
      'flex-col': type === 'button'
    }"
    :hint-class="[
      'z-31',
      {
        'max-lg:hidden': type === 'button' && expandable === 'mobile',
        'pointer-events-none': !interactive
      }
    ]"
    :show-icon="type === 'icon' && overflowing ? expandable : false"
  >
    <span
      ref="textElement"
      class="w-full align-text-bottom whitespace-nowrap"
      :class="[
        middleTruncate ? 'inline-flex' : 'inline-block',
        {
          truncate: !middleTruncate && !showMore,
          'max-lg:wrap-break-word max-lg:overflow-visible max-lg:whitespace-normal': showMore
        }
      ]"
    >
      <slot v-if="!middleTruncate" />
      <template v-else-if="!showMore && overflowing">
        <span class="truncate">{{ splitText[0] }}</span>
        <span class="inline-flex justify-end overflow-hidden">{{ splitText[1] }}</span>
      </template>
      <span
        v-else
        class="w-full"
      >
        {{ text }}
      </span>
    </span>
    <div
      v-if="expandable && (overflowing || showMore)"
      class="self-end max-w-full"
      :class="{
        'lg:hidden': expandable === 'mobile'
      }"
    >
      <TltButton
        v-if="type === 'button'"
        type="text"
        class="min-w-0 w-full! text-start"
        @click.stop="showMore = !showMore"
      >
        {{ showMore ? $t('Show less') : $t('Show more') }}
      </TltButton>
    </div>
  </TltHint>
</template>

<script setup lang="ts">
import { ref, onUpdated, useTemplateRef, computed, useSlots, type VNodeChild, Comment, isVNode } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { isArray, isObject, isString } from '@ui-core/utils/inspect'

export interface Props {
  /**
   * Determines the behavior of the overflow hint.
   * - 'mobile': The hint is only shown on mobile devices.
   * - boolean: If true, the hint is shown; if false, it is hidden.
   */
  expandable?: 'mobile' | boolean
  type?: 'button' | 'icon'
  interactive?: boolean
  /**
   * Whether to truncate the text in the middle with an ellipsis when it overflows.
   */
  middleTruncate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  expandable: 'mobile',
  interactive: true,
  type: 'button'
})

const textElement = useTemplateRef('textElement')

const overflowing = ref(false)
const showMore = ref(false)

const slots = useSlots()
const text = computed(() => {
  if (!slots.default) return ''
  const vnodes = slots.default()

  return extractVNodeText(vnodes)
})

const splitText = computed(() => {
  const middle = Math.floor(text.value.length / 2)

  return [text.value.slice(0, middle), text.value.slice(middle)]
})

const initialTextHeight = ref<number | null>(null)
useResizeObserver(textElement, ([entry]) => {
  if (!entry) return

  const textHeight = entry.target.clientHeight || 0
  if (!initialTextHeight.value || textHeight < initialTextHeight.value) initialTextHeight.value = textHeight

  if (showMore.value && initialTextHeight.value && textHeight <= initialTextHeight.value) {
    showMore.value = false
  }

  overflowing.value = checkOverflow(props.middleTruncate ? entry.target.firstElementChild : entry.target)
})

function checkOverflow(element: Element | null) {
  if (!element) return false

  const elementWidth = element.clientWidth || 0
  const textWidth = element.scrollWidth || 0

  return Math.round(elementWidth) < textWidth
}

onUpdated(() => {
  overflowing.value = checkOverflow(textElement.value ? (props.middleTruncate ? textElement.value.firstElementChild : textElement.value) : null)
})

function extractVNodeText(vnodes: VNodeChild): string {
  if (!vnodes || (isVNode(vnodes) && vnodes.type === Comment)) return ''

  if (isString(vnodes)) return vnodes
  if (isArray(vnodes)) return vnodes.map(extractVNodeText).join('')

  if (isObject(vnodes)) {
    const node = vnodes

    if (isString(node.children)) return node.children
    else if (isArray(node.children)) return node.children.map(extractVNodeText).join('')
  }

  return ''
}
</script>
