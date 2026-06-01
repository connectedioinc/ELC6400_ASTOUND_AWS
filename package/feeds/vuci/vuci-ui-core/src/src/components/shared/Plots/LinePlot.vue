<template>
  <div
    class="flex flex-col gap-4"
    @wheel.prevent
  >
    <div
      v-if="props.options.x.zoom ?? false"
      class="flex gap-2 items-center"
    >
      <tlt-icon
        icon="info"
        class="text-theme-text-info size-5 shrink-0"
      />
      {{ isPointerFine ? $t('Scroll over the chart area to adjust the live data scale.') : $t('Pinch-to-zoom on the chart to adjust the live data scale.') }}
    </div>
    <div
      ref="plotRef"
      class="w-[calc(100%+32px)] -mx-4"
    >
      <svg class="size-0">
        <linearGradient
          v-for="dataOption in props.options.datasetOptions"
          :id="`${String(dataOption.key)}-gradiant`"
          :key="dataOption.key"
          :gradientTransform="`scale(${gradiantScale(dataOption)}) rotate(90)`"
        >
          <stop
            offset="0%"
            :stop-color="dataOption.color"
            stop-opacity="0.4"
          />
          <stop
            :offset="Math.min(gradiantOptions.maxOffset, (1 / filteredDatasetOptions.length) * 2)"
            stop-color="var(--color-theme-bg-surface)"
            stop-opacity="0"
          />
        </linearGradient>
      </svg>
    </div>
    <tlt-popover
      v-if="popoverData"
      :target="`#${popoverId}`"
      placement="left"
      :fallback-placements="['right']"
      force-show
      :delay="0"
      class="transition-none pointer-events-none"
      arrow
      :auto-update-options="{ animationFrame: true }"
    >
      <b
        >{{
          props.options.x.type === 'time'
            ? dayjsRange(popoverData.data.mesurement.startTime, popoverData.data.mesurement.endTime, props.options.x.tooltipFormat, popoverData.data.mesurement.isNow, true)
            : $utils.parseTwoUnitRelativeTime(popoverData.data.mesurement.endTime)
        }}
      </b>
      <div
        v-for="dataOption in popoverData.dataOptions"
        :key="dataOption.key"
        class="flex gap-x-1 items-center flex-wrap"
      >
        <tlt-icon
          icon="status-circle"
          class="size-[10px]"
          :style="{ color: dataOption.color }"
        />
        <b>{{ dataOption.name }}:</b>
        <template v-if="popoverData.data.mesurement.isNow && dataOption.interpolate">
          {{
            $t('%s (actual %s)').format(
              (props.options.y?.format ?? defaultYformat)(popoverData.data.rates[dataOption.key], dataOption.yAxisID, dataOption.key as keyof T),
              (props.options.y?.format ?? defaultYformat)(popoverData.data.mesurement.value[dataOption.key], dataOption.yAxisID, dataOption.key as keyof T, 'total')
            )
          }}
        </template>
        <template v-else>
          {{ (props.options.y?.format ?? defaultYformat)(popoverData.data.rates[dataOption.key], dataOption.yAxisID, dataOption.key as keyof T, popoverData.data) }}
        </template>
      </div>
    </tlt-popover>
  </div>
</template>

<script lang="ts" setup generic="T extends MeasurementGeneric">
import { ref, onMounted, watch, computed, watchEffect, triggerRef, shallowRef } from 'vue'
import { useDebounceFn, useElementSize, useMediaQuery } from '@vueuse/core'
import { Measurement, type MeasurementGeneric } from './measurement'

import { create, axisBottom, scaleUtc, scaleLinear, axisLeft, area, line, bisector, pointer, curveMonotoneX, zoom, zoomIdentity, type D3ZoomEvent, axisRight, ticks } from 'd3'
import { dayjsAutoFormat, dayjsRange, removeTimeZoneOffset, toRelativeTime } from './timeAndDateExtras'
import { utils } from '@/plugins/utils'
import { isNonNullable } from '@ui-core/utils/inspect'
import { BOTTOM_MARGIN, defaultYformat, scaleMargin, TOP_MARGIN } from './plotCommon'

export interface yAxisOptions<T extends MeasurementGeneric> {
  suggestedMin?: number
  suggestedMax?: number
  tickCount?: number
  /** Format function used to format spot or speed values it if its speed value add per second (mesurement/s) at the end. If not specified raw value is displayed */
  format?: (value: string | number | null, yAxisID?: 'y2', key?: keyof T, format?: 'total') => string
}

