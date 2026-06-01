import MobileDataLimit from '../../src/views/network/MobileDataLimitEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const props = {
  section: { id: 'wan1', enabled: '1', data_limit: 10 },
  interfaces: [{ id: 'wan1', enabled: '1' }],
  uciData: { dataLimit: [{ id: 'wan1', data_limit: 10 }] }
}
const provide = {
  formOptions: () => {
    return []
  }
}
describe('MobileDataLimitEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileDataLimit, { props, global: { provide } })
  })
  it.each([
    [1, 3, ['1', '2', '3']],
    [0, 0, ['0']]
  ])('returns number array [%s-%s]', (start, end, result) => {
    expect(wrapper.vm.numberOptions(start, end)).toEqual(result)
  })
  it('returns error message when clearData API call is not successful', async () => {
    wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.clearData()
    expect(spy).toHaveBeenCalledWith('Interface is currently inactive, only available if interface is active')
    spy.mockClear()
  })
  it('invokes success message when clearData API call is successful', async () => {
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.clearData()
    expect(spy).toHaveBeenCalledWith('Mobile data limit cleared successfully')
    spy.mockClear()
  })
  it.each([['undefined'], ['-1'], ['11']])('validates warning limit when limit is not valid', val => {
    expect(wrapper.vm.validateWarningLimit(val)).toEqual({
      isValid: false,
      message: 'Only positive integers are accepted. Value can not be higher than mobile data limit value.'
    })
  })
  it('validates warning limit when limit is valid', () => {
    expect(wrapper.vm.validateWarningLimit('5')).toEqual({
      isValid: true,
      message: 'Only positive integers are accepted. Value can not be higher than mobile data limit value.'
    })
  })
  it.each([
    [100, 50, '50'],
    [800, 80, '640']
  ])('returns calculated warning limit when data limit - %s and warning percentage - %s', async (limit, percentage, result) => {
    const data = { id: 'lan', data_limit: limit, warning_percentage: percentage, warning_limit: '' }
    await wrapper.setProps({ section: data })
    await wrapper.vm.calculateWarningLimit(data)
    expect(wrapper.vm.section.warning_limit).toEqual(result)
  })
  it.each([
    [100, 50, '50'],
    [800, 640, '80']
  ])('returns calculated warning percentage when data limit - %s and warning limit - %s', async (limit, warning, result) => {
    const data = { id: 'lan', data_limit: limit, warning_limit: warning, warning_percentage: '' }
    await wrapper.setProps({ section: data })
    await wrapper.vm.calculateWarningLimit(data, true)
    expect(wrapper.vm.section.warning_percentage).toEqual(result)
  })
  it('shows error message when SIM switch with data limit rule enabled', async () => {
    wrapper.vm.checkSimSwitchDataRule = vi.fn().mockReturnValueOnce({ isValid: false, message: 'Cannot disable because SIM switch rule enabled' })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const self = { model: '0' }
    await wrapper.vm.onLimitChange(self)
    expect(spy).toHaveBeenCalledWith('Cannot disable because SIM switch rule enabled')
    expect(self.model).toEqual('1')
  })
})
