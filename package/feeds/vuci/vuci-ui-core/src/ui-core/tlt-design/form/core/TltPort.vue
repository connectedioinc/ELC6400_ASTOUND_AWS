<template>
  <tlt-hint
    :hints="hints"
    rawhtml
    class="port-hint relative"
    :expand-to="(sfpPort && staticPortData.position === 'down') || (!sfpPort && staticPortData.position === 'up') ? 'top-start' : 'bottom-start'"
    :show-on-click="portData.hint?.some(e => e.showOnClick)"
  >
    <button
      :id="id"
      :test-id="`port-${id}`"
      class="port-box group/port disabled:bg-theme-bg-secondary-subtle"
      :disabled="readonly"
      @click="modelValue = !modelValue"
    >
      <icon-port
        class="img-port group-enabled/port:group-hover/port:scale-110 h-auto"
        :class="[
          {
            'rotate-180': staticPortData.position === 'down',
            'opacity-50': portData.dimmed
          },
          portSize
        ]"
        :type="staticPortData.type"
        :color="color"
      />
      <div
        class="flex justify-center items-center port-number"
        :class="numberPosition"
      >
        <span>
          {{ customName || staticPortData.num }}
        </span>
      </div>
      <span
        class="tag"
        :class="tagPosition"
      >
        <span v-if="sfpPort"> SFP </span>
        <tlt-icon
          v-else-if="portData.poe && portData.poe !== 'none'"
          class="icon"
          :class="poeIconColors[portData.poe]"
          icon="poe"
        />
      </span>
      <tlt-icon
        v-if="portData.error"
        class="icon absolute text-theme-text-danger"
        :class="{
          'top-1 left-1': staticPortData.position === 'up',
          'bottom-1 left-1': staticPortData.position === 'down'
        }"
        icon="error"
        solid
      />
      <template
        v-for="extraIcon in extraIcons"
        :key="extraIcon.icon"
      >
        <span
          v-if="extraIcon.position === 'center'"
          class="absolute left-1/2 -translate-x-1/2 font-semibold leading-3 flex items-center flex-nowrap group-enabled/port:group-hover/port:scale-110"
          :class="[
            extraIcon.class,
            (darkColors as string[]).includes(color) ? 'text-theme-text-on-secondary' : 'text-theme-text-secondary',
            staticPortData.position === 'up' ? 'center-up' : 'center-down'
          ]"
        >
          <tlt-icon
            :icon="extraIcon.icon"
            class="icon"
          />
          {{ extraIcon.text }}
        </span>
        <tlt-icon
          v-else
          class="absolute icon"
          :class="[
            extraIcon.class,
            {
              'top-2 right-2': extraIcon.position === 'topRight',
              'top-2 left-2': extraIcon.position === 'topLeft',
              'bottom-2 right-2': extraIcon.position === 'bottomRight' || extraIcon.position === undefined,
              'bottom-2 left-2': extraIcon.position === 'bottomLeft',
              '': extraIcon.position === 'custom'
            }
          ]"
          :icon="extraIcon.icon"
        />
      </template>
      <span
        v-if="selectable"
        class="port-checkbox"
      >
        <tlt-check-box
          :model-value="modelValue"
          :custom-id="id"
          type="checkbox"
          class="pointer-events-none tab"
          :readonly="false"
          size="sm"
        />
      </span>
      <span
        v-if="portData.speed && portData.speed !== '0'"
        class="absolute z-10 bg-theme-bg-secondary-subtle rounded-full px-1 leading-3 text-[0.5rem] -bottom-1.5 left-1/2 -translate-x-1/2 text-theme-text-base min-w-0 max-w-full truncate"
      >
        {{ getPortSpeed(portData.speed) }}
      </span>
    </button>
  </tlt-hint>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useMainStore } from '@/stores/main'
import { useCommonInjects } from './_shared/useCommonInjects'
import { useTranslate } from '@ui-core/composables/useI18n'
import { portIconColors, poeIconColors, darkColors, getPortSpeed } from '@/plugins/ports'
import IconPort from '@ui-core/tlt-design/icons/IconPort.vue'
import type { PoeState } from '@/plugins/ports'
import type { StaticPortInfo } from '@/types/portTypes'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import type { Props as PortsLegendItemProps } from '@ui-core/tlt-design/customComponents/network/PortsLegendItem.vue'

export type PortData = {
  /** port icon type */
  type?: PortType
  /** add poe icon */
  poe?: PoeState
  /** port cannot be selected */
  readonly?: boolean
  /** show hint on hover */
  hint?: { title?: string; info: string; showOnClick?: boolean }[]
  /** Shows error icon and displays in hint */
  error?: string
  /** makes port icon dimmer */
  dimmed?: boolean
  /** show select. By default true */
  selectable?: boolean
  /** shows port speed pill under port icon */
  speed?: number | string
  /** adds extra icons(s) */
  extraIcon?: ExtraIcon | ExtraIcon[]
  /** if ports aggregated their aggregation index */
  bondIndex?: string | number
  /** list of keys to copy from aggregation parent port */
  copyFromParent?: Array<keyof PortData>
}