export interface LinePlotOptions<T extends MeasurementGeneric> {
  height: number
  x: {
    domain?: [number, number]
    tooltipFormat: string | { normal: string; now: string }
    zoom?: boolean
    type: 'time' | 'relative_time'
    tickSpan?: number
  }
  y?: yAxisOptions<T>
  y2?: yAxisOptions<T>
  /** Gradiant preset. Values:
   * - default - more spread out gradiant
   * - peak - gradiant with more defined max peaks
   */
  gradiant?: 'peak'
  datasetOptions: DatasetOptions<T>[]
}

export interface DatasetOptions<T extends MeasurementGeneric> {
  key: keyof T
  color: string
  name: string
  /** Used to show data depending on non-user input e.g. values are unavailable. */
  show?: boolean
  /** Used as to hide data with user input */
  hidden?: boolean
  help?: string
  yAxisID?: 'y2'
  /** Interpolate last mesurement using tickSpan. Do not interpolate non-speed mesurements like signal strengh.  */
  interpolate?: boolean
}

export interface Props<T extends MeasurementGeneric> {
  data: Measurement<T>[]
  options: LinePlotOptions<T>
}

const props = defineProps<Props<T>>()
// End time might be the best for both but it has problems in time plot as it gets ugly axis offset.
const shownPoint = computed(() => (props.options.x.type === 'time' ? 'startTime' : 'endTime'))

const gradiantOptions = computed(() => (props.options.gradiant === 'peak' ? { maxOffset: 0.5, maxScale: 3 } : { maxOffset: 0.8, maxScale: 1.5 }))

const filteredDatasetOptions = computed(() => props.options.datasetOptions.filter(e => (e.show ?? true) && !e.hidden))
const yDatasetOptions = computed(() => filteredDatasetOptions.value.filter(e => !e.yAxisID))
const y2DatasetOptions = computed(() => filteredDatasetOptions.value.filter(e => e.yAxisID === 'y2'))

const parsedData = computed(() =>
  [...props.data]
    .sort((a, b) => (props.options.x.type === 'time' ? a.startTime - b.startTime : b.startTime - a.startTime))
    .flatMap((dataPoint, pointIndex, pointArr) => {
      // live data uses browser time
      const mesurement = new Measurement(convertTime(dataPoint.startTime, pointArr.at(0)!.endTime), convertTime(dataPoint.endTime, pointArr.at(0)!.endTime), dataPoint.value, dataPoint.isNow)
      return {
        mesurement,
        rates: Object.fromEntries(
          filteredDatasetOptions.value.map(datasetOption => [datasetOption.key, mesurement.getRate(datasetOption.key, props.options.x.tickSpan, datasetOption.interpolate)])
        ) as T
      }
    })
    .filter(e => e !== null)
)

const parsedNonNullData = computed(() => parsedData.value.filter(e => Object.values(e.rates).some(value => isNonNullable(value))))

const rawYDataPoint = computed(() => {
  const res = yDatasetOptions.value.flatMap(key => parsedData.value.map<number | null>(data => data.rates[key.key])).filter((e): e is number => e !== null && Number.isFinite(e))
  if (props.options.y?.suggestedMax !== undefined) res.push(props.options.y.suggestedMax)
  res.push(props.options.y?.suggestedMin ?? 0)
  return res
})
const maxYData = computed(() => Math.max(...rawYDataPoint.value))
const minYData = computed(() => Math.min(...rawYDataPoint.value))

const rawY2DataPoint = computed(() => {
  const res = y2DatasetOptions.value.flatMap(key => parsedData.value.map<number | null>(data => data.rates[key.key])).filter((e): e is number => e !== null && Number.isFinite(e))
  if (props.options.y2?.suggestedMax !== undefined) res.push(props.options.y2.suggestedMax)
  res.push(props.options.y2?.suggestedMin ?? 0)
  return res
})
const maxY2Data = computed(() => Math.max(...rawY2DataPoint.value))
const minY2Data = computed(() => Math.min(...rawY2DataPoint.value))

const margin = computed(() => ({
  top: TOP_MARGIN,
  bottom: BOTTOM_MARGIN,
  left: scaleMargin(
    ticks(minYData.value, maxYData.value, props.options.y?.tickCount ?? 5),
    props.options.y?.format ?? defaultYformat,
    !yDatasetOptions.value.length && !!y2DatasetOptions.value.length
  ),
  right: scaleMargin(ticks(minY2Data.value, maxY2Data.value, props.options.y?.tickCount ?? 5), props.options.y2?.format ?? defaultYformat, !y2DatasetOptions.value.length)
}))

