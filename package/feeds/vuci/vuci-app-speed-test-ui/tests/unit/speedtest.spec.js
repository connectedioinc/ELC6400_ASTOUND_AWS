import SpeedTest from '../../src/views/services/SpeedTest.vue'
import createWrapper from '@tests/unit/mockFactory'
describe('SpeedTest.vue', () => {
  const reject = {
    response: {
      data: {
        errors: {
          data: {
            status: 107
          }
        }
      }
    }
  }
  const apiData = {
    success: true,
    data: [
      { test: 'test', host: 'test', name: 'new' },
      { test: 'test', host: 'test', name: 'new' }
    ]
  }
  const responseData = {
    success: true,
    data: { state: 'FINISHED' }
  }
  const responseData2 = {
    success: true,
    data: { state: 'ERROR', error: 'test' }
  }
  const responseData3 = {
    success: true,
    data: { state: 'COOLDOWN' }
  }
  const responseData4 = {
    success: true,
    data: { state: 'TESTING_DOWNLOAD', avgDownloadSpeed: 50000, serverURL: 'test' }
  }
  const ipData = {
    success: true,
    data: { response: 'test13' }
  }
  document.getElementById = () => ({
    getContext: () => ({})
  })
  it('Checks if server list is loaded correctly', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([apiData])
    await wrapper.vm.loadData()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.servers).toEqual(apiData.data)
  })
  it('Checks if servers is empty array when promise is rejected', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce(reject)
    await wrapper.vm.loadData()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.servers).toEqual([])
  })
  it('Checks if servers is empty array when promise is rejected (after refresh)', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce(reject)
    await wrapper.vm.refreshServerList()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.servers).toEqual([])
  })
  it('Checks servers array when promise is resolve (after refresh)', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.$axios.post = vi.fn()
    const res = ['test', 'test2']
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true, data: res })
    await wrapper.vm.refreshServerList()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.servers).toEqual(res)
  })
  it('Checks if button is disabled when test is over', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.draw = vi.fn().mockResolvedValueOnce()
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(responseData)
    await wrapper.vm.loadResults()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.isDisabledButton).toEqual(false)
  })
  it('Checks if target is 0 when it is on cooldown', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.draw = vi.fn().mockResolvedValueOnce()
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(responseData3)
    await wrapper.vm.loadResults()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.target).toEqual(0)
  })
  it('Checks if error is displayed', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.draw = vi.fn().mockResolvedValueOnce()
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(responseData2)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadResults()
    expect(mockMethod).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith('test')
  })
  it('Checks if final upload speed is asigned', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.draw = vi.fn().mockResolvedValueOnce()
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce(responseData4)
    wrapper.vm.targetIP = 'test'
    await wrapper.vm.loadResults()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.target).toEqual(0.4)
  })
  it('Checks if ip is loaded correctly', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce(ipData)
    await wrapper.vm.loadIP()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.targetIP).toEqual('test13')
  })
  it('Checks if load ip request is rejected correctly', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce(reject)
    await wrapper.vm.loadIP()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.targetIP).toEqual('')
  })
  it('Checks if load ip prompt is being opened', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.startSpeedTest()
    expect(mockMethod).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('Checks if load results timer starts', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true })
    const spy = vi.spyOn(wrapper.vm.$timer, 'start')
    await wrapper.vm.onOk()
    expect(mockMethod).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith('loadResults')
  })
  it('Checks if modal is open', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest)
    await wrapper.vm.openModal()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.modalOpen).toEqual(true)
    expect(wrapper.vm.isDisabledButton).toEqual(true)
  })
  it('Checks if modal is closed', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest, { data: () => ({ modalOpen: true }) })
    wrapper.vm.$refs.serversModal.closeModal = vi.fn()
    await wrapper.vm.closeModal()
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.modalOpen).toEqual(false)
    expect(wrapper.vm.isDisabledButton).toEqual(false)
  })
  it('Checks if getSelected returns needed data', async () => {
    const mockMethod = vi.spyOn(SpeedTest.methods, 'draw').mockResolvedValueOnce()
    const wrapper = createWrapper(SpeedTest, { data: () => ({ modalOpen: true }) })
    wrapper.vm.$refs.serversModal.closeModal = vi.fn()
    wrapper.vm.currentData = {
      url: '192.168.1.1',
      name: 'lan'
    }
    wrapper.vm.closeModal = vi.fn()
    wrapper.vm.loadIP = vi.fn().mockResolvedValueOnce()
    await wrapper.vm.getSelected('2022')
    expect(mockMethod).toHaveBeenCalled()
    expect(wrapper.vm.isDisabledButton).toEqual(false)
  })
})
