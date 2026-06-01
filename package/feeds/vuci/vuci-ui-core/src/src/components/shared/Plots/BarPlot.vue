<template>
  <div class="flex flex-col gap-4">
    <div
      ref="plotRef"
      class="w-[calc(100%+32px)] -mx-4"
    >
      <svg class="size-0">
        <linearGradient
          v-for="dataOption in props.options.datasetOptions"
          :id="`${String(dataOption.key)}-gradiant`"
          :key="dataOption.key"
          gradientTransform="rotate(90)"
        >
          <stop
            offset="0%"
            :stop-color="dataOption.color"
            stop-opacity="1"
          />
          <stop
            offset="100%"
            :stop-color="dataOption.color"
            stop-opacity="0.25"
          />
        </linearGradient>
      </svg>
    </div>
    <tlt-popover
      v-if="popoverData"
      :target="`#${popoverId}`"
      placement="top"
      :fallback-placements="['bottom']"
      force-show
      :delay="0"
      class="transition-none! pointer-events-none [&_.positioner-arrow]:bg-theme-bg-floating"
      arrow
    >
      <b>{{ dayjsRange(popoverData.mesurement.startTime, popoverData.mesurement.endTime, props.options.x.tooltipFormat, popoverData.mesurement.isNow, false) }} </b>
      <div
        v-for="dataOption in [...options.datasetOptions].sort((a, b) => scaleY(popoverData?.rates?.[a.key]!) - scaleY(popoverData?.rates[b.key]!))"
        :key="dataOption.key"
        class="flex gap-x-1 items-center flex-wrap"
      >
        <div
          :style="{ borderColor: dataOption.color, content: '' }"
          class="rounded-full size-2 border-2"
        ></div>
        <b>{{ dataOption.name }}:</b>
        {{ (props.options.y?.format ?? defaultYformat)(popoverData.rates[dataOption.key], undefined, dataOption.key) }}
      </div>
    </tlt-popover>
  </div>
</template>

<script lang="ts" setup generic="T extends MeasurementGeneric">
import { ref, onMounted, watch, computed, watchEffect } from 'vue'
import { useElementSize } from '@vueuse/core'
import { Measurement, type MeasurementGeneric } from './measurement'

import { create, axisBottom, scaleLinear, axisLeft, scaleBand, select, ticks } from 'd3'
import { dayjsRange } from './timeAndDateExtras'
import { utils } from '@/plugins/utils'
import { localDate } from '@ui-core/plugins/date'
import { BOTTOM_MARGIN, dedupeTicks, defaultYformat, scaleMargin, SIDE_MARGIN, TOP_MARGIN } from './plotCommon'

export interface BarPlotOptions<T extends MeasurementGeneric> {
  height: number
  x: {
    tooltipFormat: string | { normal: string; now: string }
    format: string
  }
  y?: {
    suggestedMin?: number
    suggestedMax?: number
    tickCount?: number
    /** Format function used to format spot or speed values it if its speed value add per second (mesurement/s) at the end. If not specified raw value is displayed */
    format?: (value: string | number | null, yAxisID?: string, key?: keyof T) => string
    /** Used for current value for speed mesurements Do not include time interval like "mesurement/s", it should be onlt "mesurement" */
    formatSpot?: (value: string | number | null, yAxisID?: string, key?: keyof T) => string
  }
  datasetOptions: DatasetOptions<T>[]
}

export interface DatasetOptions<T extends MeasurementGeneric> {
  key: keyof T
  color: string
  name: string
  show?: boolean
  hidden?: boolean
  help?: string
}

export interface Props<T extends MeasurementGeneric> {
  data: Measurement<T>[]
  options: BarPlotOptions<T>
}

const props = defineProps<Props<T>>()

const filteredDatasetOptions = computed(() => props.options.datasetOptions.filter(e => (e.show ?? true) && !e.hidden))

// Uneque is needed to generate unique htmls ids as few charts can excists at the same time
const elementId = utils.getUniqueId()
const popoverId = `popover-${elementId}`

const plotRef = ref<HTMLDivElement | null>(null)
const elementSize = useElementSize(plotRef)

