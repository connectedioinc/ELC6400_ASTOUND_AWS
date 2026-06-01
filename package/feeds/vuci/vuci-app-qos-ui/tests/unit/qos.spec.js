import Qos from '../../src/views/services/Qos.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn()
    })
  }
})

const interfaceData = [
  {
    '.type': 'interface',
    id: 'loopback'
  },
  {
    '.type': 'interface',
    id: 'testname2',
    proto: 'testProto'
  },
  {
    '.type': 'interface',
    id: 'lan',
    proto: 'static'
  },
  {
    '.type': 'interface',
    id: 'mobis',
    proto: 'wwan'
  },
  {
    '.type': 'interface',
    id: 'mobis2',
    proto: 'connm'
  }
]
describe('Qos.vue', () => {
  it('should get interface options', async () => {
    const wrapper = createWrapper(Qos)
    wrapper.vm.interfaceData = interfaceData
    const interfaceOptions = await wrapper.vm.interfaceOptions
    expect(interfaceOptions).toEqual(['lan', 'mobis', 'mobis2'])
  })
  it.each([
    { success: false, result: [] },
    { success: true, result: ['test'] }
  ])('should execute function on load', async ({ success, result }) => {
    const wrapper = createWrapper(Qos)
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      {
        success,
        data: result
      },
      {
        success,
        data: {
          ips: result,
          classes: result
        }
      },
      {
        success,
        data: { flow_offloading: result[0] }
      }
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.interfaceData).toEqual(result)
    expect(wrapper.vm.hostData).toEqual(result)
    expect(wrapper.vm.targetOptions).toEqual(result)
    expect(wrapper.vm.offloadingConfig).toEqual({ flow_offloading: result[0] })
  })
  it('should display error message then load data fails ', async () => {
    const wrapper = createWrapper(Qos)
    vi.spyOn(axios, 'bulkGet').mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalled()
  })
  it.each([
    { hostData: [], result: [['', 'All']] },
    { hostData: ['test'], result: [['', 'All'], 'test'] }
  ])('should get host options', async ({ hostData, result }) => {
    const wrapper = createWrapper(Qos)
    wrapper.vm.hostData = hostData
    const hostOptions = await wrapper.vm.hostOptions
    expect(hostOptions).toEqual(result)
  })
  it.each`
    data              | result
    ${'90'}           | ${true}
    ${'90,105'}       | ${true}
    ${'90,69999,105'} | ${false}
    ${'not a port'}   | ${false}
    ${'90,'}          | ${false}
  `('should return $result when $data is used as a port', ({ data, result }) => {
    const wrapper = createWrapper(Qos)
    expect(wrapper.vm.validatePorts(data).isValid).toEqual(result)
  })
})
