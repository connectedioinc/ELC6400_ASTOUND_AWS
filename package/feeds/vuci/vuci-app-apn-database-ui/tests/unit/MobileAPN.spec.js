import MobileAPN from '../../src/views/network/MobileAPN.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('MobileAPN.vue', () => {
  it.each([
    ['0', 'None'],
    ['1', 'PAP'],
    ['2', 'CHAP'],
    ['3', '']
  ])('returns auth type when %s', (data, res) => {
    const wrapper = createWrapper(MobileAPN)
    const result = wrapper.vm.getReadableAuthType(data)
    expect(result).toEqual(res)
  })
  it.each([
    ['0', 'IPv4/IPv6'],
    ['1', 'IPv4'],
    ['2', 'IPv6'],
    ['3', '']
  ])('returns pdp type when %s', (data, res) => {
    const wrapper = createWrapper(MobileAPN)
    const result = wrapper.vm.getReadablePdpType(data)
    expect(result).toEqual(res)
  })
  it.each([
    [{ mcc: '246', country: 'Lithuania' }, '246 (Lithuania)'],
    [{ mcc: '247', country: 'Latvia' }, '247 (Latvia)'],
    [{ mcc: '248', country: 'Estonia' }, '248 (Estonia)']
  ])('returns MCC with country when %s', (data, res) => {
    const wrapper = createWrapper(MobileAPN)
    const result = wrapper.vm.getReadableMcc(data.mcc, data)
    expect(result).toEqual(res)
  })
  it('check if afterLoad returns error when request throws error', async () => {
    const wrapper = createWrapper(MobileAPN)
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('check if afterLoad returns error when all endpoints are unsuccessful', async () => {
    const wrapper = createWrapper(MobileAPN)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load country list')
    expect(spy).toHaveBeenCalledWith('Failed to load APN data')
  })
})