const margin = computed(() => ({
  top: TOP_MARGIN,
  bottom: BOTTOM_MARGIN,
  left: scaleMargin(ticks(minData.value, maxData.value, props.options.y?.tickCount ?? 5), props.options.y?.format ?? defaultYformat),
  right: SIDE_MARGIN
}))

// post render to reuse some elements
const svg = create<SVGAElement>('svg').style('max-width', '100%').style('height', 'auto')
// if we want to prevent scroll events on phone
// .on('touchstart', event => event.preventDefault())

const gx = svg.append('g')
let scaleX = scaleBand<number>()
let subScaleX = scaleBand<keyof T>()
const axisX = axisBottom<number>(scaleX)
axisX.tickFormat(value => localDate(value / 1000, { format: props.options.x.format }))
axisX.tickSize(0)
axisX.tickPadding(6)

let gy = svg.append('g')
const scaleY = scaleLinear([0, 1], [0, 1])
const axisY = axisLeft(scaleY)
axisY.tickSize(0)
axisY.tickPadding(6)

let charts = svg.append('g').selectAll<SVGGElement, ParsedData>('g')
let mouseAreas = svg.append('g').selectAll<SVGGElement, ParsedData>('g')
const pointerBBls = svg.append('g')
// const pointerLine = svg.append('line').attr('stroke', 'var(--color-theme-border-strong)').attr('stroke-dasharray', 2)

const popoverSvg = svg.append('circle').attr('id', popoverId)
const popoverData = ref<ParsedData | null>(null)
const isMobile = computed(() => elementSize.width.value <= 640)
const isTablet = computed(() => elementSize.width.value <= 1024)

type ParsedData = { mesurement: Measurement<T>; rates: T }

// Heavy calculations are moved from render function so animations like zoom or pan would be more performant
// Almost everything can be moved but it will probably look ugly will see
const parsedData = computed<ParsedData[]>(() =>
  [...props.data]
    .sort((a, b) => a.endTime - b.endTime)
    .flatMap(dataPoint => {
      return {
        mesurement: dataPoint,
        rates: Object.fromEntries(filteredDatasetOptions.value.map(datasetOption => [datasetOption.key, dataPoint.value[datasetOption.key]])) as unknown as T
      }
    })
    .filter(e => e !== null)
)

const rawDataPoint = computed(() => {
  const res = parsedData.value.flatMap(e => Object.values(e.rates)).filter((e): e is number => e !== null && Number.isFinite(e))
  if (props.options.y?.suggestedMax !== undefined) res.push(props.options.y.suggestedMax)
  res.push(props.options.y?.suggestedMin ?? 0)
  return res
})
const maxData = computed(() => Math.max(...rawDataPoint.value))
const minData = computed(() => Math.min(...rawDataPoint.value))

watchEffect(() => {
  svg.attr('width', elementSize.width.value).attr('height', props.options.height).attr('viewBox', [0, 0, elementSize.width.value, props.options.height])
})

