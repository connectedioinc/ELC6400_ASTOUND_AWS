<template>
  <div
    ref="legend"
    :test-id="`legend-${icon.id}`"
    class="flex gap-2 items-center"
  >
    <slot>
      <tlt-popover
        v-if="icon.hint"
        :target="() => legend"
        placement="bottom"
        fallback-placements="top"
      >
        {{ icon.hint }}
      </tlt-popover>
      <tlt-icon
        v-if="icon.type === 'icon'"
        :icon="icon.icon"
        :class="icon.class"
        class="size-5"
        v-bind="icon.props"
      />
      <div
        v-else-if="icon.type === 'square'"
        class="square"
        :class="icon.class"
      />
      <div
        v-else-if="icon.type === 'tag'"
        class="square tag"
      >
        <span class="legend-box-tag">
          {{ icon.text }}
        </span>
      </div>
      <span
        v-else-if="icon.type === 'pill'"
        class="legend-box-tag bg-theme-bg-secondary-subtle rounded-full px-1 leading-3"
      >
        {{ icon.text }}
      </span>
    </slot>
    <span>
      <slot
        name="text"
        :text="icon.text"
      >
        {{ icon.text }}
      </slot>
    </span>
  </div>
</template>

<script setup lang="ts">
import { portBgColors, poeIconColors, getVlanHints } from '@/plugins/ports'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import { computed, ref } from 'vue'
import { log } from '@ui-core/plugins/log'

const legend = ref<HTMLElement | null>(null)

interface LegendIconGeneral {
  id: string
  type: string
  text: string
  hint?: string
}
export interface LegendIconNormal extends LegendIconGeneral {
  type: 'square'
  class: `bg-${string}`
}
export interface LegendIconTag extends LegendIconGeneral {
  type: 'tag'
}
export interface LegendIconIcon extends LegendIconGeneral {
  type: 'icon'
  class: `text-${string}`
  icon: Icon
  props?: Record<string, any>
}
export interface LegendIconPill extends LegendIconGeneral {
  type: 'pill'
}
export type LegendIcon = LegendIconNormal | LegendIconIcon | LegendIconTag | LegendIconPill

export type LegendItem = keyof typeof icons

export interface Props {
  item: LegendItem | LegendIcon
}
const props = defineProps<Props>()

const $t = useTranslate()

const vlanHints = getVlanHints()
const icons = {
  portUp: { type: 'square', class: portBgColors.up, text: $t('Up'), hint: $t('Port connection has been established.') },
  portDown: { type: 'square', class: portBgColors.down, text: $t('Down'), hint: $t('Nothing is plugged in into port or connection could not be established.') },
  portEnabled: { type: 'square', class: portBgColors.enabled, text: $t('Enabled'), hint: $t('Port is active.') },
  portDisabled: { type: 'square', class: portBgColors.disabled, text: $t('Disabled'), hint: $t('Port or particular port function is disabled.') },
  tagSfp: { type: 'tag', text: 'SFP', hint: $t('Small Form-factor Pluggable - modular slot for fiber-optic or copper cable transceivers.') },
  vlanTagged: {
    type: 'square',
    class: portBgColors.tagged,
    text: $t('Tagged'),
    hint: vlanHints.tagged
  },
  vlanUntagged: {
    type: 'square',
    class: portBgColors.untagged,
    text: $t('Untagged'),
    hint: vlanHints.untagged
  },
  errors: {
    type: 'icon',
    icon: 'error',
    props: { solid: true },
    class: 'text-theme-text-danger',
    text: $t('Errors'),
    hint: $t('Some ports have errors.')
  },
  poeEnabled: { type: 'icon', icon: 'poe', class: poeIconColors.enabled, text: $t('PoE enabled'), hint: $t('PoE is enabled and it is waiting to be required by a connected device.') },
  poeDisabled: { type: 'icon', icon: 'poe', class: poeIconColors.disabled, text: $t('PoE disabled'), hint: $t('PoE is supported but disabled in Ports Settings.') },
  poeActive: { type: 'icon', icon: 'poe', class: poeIconColors.active, text: $t('PoE active'), hint: $t('PoE is enabled and it has been activated by a connected device.') },
  portAggregated: {
    type: 'icon',
    icon: 'aggregated',
    class: 'text-theme-text-base',
    text: $t('Aggregated'),
    hint: $t('Multiple physical network ports are combined into a single logical link to increase the bandwidth and provide redundancy.')
  },
  portIndividual: { type: 'square', class: portBgColors.down, text: $t('Individual'), hint: $t('Port does not belong to any aggregated group.') }
} satisfies Record<string, DistributiveOmit<LegendIcon, 'id'>>

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

const icon = computed<LegendIcon>(() => {
  if (typeof props.item === 'object') return props.item
  const icon = icons[props.item]
  if (!icon) {
    log(`"${props.item}" is not valid legend item`, true)
    return { id: 'invalid-item', type: 'square', class: portBgColors.down, text: '' }
  }
  return { id: props.item, ...icon }
})
</script>

<style scoped>
.square {
  width: 1rem;
  height: 1rem;
}
.legend-box-tag {
  font-size: 0.5rem;
  line-height: 1;
}
.tag {
  background: none;
  border: 1px solid var(--color-theme-border-subtle);
  border-radius: 1px;
  display: flex;
  align-items: end;
}
</style>
