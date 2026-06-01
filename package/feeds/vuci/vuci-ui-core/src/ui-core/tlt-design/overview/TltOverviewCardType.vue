<template>
  <div
    class="overview__card"
    :class="{ selectable, selected, disabled }"
    @click="$emit('click', $event, item)"
  >
    <component
      :is="component"
      v-bind="{ ...$props, ...$attrs }"
      :disabled="readOnly"
      @start-drag="$emit('start-drag', $event)"
    >
      <template #header="{ widget }">
        <slot
          name="header"
          :widget="widget"
        />
      </template>
      <template #content="{ info }">
        <slot
          name="content"
          :info="info"
        />
      </template>
    </component>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMainStore } from '@/stores/main'
import { isArray } from '@ui-core/utils/inspect'

interface Widget {
  type: keyof typeof componentMap
  [key: string]: any
}

export interface Props {
  widget?: Widget | Widget[]
  item?: any
  clickableLabel?: boolean
  selectable?: boolean
  selected?: boolean
  disabled?: boolean
}

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<Props>(), {
  widget: undefined,
  item: () => ({}),
  disabled: undefined
})

defineEmits<{
  click: [MouseEvent, any]
  'start-drag': [MouseEvent | TouchEvent]
}>()

const store = useMainStore()

const componentMap = {
  basic: 'TltOverviewCardBasic',
  interface: 'TltOverviewCardInterface',
  interfaceStatus: 'TltOverviewCardInterfaceStatus',
  sms_limit: 'TltOverviewCardSmsLimit',
  modem: 'TltOverviewCardModem',
  rms: 'TltOverviewCardRms',
  system: 'TltOverviewCardSystem',
  wifi: 'TltOverviewCardWifi',
  'system-basic': 'TltOverviewCardSystemBasic'
}
const component = computed(() => {
  const type = isArray(props.widget) ? props.widget[0]?.type : props.widget?.type
  if (!type) return 'TltOverviewCardBasic'
  return componentMap[type]
})

const readOnly = computed(() => props.disabled ?? store.readOnlyPage)
</script>

<style scoped>
.overview__card {
  background: var(--color-theme-bg-surface);
  border: 1px solid var(--color-theme-border-base);
  border-radius: 5px;
  min-height: 300px;
  line-height: normal;
  &.selectable {
    cursor: pointer;
    transition: 0.3s;
    &:hover,
    &.selected {
      border: 1px solid var(--color-theme-border-primary);
    }
  }
}
</style>