// Uneque is needed to generate unique htmls ids as few charts can excists at the same time
const elementId = utils.getUniqueId()
const clipID = `clip-${elementId}`
const popoverId = `popover-${elementId}`

const plotRef = ref<HTMLDivElement | null>(null)
const elementSize = useElementSize(plotRef)
const isPointerFine = useMediaQuery('(pointer: fine)')

// post render to reuse some elements
const svg = create<SVGAElement>('svg')
  .style('max-width', '100%')
  .style('height', 'auto')
  .on('pointerenter pointermove', pointermoved)
  .on('pointerleave', () => removePointer(true))
// if we want to prevent scroll events on phone
// .on('touchstart', event => event.preventDefault())

// clipPath is used to visually hide overflow beyond margin.value. Other methods also excist like .clap or data filtering. But this is the best way.
const clipPath = svg.append('clipPath').attr('id', clipID).append('rect')

const gx = svg.append('g')
let scaleX = scaleUtc([0, 1], [0, 1])
const axisX = axisBottom<Date>(scaleX)
axisX.tickFormat(dayjsAutoFormat)
axisX.tickSize(0)
axisX.tickPadding(6)

let gy = svg.append('g')
const scaleY = shallowRef(scaleLinear([maxYData.value, minYData.value], [margin.value.top, props.options.height - margin.value.bottom]))
const axisY = axisLeft(scaleY.value)
axisY.tickSize(0)
axisY.tickPadding(6)

let gy2 = svg.append('g')
const scaleY2 = shallowRef(scaleLinear([maxY2Data.value, minY2Data.value], [margin.value.top, props.options.height - margin.value.bottom]))
const axisY2 = axisRight(scaleY2.value)
axisY2.tickSize(0)
axisY2.tickPadding(6)

function getScale(scale: undefined | 'y2') {
  return scale === 'y2' ? scaleY2.value : scaleY.value
}

const curve = curveMonotoneX
let charts1 = svg.append('g').attr('clip-path', `url('#${clipID}')`).selectAll<SVGPathElement, DatasetOptions<T>>('path')
let charts2 = svg.append('g').attr('clip-path', `url('#${clipID}')`).selectAll<SVGPathElement, DatasetOptions<T>>('path')
const pointerBBls = svg.append('g')
const pointerLine = svg.append('line').attr('stroke', 'var(--color-theme-border-strong)').attr('stroke-dasharray', 2)

const popoverSvg = svg.append('circle').attr('id', popoverId)
const popoverData = ref<{ data: ParsedData; dataOptions: DatasetOptions<T>[] } | null>(null)
const isMobile = computed(() => elementSize.width.value <= 640)
const isTablet = computed(() => elementSize.width.value <= 1024)

type ParsedData = { mesurement: Measurement<T>; rates: T }

function convertTime(timeStamp: number, now: number) {
  return props.options.x.type === 'time' ? removeTimeZoneOffset(timeStamp) : toRelativeTime(timeStamp, now)
}

const zoomHandler = zoom<SVGAElement, undefined>().on('zoom', zoomed)

function applyZoomExtent(enforceLimits: boolean) {
  if (!(props.options.x.zoom ?? false)) return
  zoomHandler
    .extent([
      [margin.value.left, 0],
      [elementSize.width.value - margin.value.right, props.options.height]
    ])
    .translateExtent([
      [-Infinity, -Infinity],
      [elementSize.width.value - margin.value.right, Infinity]
    ])
    .scaleExtent([isMobile.value ? 0.25 : isTablet.value ? 0.175 : 0.12, 3])

  // Enforce zoom and return to begining
  if (enforceLimits) svg.call(zoomHandler.scaleTo, xZoom.k).call(zoomHandler.translateTo, elementSize.width.value, 0)
}

// for some reason shallow watch sources need to be kept seperate else old and new values will be stopped being compared https://github.com/vuejs/core/blob/c875019d49b4c36a88d929ccadc31ad414747c7b/packages/reactivity/src/watch.ts#L161
watch(elementSize.width, () => {
  applyZoomExtent(true)
})

watch([() => props.options.x.zoom, () => margin.value.left, () => margin.value.right], () => {
  applyZoomExtent(true)
})

let xZoom = zoomIdentity

// Use to clear event queue. 0ms does not work because setTimeout logic is skipped.
const throtteledZoom = useDebounceFn(render, 0.00000001)
function zoomed(event: D3ZoomEvent<SVGAElement, undefined>) {
  xZoom = event.transform
  throtteledZoom()
}

watchEffect(() => {
  if (props.options.x.zoom) {
    svg.call(zoomHandler)
  } else {
    svg.on('.zoom', null)
  }
})

