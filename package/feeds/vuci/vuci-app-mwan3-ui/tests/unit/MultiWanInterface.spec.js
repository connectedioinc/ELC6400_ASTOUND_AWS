import createWrapper from '@tests/unit/mockFactory'
import MultiWanInterface from '../../src/views/network/MultiWanInterface.vue'
import MultiWanInterfaceEdit from '../../src/views/network/MultiWanInterfaceEdit.vue'
import { axios } from '@ui-core/plugins/axios'
import { contextId } from '../../src/views/network/MultiWanInterfaceCommon'

const interfaceStatus = [
  {
    id: 'lan',
    area_type: 'lan'
  },
  {
    id: 'mob1s1a1',
    area_type: 'wan',
    proto: 'mobile'
  },
  {
    id: 'mob1s2a1',
    area_type: 'wan',
    proto: 'mobile'
  },
  {
    id: 'wan',
    area_type: 'wan',
    proto: 'dhcp'
  },
  {
    id: 'wan6',
    area_type: 'wan',
    proto: 'dhcp'
  }
]

describe('MultiWanInterface.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MultiWanInterface)
  })

  it('loads afterLoad data', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: interfaceStatus })
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.interfaceStatus).toEqual(interfaceStatus)
  })

  it('computes available interface options', () => {
    const res = [
      ['', '-- Select an interface --'],
      ['mob1s1a1', 'mob1s1a1'],
      ['wan', 'wan']
    ]
    wrapper.vm.interfaceStatus = interfaceStatus
    wrapper.vm.formData.mwanIfaces = [{ id: 'mob1s2a1' }]
    expect(wrapper.vm.ifaceOptions).toEqual(res)
  })
})

describe('MultiWanInterfaceEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MultiWanInterfaceEdit, { props: { section: {} }, global: { provide: { [contextId]: { interfaceStatus } } } })
  })
  it.each`
    track_method  | res
    ${'ping'}     | ${'Track IP'}
    ${'wgetping'} | ${'URL'}
  `('computes trackIpLabel when track method is $track_method', async ({ track_method, res }) => {
    const section = { track_method }
    await wrapper.setProps({ section })
    expect(wrapper.vm.trackIpLabel).toEqual(res)
  })
  it.each`
    track_method  | family    | res
    ${'ping'}     | ${'ipv4'} | ${'ipv4host'}
    ${'ping'}     | ${'ipv6'} | ${'ipv6host'}
    ${'wgetping'} | ${''}     | ${'url'}
  `('computes trackIpRules when track method is $track_method and family is $family', async ({ track_method, family, res }) => {
    const section = { track_method, family }
    await wrapper.setProps({ section })
    expect(wrapper.vm.trackIpRules).toEqual(res)
  })
  it.each`
    track_method  | family    | res
    ${'ping'}     | ${'ipv4'} | ${'8.8.8.8'}
    ${'ping'}     | ${'ipv6'} | ${'2001:4860:4860::8844'}
    ${'wgetping'} | ${''}     | ${'www.example.com'}
  `('computes trackIpPlaceholder when track method is $track_method and family is $family', async ({ track_method, family, res }) => {
    const section = { track_method, family }
    await wrapper.setProps({ section })
    expect(wrapper.vm.trackIpPlaceholder).toEqual(res)
  })
})
