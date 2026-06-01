import Channel from '../../src/components/status/Channel.vue'
import createWrapper from '@tests/unit/mockFactory'

const devices = [
  {
    ssid: 'test2_4',
    bssid: '6A-A2-89-9E-75-87',
    band: '2.4GHz',
    signal: -40,
    channel: 1,
    channel_width: 20,
    channel_center: 1
  },
  {
    ssid: 'test5',
    bssid: '50-8A-4E-FB-75-E2',
    band: '5GHz',
    signal: -30,
    channel: 36,
    channel_width: 80,
    channel_center: 42
  },
  {
    ssid: 'test',
    bssid: '3B-43-07-F3-FD-75',
    band: '2.4GHz',
    signal: -80,
    channel: 5,
    channel_width: 40,
    channel_center: 7
  },
  {
    ssid: 'test2',
    bssid: '89-3F-D3-7D-BF-1E',
    band: '5GHz',
    channel: 60,
    channel_width: '-',
    channel_center: '-'
  }
]

describe('Channel.vue', () => {
  let wrapper
  beforeEach(async () => {
    wrapper = createWrapper(Channel)
    wrapper.vm.selectedRow = null
    await wrapper.setProps({ channelWidthLengths: { 20: 4, 40: 8, 80: 16 }, scannedDevices: devices })
  })

  it('computes figureData data 2.4ghz', async () => {
    await wrapper.setProps({ minChannel: 1, maxChannel: 14, scannedDevices: devices.filter(e => e.band === '2.4GHz'), channelWidthLengths: { 20: 5, 40: 8 } })
    const res = [
      {
        color: 'var(--color-red-700)',
        decorations: undefined,
        name: 'test2_4',
        points: [
          [-1, -100],
          [0, -40],
          [1, -40],
          [2, -40],
          [3, -100]
        ],
        id: '6A-A2-89-9E-75-87'
      },
      {
        color: 'var(--color-red-900)',
        name: 'test',
        decorations: [{ position: [5, -80], type: 'diamond' }],
        points: [
          [3, -100],
          [4, -80],
          [7, -80],
          [10, -80],
          [11, -100]
        ],
        id: '3B-43-07-F3-FD-75'
      }
    ]
    expect(wrapper.vm.figureData).toEqual(res)
  })

  it('computes figureData data 5ghz', async () => {
    await wrapper.setProps({ minChannel: 1, maxChannel: 14, scannedDevices: devices.filter(e => e.band === '5GHz'), channelWidthLengths: { 20: 4, 40: 8, 80: 16, 160: 32 } })
    const res = [
      {
        color: 'var(--color-red-700)',
        decorations: [{ position: [36, -30], type: 'diamond' }],
        name: 'test5',
        points: [
          [34, -100],
          [35, -30],
          [42, -30],
          [49, -30],
          [50, -100]
        ],
        id: '50-8A-4E-FB-75-E2'
      },
      { color: 'var(--color-red-900)', name: 'test2', decorations: undefined, points: [], id: '89-3F-D3-7D-BF-1E' }
    ]
    expect(wrapper.vm.figureData).toEqual(res)
  })

  describe('method formatAxisX()', () => {
    it.each`
      value   | res
      ${null} | ${'-100 dBm'}
      ${-20}  | ${'-20 dBm'}
    `('formats X axis when value is $value', ({ value, res }) => {
      expect(wrapper.vm.formatAxisX(value)).toBe(res)
    })
  })

  describe('method clickFigure()', () => {
    it('device is selected', () => {
      wrapper.vm.selectedSSIDs = [devices[0]]
      wrapper.vm.selectedBy = 'table'
      wrapper.vm.clickFigure([devices[0].bssid])
      expect(wrapper.vm.selectedSSIDs).toEqual([])
      expect(wrapper.vm.selectedBy).toEqual(null)
    })
    it('device is not selected', async () => {
      wrapper.vm.selectedSSIDs = null
      wrapper.vm.selectedBy = null
      wrapper.vm.clickFigure([devices[0].bssid])
      expect(wrapper.vm.selectedSSIDs).toEqual([devices[0]])
      expect(wrapper.vm.selectedBy).toEqual('plot')
    })
  })

  describe('selectedRow', () => {
    it('get', () => {
      wrapper.vm.selectedSSIDs = devices
      expect(wrapper.vm.selectedRow).toEqual(devices[0])
    })
    it('set', () => {
      wrapper.vm.selectedRow = devices[2]
      expect(wrapper.vm.selectedSSIDs).toEqual([devices[2]])
    })
  })

  describe('method getPoints()', () => {
    it.each`
      device        | res
      ${devices[0]} | ${[[-1, -100], [0, -40], [1, -40], [2, -40], [3, -100]]}
      ${devices[1]} | ${[[34, -100], [35, -30], [42, -30], [49, -30], [50, -100]]}
      ${devices[2]} | ${[[3, -100], [4, -80], [7, -80], [10, -80], [11, -100]]}
    `('gets points for drawing interference graph when device is $device, min channels is $minChannel and max channel is $maxChannel', async ({ device, res }) => {
      const result = wrapper.vm.getPoints(device)
      expect(res).toEqual(result)
    })
  })

  describe('method timestampInfo()', () => {
    it.each`
      scanTimestamp    | scannedDevices | expectResult
      ${1709453419461} | ${[]}          | ${{ icon: 'success', iconStyle: 'text-theme-text-success', relativeText: 'just now' }}
      ${1709367019461} | ${[]}          | ${{ icon: 'warning', iconStyle: 'text-theme-text-warning', relativeText: 'yesterday' }}
      ${null}          | ${[]}          | ${{ icon: 'warning', iconStyle: 'text-theme-text-warning', relativeText: 'never' }}
    `('returs info needed to render last scan label #%#', async ({ scanTimestamp, scannedDevices, expectResult }) => {
      Date.now = () => 1709453419462
      await wrapper.setProps({ scanTimestamp, scannedDevices })
      expect(wrapper.vm.timestampInfo).toEqual(expectResult)
    })
  })
})
