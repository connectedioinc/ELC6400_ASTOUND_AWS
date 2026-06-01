<template>
  <div class="flex flex-col gap-4">
    <!-- @wheel.prevent -->
    <div
      v-if="props.options.x.zoom"
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
        <linearGradient :id="fadeoutId">
          <stop
            offset="0%"
            stop-color="var(--color-theme-bg-surface)"
            stop-opacity="1"
          />
          <stop
            offset="80%"
            stop-color="var(--color-theme-bg-surface)"
            stop-opacity="0.5"
          />
          <stop
            offset="100%"
            stop-color="var(--color-theme-bg-surface)"
            stop-opacity="0"
          />
        </linearGradient>
        <linearGradient
          v-for="dataOption in props.data"
          :id="`${dataOption.id}-gradiant`"
          :key="dataOption.id"
          gradientTransform="rotate(90)"
        >
          <stop
            offset="0%"
            :stop-color="dataOption.color"
            stop-opacity="0.4"
          />
          <stop
            offset="100%"
            stop-color="var(--color-theme-bg-surface)"
            stop-opacity="0"
          />
        </linearGradient>
      </svg>
    </div>
    <tlt-popover
      v-if="popoverData.length"
      :target="`#${popoverId}`"
      placement="top"
      :fallback-placements="['bottom']"
      force-show
      :delay="0"
      class="transition-none pointer-events-none flex [&_.positioner-arrow]:bg-theme-bg-floating"
      arrow
      :auto-update-options="{ animationFrame: true }"
    >
      <slot
        name="popover"
        :figures="popoverData"
      />
    </tlt-popover>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, computed, watchEffect } from 'vue'
import { useDebounceFn, useElementSize, useMediaQuery } from '@vueuse/core'

import { create, axisBottom, scaleLinear, axisLeft, area, line, pointer, zoom, zoomIdentity, type D3ZoomEvent, interpolateArray, ticks } from 'd3'
import { utils } from '@/plugins/utils'
import { BOTTOM_MARGIN, defaultYformat, scaleMargin, SIDE_MARGIN, TOP_MARGIN } from './plotCommon'

export interface FigurePlotOptions {
  height: number
  x: {
    domain?: [number, number]
    suggestedDomain?: [number, number]
    zoom?: boolean
    type: 'line'
    tickManipulation?: TickManipulation
  }
  y?: {
    invert?: boolean
    suggestedMin?: number
    suggestedMax?: number
    tickCount?: number
    /** Format function used to format spot or speed values it if its speed value add per second (mesurement/s) at the end. If not specified raw value is displayed */
    format?: (value: string | number | null, yAxisID?: string) => string
  }
}

export interface TickManipulation {
  /** Specify what ticks should be multiple of. If value is 3 then scale will be ..., 0, 3, 6, 9, ... */
  multiple: number
  /** Specify offset for multiple. If multiple is 3 and offset is 2 then scale will be ..., 2, 5, 8, 12, ... */
  offset: number
  /** Optimal tick count for breakpoints. It is used in https://d3js.org/d3-array/ticks#nice */
  count: {
    mobile: number
    tablet: number
    desktop: number
  }
  /**
   * Used when scale needs multiple offsets due to gaps in possible data.
   * - start - when gap starts and `offset` needs to be modified
   * - end - used to find gap size when `start` is substracted. Then it is used to modify `offset` after `start`
   *
   * For e.g 5ghz has gap of 1ch starting from 146 so [146,147]. With offset: 42, multiple: 8 it goes ..., 42, 50, ..., 138, 147, 155, ...
   */
  aligmentGaps?: [start: number, end: number][]
}

export interface Decoration {
  type: 'diamond'
  position: [number, number]
}

export interface Figure {
  id: string
  points: [number, number][]
  color: string
  name: string
  show?: boolean
  help?: string
  yAxisID?: string
  decorations?: Decoration[]
}

export interface Props {
  data: Figure[]
  options: FigurePlotOptions
}

const emit = defineEmits<{
  (event: 'click-figure', ids: string[]): void
}>()

const props = defineProps<Props>()

// Uneque is needed to generate unique htmls ids as few charts can excists at the same time
const elementId = utils.getUniqueId()
const clipID = `clip-${elementId}`
const popoverId = `popover-${elementId}`
const fadeoutId = `fadeout-${elementId}`

const plotRef = ref<HTMLDivElement | null>(null)
const elementSize = useElementSize(plotRef)
const isPointerFine = useMediaQuery('(pointer: fine)')

// post render to reuse some elements
const svg = create<SVGAElement>('svg').style('max-width', '100%').style('height', 'auto').on('pointerenter pointermove', pointermoved).on('pointerleave', pointerleft).on('click', pointerClick)
// if we want to prevent scroll events on phone
// .on('touchstart', event => event.preventDefault())

// clipPath is used to visually hide overflow beyond margin.value. Other methods also excist like .clap or data filtering. But this is the best way.
const clipPath = svg.append('clipPath').attr('id', clipID).append('rect')