watchEffect(() => {
  svg.attr('width', elementSize.width.value).attr('height', props.options.height).attr('viewBox', [0, 0, elementSize.width.value, props.options.height])
  clipPath
    .attr('x', margin.value.left)
    .attr('y', 0)
    .attr('width', elementSize.width.value - margin.value.left - margin.value.right)
    .attr('height', props.options.height)
})

function gradiantScale(dataOption: DatasetOptions<T>) {
  const maxValue = parsedData.value.reduce<number>((acc, curr) => (acc >= (curr.rates[dataOption.key] ?? -Infinity) ? acc : (curr.rates[dataOption.key] ?? -Infinity)), -Infinity)
  const yPos = getScale(dataOption.yAxisID)(maxValue) - margin.value.top
  const drawAreaHeight = props.options.height - margin.value.top - margin.value.bottom
  const plotHeight = drawAreaHeight - yPos
  return Math.min(gradiantOptions.value.maxScale, plotHeight ? drawAreaHeight / plotHeight : 1)
}

function render() {
  const width = elementSize.width.value
  const height = props.options.height
  if (!width || !height) return

  // X axis
  // Domain for relative_time is better to give in relative format
  const definedStartX = props.options.x?.domain ? (props.options.x.type === 'time' ? removeTimeZoneOffset(Math.min(...props.options.x.domain)) : Math.max(...props.options.x.domain)) : undefined
  const definedEndX = props.options.x?.domain ? (props.options.x.type === 'time' ? removeTimeZoneOffset(Math.max(...props.options.x.domain)) : Math.min(...props.options.x.domain)) : undefined
  const dataStartX = parsedData.value.at(0)?.mesurement[shownPoint.value] ?? (props.options.x.type === 'time' ? Date.now() : 0)
  const dataEndX = parsedData.value.at(-1)?.mesurement[shownPoint.value] ?? Date.now()
  const startX = definedStartX !== undefined && definedStartX !== -Infinity ? definedStartX : dataStartX
  const endX = definedEndX !== undefined && definedEndX !== Infinity ? definedEndX : dataEndX
  scaleX.domain([startX, endX])
  scaleX.range([margin.value.left, width - margin.value.right])

  if (props.options.x.zoom ?? false) {
    scaleX = xZoom.rescaleX(scaleX)
    axisX.scale(scaleX)
  }

  axisX.ticks(isMobile.value ? 5 : isTablet.value ? 7 : null)

  gx.attr('transform', `translate(0,${props.options.height - margin.value.bottom})`)
  gx.call(axisX).call(g => {
    g.select('.domain').remove()
    if (props.options.x.type === 'time') return
    // change 'now' lable position
    const last = g.selectChild('g:last-child')
    if (!last.node()) return
    last.attr('text-anchor', 'end')
  })

  // Y axis
  if (yDatasetOptions.value.length || !y2DatasetOptions.value.length) {
    scaleY.value.domain([maxYData.value, minYData.value])
    scaleY.value.range([margin.value.top, height - margin.value.bottom])
    triggerRef(scaleY)

    const yFormat = props.options.y?.format
    if (yFormat) axisY.tickFormat(value => yFormat(value.valueOf()) ?? '')
    else axisY.tickFormat(defaultYformat)

    axisY.tickSize(-(width - margin.value.left - margin.value.right))
    axisY.ticks(props.options.y?.tickCount ?? 5)
    gy.attr('transform', `translate(${margin.value.left},0)`)
    gy.call(axisY).call(g => g.select('.domain').remove())
  } else {
    gy.selectChildren().remove()
  }

  // Y 2 axis
  if (y2DatasetOptions.value.length) {
    scaleY2.value.domain([maxY2Data.value, minY2Data.value])
    scaleY2.value.range([margin.value.top, height - margin.value.bottom])
    triggerRef(scaleY2)

    const y2Format = props.options.y2?.format
    if (y2Format) axisY2.tickFormat(value => y2Format(value.valueOf(), 'y2') ?? '')
    else axisY2.tickFormat(defaultYformat)

    axisY2.tickSize(yDatasetOptions.value.length ? 0 : -(width - margin.value.left - margin.value.right))
    axisY2.ticks(props.options.y2?.tickCount ?? 5)
    gy2.attr('transform', `translate(${width - margin.value.right},0)`)
    gy2.call(axisY2).call(g => g.select('.domain').remove())
  } else {
    gy2.selectChildren().remove()
  }

  // Charts
  charts1 = charts1
    .data(filteredDatasetOptions.value, e => String(e.key))
    .join('path')
    .attr('d', e => {
      const areaObject = area<ParsedData>()
        .x(d => scaleX(d.mesurement[shownPoint.value]))
        .y0(scaleY.value(scaleY.value.domain()[1]))
        .y1(d => getScale(e.yAxisID)(d.rates[e.key] ?? 0))
        .defined(d => Number.isFinite(d.rates[e.key]))
        .curve(curve)

      return areaObject(parsedData.value)
    })
    .attr('fill', e => `url('#${String(e.key)}-gradiant')`)

  charts2 = charts2
    .data(filteredDatasetOptions.value, e => String(e.key))
    .join('path')
    .attr('d', e => {
      const lineObject = line<ParsedData>()
        .x(d => scaleX(d.mesurement[shownPoint.value]))
        .y(d => getScale(e.yAxisID)(d.rates[e.key] ?? 0))
        .defined(d => Number.isFinite(d.rates[e.key]))
        .curve(curve)

      return lineObject(parsedData.value)
    })
    .attr('stroke', e => e.color)
    .attr('stroke-width', 2)
    .attr('fill', 'none')

  pointermoved()
}

