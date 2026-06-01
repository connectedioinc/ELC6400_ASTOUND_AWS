<template>
  <LinePlot
    :data="data"
    :options="options"
  />
</template>

<script setup lang="ts">
import { getColor } from '@/components/shared/Plots/figureColors'
import LinePlot, { type LinePlotOptions } from '@/components/shared/Plots/LinePlot.vue'
import { Measurement } from '@/components/shared/Plots/measurement'

type SpeedMesurement = { 1: number; 2: number; 3: number; 4: number; 5: number; 6: number; 7: number; 8: number }

const data: Array<Measurement<SpeedMesurement>> = Array.from(
  { length: 1000 },
  (_, i) =>
    new Measurement(
      1750917600000 - i * 3000,
      1750917600000 - 3000 - i * 3000,
      {
        1: Math.random(),
        2: Math.random(),
        3: Math.random(),
        4: Math.random(),
        5: Math.random(),
        6: Math.random(),
        7: Math.random(),
        8: Math.random()
      },
      i ? false : true
    )
)
const options: LinePlotOptions<SpeedMesurement> = {
  height: 400,
  x: {
    tooltipFormat: 'll',
    type: 'relative_time',
    zoom: true,
    domain: [0, 100000],
    tickSpan: 3000
  },
  datasetOptions: [
    { key: 1, color: getColor(1), name: 'Inbound', interpolate: true },
    { key: 2, color: getColor(2), name: 'Outbound', interpolate: true },
    { key: 3, color: getColor(3), name: 'Outbound', interpolate: true },
    { key: 4, color: getColor(4), name: 'Outbound', interpolate: true },
    { key: 5, color: getColor(5), name: 'Outbound', interpolate: true },
    { key: 6, color: getColor(6), name: 'Outbound', interpolate: true },
    { key: 7, color: getColor(7), name: 'Outbound', interpolate: true },
    { key: 8, color: getColor(7), name: 'Outbound', interpolate: true }
  ]
}
</script>
