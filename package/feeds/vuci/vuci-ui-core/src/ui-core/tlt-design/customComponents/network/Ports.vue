<template>
  <div
    class="flex gap-y-10 gap-x-16 justify-center items-center"
    :class="[inline ? 'flex-wrap' : 'flex-col']"
  >
    <div class="flex flex-col gap-2">
      <slot
        name="multi-action"
        :fire-multi-action="fireMultiAction"
      >
        <tlt-button
          v-if="selectable && multiple"
          type="text"
          class="ml-auto"
          @click="fireMultiAction"
        >
          {{ multiAction }}
        </tlt-button>
      </slot>
      <div
        ref="container"
        :class="['flex', widget ? 'flex-nowrap' : 'flex-wrap', 'justify-center select-none gap-y-5 gap-x-5 sm:gap-x-7']"
      >
        <div
          v-for="{ type, name, blocks } in [{ type: 'eth', name: $t('Ethernet'), blocks: ethPortBlocks }, ...(sfpPortBlocks.length ? [{ type: 'sfp', name: $t('SFP'), blocks: sfpPortBlocks }] : [])]"
          ref="mainBlocks"
          :key="type"
          class="flex flex-col justify-center gap-y-5 gap-x-5 sm:gap-x-7"
        >
          <div
            v-for="{ block, ports: blockPorts } in blocks"
            :key="block"
            class="flex gap-y-16 justify-center relative"
            :class="[
              widget ? 'flex-nowrap mb-10' : 'flex-wrap',
              {
                'border border-grey-tlt-5 rounded-sm py-8 px-3 md:px-4': !borderless && !widget,
                'mt-4': borderless && !widget
              }
            ]"
          >
            <template
              v-for="(portPairs, index) in blockPorts"
              :key="index"
            >
              <div class="flex flex-col gap-4">
                <template
                  v-for="(port, portIndex) of portPairs"
                  :key="port?.name || portIndex"
                >
                  <tlt-port
                    v-if="port"
                    :port-size="portSize"
                    :model-value="isSelected(port.name)"
                    :custom-id="(port.custom?.toLowerCase() || port.name) + '-switch'"
                    :static-port-data="port"
                    :port-data="parsedPortData[port.name]"
                    :readonly="parsedPortData[port.name].readonly"
                    :selectable="(parsedPortData[port.name].selectable ?? selectable) && !getPortParent(port.name)"
                    :custom-name="port.custom"
                    @update:model-value="val => updateSelectedPorts(port, !!val)"
                  />
                </template>
              </div>
            </template>
            <div
              v-if="!borderless && !widget && !noBlocks"
              class="absolute mx-auto left-0 right-0 text-center -bottom-2 w-max px-2 text-xs font-semibold tracking-wide"
            >
              {{ name }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="legend && ($slots.legend || legendItems.length > 0)"
      class="gap-4 gap-x-6 justify-center"
      :class="{
        'w-full flex flex-wrap': !inline,
        'grid grid-cols-[repeat(2,max-content)]': inline
      }"
    >
      <slot
        name="legend"
        :items="legendItems"
      >
        <ports-legend-item
          v-for="(item, index) in legendItems"
          :key="(isString(item) && item) || item.id || index"
          :item="item"
        />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { StaticPortInfo } from '@/types/portTypes'

import TltPort, { type PortData } from '@ui-core/tlt-design/form/core/TltPort.vue'
import { isArray, isObject, isString } from '@ui-core/utils/inspect'
import PortsLegendItem, { type LegendItem, type LegendIcon, type LegendIconPill } from './PortsLegendItem.vue'
import { getPortSpeed } from '@/plugins/ports'

export type Block = {
  block: string
  ports: (StaticPortInfo | undefined)[][]
}

export interface Props {
  /**
   * Whether the ports are selectable
   */
  selectable?: boolean
  /**
   * Whether multiple ports can be selected
   */
  multiple?: boolean
  /**
   * Function to get port data
   */
  getPortData: (portName: string) => PortData | undefined
  /**
   * Custom ports to display. If not set, ports from board will be used
   */
  customPorts?: StaticPortInfo[] | null
  /**
   * Do not render border around blocks with block name
   */
  borderless?: boolean
  /**
   * Size of each port
   */
  portSize?: string
  /**
   * Whether to show legend inline with ports, provided there is enough space
   */
  inline?: boolean
  /**
   * Whether to show legend. Can be overridden by slot, otherwise automatically generated from port data
   */
  legend?: boolean
  widget?: boolean
  noBlocks?: boolean
  /** Set it to false if aggregated ports have seperate configurations */
  selectionAggregation?: boolean
  extraLegends?: Array<LegendIcon & { order: 'start' | 'end' }>
}

