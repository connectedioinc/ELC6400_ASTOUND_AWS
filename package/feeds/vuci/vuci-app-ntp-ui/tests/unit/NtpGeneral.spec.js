import createWrapper from '@tests/unit/mockFactory'
import NtpGeneral from '../../src/views/services/NtpGeneral'
import NtpSection from '@/components/services/NtpSection.vue'

const NtpSectionsData = [
  {
    id: 'cfg0001e',
    '.type': 'ntpclient',
    zoneName: 'Europe/Vilnius',
    current_system_time: 10
  },
  {
    id: 'cfg0000e',
    '.type': 'ntpserver'
  }
]
describe('NtpGeneral.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(NtpGeneral, {
      global: {
        stubs: {
          'vuci-form-item-switch': { template: '<div />' },
          'vuci-form-item-select': { template: '<div />' },
          'ntp-section': { template: '<div />' }
        }
      }
    })
  })
  it.each([
    [{}, 0],
    [{ messages: [{ code: 2 }] }, 1]
  ])('display message after save', async (res, timesCalled) => {
    const spy = vi.spyOn(wrapper.vm.$message, 'info')
    await wrapper.vm.afterSave('', res)
    expect(spy).toHaveBeenCalledTimes(timesCalled)
    spy.mockClear()
  })
  it('load information about timezones', async () => {
    const timezone = 'test'
    const response = { data: { timezones: [timezone] } }
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([response, {}])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.timeZones).toEqual([timezone])
  })
  it('load information about timezones and includes new timezone to list', async () => {
    const response = { data: { timezones: ['test'] } }
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([response, {}])
    wrapper.vm.formData = { ntpclient: [{ zoneName: 'test2' }] }
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.timeZones).toEqual(['test', 'test2'])
  })
  it('fails to load information about ntp and display error message', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalled()
    spy.mockClear()
  })
})

describe('NtpSection.vue', () => {
  let wrapper
  beforeEach(() => {
    const mocks = {
      $session: {
        sid: vi.fn().mockReturnThis('')
      }
    }
    wrapper = createWrapper(NtpSection, {
      stubs: {
        'vuci-form-item-dummy': { template: '<div />' },
        'vuci-form-item-button': { template: '<div />' },
        'vuci-form-item-select': { template: '<div />' }
      },
      global: { mocks },
      propsData: {
        title: '',
        uciData: {
          ntpclient: [{ id: 'general' }]
        },
        timeZones: [],
        afterSave: vi.fn()
      }
    })
  })
  it('sync time with browsers fail test', async () => {
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({
      data: ['timezone1', 'timezone2']
    })
    wrapper.vm.$axios.put = vi.fn().mockResolvedValueOnce({ data: { zoneName: 'Europe/Vilnius', current_system_time: 10 } })
    await wrapper.vm.syncTime(NtpSectionsData[0])
    expect(wrapper.vm.time).toEqual('1970-01-01 00:00:10')
    expect(wrapper.vm.isButtonDisabled).toBe(false)
  })
  it('display error message then sync time fails', async () => {
    wrapper.vm.$axios.put = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.syncTime(NtpSectionsData[0])
    expect(spy).toHaveBeenCalled()
    spy.mockClear()
  })
  it('display error message then router time loading fails', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadRouterTime()
    expect(spy).toHaveBeenCalled()
    spy.mockClear()
  })
  it('checks returned data when API call is successful', async () => {
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ data: { zoneName: 'UTC', current_system_time: '1111' } })
    await wrapper.vm.loadRouterTime()
    expect(wrapper.vm.isButtonDisabled).toEqual(false)
  })
  it('commits timezone to store after save', () => {
    const data = { data: { zoneName: 'test' } }
    wrapper.vm._afterSave(undefined, data)
    expect(wrapper.vm.$store.setTimeZone).toHaveBeenCalledWith('test')
    expect(wrapper.vm.afterSave).toHaveBeenCalled()
  })
})
