import createWrapper from '@tests/unit/mockFactory'
import Ntp from '../../src/views/services/Ntp'

describe('Ntp.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Ntp)
  })
  it('finds ntpclient section in ntp sections', () => {
    const NtpSectionsData = [
      {
        id: 'cfg0000e',
        '.type': 'ntpserver'
      },
      {
        id: 'cfg0001e',
        '.type': 'ntpclient'
      }
    ]
    const section = wrapper.vm.findNamedSection(NtpSectionsData)
    expect(section).toEqual({
      id: 'cfg0001e',
      '.type': 'ntpclient'
    })
  })
  it('displays error when bulk fails', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce({})
    await wrapper.vm.loadData({})
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('loads data successfully', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: [{ name: 'Internal modem' }] },
      { success: true, data: { enabled: '1' } }
    ])
    await wrapper.vm.loadData({})
    const result = wrapper.vm.modemList
    const result1 = wrapper.vm.ntpdEnabled
    expect(result).toEqual([{ name: 'Internal modem' }])
    expect(result1).toEqual(true)
  })
  it('displays error messages when modem and ntpd data load fails', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([{ success: false }, { success: false, errors: [{ code: 113 }] }])
    await wrapper.vm.loadData({})
    expect(spy).toHaveBeenCalledWith('Failed to load modem data')
    expect(spy).toHaveBeenCalledWith('Failed to load NTPD data')
  })
  it.each`
    code   | res
    ${1}   | ${'Failed to edit configuration'}
    ${103} | ${'NTP client requires at least one "Time servers" instance added or "Operator station synchronization" enabled'}
  `('returns error message when code is $code', async ({ code, res }) => {
    const result = wrapper.vm.returnEditErrorMessage({ data: { errors: [{ code }] } })
    expect(result).toEqual(res)
  })
  it.each`
    code   | res
    ${1}   | ${'Failed to edit configuration'}
    ${103} | ${'NTP client requires at least one "Time servers" instance added or "Operator station synchronization" enabled'}
  `('returns error message when code is $code', async ({ code, res }) => {
    const result = wrapper.vm.returnDeleteErrorMessage({ data: { errors: [{ code }] } })
    expect(result).toEqual(res)
  })
  it.each`
    title             | length | result
    ${'passes'}       | ${1}   | ${{ valid: true, message: 'Cannot create more instances. Only 4 instances are allowed' }}
    ${'throws error'} | ${4}   | ${{ valid: false, message: 'Cannot create more instances. Only 4 instances are allowed' }}
  `('tests if validation $title', ({ length, result }) => {
    const dataSource = Array.from({ length }, (_, index) => ({ id: 'test' + index }))
    expect(wrapper.vm.onAdd('', dataSource)).toEqual(result)
  })
})
