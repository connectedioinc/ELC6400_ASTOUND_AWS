import Vrrp from '../../src/views/services/Vrrp.vue'
import VrrpEdit from '../../src/views/services/VrrpEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const props = {
  section: {
    id: 'test1',
    virtual_id: '2',
    interface: 'lan',
    ping_enabled: '1',
    enabled: '1'
  }
}
const noFormData = [{}]
const goodFormData = [
  {
    proto: 'pppoe',
    ifname: ['eth0'],
    id: 'test'
  }
]
const storeData = {
  board: {
    network: {
      lan: {
        device: 'eth0'
      },
      wan: {
        device: 'eth0'
      }
    }
  }
}
describe('Vrrp.vue', () => {
  it('loads form options when success is true', async () => {
    const responseData = {
      success: true,
      data: [
        {
          id: 'test1',
          '.type': 'phone'
        }
      ]
    }
    const wrapper = createWrapper(Vrrp)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(responseData)
    await wrapper.vm.loadData()
    expect(wrapper.vm.interfaces).toEqual([{ id: 'test1', '.type': 'phone' }])
  })
  it('invokes message when promise is rejected', async () => {
    const wrapper = createWrapper(Vrrp)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load interface data')
  })
  const existingData = {
    state: [
      {
        name: 'test'
      },
      {
        name: 'tst'
      }
    ]
  }
  it.each([
    ['name exists', existingData, 'test', { name: 'test' }],
    ['name doesnt exist', existingData, 'tsts', { name: 'tsts', main_ip: 'N/A', state: 'N/A' }]
  ])('filters status data when %s', (text, data, name, response) => {
    const wrapper = createWrapper(Vrrp)
    wrapper.setData(data)
    const result = wrapper.vm.filterStatus(name)
    expect(result).toEqual(response)
  })
  it('returns form options', () => {
    const wrapper = createWrapper(Vrrp)
    wrapper.vm.interfaces = 'test'
  })
  it.each([
    ['update already started', true, true, { data: ['test'] }, []],
    ['update not started', false, false, { data: ['test'] }, ['test']]
  ])('loads state data when %s', async (text, state, updateState, data, response) => {
    const wrapper = createWrapper(Vrrp)
    wrapper.vm.updateStarted = state
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(data)
    await wrapper.vm.loadState()
    expect(wrapper.vm.state).toEqual(response)
    expect(wrapper.vm.updateStarted).toEqual(updateState)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(Vrrp)
    wrapper.vm.updateStarted = false
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadState()
    expect(spy).toHaveBeenCalledWith('Failed to load status')
  })
  it.each`
    status                                 | result
    ${{ state: true, main_ip: '1.1.1.1' }} | ${{ columns: [[{ label: 'Virtual ID', value: 1 }, { label: 'Priority', value: 20 }, { label: 'Virtual address', value: '8.8.8.8' }], [{ label: 'State', value: true }, { label: 'Main IP', value: '1.1.1.1' }]], item: { id: 'vrrp1', priority: 20, virtual_id: 1, virtual_ip: ['8.8.8.8'] } }}
    ${{ state: false }}                    | ${{ columns: [[{ label: 'Virtual ID', value: 1 }, { label: 'Priority', value: 20 }, { label: 'Virtual address', value: '8.8.8.8' }], [{ label: 'State', value: false }, { label: 'Main IP', value: undefined }]], item: { id: 'vrrp1', priority: 20, virtual_id: 1, virtual_ip: ['8.8.8.8'] } }}
  `('returns configurationColumns when item is provided and status is $status', ({ status, result }) => {
    const item = {
      id: 'vrrp1',
      virtual_id: 1,
      priority: 20,
      virtual_ip: ['8.8.8.8']
    }
    const wrapper = createWrapper(Vrrp)
    const spy = vi.spyOn(wrapper.vm, 'filterStatus')
    spy.mockReturnValueOnce(status)
    const eRes = wrapper.vm.configurationColumns(item)
    expect(spy).toHaveBeenCalledWith(item.id)
    expect(eRes).toEqual(result)
  })
})
describe('VrrpEdit.vue', () => {
  describe('Method tests', () => {
    it('changes ping_enabled value when enabled value changes', () => {
      const wrapper = createWrapper(VrrpEdit, { props, global: { provide: { interfaces: () => noFormData } } })
      const s = {
        enabled: '1',
        ping_enabled: '0'
      }
      wrapper.vm.changePingEnabled(s)
      expect(s.ping_enabled).toEqual('1')
    })

    it('returns isValid: true when id is not taken', () => {
      const wrapper = createWrapper(VrrpEdit, { props, global: { provide: { interfaces: () => noFormData } } })
      wrapper.vm.formData = {
        vrrp: []
      }
      const result = wrapper.vm.isVirtualIdUsed()
      expect(result).toEqual({ isValid: true })
    })
    it('returns isValid: false when virtual id is taken', () => {
      const wrapper = createWrapper(VrrpEdit, { props, global: { provide: { interfaces: () => goodFormData } } })
      wrapper.vm.formData = {
        vrrp: [
          {
            virtual_id: '1',
            id: 'test1',
            interface: 'wan'
          },
          {
            virtual_id: '2',
            id: 'test2',
            interface: 'lan'
          }
        ]
      }
      const result = wrapper.vm.isVirtualIdUsed()
      expect(result).toEqual({ isValid: false, message: 'Instance with the same operating virtual ID already exists' })
    })
    it('returns isValid: true when interface isnt taken', () => {
      const wrapper = createWrapper(VrrpEdit, {
        props,
        global: {
          provide: { interfaces: () => noFormData }
        }
      })
      wrapper.vm.formData = {
        vrrp: []
      }
      const result = wrapper.vm.isInterfaceUsed()
      expect(result).toEqual({ isValid: true })
    })
    it('returns isValid: false interface is already used', () => {
      const wrapper = createWrapper(VrrpEdit, { props, global: { provide: { interfaces: () => goodFormData } } })
      wrapper.vm.formData = {
        vrrp: [
          {
            virtual_id: '1',
            id: 'test1',
            interface: 'wan'
          },
          {
            virtual_id: '2',
            id: 'test2',
            interface: 'lan'
          }
        ]
      }
      const result = wrapper.vm.isInterfaceUsed()
      expect(result).toEqual({ isValid: false, message: 'Instance with the same operating interface already exists' })
    })
  })
  describe('Computed tests', () => {
    it('updates service status value when ping_enabled changes', () => {
      const wrapper = createWrapper(VrrpEdit, { props, global: { provide: { interfaces: () => noFormData } } })
      const result = wrapper.vm.serviceStatus
      expect(wrapper.vm.section.ping_enabled).toEqual('1')
      expect(result).toEqual(true)
    })
    it('filters interfaces when there is an interface that passes filter', () => {
      const wrapper = createWrapper(VrrpEdit, { props, global: { provide: { interfaces: () => goodFormData } } })
      wrapper.vm.$store = storeData
      const result = wrapper.vm.interfaceList()
      expect(result).toEqual(['test'])
    })
    it('returns empty array when there are not matching proto options', () => {
      const wrapper = createWrapper(VrrpEdit, { props, global: { provide: { interfaces: () => noFormData } } })
      wrapper.vm.$store = storeData
      const result = wrapper.vm.interfaceList()
      expect(result).toEqual([])
    })
    it('returns empty array when there are no matching if names', () => {
      const form = {
        vrrp: [
          {
            virtual_id: '1',
            id: 'test1',
            interface: 'wan'
          },
          {
            virtual_id: '2',
            id: 'test2',
            interface: 'lan'
          }
        ]
      }
      const incorrectName = [
        {
          ifname: ['test'],
          proto: 'pppoe'
        }
      ]
      const wrapper = createWrapper(VrrpEdit, { props, global: { provide: { interfaces: () => incorrectName } } })
      wrapper.vm.$store = storeData
      wrapper.vm.formData = form
      const result = wrapper.vm.interfaceList()
      expect(result).toEqual([])
    })
    it('returns empty array when the only matching interface is with .name loopback', () => {
      const loopBackData = [
        {
          proto: 'pppoe',
          ifname: ['eth0'],
          id: 'loopback'
        }
      ]
      const wrapper = createWrapper(VrrpEdit, { props, global: { provide: { interfaces: () => loopBackData } } })
      wrapper.vm.$store = storeData
      const result = wrapper.vm.interfaceList()
      expect(result).toEqual([])
    })
  })
})