const props = withDefaults(defineProps<Props>(), {
  getPortData: () => ({ type: 'down' }) as const,
  customPorts: null,
  portSize: undefined,
  legend: true,
  selectionAggregation: true,
  extraLegends: () => []
})

const emit = defineEmits<{
  /**
   * Emitted when a port is clicked. Ignored if `selectable` is `true`
   */
  portclick: [port: string]
}>()

defineSlots<{
  /**
   * Legend items override
   */
  legend: { items: LegendItem[] }
  /**
   * Customize "Select all" button, when multiple ports are selectable
   */
  'multi-action': { fireMultiAction: () => void }
}>()

const modelValue = defineModel<Array<string> | string>({ default: () => [] })

const store = useMainStore()
const $t = useTranslate()

const ports = computed<StaticPortInfo[]>(() => (props.customPorts || store.board?.network?.static?.ports) ?? [])

const ethPorts = computed(() => ports.value.filter(port => port.type === 'eth'))
const sfpPorts = computed(() => ports.value.filter(port => port.type === 'sfp'))
const portData = computed(() => Object.fromEntries(ports.value.map(port => [port.name, props.getPortData(port.name)] as const).filter((data): data is [string, PortData] => !!data[1])))

function groupIntoChunks<T>(items: T[], chunkSize = 12) {
  const result: T[][] = []
  if (chunkSize <= 0) return result
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    result.push(chunk)
  }
  return result
}

function pairItems<T>(arr1: T[], arr2: T[]) {
  const pairs: [T?, T?][] = []
  for (let i = 0; i < Math.max(arr1.length, arr2.length); i++) {
    pairs.push([arr1[i] || undefined, arr2[i] || undefined])
  }

  return pairs
}

const ethPortBlocks = computed<Block[]>(() => {
  const chunks = groupIntoChunks(ethPorts.value)
  return chunks.map((chunk, index) => {
    const upPorts = chunk.filter(port => port.position === 'up')
    const downPorts = chunk.filter(port => port.position === 'down')

    return { block: String(index), ports: pairItems(upPorts, downPorts) }
  })
})

const sfpPortBlocks = computed<Block[]>(() => {
  const chunks = groupIntoChunks(sfpPorts.value, blocksWrapping.value ? 12 : sfpPorts.value.length / ethPortBlocks.value.length)
  return chunks.map((chunk, index) => {
    const upPorts = chunk.filter(port => port.position === 'down')
    const downPorts = chunk.filter(port => port.position === 'up')

    return { block: String(index), ports: pairItems(upPorts, downPorts) }
  })
})

const legendItems = computed(() => {
  // Stable order of legend items
  const includedItems: Record<LegendItem, boolean> = {
    portUp: false,
    portDown: false,
    portEnabled: false,
    portDisabled: false,
    vlanTagged: false,
    vlanUntagged: false,
    poeEnabled: false,
    poeDisabled: false,
    poeActive: false,
    tagSfp: false,
    portAggregated: false,
    portIndividual: false,
    errors: false
  }
  const extraItems: LegendIcon[] = []
  const itemIncluded = (item: LegendIcon) => extraItems.find(i => i.id === item.id || i === item)
  const speedIncluded: number[] = []
  for (const [name, port] of Object.entries(portData.value)) {
    const staticData = ports.value.find(port => port.name === name)
    // Port type
    if (port.type !== undefined && ['up', 'true', 1].includes(port.type)) includedItems['portUp'] = true
    else if (port.type !== undefined && ['down', 'false', 0].includes(port.type)) includedItems['portDown'] = true
    else if (port.type === 'enabled') includedItems['portEnabled'] = true
    else if (port.type === 'disabled') includedItems['portDisabled'] = true
    else if (port.type === 't') includedItems['vlanTagged'] = true
    else if (port.type === 'u') includedItems['vlanUntagged'] = true

    // PoE
    if (port.poe === 'enabled') includedItems['poeEnabled'] = true
    else if (port.poe === 'disabled') includedItems['poeDisabled'] = true
    else if (port.poe === 'active') includedItems['poeActive'] = true

    // Speed
    if (port.speed && Number(port.speed) > 0 && !speedIncluded.includes(Number(port.speed))) speedIncluded.push(Number(port.speed))

    if (staticData?.type === 'sfp') includedItems['tagSfp'] = true
    if (port.error) includedItems['errors'] = true

    if (port.bondIndex) includedItems['portAggregated'] = true

    // Extra icons
    if (!port.extraIcon) continue
    if (isArray(port.extraIcon)) port.extraIcon.forEach(icon => icon.legend && isObject(icon.legend) && !itemIncluded(icon.legend) && extraItems.push(icon.legend))
    else if (port.extraIcon.legend && isObject(port.extraIcon.legend) && !itemIncluded(port.extraIcon.legend)) extraItems.push(port.extraIcon.legend)
  }
  const items = Object.entries(includedItems)
    .filter(([, value]) => value === true)
    .map(([key]) => key) as LegendItem[]
  const speedItems = speedIncluded
    .sort()
    .map<LegendIconPill>(speed => ({ id: String(speed), type: 'pill', text: getPortSpeed(speed), hint: $t('%s (%sMbps) connection has been established.').format(getPortSpeed(speed), speed) }))
  return [...props.extraLegends.filter(e => e.order === 'start'), ...items, ...speedItems, ...extraItems, ...props.extraLegends.filter(e => e.order === 'end')]
})

