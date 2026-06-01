import ProtoOspf from '../../src/views/status/ProtoOspf.vue'
import createWrapper from '@tests/unit/mockFactory'

const goodData = {
  success: true,
  data: {
    neighbors: {
      route1: [
        {
          ifaceName: 'test:test2',
          address: '1',
          priority: '2',
          state: 'on',
          deadTimeMsecs: 5000,
          retransmitCounter: '25',
          requestCounter: '30',
          dbSummaryCounter: '27'
        }
      ]
    }
  }
}

describe('New status tests', () => {
  const resolve = [
    {
      data: {
        address: '1',
        dbSummaryCounter: '27',
        deadTimeMsecs: '5',
        iface: 'test',
        ifaceName: 'test2',
        priority: '2',
        requestCounter: '30',
        retransmitCounter: '25',
        state: 'on'
      },
      tableData: [],
      title: 'route1',
      id: 'route1'
    }
  ]
  it.each([
    ['data exists', goodData, resolve, true],
    ['not first load', goodData, resolve, false]
  ])('returns loaded data when %s', async (text, data, response, load) => {
    const wrapper = createWrapper(ProtoOspf)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.firstLoad = load
    wrapper.vm.$axios.get.mockResolvedValueOnce(data)
    wrapper.vm.getRoutes = vi.fn()
    wrapper.vm.getRoutes.mockReturnValue([])
    await wrapper.vm.getData()
    expect(wrapper.vm.cards).toEqual(response)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(ProtoOspf)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getData()
    expect(spy).toHaveBeenCalledWith('Failed to load ospf data')
  })
  const resp = [
    {
      area: '27',
      cost: '15',
      id: 'notNeighbors',
      ip: '-',
      rtype: 'TEST',
      nexthops: '12',
      type: 'R ',
      via: '25'
    }
  ]
  const routeData = {
    notNeighbors: {
      nexthops: [
        {
          ip: '12',
          via: '25'
        }
      ],
      routeType: 'R ',
      routerType: 'test',
      cost: '15',
      area: '27'
    }
  }
  const badRouteData = {
    neighbors: {
      nexthops: [
        {
          ip: '12'
        }
      ],
      routeType: 'N E2'
    }
  }
  const goodDataNoCorrectOptionsData = {
    notNeighbors: {
      nexthops: [
        {
          ip: '12'
        }
      ],
      routeType: 'N'
    }
  }
  const badResp = [
    {
      area: '-',
      cost: '-',
      id: 'notNeighbors',
      ip: 'notNeighbors',
      nexthops: '12',
      rtype: '-',
      type: 'N',
      via: '-'
    }
  ]
  it.each([
    ['data exists', routeData, resp],
    ['data doest exist', badRouteData, []],
    ['no options', goodDataNoCorrectOptionsData, badResp],
    ['no options', {}, []]
  ])('tests getRoutes when %s', async (text, data, response) => {
    const wrapper = createWrapper(ProtoOspf)
    const val = await wrapper.vm.getRoutes(data, '12')
    expect(val).toEqual(response)
  })
  const externalRouteData = {
    notNeighbors: {
      nexthops: [
        {
          ip: '12',
          via: '25'
        }
      ],
      routeType: 'N E2',
      routerType: 'test',
      cost: '15',
      area: '27'
    }
  }

  const externalRouteResp = [
    {
      area: '27',
      cost: '15',
      id: 'notNeighbors',
      ip: 'notNeighbors',
      rtype: 'TEST',
      nexthops: '12',
      type: 'N E2',
      via: '25'
    }
  ]
  const externalBadResp = [
    {
      area: '-',
      cost: '-',
      id: 'notNeighbors',
      ip: 'notNeighbors',
      nexthops: '12',
      rtype: '-',
      type: 'N E2',
      via: '-'
    }
  ]
  const externalGoodDataNoCorrectOptionsData = {
    notNeighbors: {
      nexthops: [
        {
          ip: '12'
        }
      ],
      routeType: 'N E2'
    }
  }
  it.each([
    ['data exists', externalRouteData, externalRouteResp],
    ['data doest exist', badRouteData, []],
    ['no options', externalGoodDataNoCorrectOptionsData, externalBadResp],
    ['no options', {}, []]
  ])('tests getExternalRoutes when %s', async (text, data, response) => {
    const wrapper = createWrapper(ProtoOspf)
    const val = await wrapper.vm.getExternalRoutes(data)
    expect(val).toEqual(response)
  })

  it.each([
    [
      'data exist',
      1,
      { route: '1', routeType: '1', routerType: '1', cost: '1', area: '1' },
      { via: '1', ip: '1' },
      { area: '1', cost: '1', id: 1, ip: 1, nexthops: '1', rtype: '1', type: '1', via: '1' }
    ],
    [
      'routerType and cost dont exist',
      1,
      { route: '1', routeType: 'R ', routerType: '1', area: '1' },
      { via: '1', ip: '1' },
      { area: '1', cost: '-', id: 1, ip: '-', nexthops: '1', rtype: '1', type: 'R ', via: '1' }
    ],
    ['data doesnt exist', 1, {}, { via: '1', ip: '1' }, { area: '-', cost: '-', id: 1, ip: 1, nexthops: '1', rtype: '-', type: '-', via: '1' }],
    ['routerType and cost dont exist', 1, { route: '1', routeType: 'R ', routerType: '1', area: '1' }, {}, { area: '1', cost: '-', id: 1, ip: '-', nexthops: '-', rtype: '1', type: 'R ', via: '-' }]
  ])('tests parseRoutes when %s', async (text, id, data, hop, response) => {
    const wrapper = createWrapper(ProtoOspf)
    const val = await wrapper.vm.parseRoutes(id, data, hop)
    expect(val).toEqual(response)
  })
})
