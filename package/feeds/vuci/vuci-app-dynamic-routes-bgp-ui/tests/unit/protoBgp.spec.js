import ProtoBgp from '../../src/views/network/ProtoBgp.vue'
import ProtoBgpEdit from '../../src/views/network/ProtoBgpEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('ProtoBgp.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(ProtoBgp)
  })
  it.each([
    [
      'data exists',
      {
        formData: {
          p_bgp_peer: [
            { id: 'peer1', '.type': 'bgp_peer' },
            { id: 'peer2', '.type': 'bgp_peer' }
          ],
          pg_bgp_peer_group: [
            { id: 'peerGroup1', '.type': 'bgp_peer_group' },
            { id: 'peerGroup2', '.type': 'bgp_peer_group' }
          ]
        }
      },
      ['peer1', 'peer2', 'peerGroup1', 'peerGroup2']
    ],
    [
      'data doesnt exist',
      {
        formData: {}
      },
      []
    ]
  ])('tests target then %s', async (text, formData, result) => {
    await wrapper.setData(formData)
    expect(wrapper.vm.target).toEqual(result)
  })

  it.each([
    ['success', { isValid: true }, 'toBeTruthy'],
    ['fail', { isValid: false }, 'toBeFalsy']
  ])('subet validation %s', (text, isValid, toBe) => {
    wrapper.vm.$VuciValidator = {
      value: null,
      subnet: vi.fn().mockReturnValue(isValid)
    }
    const res = wrapper.vm.validateSubnet('test')
    expect(res.isValid)[toBe]()
  })

  it.each([
    [{ id: 'bgp1' }, { bgp1_bgp_peer: [{ id: 'bgp1p1' }] }, {}, {}, {}],
    [{ id: 'bgp1' }, { bgp2_bgp_peer: [{ id: 'bgp2p1' }] }, {}, {}, { bgp2_bgp_peer: [{ id: 'bgp2p1' }] }],
    [{ id: 'bgp1' }, { bgp1_bgp_peer: [{ id: 'bgp1p1' }, { id: 'bgp1p2' }], bgp2_bgp_peer: [{ id: 'bgp2p1' }, { id: 'bgp2p2' }] }, {}, {}, { bgp2_bgp_peer: [{ id: 'bgp2p1' }, { id: 'bgp2p2' }] }],

    [{ id: 'bgp1' }, {}, { bgp1_bgp_peer_group: [{ id: 'bgp1pg1' }] }, {}, {}],
    [{ id: 'bgp1' }, {}, { bgp2_bgp_peer_group: [{ id: 'bgp2pg1' }] }, {}, { bgp2_bgp_peer_group: [{ id: 'bgp2pg1' }] }],
    [
      { id: 'bgp1' },
      {},
      { bgp1_bgp_peer_group: [{ id: 'bgp1pg1' }, { id: 'bgp1pg2' }], bgp2_bgp_peer_group: [{ id: 'bgp2pg1' }, { id: 'bgp2pg2' }] },
      {},
      { bgp2_bgp_peer_group: [{ id: 'bgp2pg1' }, { id: 'bgp2pg2' }] }
    ],
    [
      { id: 'bgp1' },
      {},
      {},
      { bgp1_bgp_route_map_filters: [{ id: 'bgp1rmf1' }, { id: 'bgp1rmf2' }], bgp2_bgp_route_map_filters: [{ id: 'bgp2rmf1' }, { id: 'bgp2rmf2' }] },
      { bgp2_bgp_route_map_filters: [{ id: 'bgp2rmf1' }, { id: 'bgp2rmf2' }] }
    ]
  ])('tests deleteChildInstances', (deletedBgpInstance, bgpPeers, bgpPeerGroups, bgpRouteMaps, result) => {
    const uciData = { ...bgpPeers, ...bgpPeerGroups, ...bgpRouteMaps }
    wrapper.vm.deleteChildInstances(deletedBgpInstance, uciData)
    expect(uciData).toEqual(result)
  })

  it('returns function that gets error message', () => {
    const errors = {
      1: 'test',
      default: 'default'
    }
    expect(wrapper.vm.handleErrors(errors)({ data: { errors: [{ code: 1 }] } })).toBe('test')
    expect(wrapper.vm.handleErrors(errors)({ data: { errors: [{ code: null }] } })).toBe('default')
  })
  it('increments sequence by 10', () => {
    const data = [{ sequence: '1' }, { sequence: '5' }, { sequence: '6' }]
    wrapper.vm.onDragChange(data)
    expect(data).toEqual([{ sequence: '10' }, { sequence: '50' }, { sequence: '60' }])
  })

  it.each([
    [new Array(29), 'test', { valid: true, message: "Maximum number (30) of 'test' instances has been reached" }],
    [new Array(30), 'test', { valid: false, message: "Maximum number (30) of 'test' instances has been reached" }],
    [new Array(31), 'test', { valid: false, message: "Maximum number (30) of 'test' instances has been reached" }],
    [[], 'test', { valid: true, message: "Maximum number (30) of 'test' instances has been reached" }]
  ])('addValidateInstance tests', (sections, name, res) => {
    const val = wrapper.vm.addValidateInstance(sections, name)
    expect(val).toEqual(res)
  })
  it('returns delete button hints', () => {
    wrapper.vm.formData = {
      test_bgp_route_map_filters: [
        {
          instance: 'test',
          route_map: 'asd'
        }
      ],
      test2_bgp_route_map_filters: [
        {
          instance: 'test2',
          route_map: 'asd'
        }
      ]
    }
    const val = wrapper.vm.deleteHints('asd')
    expect(val).toEqual([{ info: "Can't delete due to existing Route Map Filters using this Route Map in instance: test, test2." }])
  })
})

