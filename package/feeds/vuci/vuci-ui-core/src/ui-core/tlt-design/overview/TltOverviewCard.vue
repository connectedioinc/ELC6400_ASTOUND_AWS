<template>
  <div
    class="h-full flex flex-col"
    :test-id="item.id === item.sectionName ? `overview-card-${item.id}` : `overview-card-${item.id}-${item.sectionName ?? ''}`"
    @click="$emit('click', item)"
  >
    <div
      v-if="!selectable && !clickableLabel"
      class="card-title p-4 pb-0 content-title"
      :class="{ disabled, 'content-title-drag': draggable }"
      v-bind="draggable ? events : {}"
      @mousedown="draggable && $emit('startDrag', $event)"
    >
      <div class="flex gap-2 justify-between items-center pb-1 border-b border-theme-border-strong">
        <div class="flex min-w-0 gap-1">
          <div class="truncate font-semibold uppercase">
            <slot name="header" />
          </div>
          <div class="ml-1 shrink-0 self-center">
            <tlt-routing-icons
              :status-path="statusPath"
              :services-path="servicesPath"
            />
          </div>
        </div>
        <div class="flex-none">
          <slot name="header-item" />
        </div>
      </div>
    </div>
    <div
      v-else
      class="content-title p-4 pb-0"
      :class="{ 'cursor-pointer': item.onClick }"
      @click="onClick"
    >
      <div
        class="pb-1 border-b border-theme-border-strong flex justify-between font-semibold uppercase"
        :style="item.headerStyle || ''"
      >
        <slot name="header" />
        <slot name="header-item" />
      </div>
    </div>
    <div class="grow mx-4 mb-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTouchDrag } from '@ui-core/composables/useTouchDrag'
import type { Path } from '@ui-core/tlt-design/widgets/tltRoutingIcons.vue'

export interface CardItem {
  id: string
  sectionName?: string
  headerStyle?: string
  onClick?: (...args: any[]) => void
}

export interface Props {
  servicesPath?: string | Path
  statusPath?: string | Path
  item: CardItem
  clickableLabel?: boolean
  selectable?: boolean
  disabled?: boolean
  draggable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  servicesPath: '',
  statusPath: ''
})

const emit = defineEmits<{
  click: [item: CardItem | CardItem[]]
  startDrag: [event: TouchEvent | MouseEvent]
}>()

const { events } = useTouchDrag({
  callback: event => emit('startDrag', event)
})

function onClick(...rest: any[]) {
  if (props.disabled || !props.item.onClick) return
  props.item.onClick(...rest)
}
</script>

<style scoped>
.content-title-drag {
  text-transform: uppercase;
  color: var(--color-theme-text-base);
  font-size: 1.5em;
  &:hover:not(.disabled) {
    cursor: grab;
  }
}
.content-title {
  text-transform: uppercase;
  color: var(--color-theme-text-base);
  font-size: 1.5em;
}
</style>
