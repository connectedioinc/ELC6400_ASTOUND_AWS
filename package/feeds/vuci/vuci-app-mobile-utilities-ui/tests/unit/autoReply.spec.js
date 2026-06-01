import AutoReply from '../../src/views/services/AutoReply.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

vi.mock('@/plugins/mobile', () => ({
  mobile: {
    modemsOptions: () => [
      ['3-1', 'Internal'],
      ['3-10', 'External']
    ],
    parseModems: data => data
  }
}))

describe('AutoReply.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(AutoReply)
  })

  it('loads phone groups and modems with success response and some data', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [{ name: 'test1' }, { name: 'test2' }] },
      {
        success: true,
        data: [
          { id: '3-1', name: 'Internal' },
          { id: '3-10', name: 'External' }
        ]
      },
      { success: true, data: { params: [] } }
    ])
    await wrapper.vm.loadData()
    expect(wrapper.vm.modems).toEqual([
      { id: '3-1', name: 'Internal' },
      { id: '3-10', name: 'External' }
    ])
    expect(wrapper.vm.userGroups).toEqual([{ name: 'test1' }, { name: 'test2' }])
  })

  it('returns mapped modems to options', () => {
    wrapper.vm.modems = [
      { id: '3-1', name: 'Internal' },
      { id: '3-10', name: 'External' }
    ]
    expect(wrapper.vm.modemOptions).toEqual([
      ['3-1', 'Internal'],
      ['3-10', 'External']
    ])
  })

  it('returns mapped userGroup options when some exist', () => {
    wrapper.vm.userGroups = [{ name: 'test1' }, { name: 'test2' }]
    expect(wrapper.vm.userGroupOptions).toEqual(['test1', 'test2'])
  })

  it('invokes error message when phone groups request fails', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: false },
      {
        success: true,
        data: [
          { id: '3-1', name: 'Internal' },
          { id: '3-10', name: 'External' }
        ]
      },
      { success: true, data: { params: [] } }
    ])
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load phone group options')
    vi.clearAllMocks()
  })

  it('invokes error message when modem request fails', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: true, data: [] }, { success: false }, { success: true, data: { params: [] } }])
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load modem options')
    vi.clearAllMocks()
  })

  it('invokes error message when SMS parameters request fails', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: true, data: [] }, { success: true, data: [] }, { success: false }])
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load SMS parameters')
    vi.clearAllMocks()
  })

  it('sets parameters empty when request response is returned without params', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: {} }
    ])
    await wrapper.vm.loadData()
    expect(wrapper.vm.parameters).toEqual([])
  })

  it('invokes error message when bulk request fails', async () => {
    axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    vi.clearAllMocks()
  })

  const parameters = [
    { id: 'rn', type: 'device', description: 'Router name' },
    { id: 'wi', type: 'network', description: 'Wired WAN IP addresses' },
    { id: 'cs', type: 'mobile', description: 'Data connection state' },
    { id: 'ct', type: 'mobile', description: 'Network type' },
    { id: 'ss', type: 'mobile', description: 'Signal strength' }
  ]
  const messageParameters = 'Router name - %rn; WAN IPv4 address - %wi; Signal strength - %ss; Network type - %ct; Data connection state - %cs'
  const parametersResult = [
    { parameter: '%rn', description: 'Router name' },
    { parameter: '%wi', description: 'WAN IPv4 address' },
    { parameter: '%ss', description: 'Signal strength' },
    { parameter: '%ct', description: 'Network type' },
    { parameter: '%cs', description: 'Data connection state' }
  ]

  it('returns textbox and placeholder parameters', () => {
    wrapper.vm.parameters = parameters
    wrapper.vm.getParametersMessage = vi.fn().mockReturnValue(messageParameters)
    expect(wrapper.vm.formattedParameters).toEqual(parametersResult)
    expect(wrapper.vm.messagePlaceholder).toEqual(messageParameters)
  })

  it.each([
    [false, ['Router name - %rn', 'WAN IPv4 address - %wi', 'Signal strength - %ss', 'Network type - %ct', 'Data connection state - %cs']],
    [true, 'Router name - %rn; WAN IPv4 address - %wi; Signal strength - %ss; Network type - %ct; Data connection state - %cs']
  ])('returns placeholder parameters for isArray=%s', (isArray, expectedResults) => {
    wrapper.vm.getAllParameters = vi.fn().mockReturnValueOnce(parametersResult)
    wrapper.vm.getMessages = vi.fn().mockReturnValueOnce(parametersResult)
    expect(wrapper.vm.getParametersMessage(parameters, isArray)).toEqual(expectedResults)
  })
})
