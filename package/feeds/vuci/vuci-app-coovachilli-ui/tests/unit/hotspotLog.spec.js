import HotspotLog from '../../src/views/status/HotspotLog.vue'
import createWrapper from '@tests/unit/mockFactory'

const date = '2024-05-20 08:30:03'

describe('HotspotUserManagement.vue', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })
  const badApiData = { success: false }
  const goodApiData = {
    success: true,
    data: [
      {
        mac: '7A-7A-D7-29-CD-8D',
        input_octets: '415899',
        ip: '192.168.2.1',
        username: 'test',
        terminate_cause: '0',
        output_octets: '202604',
        start_time: '05/20/24 08:30:03',
        session: '1',
        sessiontime: '249'
      }
    ]
  }
  const falseApiData = {
    success: true,
    data: []
  }
  const correctResponse = [
    {
      username: 'test',
      ip: '192.168.2.1',
      mac: '7A-7A-D7-29-CD-8D',
      start_time: date,
      input_octets: '415.9 KB',
      output_octets: '202.6 KB',
      sessiontime: '249 s',
      terminate_cause: '-',
      session: '1'
    }
  ]

  it.each([
    [false, badApiData, []],
    [true, goodApiData, correctResponse],
    ['incorrect', falseApiData, []]
  ])('Checks if data is loaded correctly with response is %s', async (value, text, result) => {
    const wrapper = createWrapper(HotspotLog, {
      global: {
        mocks: {
          $localDate: vi.fn().mockReturnValue(date)
        }
      }
    })
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(text)

    await wrapper.vm.loadHotspotLogs()
    expect(wrapper.vm.hotspot).toEqual(result)
  })
})
