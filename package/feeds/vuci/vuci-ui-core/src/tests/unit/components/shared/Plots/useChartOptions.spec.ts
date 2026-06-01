import { ref } from 'vue'
import { useChartOptions } from '@/components/shared/Plots/useChartOptions'
import { createComposableWrapper } from '@tests/unit/mockFactory'
import { Measurement } from '@/components/shared/Plots/measurement'
import { useTimeChartScale, type ScaleY } from '@/components/shared/Plots/useTimeChartScale'
import { type DatasetOptions } from '@/components/shared/Plots/LinePlot.vue'
describe('useChartOptions.ts', () => {
  let wrapper: ReturnType<typeof useChartOptions>

  const liveChartData = ref<Measurement<{ speed: number }>[]>([])
  const scaleY = ref<ScaleY>('live')
  let scaleProps: ReturnType<typeof useTimeChartScale>
  const formatValue = (value: string | number | null) => value?.toString() ?? ''
  const graphs = ref<DatasetOptions<{ speed: number }>[]>([])
  const additionalOptions = ref<any>({})
  beforeEach(() => {
    liveChartData.value = [new Measurement(2592000000, 2678400000, { speed: 1000 })]
    scaleY.value = 'live'
    graphs.value = [{ color: '', key: 'speed', name: 'Speed' }]
    additionalOptions.value = {}
    ;[wrapper] = createComposableWrapper(() => {
      scaleProps = useTimeChartScale(scaleY, ref(0))
      return useChartOptions({ chartData: liveChartData, scaleProps, formatValue, graphs, additionalOptions })
    })
  })
  describe('test options', () => {
    it('regular live options', () => {
      expect(wrapper.value).toEqual({
        datasetOptions: [
          {
            color: '',
            key: 'speed',
            name: 'Speed'
          }
        ],
        height: 400,
        x: {
          domain: [0, 180000],
          tooltipFormat: {
            normal: '',
            now: ''
          },
          tickSpan: 1000,
          type: 'relative_time',
          zoom: true
        },
        y: {
          format: expect.any(Function),
          formatSpot: undefined
        },
        y2: undefined
      })
    })
    it('regular historical options', () => {
      scaleY.value = 'month'
      expect(wrapper.value).toEqual({
        datasetOptions: [
          {
            color: '',
            key: 'speed',
            name: 'Speed'
          }
        ],
        height: 400,
        x: {
          domain: [0, 2592000000],
          tickSpan: 86400000,
          tooltipFormat: {
            normal: 'MMM D[ - ]<MMM D>, YYYY',
            now: 'MMM D, YYYY[ - now]'
          },
          type: 'time'
        },
        y: {
          format: expect.any(Function)
        },
        y2: undefined
      })
    })
  })
})
