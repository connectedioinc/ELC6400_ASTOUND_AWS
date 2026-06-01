import { ref } from 'vue'
import { useCards } from '@/components/shared/Plots/useChartCards'
import { createComposableWrapper } from '@tests/unit/mockFactory'
import { Measurement } from '@/components/shared/Plots/measurement'
import type { ScaleY } from '@/components/shared/Plots/useTimeChartScale'
import { type DatasetOptions } from '@/components/shared/Plots/LinePlot.vue'

describe('useChartCards.ts', () => {
  let wrapper: ReturnType<typeof useCards>

  const liveChartData = ref<Measurement<{ speed: number }>[]>([])
  const scaleY = ref<ScaleY>('live')
  const formatValue = (value: string | number) => value.toString()
  const graphs = ref<DatasetOptions<{ speed: number }>[]>([])
  const additionalOptions = ref<any>({})

  beforeEach(() => {
    liveChartData.value = []
    scaleY.value = 'live'
    graphs.value = [{ color: '', key: 'speed', name: 'Speed' }]
    additionalOptions.value = {}
    ;[wrapper] = createComposableWrapper(() => useCards({ chartData: liveChartData, values: graphs, scaleY, formatValue, speedMeasurement: false }))
  })
  it('spot mesurement cards', () => {
    liveChartData.value = [new Measurement(1000, 2000, { speed: 100 }), new Measurement(2000, 2500, { speed: 125 })]
    graphs.value = [{ color: '', key: 'speed', name: 'Speed', help: 'this is help' }]
    expect(wrapper.value.speed).toEqual([
      {
        title: 'Speed',
        content: [
          { title: 'Current', info: '125' },
          { title: 'Average', info: '112.5' },
          { title: 'Peak', info: '125' }
        ],
        type: 'system-basic',
        headerStyle: 'border-color: ; border-bottom-width: 2px; cursor: pointer;',
        help: 'this is help',
        show: undefined,
        onClick: expect.any(Function)
      }
    ])
  })
  it('spot speed cards', () => {
    scaleY.value = 'day'
    ;[wrapper] = createComposableWrapper(() => useCards({ chartData: liveChartData, values: graphs, scaleY, formatValue, speedMeasurement: true }))
    liveChartData.value = [new Measurement(0, 3600000, { speed: 100 }), new Measurement(3600000, 5400000, { speed: 125 }, true)]
    graphs.value = [{ color: '', key: 'speed', name: 'Speed', help: 'this is help' }]
    expect(wrapper.value.speed).toEqual([
      {
        title: 'Speed',
        content: [
          { title: 'Current', info: '250' },
          { title: 'Average', info: '150' },
          { title: 'Peak', info: '250' },
          { title: 'Total', info: '225 (Jan 1, 1970 0h - now)', show: true }
        ],
        type: 'system-basic',
        headerStyle: 'border-color: ; border-bottom-width: 2px; cursor: pointer;',
        help: 'this is help',
        show: undefined,
        onClick: expect.any(Function)
      }
    ])
  })
})
