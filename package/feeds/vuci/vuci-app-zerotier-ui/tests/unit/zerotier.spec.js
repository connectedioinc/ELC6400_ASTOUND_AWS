import ZeroTier from '../../src/views/services/ZeroTier.vue'
import ZeroTierEdit from '../../src/views/services/ZeroTierEdit.vue'
import ZeroTierNetworksEdit from '../../src/views/services/ZeroTierNetworksEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

let data = []
beforeEach(() => {
  data.push(
    {
      '.name': 'test',
      '.type': 'test',
      name: 'test',
      network_id: 'test',
      enabled: '0'
    },
    {
      '.name': 'test2',
      '.type': 'test2',
      name: 'test2',
      network_id: 'test2',
      enabled: '0'
    }
  )
})
describe('ZeroTier.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(ZeroTier)
  })
  it('returns form options', () => {
    wrapper.vm.formOptions = 'test'
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual('test')
  })
  it('loads data about all zerotier networks', async () => {
    const wrapper = createWrapper(ZeroTier)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      {
        success: true,
        data: {}
      },
      { success: true, data }
    ])
    const res = await wrapper.vm.loadData({ zerotier: [] })
    expect(res).toEqual({
      zerotier_networks: data
    })
  })
  it('doesnt load data about all zerotier networks', async () => {
    const wrapper = createWrapper(ZeroTier)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      {
        success: false,
        data: []
      },
      { success: false, data: [] }
    ])
    const res = await wrapper.vm.loadData({ zerotier: [] })
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toBeCalledWith('Failed to load interfaces')
    expect(res).toEqual(undefined)
  })
  it('fails to load data about all zerotier networks', async () => {
    const wrapper = createWrapper(ZeroTier)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    await wrapper.vm.loadData({ zerotier: [] })
    expect(spy).toBeCalledWith('An unexpected error occurred')
  })
  it.each`
    index | res
    ${0}  | ${false}
    ${1}  | ${false}
  `('removes correspinding networks when zerotier interface is deleted', async ({ index, res }) => {
    const zerotierIfaces = data
    const uciData = {
      zerotier_networks: []
    }
    zerotierIfaces.forEach(iface => {
      uciData.zerotier_networks.push({
        '.type': `zerotier_${iface['.name']}`,
        '.name': `cfg${Date.now()}`
      })
    })
    const deletedSection = zerotierIfaces[index]
    await wrapper.vm.deleteNetworks(deletedSection, uciData)
    const networksExist = uciData.zerotier_networks.some(peer => peer['.type'] === `network_${deletedSection['.name']}`)
    expect(networksExist).toEqual(res)
  })
  it.each`
    data                                                        | input      | result
    ${[{ name: 'test1', id: '1' }, { name: 'test1', id: '2' }]} | ${'test1'} | ${{ isValid: false, message: "Name 'test1' already exists" }}
    ${[{ name: 'test1', id: '1' }, { name: 'test2', id: '2' }]} | ${'test3'} | ${{ isValid: true }}
  `('validateDuplicate duplicates %s', async ({ data, input, result }) => {
    const wrapper = createWrapper(ZeroTier)
    wrapper.vm.formData = { zerotier: data }
    const val = await wrapper.vm.validateDuplicate(input)
    expect(val).toEqual(result)
  })
})

describe('ZeroTierEdit.vue', () => {
  it('validates enable by checking if network_id exists', () => {
    const propsData = { section: data[0] }
    const wrapper = createWrapper(ZeroTierEdit, { propsData })
    const self = {
      uciSection: {
        network_id: null,
        enabled: '1'
      }
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    expect(wrapper.vm.validateEnable(self))
    expect(spy).toHaveBeenCalledWith('"Network ID" must be set to enable the network')
  })
})

describe('ZeroTierNetworksEdit.vue', () => {
  it("checks if 'port' or 'network_id' values have no duplicates", () => {
    const propsData = {
      section: {
        ...data[1]
      }
    }
    const wrapper = createWrapper(ZeroTierNetworksEdit, {
      propsData,
      global: {
        provide: {
          formOptions: () => ({
            interfaces: []
          })
        }
      }
    })
    wrapper.setData({
      formData: {
        zerotier_networks: data
      }
    })
    expect(wrapper.vm.validateNetwork(data[0].network_id).isValid).toEqual(true)
    expect(wrapper.vm.validateNetwork(data[1].network_id)).toEqual({
      isValid: true,
      message: 'Network ID cannot be the same between instance networks'
    })
    expect(wrapper.vm.validatePort(data[0].port).isValid).toEqual(true)
    expect(wrapper.vm.validatePort(data[1].port)).toEqual({
      isValid: true,
      message: 'Port key cannot be the same between networks'
    })
  })
})