// Seperate group for grid lines so they would be bellow chart but labels would be above it
let gyGrid = svg.append('g')

let charts1 = svg.append('g').attr('clip-path', `url('#${clipID}')`).selectAll<SVGPathElement, Figure>('path')
let charts2 = svg.append('g').attr('clip-path', `url('#${clipID}')`).selectAll<SVGPathElement, Figure>('path')
let decorations = svg.append('g').attr('clip-path', `url('#${clipID}')`).selectAll<SVGPathElement, Decoration & { id: string; parent: Figure }>('path')
const pointerBBls = svg.append('circle')
const fadeout = svg.append('rect').attr('x', 0).attr('y', 0).attr('fill', `url('#${fadeoutId}')`)

const gx = svg.append('g')
let scaleX = scaleLinear([0, 1], [0, 1])
const axisX = axisBottom<number>(scaleX)
axisX.tickSize(0)
axisX.tickPadding(6)

let gy = svg.append('g')
const scaleY = scaleLinear([0, 1], [0, 1])
const axisY = axisLeft(scaleY)
axisY.tickSize(0)
axisY.tickPadding(6)

const popoverSvg = svg.append('circle').attr('id', popoverId)
const popoverData = ref<Figure[]>([])
const isMobile = computed(() => elementSize.width.value <= 640)
const isTablet = computed(() => elementSize.width.value <= 1024)

const rawDataPoint = computed(() => {
  const resX = props.data.flatMap(e => e.points.map(k => k[0])).filter(e => e !== null)
  const resY = props.data.flatMap(e => e.points.map(k => k[1])).filter(e => e !== null)
  if (props.options.y?.suggestedMax !== undefined) resY.push(props.options.y.suggestedMax)
  if (props.options.y?.suggestedMin !== undefined) resY.push(props.options.y.suggestedMin)
  return [resX, resY]
})
const maxData = computed(() => Math.max(...rawDataPoint.value[1]))
const minData = computed(() => Math.min(...rawDataPoint.value[1]))

const margin = computed(() => ({
  top: TOP_MARGIN,
  bottom: BOTTOM_MARGIN,
  left: scaleMargin(ticks(minData.value, maxData.value, props.options.y?.tickCount ?? 5), props.options.y?.format ?? defaultYformat),
  right: SIDE_MARGIN
}))

const zoomHandler = zoom<SVGAElement, undefined>().on('zoom', zoomed)

