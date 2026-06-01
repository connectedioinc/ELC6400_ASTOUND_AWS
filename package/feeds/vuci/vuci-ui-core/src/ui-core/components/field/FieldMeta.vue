<template>
  <Slot
    v-if="$slots.trigger && metaState"
    ref="triggerSlot"
  >
    <slot name="trigger"> </slot>
  </Slot>
  <TltPopover
    v-if="metaState && targetElement"
    v-bind="{ ...props, ...$attrs }"
    :target="targetElement"
    :variant="metaState"
  >
    <div class="flex gap-3 font-semibold rounded">
      <TltIcon
        :icon="metaState"
        class="size-5 shrink-0"
      />
      <ul>
        <li
          v-for="message in messages"
          :key="message"
        >
          {{ message }}
        </li>
      </ul>
    </div>
  </TltPopover>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { injectFieldMetaContext } from './use-field-context'
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'
import TltPopover, { type Props as TltPopoverProps } from '../tooltip/TltPopover.vue'
import { Slot } from '../primitive/Slot'
import type { ComponentPublicInstance } from 'vue'

defineOptions({
  inheritAttrs: false
})

type Props = {
  target?: HTMLElement
  /**
   * @default 'hover focus'
   */
  triggers?: TltPopoverProps['triggers']
  /**
   * @default 'right-start'
   */
  placement?: TltPopoverProps['placement']
  /**
   * @default ['bottom-start', 'top-start', 'bottom-end', 'top-end']
   */
  fallbackPlacements?: TltPopoverProps['fallbackPlacements']
  /**
   * @default false
   */
  forceShow?: TltPopoverProps['forceShow']
}

const props = withDefaults(defineProps<Props>(), {
  forceShow: false,
  // @ts-ignore
  fallbackPlacements: ['bottom-start', 'top-start', 'bottom-end', 'top-end'] as const,
  placement: 'right-start',
  triggers: 'hover focus',
  target: undefined
})

const { errors, metaState, warnings } = injectFieldMetaContext()

const messages = computed(() => (errors.value.length ? errors.value : warnings.value))

const triggerSlot = useTemplateRef<ComponentPublicInstance<any>>('triggerSlot')

const targetElement = computed(() => props.target || triggerSlot.value?.$el)
</script>
