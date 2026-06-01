import type { AxisScale, NumberValue } from 'd3'

// Left and right has margin in svg but has negative margin outside it so in the end it is 0.
// It was done to add more space for hover to work so last data point could be hovered
export const SIDE_MARGIN = 16
const TEXT_HEIGHT = 16
export const TOP_MARGIN = TEXT_HEIGHT / 2
export const BOTTOM_MARGIN = TEXT_HEIGHT

function createTextWidthGetter() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  // Ticks uses default font and size
  // ctx.font = '10px sans-serif'
  return function getTextWidth(text: string) {
    // measureText is always off by 6px for some reason.
    return ctx.measureText(text).width + 6
  }
}

export function dedupeTicks(options: { ticks: number[]; format: (value: number, index: number) => string; scale: AxisScale<number>; bandwidth: number; width: number; padding: number }): number[] {
  const { bandwidth, format, padding, scale, ticks, width } = options
  const getTextWidth = createTextWidthGetter()
  const parsedTicks = ticks.map((tick, i) => ({ tick: tick, pos: scale(tick) ?? 0, width: getTextWidth(format(tick, i)) }))
  return parsedTicks.reduce<{ ticks: number[]; lastPos: number }>(
    (acc, curr) => {
      const left = curr.pos + (bandwidth - curr.width) / 2
      const right = curr.pos + (bandwidth + curr.width) / 2
      if (left - padding >= acc.lastPos && right + padding <= width) {
        acc.lastPos = right
        acc.ticks.push(curr.tick)
      }
      return acc
    },
    { ticks: [], lastPos: 0 }
  ).ticks
}

export function scaleMargin(ticks: number[], format: ((value: number) => string) | undefined, hide?: boolean) {
  if (hide) return SIDE_MARGIN
  const getTextWidth = createTextWidthGetter()
  return (
    ticks.reduce<number>((acc, curr) => {
      const parsedCurr = getTextWidth(format?.(curr) ?? curr.toString())
      return parsedCurr > acc ? parsedCurr : acc
    }, 0) + SIDE_MARGIN
  )
}

/** Replaces default d3 tick format function as it uses scale that is not nice to use outside render function */
export function defaultYformat(value: NumberValue | null) {
  if (value === null) return ''
  return value.toLocaleString()
}