function applyZoomExtent(enforceLimits: boolean) {
  if (!props.options.x.zoom) return
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
watch([elementSize.width, () => props.options.x.zoom], () => {
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
  fadeout.attr('width', margin.value.left).attr('height', props.options.height)
})

function render() {
  const width = elementSize.width.value
  const height = props.options.height
  if (!width || !height) return

  // X axis
  // Domain for relative_time is better to give in relative format
  const definedStartX = props.options.x?.domain ? Math.min(...props.options.x.domain) : undefined
  const definedEndX = props.options.x?.domain ? Math.max(...props.options.x.domain) : undefined
  const definedSuggestedStartX = props.options.x?.suggestedDomain ? Math.min(...props.options.x.suggestedDomain) : undefined
  const definedSuggestedEndX = props.options.x?.suggestedDomain ? Math.max(...props.options.x.suggestedDomain) : undefined
  const dataStartX = Math.min(...rawDataPoint.value[0])
  const dataEndX = Math.max(...rawDataPoint.value[0])
  const startX = definedStartX !== undefined && definedStartX !== -Infinity ? definedStartX : Math.min(dataStartX, definedSuggestedStartX ?? Infinity)
  const endX = definedEndX !== undefined && definedEndX !== Infinity ? definedEndX : Math.max(dataEndX, definedSuggestedEndX ?? -Infinity)
  scaleX.domain([startX, endX])
  scaleX.range([margin.value.left, width - margin.value.right])

  if (props.options.x.zoom) {
    scaleX = xZoom.rescaleX(scaleX)
    axisX.scale(scaleX)
  }

  const tickManipulation = props.options.x.tickManipulation
  if (tickManipulation) {
    const length = isMobile.value ? tickManipulation.count.mobile : isTablet.value ? tickManipulation.count.tablet : tickManipulation.count.desktop
    const newStart = (scaleX.domain()[0] - tickManipulation.offset) / tickManipulation.multiple
    const newEnd = (scaleX.domain()[1] - tickManipulation.offset) / tickManipulation.multiple
    axisX.tickValues(ticks(newStart, newEnd, length).map(e => applyGaps(e * tickManipulation.multiple + tickManipulation.offset, tickManipulation.aligmentGaps)))
  } else {
    axisX.ticks(isMobile.value ? 5 : isTablet.value ? 7 : null)
  }

  gx.attr('transform', `translate(0,${props.options.height - margin.value.bottom})`)
  gx.call(axisX).call(g => g.select('.domain').remove())

  // Y axis
  scaleY.domain(props.options.y?.invert ? [minData.value, maxData.value] : [maxData.value, minData.value])
  scaleY.range([margin.value.top, height - margin.value.bottom])

  const yFormat = props.options.y?.format
  if (yFormat) axisY.tickFormat(value => yFormat(value.valueOf()) ?? '')
  else axisY.tickFormat(defaultYformat)

  axisY.tickSize(-(width - margin.value.left - margin.value.right))
  axisY.ticks(props.options.y?.tickCount ?? 5)
  gy.attr('transform', `translate(${margin.value.left},0)`)
  gy.call(axisY).call(g => {
    g.select('.domain').remove()
    g.selectAll('line').remove()
  })
  gyGrid.attr('transform', `translate(${margin.value.left},0)`)
  gyGrid.call(axisY).call(g => g.select('.domain').remove())

  // Charts
  charts1 = charts1
    .data(props.data, e => e.id)
    .join('path')
    .attr('d', e => {
      const areaObject = area<Figure['points'][number]>()
        .x(d => scaleX(d[0]))
        .y0(scaleY(scaleY.domain()[1]))
        .y1(d => scaleY(d[1]))
      // .curve(curve)

      return areaObject(e.points)
    })
    .attr('fill', e => `url('#${e.id}-gradiant')`)

  charts2 = charts2
    .data(props.data, e => e.id)
    .join('path')
    .attr('d', e => {
      const lineObject = line<Figure['points'][number]>()
        .x(d => scaleX(d[0]))
        .y(d => scaleY(d[1]))
      // .curve(curve)

      return lineObject(e.points)
    })
    .attr('stroke', e => e.color)
    .attr('stroke-width', 2)
    .attr('fill', 'none')

  decorations = decorations
    .data(
      props.data.flatMap(data => data.decorations?.map((decoration, i) => ({ ...decoration, id: `${data.id}-decoration-${i}`, parent: data })) ?? []),
      e => e.id
    )
    .join('path')
    .attr('d', e => {
      const r = 3
      const cX = scaleX(e.position[0])
      const cY = scaleY(e.position[1])
      return e.type === 'diamond' ? `M${cX + r} ${cY} L${cX} ${cY - r} L${cX - r} ${cY} L${cX} ${cY + r} Z` : ''
    })
    .attr('stroke', e => e.parent.color)
    .attr('stroke-width', 2)
    .attr('fill', 'var(--color-theme-bg-surface)')

  pointermoved()
}

function applyGaps(value: number, gaps: [number, number][] | undefined) {
  return value + (gaps?.filter(e => value >= e[0]).reduce((prev, curr) => prev + curr[1] - curr[0], 0) ?? 0)
}

function pointerClick() {
  if (!popoverData.value.length || !lastPointerPosition) return
  emit(
    'click-figure',
    popoverData.value.map(e => e.id)
  )
}

let lastPointerPosition: null | [number, number] = null
function pointermoved(event?: any) {
  if (event) lastPointerPosition = pointer(event)
  if (lastPointerPosition === null) return

  const targets = findClosestFigures(lastPointerPosition)
  if (!targets.length) {
    pointerleft()
    return
  }
  popoverData.value = targets
  // In svg the last figure will be on top so bouble color should be same as last one
  const target = targets.at(-1)!
  const center = getFigureTopCenter(target.points)
  const pointerBBlsRadius = 3
  const pointerBBlsStroke = 2
  const pointerBBlsOffsetRadius = pointerBBlsRadius + pointerBBlsStroke * 2
  popoverSvg.attr('cy', scaleY(center[1])).attr('cx', scaleX(center[0])).attr('r', pointerBBlsOffsetRadius).attr('fill', 'transparent')

  pointerBBls.style('display', null)
  pointerBBls.attr('cy', scaleY(center[1])).attr('cx', scaleX(center[0])).attr('r', pointerBBlsRadius).attr('fill', 'white').attr('stroke', target.color).attr('stroke-width', pointerBBlsStroke)
}

function pointerleft() {
  popoverData.value = []
  lastPointerPosition = null
  pointerBBls.style('display', 'none')
}

function distanceToFigure(figure: Figure, position: [number, number]) {
  const topPoint = getFigureTopCenter(figure.points)
  return Math.sqrt(Math.pow(scaleX(topPoint[0]) - position[0], 2) + Math.pow(scaleY(topPoint[1]) - position[1], 2))
}
function findClosestFigures(position: [number, number]) {
  const closestToCursor = props.data.reduce<{ figure: Figure; result: number } | null>((acc, curr) => {
    const distance = distanceToFigure(curr, position)
    return !acc || acc.result > distance ? { figure: curr, result: distance } : acc
  }, null)?.figure
  if (!closestToCursor) return []
  return props.data.filter(figure => figure.points.toString() === closestToCursor.points.toString())
}

function getFigureTopCenter(points: [number, number][]) {
  const centerIndex = (points.length - 1) / 2
  return points.length % 2 ? points[centerIndex] : interpolateArray(points[centerIndex - 0.5], points[centerIndex + 0.5])(0.5)
}

watch([props, elementSize.width, isMobile, isTablet], render, { immediate: false })

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
