import Sqm from '../../src/views/services/Sqm.vue'
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

describe('Sqm.vue', () => {
  it('invoke error message', () => {
    const wrapper = createWrapper(Sqm)
    const result = wrapper.vm.handleErrors({ payload: [{ errors: [{ section: 'test' }] }] })
    expect(result).toEqual("Saving failed: SQM instance 'test' cannot be enabled due to invalid configuration")
  })
  it('invoke multiple error message', () => {
    const wrapper = createWrapper(Sqm)
    const result = wrapper.vm.handleErrors({ payload: [{ errors: [{ section: 'test' }] }, { errors: [{ section: 'test2' }] }] })
    expect(result).toEqual("Saving failed: SQM instances: 'test, test2' cannot be enabled due to invalid configuration")
  })
  it.each([
    { success: false, result: [] },
    { success: true, result: ['test'] }
  ])('should execute function on load #%#', async ({ success, result }) => {
    const wrapper = createWrapper(Sqm)
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      {
        success,
        data: result
      },
      {
        success,
        data: {
          cake: result,
          fq_codel: result
        }
      },
      {
        success,
        data: result
      },
      {
        success,
        data: result
      },
      {
        success,
        data: result
      },
      {
        success,
        data: result
      },
      {
        success,
        data: result
      }
    ])
    await wrapper.vm.loadData({ sqm: [{ id: '100' }] })
    expect(wrapper.vm.deviceData).toEqual(result)
    expect(wrapper.vm.wirelessData).toEqual(result)
    expect(wrapper.vm.interfacesConfig).toEqual(result)
    expect(wrapper.vm.interfaceStatus).toEqual(result)
    expect(wrapper.vm.fqCodel).toEqual(result)
    expect(wrapper.vm.cake).toEqual(result)
    expect(wrapper.vm.ipv4Hints).toEqual(result)
  })
})
