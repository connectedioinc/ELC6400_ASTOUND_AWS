import createWrapper from '@tests/unit/mockFactory'
import DLNA from '../../src/views/services/DLNA.vue'

const statusData = {
  running: true,
  audio: 1,
  video: 2,
  images: 3
}

describe('DLNA.vue', () => {
  it.each`
    value                          | result
    ${{ mountpoint: '/mnt/asdf' }} | ${['/mnt/asdf', '/mnt']}
    ${{}}                          | ${['/mnt']}
    ${{ mountpoint: '' }}          | ${['/mnt']}
  `('returns mountpoints', async ({ value, result }) => {
    const wrapper = createWrapper(DLNA)
    wrapper.vm.loadedData = {
      mounts: [value]
    }
    expect(wrapper.vm.mediaOptions).toEqual(result)
  })
  it.each`
    ifacesData                                                                                              | result
    ${[{ ipaddrs: [], device: 'br-lan' }]}                                                                  | ${[{ ipaddrs: [], device: 'br-lan' }]}
    ${[{ ipaddrs: ['192.168.1.1/24'], device: 'br-lan' }]}                                                  | ${[{ ipaddrs: ['192.168.1.1/24'], device: 'br-lan' }]}
    ${[{ ipaddrs: [], device: 'br-lan' }, { ipaddrs: ['192.168.1.1/24'], device: 'eth1' }]}                 | ${[{ ipaddrs: [], device: 'br-lan' }, { ipaddrs: ['192.168.1.1/24'], device: 'eth1' }]}
    ${[{ ipaddrs: ['192.168.1.1/24'], device: 'br-lan' }, { ipaddrs: ['192.168.1.1/24'], device: 'eth1' }]} | ${[{ ipaddrs: ['192.168.1.1/24'], device: 'br-lan' }, { ipaddrs: ['192.168.1.1/24'], device: 'eth1' }]}
    ${[{ ipaddrs: [], device: 'br-lan' }, { ipaddrs: [], device: 'eth1' }]}                                 | ${[{ ipaddrs: [], device: 'br-lan' }, { ipaddrs: [], device: 'eth1' }]}
  `('tests ifaceOptions', async ({ ifacesData, result }) => {
    const wrapper = createWrapper(DLNA)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: { available_interfaces: ifacesData } },
      { success: true, data: [] }
    ])

    await wrapper.vm.loadData()
    expect(wrapper.vm.ifaces).toStrictEqual(result)
  })
  it.each([
    [
      0,
      [
        { success: true, data: [] },
        { success: true, data: [] }
      ]
    ],
    [
      2,
      [
        { success: false, data: [] },
        { success: false, data: [] }
      ]
    ]
  ])('error messages were called %s times when loading data', async (times, response) => {
    const wrapper = createWrapper(DLNA)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(response)
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledTimes(times)
  })
  it('invokes error message when bulk request is rejects', async () => {
    const wrapper = createWrapper(DLNA)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each`
    isRunning | message
    ${true}   | ${`The miniDLNA service is active, serving ${statusData.audio} audio, ${statusData.video} video and ${statusData.images} image files`}
    ${false}  | ${'The miniDLNA service is not running'}
  `('returns status message when DLNA running status is $isRunning', async ({ isRunning, message }) => {
    const wrapper = createWrapper(DLNA)
    wrapper.vm.$axios.get = vi.fn()
    const apiData = {
      success: true,
      data: statusData
    }
    apiData.data.running = isRunning
    wrapper.vm.$axios.get.mockResolvedValueOnce(apiData)
    await wrapper.vm.loadDLNAStatus()
    const result = await wrapper.vm.getDLNAStatus()
    expect(result).toEqual(message)
  })
  const err = {
    data: {
      errors: [
        {
          code: 103
        }
      ]
    }
  }
  const err1 = {
    data: {
      errors: [
        {
          code: 0
        }
      ]
    }
  }
  it.each`
    error   | message
    ${err}  | ${"Media directory doesn't exist"}
    ${err1} | ${'Unexpected error occurred'}
  `('displays error message when error code is $code', async ({ error, message }) => {
    const wrapper = createWrapper(DLNA)
    const result = wrapper.vm.handleError(error)
    expect(result).toEqual(message)
  })
  it('displays error message when fails to load DLNA status', async () => {
    const wrapper = createWrapper(DLNA)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadDLNAStatus()
    expect(spy).toHaveBeenCalledWith('Failed to get DLNA status')
  })
  it.each`
    title                       | value       | returnedValue
    ${'allows value'}           | ${'test'}   | ${{ isValid: true }}
    ${'displays error message'} | ${'/test/'} | ${{ isValid: false, message: "Character '/' is not allowed." }}
  `('validation $title', ({ value, returnedValue }) => {
    const wrapper = createWrapper(DLNA)
    const result = wrapper.vm.albumValidation(value)
    expect(result).toEqual(returnedValue)
  })
})
