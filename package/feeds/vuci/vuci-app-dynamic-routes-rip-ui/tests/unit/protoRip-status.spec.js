import ProtoRip from '../../src/views/status/ProtoRip.vue'
import createWrapper from '@tests/unit/mockFactory'

const goodData = {
  success: true,
  data: {
    route1: {},
    route2: {},
    route3: {
      From: 'test',
      Metric: '1',
      Network: 'test',
      NextHop: 'test',
      Tag: 'test',
      Time: '0',
      Type: 'R(n)'
    },
    sources: {
      neighbor1: {
        LastUpdate: 'test',
        Badroutes: 'test',
        Distance: 'test',
        Badpackets: '0',
        Gateway: 'test'
      },
      Interface: 'test',
      sendreceive: 'test'
    }
  }
}
const badData = {
  success: true,
  data: {
    route1: {},
    route2: {},
    route3: {
      Form: 'test',
      Type: 'R(n)'
    },
    sources: {
      neighbor1: {},
      test: 'test',
      new: 'new'
    }
  }
}
describe('New status tests', () => {
  it.each([
    [
      'data exists',
      goodData,
      [
        {
          data: {
            badpackets: '0',
            badroutes: 'test',
            distance: 'test',
            interface: 'test',
            lastUpdate: 'test',
            sendreceive: 'test'
          },
          tableData: [],
          title: 'test',
          id: 'test'
        }
      ],
      true
    ],
    [
      'data doesnt exists',
      badData,
      [
        {
          data: {
            badpackets: '-',
            badroutes: '-',
            distance: '-',
            interface: '-',
            lastUpdate: '-',
            sendreceive: '-'
          },
          id: 0,
          tableData: [],
          title: '-'
        }
      ],
      false
    ]
  ])('returns loaded data when %s', async (text, data, response, load) => {
    const wrapper = createWrapper(ProtoRip)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.firstLoad = load
    wrapper.vm.$axios.get.mockResolvedValueOnce(data)
    wrapper.vm.getTableData = vi.fn()
    wrapper.vm.getTableData.mockReturnValue([])
    await wrapper.vm.getData()
    expect(wrapper.vm.cards).toEqual(response)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(ProtoRip)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getData()
    expect(spy).toHaveBeenCalledWith('Failed to load rip data')
  })
  it.each([
    ['data exists', goodData, [{ From: 'test', Metric: '1', Network: 'test', NextHop: 'test', Tag: 'test', Time: '0' }]],
    ['data doesnt exists', badData, [{ From: '-', Metric: '-', Network: '-', NextHop: '-', Tag: '-', Time: '-' }]]
  ])('returns loaded table data when %s', (text, data, response) => {
    const wrapper = createWrapper(ProtoRip)
    const val = wrapper.vm.getTableData(data.data, 1, 'sources', data.data.sources, Object.keys(data.data.sources))
    expect(val).toEqual(response)
  })
})
