import AccessControlSafety from '../../src/views/system/AccessControlSafety.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('AccessControlSafety.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(AccessControlSafety)
  })
  it('returns error message when fails to load login attempts data', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.onError()
    expect(spy).toHaveBeenCalledWith('Failed to load login attempts data')
  })
  it('displays show message when delete is clicked', async () => {
    const data = { id: 'test' }
    wrapper.vm.formData = { attempts: [data] }
    wrapper.vm.$refs.table.localDataSource = [{ id: 'test' }]
    wrapper.vm.$refs.table.loadLazyData = () => {}
    wrapper.vm.checkedSections = [data]
    wrapper.vm.$axios.delete = vi.fn()
    wrapper.vm.$axios.delete.mockResolvedValueOnce([{ success: true, data }])
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.onUnblockClick(data)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockClear()
  })
  it('returns attempt count with counter less than max attempt count ', async () => {
    wrapper.vm.form = { max_attempt_count: '10' }
    wrapper.vm.ready = true
    const res = await wrapper.vm.getStatusText({
      blocked_time: undefined,
      iteration_count: '1',
      counter: '1'
    })
    expect(res).toEqual('Attempt count 1 / 10')
  })
  it('returns blocked text for permanently blocked records', async () => {
    wrapper.vm.form = { max_attempt_count: '10' }
    wrapper.vm.ready = true
    const res = await wrapper.vm.getStatusText({
      blocked_time: '1702895472',
      iteration_count: '0',
      counter: '10'
    })
    expect(res).toEqual('Blocked permanently')
  })
  it('getRouterData is called', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([{ success: true, data: { localtime: 1702976322 } }, { success: true }])
    await wrapper.vm.getRouterData()
    expect(wrapper.vm.routerTime).toEqual(1702976322)
  })
  it.each`
    mockValue                  | responseData                                                     | errorMsg
    ${'mockResolvedValueOnce'} | ${[{ success: false, data: {} }, { success: true, data: [{}] }]} | ${"Failed to load device's time"}
    ${'mockResolvedValueOnce'} | ${[{ success: true, data: {} }, { success: false, data: [{}] }]} | ${'Failed to load security data'}
    ${'mockRejectedValueOnce'} | ${[]}                                                            | ${'An unexpected error occurred'}
  `('tests getRouterData', async ({ mockValue, responseData, errorMsg }) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet[mockValue](responseData)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getRouterData()
    expect(spy).toHaveBeenCalledWith(errorMsg)
  })
  it.each`
    response                     | blockedTime   | iterationCount
    ${'Unblocked in 10 minutes'} | ${1702895482} | ${1}
    ${'Unblocked in 30 minutes'} | ${1702895482} | ${2}
    ${'Unblocked in 60 minutes'} | ${1702895482} | ${3}
  `('shows correct time until unblocked', async ({ response, blockedTime, iterationCount }) => {
    wrapper.vm.routerTime = 1702895472
    wrapper.vm.ready = true
    const res = await wrapper.vm.getStatusText({
      blocked_time: blockedTime,
      iteration_count: iterationCount,
      counter: '10'
    })
    expect(res).toEqual(response)
  })
  it.each`
    response                             | blockedTime   | iterationCount
    ${'Unblocked in 5 minutes'}          | ${1702895192} | ${1}
    ${'Unblocked in 1 minute'}           | ${1702894942} | ${1}
    ${'Unblocked in less than a minute'} | ${1702894392} | ${1}
  `('shows correct text until unblocked', async ({ response, blockedTime, iterationCount }) => {
    wrapper.vm.routerTime = 1702895472
    wrapper.vm.ready = true
    const res = await wrapper.vm.getStatusText({
      blocked_time: blockedTime,
      iteration_count: iterationCount,
      counter: '10'
    })

    expect(res).toEqual(response)
  })
  it('call getRouterData on refresh', async () => {
    wrapper.vm.getRouterData = vi.fn()
    wrapper.vm.$refs.table.localDataSource = [{ id: 'test' }]
    wrapper.vm.$refs.table.loadLazyData = () => {}

    await wrapper.vm.refresh()
    expect(wrapper.vm.getRouterData).toHaveBeenCalledTimes(1)
  })
  it.each`
    port    | proto     | value
    ${'80'} | ${'HTTP'} | ${'80 (HTTP)'}
    ${'23'} | ${'SSH'}  | ${'23 (SSH)'}
  `('getPortProtocol displays correctly', ({ port, proto, value }) => {
    const res = wrapper.vm.getPortProtocol({ port, proto })
    expect(res).toEqual(value)
  })
  it.each`
    ip               | value
    ${'111.111.1.1'} | ${'111.111.1.1'}
    ${undefined}     | ${'-'}
  `('getSourceMAC displays correctly', ({ ip, value }) => {
    const res = wrapper.vm.getSourceMAC({ ip })
    expect(res).toEqual(value)
  })
})
