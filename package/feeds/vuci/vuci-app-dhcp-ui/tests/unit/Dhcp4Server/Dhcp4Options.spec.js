import view from '../../../src/views/network/Dhcp4Server/Dhcp4Options.vue'
import createWrapper from '@tests/unit/mockFactory'
import { vi } from 'vitest'

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

describe('Dhcp4Options.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      props: {
        section: {},
        modelValue: true
      },
      global: {
        provide: { modalNavigation: () => [], setSection: () => {} }
      }
    }
    wrapper = createWrapper(view, wrapperOptions)
  })
  it.each`
    dhcpOptions      | currentData
    ${['6,1.1.1.1']} | ${[{ id: expect.any(Number), ignore: false, key: '6', value: '1.1.1.1' }]}
    ${undefined}     | ${[]}
  `('loads modal data after modal turn on #%#', async ({ dhcpOptions, currentData }) => {
    await wrapper.setProps({ section: { dhcp_option: dhcpOptions }, modelValue: false })
    await wrapper.setProps({ modelValue: true })
    expect(wrapper.vm.currentData).toEqual(currentData)
  })
  it.each`
    record                                       | res
    ${{ id: 3, key: '6', value: '10.10.10.10' }} | ${{ isValid: true }}
    ${{ id: 3, key: '3', value: '1.1.1.1' }}     | ${{ isValid: true }}
  `('validates duplicate values #%#', ({ record, res }) => {
    const dhcpOptions = [[{ id: 1, key: '6', value: '1.1.1.1' }], [{ id: 2, key: '6', value: '8.8.8.8' }]]
    wrapper.vm.currentData = dhcpOptions
    const result = wrapper.vm.validateDuplicate(record)
    expect(result).toEqual(res)
  })
  it('parses config', () => {
    const dhcpOptions = ['6,1.1.1.1,8.8.8.8', '2,-100', '42,198.168.1.100', '100']
    const expectedResult = [
      { id: 0, key: '6', value: '1.1.1.1', ignore: false },
      { id: 1, key: '6', value: '8.8.8.8', ignore: false },
      { id: 2, key: '2', value: '-100', ignore: false },
      { id: 3, key: '42', value: '198.168.1.100', ignore: false },
      { id: 4, key: '100', ignore: true }
    ]
    expect(wrapper.vm.parseConfig(dhcpOptions)).toEqual(expectedResult)
  })
  it('adds new option', () => {
    wrapper.vm.currentData = [{ id: 0, key: '42', value: '198.168.1.100', ignore: false }]
    wrapper.vm.add()
    expect(wrapper.vm.currentData).toEqual([
      { id: 0, key: '42', value: '198.168.1.100', ignore: false },
      { id: 1, key: '2', ignore: false }
    ])
  })
  it('deletes option', () => {
    wrapper.vm.currentData = [{ id: 20 }, { id: 30 }, { id: 40 }]
    wrapper.vm.delSection(30)
    expect(wrapper.vm.currentData).toEqual([{ id: 20 }, { id: 40 }])
  })
  it('parses config back', () => {
    const dhcpOptionData = [
      { id: 0, key: '6', value: '1.1.1.1' },
      { id: 0, key: '6', value: '8.8.8.8' },
      { id: 0, key: '2', value: '-100' },
      { id: 0, key: '42', value: '198.168.1.100' }
    ]
    const expectedResult = ['2,-100', '6,1.1.1.1,8.8.8.8', '42,198.168.1.100']
    expect(wrapper.vm.parseConfigBack(dhcpOptionData)).toEqual(expectedResult)
  })
  it('saves data', async () => {
    const dhcpOptionData = [{ id: 0, key: '6', value: '1.1.1.1' }]
    wrapper.vm.currentData = dhcpOptionData
    await wrapper.vm.save()
    expect(wrapper.vm.model).toEqual(false)
  })
  it('shows back prompt', () => {
    wrapper.vm.prompt = {
      show: vi.fn(({ onOk }) => {
        onOk()
        expect(wrapper.vm.model).toEqual(false)
      })
    }
    wrapper.vm.back()
  })
})
