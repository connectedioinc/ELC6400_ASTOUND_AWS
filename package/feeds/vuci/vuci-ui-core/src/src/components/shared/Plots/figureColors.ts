export const figureColors = [
  'var(--color-red-700)',
  'var(--color-red-900)',
  'var(--color-red-500)',
  'var(--color-orange-600)',
  'var(--color-orange-500)',
  'var(--color-orange-300)',
  'var(--color-orange-400)',
  'var(--color-yellow-300)',
  'var(--color-yellow-200)',
  'var(--color-lime-200)',
  'var(--color-green-300)',
  'var(--color-green-200)',
  'var(--color-blue-500)',
  'var(--color-blue-600)',
  'var(--color-purple-300)',
  'var(--color-purple-200)'
]

export function getColor(itemIndex: number) {
  return figureColors[itemIndex % figureColors.length]
}

// If colors ever change rearange colors for better seperation

// Currently used: sorted by hue

// import { hsl, type HSLColor } from 'd3'
// const hslColors = chartColors.map(e => ({ original: e, hsl: hsl(`rgb(${window.getComputedStyle(document.body).getPropertyValue(e.slice(8, -2))})`) }))

// const sortedHsl = [...hslColors.sort((a, b) => a.hsl.h - b.hsl.h)]
// console.log(
//   'sorted',
//   sortedHsl.map(e => e.original)
// )

// const randomPalletes = Array.from({ length: 10000 }, () => [...hslColors].sort(() => (Math.random() > 0.5 ? 1 : -1)))

// const scores = randomPalletes.map(e => palleteScore(e.map(k => k.hsl)))

// console.log(
//   'closest colors using full hsl',
//   randomPalletes[scores.indexOf(Math.min(...scores))].map(e => e.original)
// )

// console.log(
//   'staggered colors',
//   randomPalletes[scores.indexOf(Math.max(...scores))].map(e => e.original)
// )

// console.log(
//   'random',
//   randomPalletes[0].map(e => e.original)
// )

// function palleteScore(colors: HSLColor[]) {
//   return colors.reduce<number>((acc, _, index) => acc + pathToOtherColors(colors, index), 0)
// }

// function pathToOtherColors(colors: HSLColor[], index: number) {
//   const maxDistance = colors.length / 2
//   const mainColor = colors[index]
//   return colors.reduce<number>((acc, curr, i) => {
//     if (i === index) return acc
//     const distance = Math.abs(i - index)
//     const realDistance = Math.min(distance, colors.length - distance)
//     return acc + path(mainColor, curr) * (maxDistance / realDistance)
//   }, 0)
// }

// function path(color1: HSLColor, color2: HSLColor) {
//   return Math.abs(color1.h - color2.h) + Math.abs(color1.s - color2.s) + Math.abs(color1.l - color2.l)
// }