describe('ProtoBgpEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(ProtoBgpEdit, {
      data: () => ({ formData: { bgp_instances: [] } }),
      props: { section: {}, uciData: { bgp_instances: [] } },
      global: { provide: { formOptions: () => ({ vrfInterfaces: [] }) } }
    })
  })
  const testData = [
    {
      bgpPeerinstance: { id: 'bgp1p1', instance: 'bgp1' },
      bgpInstance: { bgp1_bgp_route_map_filters: [{ target: 'bgp1p1' }] },
      isBgpPeerUsed: true,
      bgpDeleteHint: [{ info: "This instance can't be deleted because it is used by 'Route map filters' instance(s)" }]
    },
    {
      bgpPeerinstance: { id: 'bgp1p1', instance: 'bgp1' },
      bgpInstance: { bgp1_bgp_route_map_filters: [{ target: 'bgp1p2' }] },
      isBgpPeerUsed: false,
      bgpDeleteHint: []
    }
    // {
    //   bgpPeerinstance: { id: 'bgp1p1', instance: 'bgp1' },
    //   bgpInstance: { bgp1_bgp_route_map_filters: [{ target: 'bgp1p1' }, { target: 'bgp1p2' }] },
    //   isBgpPeerUsed: true,
    //   bgpDeleteHint: [{ info: "This instance can't be deleted because it is used by 'Route map filters' instance(s)" }]
    // }
  ]
  it('isBgpPeerUsed tests', async () => {
    for (const x of testData) {
      await wrapper.setData({ formData: x.bgpInstance })
      const val = wrapper.vm.isBgpPeerUsed(x.bgpPeerinstance)
      expect(val).toEqual(x.isBgpPeerUsed)
    }
  })
  it('bgpDeleteHint tests', async () => {
    for (const x of testData) {
      await wrapper.setData({ formData: x.bgpInstance })
      const val = wrapper.vm.bgpDeleteHint(x.bgpPeerinstance)
      expect(val).toEqual(x.bgpDeleteHint)
    }
  })

  it.each([
    [{ id: 'bgp1' }, [], 'route map filters', [], { bgp1_bgp_peer: [{}] }, { valid: false, message: "At least one 'Route maps' instance has to be created to create 'Route map filters' instance" }],
    [{ id: 'bgp1' }, [], 'route map filters', [{ id: 1 }], { bgp1_bgp_peer: [{}] }, { valid: true, message: "Maximum number (50) of 'BGP route map filters' has been reached for this BGP instance" }],
    [{ id: 'bgp1' }, new Array(49), 'test', [], { bgp1_bgp_peer: [] }, { valid: true, message: "Maximum number (50) of 'BGP test' has been reached for this BGP instance" }],
    [{ id: 'bgp1' }, new Array(50), 'test', [], { bgp1_bgp_peer: [] }, { valid: false, message: "Maximum number (50) of 'BGP test' has been reached for this BGP instance" }],
    [{ id: 'bgp1' }, new Array(51), 'test', [], { bgp1_bgp_peer: [] }, { valid: false, message: "Maximum number (50) of 'BGP test' has been reached for this BGP instance" }],
    [{ id: 'bgp1' }, [], 'peer groups', [], { bgp1_bgp_peer: [] }, { valid: true, message: "Maximum number (50) of 'BGP peer groups' has been reached for this BGP instance" }],
    [{ id: 'bgp1' }, [], 'route map filters', [{}], { bgp1_bgp_peer: [] }, { valid: false, message: "At least one 'BGP peers' instance has to be created to create 'Route map filters' instance" }]
  ])('addValidateChildInstances tests', async (section, sections, name, routeMaps, bgpPeers, res) => {
    wrapper = createWrapper(ProtoBgpEdit, {
      data: () => ({ formData: { bgp_instances: [] } }),
      props: { section, uciData: { bgp_instances: [] } },
      global: { provide: { formOptions: () => ({ vrfInterfaces: [] }) } }
    })
    await wrapper.setData({ formData: { route_maps: routeMaps, ...bgpPeers } })
    const val = wrapper.vm.addValidateChildInstances(sections, name)
    expect(val).toEqual(res)
  })

  it.each([
    [
      [{ id: 'map1' }, { id: 'map2' }],
      [
        ['map1', 'map1'],
        ['map2', 'map2']
      ]
    ],
    [[], []]
  ])('routeMapFiltersOptions tests', async (routeMaps, res) => {
    await wrapper.setData({
      formData: {
        route_maps: routeMaps
      }
    })
    expect(wrapper.vm.routeMapFiltersOptions).toEqual(res)
  })

  it.each([
    [
      { id: 'bgp1' },
      [{ id: 'rm1' }, { id: 'rm2' }],
      [
        ['rm1', 'rm1'],
        ['rm2', 'rm2']
      ]
    ],
    [{ id: 'bgp1' }, [], []]
  ])('routeMapFiltersOptions tests', async (section, peers, res) => {
    const wrapper = createWrapper(ProtoBgpEdit, {
      data: () => ({ formData: { bgp_instances: [] } }),
      props: { section, uciData: { bgp_instances: [] } },
      global: { provide: { formOptions: () => ({ vrfInterfaces: [] }) } }
    })
    await wrapper.setData({
      formData: {
        [`${section.id}_bgp_peer`]: peers
      }
    })
    expect(wrapper.vm.peerOptions).toEqual(res)
  })

  it.each([
    [
      [{ id: 'vrf1' }, { id: 'vrf2' }],
      [
        ['', 'Default'],
        ['vrf1', 'vrf1'],
        ['vrf2', 'vrf2']
      ]
    ],
    [[], [['', 'Default']]]
  ])('vrfInterfaces tests', (vrfInterfaces, res) => {
    const formOptions = {
      vrfInterfaces
    }
    const wrapper = createWrapper(ProtoBgpEdit, {
      data: () => ({ formData: { bgp_instances: [] } }),
      props: { section: {}, uciData: { bgp_instances: [] } },
      global: { provide: { formOptions: () => formOptions } }
    })
    expect(wrapper.vm.vrfInterfaces).toEqual(res)
  })

  it.each([
    [
      [
        { id: 'bgp1', vrf: 'vrf1' },
        { id: 'bgp2', vrf: 'vrf2' }
      ],
      'bgp1',
      [['vrf2', 'vrf2']]
    ],
    [[{ id: 'bgp1', vrf: 'vrf1' }, { id: 'bgp2' }], 'bgp1', [['', 'Default']]],
    [
      [{ id: 'bgp1', vrf: 'vrf1' }, { id: 'bgp2' }, { id: 'bgp2', vrf: 'vrf3' }],
      'bgp1',
      [
        ['', 'Default'],
        ['vrf3', 'vrf3']
      ]
    ]
  ])('tests vrfInterfacesDisabled', (bgpInstances, id, res) => {
    const wrapper = createWrapper(ProtoBgpEdit, {
      data: () => ({ formData: { bgp_instances: bgpInstances } }),
      props: {
        uciData: { bgp_instances: bgpInstances },
        section: {
          id
        }
      },
      global: { provide: { formOptions: () => ({ vrfInterfaces: [] }) } }
    })
    expect(wrapper.vm.vrfInterfacesDisabled).toEqual(res)
  })
  it.each([
    { value: '192.168.1.1', ip4addrValid: true, irangeValid: false, expectedResult: { isValid: true } },
    { value: '10.0.0.1', ip4addrValid: true, irangeValid: false, expectedResult: { isValid: true } },
    { value: '123456', ip4addrValid: false, irangeValid: true, expectedResult: { isValid: true } },
    { value: '0', ip4addrValid: false, irangeValid: true, expectedResult: { isValid: true } },
    { value: '2808348671', ip4addrValid: false, irangeValid: true, expectedResult: { isValid: true } },
    {
      value: '999.999.999.999',
      ip4addrValid: false,
      irangeValid: false,
      expectedResult: { isValid: false, message: 'Value must be an integer between 0 and 2808348671 or a valid IPv4 address' }
    },
    {
      value: '2808348672',
      ip4addrValid: false,
      irangeValid: false,
      expectedResult: { isValid: false, message: 'Value must be an integer between 0 and 2808348671 or a valid IPv4 address' }
    },
    {
      value: 'invalid',
      ip4addrValid: false,
      irangeValid: false,
      expectedResult: { isValid: false, message: 'Value must be an integer between 0 and 2808348671 or a valid IPv4 address' }
    }
  ])('validateAsIp with value: $value', ({ value, ip4addrValid, irangeValid, expectedResult }) => {
    wrapper.vm.$VuciValidator.ip4addr = vi.fn().mockReturnValueOnce({ isValid: ip4addrValid })
    wrapper.vm.$VuciValidator.irange = vi.fn().mockReturnValueOnce({ isValid: irangeValid })
    expect(wrapper.vm.validateAsIp(value)).toEqual(expectedResult)
  })
})
