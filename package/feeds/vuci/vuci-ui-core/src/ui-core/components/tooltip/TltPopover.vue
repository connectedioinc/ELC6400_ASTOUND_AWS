<template>
  <TltPositioner
    v-slot="{ reference }"
    v-bind="tltPositionerProps"
  >
    <BasePopover v-bind="popoverProps">
      <template
        v-if="$slots.title || props.title"
        #title
      >
        <slot
          name="title"
          :reference="reference"
        >
          {{ props.title }}
        </slot>
      </template>
      <template v-if="$slots.default || props.content">
        <slot
          v-if="!props.rawhtml"
          :reference="reference"
        >
          {{ props.content }}
        </slot>
      </template>
    </BasePopover>
  </TltPositioner>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { utils } from '@/plugins/utils'
import BasePopover, { type Props as PopoverProps } from './BasePopover.vue'
import TltPositioner, { type Props as PositionerProps } from './TltPositioner.vue'

export type Props = Omit<PositionerProps, 'id'> & PopoverProps

const props = defineProps<Props>()

const emit = defineEmits<{
  shown: [boolean]
}>()

const id = `popover_${utils.getUniqueId()}`

const tltPositionerProps = computed<PositionerProps>(() => ({
  id: id,
  forceShow: props.forceShow,
  arrow: props.arrow,
  openDelay: props.openDelay,
  closeDelay: props.closeDelay,
  padding: props.padding,
  placement: props.placement,
  fallbackPlacements: props.fallbackPlacements,
  autoUpdateOptions: props.autoUpdateOptions,
  disabled: props.disabled,
  triggers: props.triggers,
  triggersTarget: props.triggersTarget,
  target: props.target,
  onShown: (value: boolean) => emit('shown', value)
}))

const popoverProps = computed<PopoverProps>(() => ({
  id: id,
  title: props.title,
  content: props.content,
  rawhtml: props.rawhtml,
  variant: props.variant
}))
</script>
