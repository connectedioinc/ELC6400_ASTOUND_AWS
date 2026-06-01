import ProtoBgp from '../../src/views/status/ProtoBgp.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

vi.mock('@ui-core/plugins/messages')
vi.mock('@ui-core/plugins/axios')
vi.mock('@ui-core/composables/useTimer')
const response = {
  success: true,
  data: {
    route1: {
      messageStats: {},
      addressFamilyInfo: {
        ipv4Unicast: {}
      }
    },
    route2: {
      messageStats: {},
      addressFamilyInfo: {
        ipv4Unicast: {}
      }
    },
    route3: {
      bgpState: 'test',
      messageStats: {
        updatesSent: 'test',
        updatesRecv: 'test',
        totalSent: 'test',
        totalRecv: 'test'
      },
      addressFamilyInfo: {
        ipv4Unicast: {
          acceptedPrefixCounter: '1'
        }
      },
      bgpTimerUpString: '1',
      hostLocal: 'host',
      localAs: 'local',
      remoteRouterId: '1',
      remoteAs: '2'
    },
    default: {
      vrfId: '2',
      vrfName: 'test',
      routes: {
        test: [
          {
            prefix: 'test',
            prefixLen: '1',
            peerId: 'Default',
            pathFrom: 'test',
            valid: 'no'
          }
        ],
        test2: [
          {
            peerId: 'Default'
          }
        ]
      }
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
    default: {
      routes: {
        test2: [{}]
      }
    }
  }
}
const expectedResult = [
  {
    id: 'route1',
    data: {
      id: 'route1',
      acceptedPrefixCounter: '-',
      bgpState: 'Inactive',
      bgpTimerUpString: '-',
      hostLocal: '-',
      localAs: '-',
      remoteAs: '-',
      remoteRouterId: '-',
      pathFrom: 'Internal'
    },
    tableData: []
  },
  {
    id: 'route2',
    data: {
      id: 'route2',
      acceptedPrefixCounter: '-',
      bgpState: 'Inactive',
      bgpTimerUpString: '-',
      hostLocal: '-',
      localAs: '-',
      remoteAs: '-',
      pathFrom: 'Internal',
      remoteRouterId: '-'
    },
    tableData: []
  },
  {
    id: 'route3',
    data: {
      id: 'route3',
      acceptedPrefixCounter: '1',
      bgpState: 'Inactive',
      bgpTimerUpString: '1',
      hostLocal: 'host',
      localAs: 'local',
      pathFrom: 'External',
      remoteAs: '2',
      remoteRouterId: '1'
    },
    tableData: []
  }
]
const badResponseExpectedResult = [
  {
    data: {
      acceptedPrefixCounter: '-',
      bgpState: 'Inactive',
      bgpTimerUpString: '-',
      hostLocal: '-',
      id: 'route1',
      localAs: '-',
      pathFrom: 'Internal',
      remoteAs: '-',
      remoteRouterId: '-'
    },
    id: 'route1',
    tableData: []
  },
  {
    data: {
      acceptedPrefixCounter: '-',
      bgpState: 'Inactive',
      bgpTimerUpString: '-',
      hostLocal: '-',
      id: 'route2',
      localAs: '-',
      pathFrom: 'Internal',
      remoteAs: '-',
      remoteRouterId: '-'
    },
    id: 'route2',
    tableData: []
  },
  {
    data: {
      acceptedPrefixCounter: '-',
      bgpState: 'Inactive',
      bgpTimerUpString: '-',
      hostLocal: '-',
      id: 'route3',
      localAs: '-',
      pathFrom: 'Internal',
      remoteAs: '-',
      remoteRouterId: '-'
    },
    id: 'route3',
    tableData: []
  }
]
describe('New status tests', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it.each([
    ['data exists', response, expectedResult, true],
    ['data doesnt exists', badData, badResponseExpectedResult, false]
  ])('returns loaded data when %s', async (text, data, response, load) => {
    const wrapper = createWrapper(ProtoBgp)
    axios.get.mockImplementationOnce(() => Promise.resolve(data))
    wrapper.vm.firstLoad = load
    wrapper.vm.getTableData = vi.fn().mockReturnValue([])
    await wrapper.vm.getData()
    expect(wrapper.vm.cards).toEqual(response)
  })
  it('invokes error message', async ({ expect }) => {
    axios.get.mockImplementationOnce(() => Promise.reject())
    const wrapper = createWrapper(ProtoBgp)
    wrapper.vm.$message.error = vi.fn().mockImplementationOnce(console.log)
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.getData()
    expect(spy).toHaveBeenCalledWith('Failed to load bgp data')
  })
  const resp = [
    {
      network: 'test/1',
      valid: 'Used',
      vrf: '2/test'
    },
    {
      network: '-',
      valid: 'Unused',
      vrf: '2/test'
    }
  ]
  it.each([
    ['data exists', response, resp],
    ['data doesnt exists', badData, []]
  ])('returns loaded table data when %s', (text, data, response) => {
    const wrapper = createWrapper(ProtoBgp)
    const val = wrapper.vm.getTableData(data.data.default, 'Default')
    expect(val).toEqual(response)
  })
})