const noSelectedPorts = computed(() => modelValue.value.length === 0)
const multiAction = computed(() => (noSelectedPorts.value ? $t('Select all') : $t('Deselect all')))

function isSelected(port: string) {
  const realPort = getPortParent(port) ?? port
  return isArray(modelValue.value) ? modelValue.value.includes(realPort) : modelValue.value === realPort
}

function updateSelectedPorts(port: StaticPortInfo, isEnabled: boolean) {
  const portName = getPortParent(port.name) ?? port.name
  if (!(partialParsedPortData.value[portName].selectable ?? props.selectable)) return emit('portclick', portName)
  if (!props.multiple) return (modelValue.value = isEnabled ? portName : '')
  if (isEnabled) modelValue.value = [...modelValue.value, portName]
  else if (isArray(modelValue.value)) modelValue.value = modelValue.value.filter(s => s !== portName)
}

function fireMultiAction() {
  const selectablePorts = ports.value.map(port => port.name).filter(port => partialParsedPortData.value[port]?.selectable !== false && !getPortParent(port))
  modelValue.value = noSelectedPorts.value ? selectablePorts : []
}

/** Caches port statuses  */
const partialParsedPortData = computed<Record<string, PortData>>(() => Object.fromEntries(ports.value.map(port => [port.name, props.getPortData(port.name) ?? ({ type: 'down' } satisfies PortData)])))
/** If port is in bond first port is parent and configuration is made via it */
function getPortParent(port: string): string | undefined {
  if (!props.selectionAggregation || !(Number(partialParsedPortData.value[port].bondIndex) >= 0)) return
  const parent = Object.entries(partialParsedPortData.value).find(([, portData]) => partialParsedPortData.value[port].bondIndex === portData.bondIndex)?.[0]
  if (parent !== port) return parent
}

/** copyFromParent functionality */
const parsedPortData = computed<Record<string, PortData>>(() => {
  if (!props.selectionAggregation || Object.values(partialParsedPortData.value).every(e => e.bondIndex === undefined)) return partialParsedPortData.value
  const portCopy = JSON.parse(JSON.stringify(partialParsedPortData.value)) as Record<string, PortData>
  Object.entries(portCopy).forEach(([portName, portData]) => {
    const copyFromParent = portData.copyFromParent
    if (!copyFromParent) return
    const portParent = getPortParent(portName)
    if (!portParent) return
    const partialParent = Object.fromEntries(Object.entries(portCopy[portParent]).filter(([key]) => copyFromParent.includes(key as keyof PortData))) as Partial<PortData>
    portCopy[portName] = { ...portData, ...partialParent }
  })
  return portCopy
})

const containerElement = useTemplateRef('container')
const mainBlocksElements = useTemplateRef('mainBlocks')

const containerSize = useElementSize(containerElement)
const mainBlocksSize = useElementSize(() => mainBlocksElements.value?.[0])

const blocksWrapping = computed(() => containerSize.height.value > mainBlocksSize.height.value)
</script>