export type ExtraIcon = {
  icon: Icon
  position?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft' | 'center' | 'custom'
  text?: string | number
  class?: string
  legend?: PortsLegendItemProps['item']
}

export interface Props {
  portData: Partial<PortData>
  staticPortData: StaticPortInfo
  readonly?: boolean
  selectable?: boolean
  customId: string
  customName?: string
  portSize: string
}
const props = withDefaults(defineProps<Props>(), {
  portData: () => ({}),
  customId: '',
  customName: '',
  portSize: 'w-10'
})

const modelValue = defineModel<boolean>()

const { itemId, elementId } = useCommonInjects()
const $t = useTranslate()
const store = useMainStore()

const portTypes = {
  up: portIconColors.up,
  down: portIconColors.down,
  true: portIconColors.up,
  false: portIconColors.down,
  1: portIconColors.up,
  0: portIconColors.down,
  enabled: portIconColors.enabled,
  disabled: portIconColors.disabled,
  t: portIconColors.tagged,
  u: portIconColors.untagged,
  aggregated: portIconColors.aggregated
} as const

export type PortType = keyof typeof portTypes

onMounted(() => {
  if (!itemId && !props.customId) console.error('customId not provided')
})

const id = computed(() => elementId || props.customId)
const sfpPort = computed(() => id.value?.includes('sfp'))

const color = computed(() => {
  if (!props.portData.type) return portIconColors.down
  return portTypes[props.portData.type] ?? portIconColors.down
})

const hints = computed(() => {
  const hints = props.portData.hint ? [...props.portData.hint] : []
  if (props.portData.error) hints.push({ title: `${$t('Error')}: `, info: props.portData.error })
  return hints
})

const extraIcons = computed(() => {
  const res: ExtraIcon[] = []
  if (Number(props.portData.bondIndex) >= 1) res.push({ icon: 'aggregated', position: 'center', text: props.portData.bondIndex })
  if (props.portData.extraIcon) {
    return res.concat(Array.isArray(props.portData.extraIcon) ? props.portData.extraIcon : [props.portData.extraIcon])
  }
  return res
})

const numberPosition = computed(() => {
  const position = (!sfpPort.value && props.staticPortData.position === 'down') || (sfpPort.value && props.staticPortData.position === 'up')
  return position ? 'left-0 right-0 -bottom-6' : 'left-0 right-0 -top-6'
})

const tagPosition = computed(() => {
  const position = (sfpPort.value && props.staticPortData.position === 'down') || (!sfpPort.value && props.staticPortData.position === 'up')
  return position ? 'bottom-1' : 'top-1'
})

const readOnly = computed(() => store.readOnlyPage || props.readonly)
watch(readOnly, value => {
  if (value && modelValue.value) modelValue.value = false
})
</script>

<style scoped>
.port-box {
  display: flex;
  padding: 12px 16px;
  margin-bottom: 0px !important;
  cursor: pointer;
  border: 1px solid var(--color-theme-border-subtle);

  .port-number {
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.07px;
    color: var(--color-theme-text-base);
    position: absolute;
  }
  .tag {
    position: absolute;
    font-size: 10px;
    font-size: 0.625rem;
    left: 4px;
  }
  .img-port {
    transition: transform 0.2s;
  }
  .port-checkbox {
    position: absolute;
    right: 0.25rem;
    top: 0.25rem;
  }
}

.port-hint {
  .inline-input-text {
    top: 70px !important;
    &::after {
      left: 30px !important;
    }
    &:hover {
      visibility: hidden;
    }

    .flex-display {
      justify-content: space-between;
      &:first-child {
        margin-bottom: 5px;
      }
    }
  }
  .icon {
    width: 1rem;
    height: 1rem;
  }
  font-size: 0.75rem;
  .center-up {
    bottom: 30%;
  }
  .center-down {
    top: 30%;
  }
}

@media (max-width: 1400px) {
  .port-box {
    padding: 10px 14px !important;
  }
  .img-port {
    width: 32px;
  }
  .inline-input-text {
    top: 60px !important;
  }
  .icon {
    width: 0.75rem;
    height: 0.75rem;
  }
  .port-hint {
    font-size: 0.5rem;
  }
}

@media (max-width: 600px) {
  .img-port {
    width: 26px;
  }
  .inline-input-text {
    top: 55px !important;
  }
  .icon {
    width: 0.75rem;
    height: 0.75rem;
  }
  .port-hint {
    font-size: 0.5rem;
  }
}

@media (max-width: 500px) {
  .port-box {
    padding: 7.5px 10px !important;
  }
  .img-port {
    width: 20px;
  }
  .icon {
    width: 0.5rem;
    height: 0.5rem;
  }
}
</style>
