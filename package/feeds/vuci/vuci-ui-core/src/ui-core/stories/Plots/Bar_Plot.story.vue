<template>
  <BarPlot
    :data="data"
    :options="options"
  />
</template>

<script setup lang="ts">
import BarPlot, { type BarPlotOptions } from '@/components/shared/Plots/BarPlot.vue'
import { Measurement } from '@/components/shared/Plots/measurement'

type SpeedMesurement = { tx: number; rx: number }

const data: Array<Measurement<SpeedMesurement>> = [
  new Measurement(1750917600000, 1750921200000, { rx: 29385384, tx: 7382112 }, false),
  new Measurement(1750921200000, 1750924800000, { rx: 3549721, tx: 20751487 }, false),
  new Measurement(1750924800000, 1750928400000, { rx: 1327134, tx: 5040813 }, false),
  new Measurement(1750928400000, 1750932000000, { rx: 2181564, tx: 7904679 }, false),
  new Measurement(1750932000000, 1750935600000, { rx: 2198247, tx: 9883154 }, false),
  new Measurement(1750935600000, 1750939200000, { rx: 3013537, tx: 9814804 }, false),
  new Measurement(1750939200000, 1750942800000, { rx: 2491027, tx: 11853450 }, false),
  new Measurement(1750942800000, 1750946400000, { rx: 2087216, tx: 11159072 }, false),
  new Measurement(1750946400000, 1750950000000, { rx: 1421418, tx: 4369285 }, false),
  new Measurement(1750950000000, 1750953600000, { rx: 453520, tx: 1529187 }, false),
  new Measurement(1750953600000, 1750957200000, { rx: 2437032, tx: 87185953 }, false),
  new Measurement(1750957200000, 1750960800000, { rx: 435105, tx: 1371856 }, false),
  new Measurement(1750960800000, 1750964400000, { rx: 1165382, tx: 1304907 }, false),
  new Measurement(1750964400000, 1750968000000, { rx: 437193, tx: 1402495 }, false),
  new Measurement(1750968000000, 1750971600000, { rx: 507257, tx: 1657407 }, false),
  new Measurement(1750971600000, 1750975200000, { rx: 453788, tx: 1354765 }, false),
  new Measurement(1750975200000, 1750978800000, { rx: 517535, tx: 1467932 }, false),
  new Measurement(1750978800000, 1750982400000, { rx: 426588, tx: 1336731 }, false),
  new Measurement(1750982400000, 1750986000000, { rx: 592139, tx: 1611738 }, false),
  new Measurement(1750986000000, 1750989600000, { rx: 1038167, tx: 1404079 }, false),
  new Measurement(1750989600000, 1750993200000, { rx: 465696, tx: 1350992 }, false),
  new Measurement(1750993200000, 1750996800000, { rx: 541824, tx: 1408001 }, false),
  new Measurement(1750996800000, 1751000400000, { rx: 535591, tx: 1444890 }, false),
  new Measurement(1751000400000, 1751001718376, { rx: 591245, tx: 1332796 }, true)
]

const options: BarPlotOptions<SpeedMesurement> = {
  height: 400,
  x: {
    tooltipFormat: 'HH:mm',
    format: 'HH:mm'
  },
  y: {
    format: (val: number | string | null) => '%mB'.format(val)
  },
  datasetOptions: [
    {
      key: 'tx',
      name: 'Sent',
      color: 'var(--color-lime-300)'
    },
    {
      key: 'rx',
      name: 'Received',
      color: 'var(--color-blue-700)'
    }
  ]
}
</script>
