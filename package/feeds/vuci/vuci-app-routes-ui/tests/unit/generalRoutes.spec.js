import GeneralRoutes from '../../src/views/status/GeneralRoutes.vue'
import createWrapper from '@tests/unit/mockFactory'

const incorrectData = [{ test: 'test' }]
const badNeghborData = [{ dest: '-', dev: '-', mac: '-' }]
const badRoute6Data = [{ dest: '-', dev: '-', gw: '::', metric: '0', table: '-' }]
const badRouteData = [{ dest: '-', dev: '-', gw: '*', metric: '0', table: '-' }]
const badArpData = [{ dest: '-', dev: '-', mac: '-' }]
const data = [{ dest: 'test', mac: 'test', dev: 'test', table: 'test', metric: 'test', gateway: 'test' }]
const expectedNeghborData = [{ dest: 'test', mac: 'test', dev: 'test' }]
const expectedRoute6Data = [{ dest: 'test', gw: 'test', dev: 'test', table: 'test', metric: 'test' }]
const expectedRouteData = [{ dest: 'test', gw: 'test', dev: 'test', table: 'test', metric: 'test' }]
const expectedArpData = [{ dest: 'test', mac: 'test', dev: 'test' }]
describe('General route status tests', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(GeneralRoutes)
    wrapper.vm.interfaceStatus = []
  })
  it.each([
    ['reponse is successful', [{ success: true }, { success: true }, { success: true }, { success: true }, { success: true }], 0],
    ['response is unsuccessful', [{ success: false }, { success: false }, { success: false }, { success: false }, { success: false }], 5]
  ])('calls error function when %s', async (text, data, times) => {
    wrapper.vm.showError = vi.fn()
    wrapper.vm.showError.mockReturnValue([])
    const spy = vi.spyOn(wrapper.vm, 'showError')
    wrapper.vm.parseArpData = vi.fn()
    wrapper.vm.parseRoutes6Data = vi.fn()
    wrapper.vm.parseRoutes6NeighboursData = vi.fn()
    wrapper.vm.parseRoutesData = vi.fn()
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(data)
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledTimes(times)
  })
  it('invokes error message when bulk fails', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Unexpected error')
  })
  it.each([
    [data, expectedNeghborData],
    [incorrectData, badNeghborData]
  ])('returns route6 neighbor data', (data, response) => {
    const value = wrapper.vm.parseRoutes6NeighboursData(data)
    expect(value).toEqual(response)
  })
  it.each([
    [data, expectedRoute6Data],
    [incorrectData, badRoute6Data]
  ])('returns route6 data', (data, response) => {
    const value = wrapper.vm.parseRoutes6Data(data)
    expect(value).toEqual(response)
  })
  it.each([
    [data, expectedRouteData],
    [incorrectData, badRouteData]
  ])('returns route data', (data, response) => {
    const value = wrapper.vm.parseRoutesData(data)
    expect(value).toEqual(response)
  })
  it.each([
    [data, expectedArpData],
    [incorrectData, badArpData]
  ])('returns arp data', (data, response) => {
    const value = wrapper.vm.parseArpData(data)
    expect(value).toEqual(response)
  })
  it('invokes error message', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.showError('test')
    expect(spy).toHaveBeenCalledWith('Failed to load test data')
  })
})