function render() {
  const width = elementSize.width.value
  const height = props.options.height
  if (!width || !height) return

  // X axis
  scaleX.domain(parsedData.value.map(e => e.mesurement.endTime))
  scaleX.range([margin.value.left, width - margin.value.right])

  // Sub axis x
  subScaleX.domain(filteredDatasetOptions.value.map(e => e.key))
  subScaleX.padding(0.1)
  // 76 max col width
  const maxColWidth = 76
  const maxInnerWidth = maxColWidth * filteredDatasetOptions.value.length - 1 * subScaleX.paddingInner() + maxColWidth
  const maxOuterWidth = maxInnerWidth + 16 * 2
  const subScaleMargin = scaleX.bandwidth() <= maxOuterWidth ? 0 : (scaleX.bandwidth() - maxOuterWidth) / 2
  subScaleX.range([subScaleMargin, scaleX.bandwidth() - subScaleMargin])

  axisX.tickValues(dedupeTicks({ ticks: scaleX.domain(), format: axisX.tickFormat()!, scale: scaleX, bandwidth: scaleX.bandwidth(), width, padding: 10 }))

  gx.attr('transform', `translate(0,${props.options.height - margin.value.bottom})`)
  gx.call(axisX)

  // Y axis
  scaleY.domain([maxData.value, minData.value])
  scaleY.range([margin.value.top, height - margin.value.bottom])

  const yFormat = props.options.y?.format
  if (yFormat) axisY.tickFormat(value => yFormat(value.valueOf()) ?? '')
  else axisY.tickFormat(defaultYformat)

  axisY.tickSize(-(width - margin.value.left - margin.value.right))
  axisY.ticks(props.options.y?.tickCount ?? 5)
  gy.attr('transform', `translate(${margin.value.left},0)`)
  gy.call(axisY).call(g => g.select('.domain').remove())

  // Charts
  charts = charts
    .data(parsedData.value, e => e.mesurement.endTime)
    .join('g')
    .attr('transform', e => 'translate(' + scaleX(e.mesurement.endTime)! + ',0)')

  mouseAreas = mouseAreas
    .data(parsedData.value, e => e.mesurement.endTime)
    .join('rect')
    .attr('x', e => scaleX(e.mesurement.endTime)!)
    .attr('y', 0)
    .attr('width', scaleX.bandwidth())
    .attr('height', height - margin.value.bottom)
    .attr('fill', 'transparent')
    .on('pointerenter', pointermoved)
    .on('pointerleave', pointerleft)

  charts
    .selectAll('rect')
    .data(e => filteredDatasetOptions.value.map(key => ({ x: key, y: e.rates[key.key] })).filter((e): e is { x: DatasetOptions<T>; y: NonNullable<(typeof e)['y']> } => !!e.y))
    .join('rect')
    .attr('x', e => subScaleX(e.x.key)!)
    .attr('y', e => scaleY(e.y))
    .attr('width', subScaleX.bandwidth())
    .attr('height', e => height - margin.value.bottom - scaleY(e.y))
    .attr('fill', e => `url('#${String(e.x.key)}-gradiant')`)

  pointerRecheck()
}

function pointermoved(event?: any) {
  const pointerData = select<SVGGElement, ParsedData>(event.currentTarget).datum()
  if (pointerData === undefined) {
    pointerleft()
    return
  }
  popoverData.value = pointerData

  const definedDatasetOptions = filteredDatasetOptions.value.filter(e => Number.isFinite(pointerData.rates[e.key]))

  const maxY = Math.max(...definedDatasetOptions.map(key => pointerData.rates[key.key]!))

  const pointerBBlsRadius = 3
  const pointerBBlsStroke = 2
  const pointerBBlsOffsetRadius = pointerBBlsRadius + pointerBBlsStroke * 2
  popoverSvg
    .attr('cy', scaleY(maxY))
    .attr('cx', scaleX(pointerData.mesurement.endTime)! + scaleX.bandwidth() / 2)
    .attr('r', pointerBBlsOffsetRadius)
    .attr('fill', 'transparent')

  pointerBBls.style('display', null)
  // pointerLine.style('display', null)
  const xPos = scaleX(pointerData.mesurement.endTime)!
  pointerBBls
    .selectAll<SVGCircleElement, DatasetOptions<T>>('circle')
    .data(definedDatasetOptions, e => String(e.key))
    .join('circle')
    .attr('cy', e => scaleY(pointerData.rates[e.key] ?? 0))
    .attr('cx', e => xPos + subScaleX(e.key)! + subScaleX.bandwidth() / 2)
    .attr('r', pointerBBlsRadius)
    .attr('fill', 'white')
    .attr('stroke', e => e.color)
    .attr('stroke-width', pointerBBlsStroke)
}

function pointerRecheck() {
  if (parsedData.value.some(data => data.mesurement.startTime === popoverData.value?.mesurement.startTime)) return
  pointerleft()
}

function pointerleft() {
  popoverData.value = null
  pointerBBls.style('display', 'none')
}

watch([props, props.options.y?.format, elementSize.width, isMobile, isTablet, filteredDatasetOptions], render, { immediate: false })

onMounted(() => {
  render()
  if (!plotRef.value) return
  const svgNode = svg.node()
  if (!svgNode) return
  plotRef.value.append(svgNode)
})
</script>

<style scoped>
:deep(.tick) line {
  color: var(--theme-border-base);
}
:deep(.tick):last-child line {
  stroke-width: 2px;
}
</style>
