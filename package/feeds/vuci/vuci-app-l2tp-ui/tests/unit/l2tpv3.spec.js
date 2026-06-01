import L2tpv3 from '../../src/views/services/L2tpv3.vue'
import L2tpv3Edit from '../../src/views/services/L2tpv3Edit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('L2tpv3 tests', () => {
  const goodResponse = { success: true, data: [{ test: 'network' }] }
  it('Checks if error message is showed', async () => {
    const wrapper = createWrapper(L2tpv3)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load interfaces')
  })
  it('Checks if interface list is loaded', async () => {
    const wrapper = createWrapper(L2tpv3)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(goodResponse)
    await wrapper.vm.loadData()
    expect(wrapper.vm.formOptions.interfaces).toEqual([{ test: 'network' }])
  })
  const validProps = {
    section: {
      id: 'l2tpv3'
    }
  }
  const validInterfaces = [{ '.type': 'interface', bridge: '1', id: 'YaY', name: 'test' }]
  const invalidInterfaces = []
  const response = [
    ['none', 'None'],
    ['YaY', 'test']
  ]
  const bad = [['none', 'None']]
  it.each([
    ['are bridged interfaces', validInterfaces, response],
    ['arent any bridged interfaces', invalidInterfaces, bad]
  ])('Checks bridge interface list when there %s', async (status, interfaces, response) => {
    const options = { interfaces: [] }
    options.interfaces = interfaces
    const wrapper = createWrapper(L2tpv3Edit, { props: validProps, global: { provide: { formOptions: () => options } } })
    const result = await wrapper.vm.mapBridgedNetworkOptions()
    expect(result).toEqual(response)
  })
  it.each([
    ['unique tunnel ID', [{ id: 'other-id', tunnel_id: '123' }], '456', { isValid: true }],
    ['duplicate tunnel ID', [{ id: 'other-id', tunnel_id: '123' }], '123', { isValid: false, message: 'The Tunnel ID is already being used by another instance.' }]
  ])('validates %s', (scenario, tunnelData, tunnelId, expectedIsValid) => {
    const wrapper = createWrapper(L2tpv3Edit, {
      props: {
        section: {
          id: 'other-id1'
        }
      },
      global: {
        provide: {
          formOptions: () => ({
            interfaces: [{ '.type': 'interface', bridge: '1', id: 'YaY' }]
          })
        }
      }
    })
    wrapper.vm.tunnelData = { l2tpdv3: tunnelData }
    const result = wrapper.vm.validateTunnelId(tunnelId)

    expect(result).toEqual(expectedIsValid)
  })
  it.each([
    ['unique tunnel ID', [{ id: 'other-id', session_id: '123' }], '456', { isValid: true }],
    ['duplicate tunnel ID', [{ id: 'other-id', session_id: '123' }], '123', { isValid: false, message: 'The Session ID is already being used by another instance.' }]
  ])('validates %s', (scenario, tunnelData, tunnelId, expectedIsValid) => {
    const wrapper = createWrapper(L2tpv3Edit, {
      props: {
        section: {
          id: 'other-id1'
        }
      },
      global: {
        provide: {
          formOptions: () => ({
            interfaces: [{ '.type': 'interface', bridge: '1', id: 'YaY' }]
          })
        }
      }
    })
    wrapper.vm.tunnelData = { l2tpdv3: tunnelData }
    const result = wrapper.vm.validateSessionId(tunnelId)

    expect(result).toEqual(expectedIsValid)
  })
})
