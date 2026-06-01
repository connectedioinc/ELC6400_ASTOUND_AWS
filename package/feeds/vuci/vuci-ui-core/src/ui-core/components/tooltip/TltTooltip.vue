<template>
  <TltPositioner
    v-bind="props"
    :id="id"
    :disabled="props.disabled"
  >
    <BaseTooltip :id="id">
      <slot>
        {{ props.content }}
      </slot>
    </BaseTooltip>
  </TltPositioner>
</template>

<script setup lang="ts">
import { utils } from '@/plugins/utils'
import BaseTooltip, { type Props as TooltipProps } from './BaseTooltip.vue'
import TltPositioner, { type Props as PositionerProps } from './TltPositioner.vue'

type Props = Omit<PositionerProps, 'id'> & TooltipProps
const props = defineProps<Props>()

const id = `tooltip_${utils.getUniqueId()}`
</script>
