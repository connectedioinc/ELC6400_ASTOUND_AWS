import PPTP from '../../src/views/services/PPTP.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('PPTP.vue', () => {
  it('returns type (Server or client)', () => {
    const wrapper = createWrapper(PPTP)
    expect(wrapper.vm.displayType('service')).toEqual('Server')
    expect(wrapper.vm.displayType('interface')).toEqual('Client')
  })
  const sixClients = [{ '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }]
  const serverExists = [{ '.type': 'service' }]
  const oneClient = [{ '.type': 'interface' }]
  it('returns error messages when afterLoad API call is not successful', async () => {
    const wrapper = createWrapper(PPTP)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      {
        success: false,
        data: []
      },
      {
        success: false,
        data: []
      }
    ])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const spy2 = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad({ pptp: [] })
    expect(spy).toHaveBeenCalledWith('Failed to load network data')
    expect(spy2).toHaveBeenCalledWith('Failed to load PPTP server users data')
  })
  const array = [{ id: '1' }, { id: '2' }]
  it.each([
    [
      {
        success: true,
        data: array
      },
      {
        success: true,
        data: array
      }
    ],
    [
      {
        success: true,
        data: array
      }
    ]
  ])('checks returned values when afterLoad API call is successful', async data => {
    const wrapper = createWrapper(PPTP)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([data])
    await wrapper.vm.afterLoad({ pptp: [] })
    expect(wrapper.vm.networkNames).toEqual(['1', '2'])
  })

  it.each([
    [sixClients, true],
    [oneClient, false]
  ])('Tests clientLimitReached', (data, res) => {
    const wrapper = createWrapper(PPTP)
    wrapper.vm.formData = { pptp: data }
    const val = wrapper.vm.clientLimitReached
    expect(val).toEqual(res)
  })
  it.each([
    [serverExists, sixClients, true],
    [serverExists, oneClient, false],
    [[], sixClients, false],
    [[], [], false]
  ])('Tests instanceLimitReached', (servers, clients, res) => {
    const wrapper = createWrapper(PPTP)
    wrapper.vm.formData = { pptp: [...servers, ...clients] }
    const val = wrapper.vm.instanceLimitReached
    expect(val).toEqual(res)
  })

  it.each([
    [serverExists, sixClients, true],
    [serverExists, oneClient, false],
    [[], sixClients, false],
    [[], [], false]
  ])('Tests instanceLimitReached', (servers, clients, res) => {
    const wrapper = createWrapper(PPTP)
    wrapper.vm.formData = { pptp: [...servers, ...clients] }
    const val = wrapper.vm.instanceLimitReached
    expect(val).toEqual(res)
  })
})