const bisect = bisector<ParsedData, Date>(d => d.mesurement[shownPoint.value]).center
let lastPointerPosition: null | [number, number] = null
function pointermoved(event?: any) {
  if (event) lastPointerPosition = pointer(event)
  if (lastPointerPosition === null) return
  const i = bisect(parsedNonNullData.value, scaleX.invert(lastPointerPosition[0]))
  const pointerData = parsedNonNullData.value[i]
  if (pointerData === undefined) {
    removePointer()
    return
  }

  let shownDatasetOptions = filteredDatasetOptions.value
    .filter(e => Number.isFinite(pointerData.rates[e.key]))
    .sort((a, b) => Math.abs(getScale(a.yAxisID)(pointerData.rates?.[a.key]!) - lastPointerPosition![1]) - Math.abs(getScale(b.yAxisID)(pointerData.rates[b.key]!) - lastPointerPosition![1]))
  if (shownDatasetOptions.length > 5) {
    shownDatasetOptions = shownDatasetOptions.slice(0, 1)
  }
  shownDatasetOptions = shownDatasetOptions.sort((a, b) => getScale(a.yAxisID)(pointerData.rates?.[a.key]!) - getScale(b.yAxisID)(pointerData.rates[b.key]!))

  popoverData.value = { data: pointerData, dataOptions: shownDatasetOptions }

  const averageY = shownDatasetOptions.reduce((acc, curr) => acc + getScale(curr.yAxisID)(pointerData.rates[curr.key] || 0), 0) / shownDatasetOptions.length

  const pointerBBlsRadius = 3
  const pointerBBlsStroke = 2
  const pointerBBlsOffsetRadius = pointerBBlsRadius + pointerBBlsStroke * 2
  popoverSvg.attr('cy', averageY).attr('cx', scaleX(pointerData.mesurement[shownPoint.value])).attr('r', pointerBBlsOffsetRadius).attr('fill', 'transparent')

  pointerBBls.style('display', null)
  pointerLine.style('display', null)
  const xPos = scaleX(pointerData.mesurement[shownPoint.value])

  // Data point is outside view
  if (xPos < scaleX.range()[0] || xPos > scaleX.range()[1]) {
    removePointer()
    return
  }

  pointerBBls
    .selectAll<SVGCircleElement, DatasetOptions<T>>('circle')
    .data(shownDatasetOptions, e => String(e.key))
    .join('circle')
    .attr('cy', e => getScale(e.yAxisID)(pointerData.rates[e.key] ?? 0))
    .attr('cx', xPos)
    .attr('r', pointerBBlsRadius)
    .attr('fill', 'white')
    .attr('stroke', e => e.color)
    .attr('stroke-width', pointerBBlsStroke)

  pointerLine
    .attr('y1', margin.value.top)
    .attr('y2', props.options.height - margin.value.bottom)
    .attr('x1', xPos)
    .attr('x2', xPos)
}

function removePointer(left = false) {
  if (left) lastPointerPosition = null
  popoverData.value = null
  pointerBBls.style('display', 'none')
  pointerLine.style('display', 'none')
}

watch([props, elementSize.width, isMobile, isTablet, filteredDatasetOptions], render, { immediate: false })

onMounted(() => {
  applyZoomExtent(false)
  render()
  if (!plotRef.value) return
  const svgNode = svg.node()
  if (!svgNode) return
  plotRef.value.append(svgNode)
})
</script>

<style scoped>
:deep(.tick) line {
  color: var(--color-theme-border-base);
}
:deep(.tick):last-child line {
  stroke-width: 2px;
}
</style>
