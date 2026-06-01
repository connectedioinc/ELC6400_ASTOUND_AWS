import TCPdump from '../../src/views/system/TCPdump.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { utils } from '@/plugins/utils'

describe('TCPdump', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TCPdump)
  })
  it.each`
    errorCode | error
    ${1}      | ${'TCP dump is not enabled'}
    ${2}      | ${'No TCP dump file location specified'}
    ${1000}   | ${'Failed to generate TCP dump file'}
  `('returns "$error" when errorCode: $errorCode', ({ errorCode, error }) => {
    const result = wrapper.vm.parseTcpDumpError(errorCode)
    expect(result).toBe(error)
  })
  it("doesn't show error when request doesn't throw error for TCP dump", async () => {
    vi.spyOn(utils, 'downloadFileApi').mockResolvedValue({ data: { success: true } })
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.downloadTcpDump()
    expect(spy).not.toHaveBeenCalled()
  })
  it('shows common error when request throws simple error', async () => {
    vi.spyOn(utils, 'downloadFileApi').mockRejectedValue({ response: { data: { success: false } } })
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.downloadTcpDump()
    expect(spy).toHaveBeenCalledWith('Failed to generate file')
  })
  it('shows concrete error when request throws error with error code', async () => {
    vi.spyOn(utils, 'downloadFileApi').mockRejectedValue({
      response: {
        data: {
          success: false,
          errors: [{ code: 1000 }]
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.downloadTcpDump()
    expect(spy).toHaveBeenCalledWith('Failed to generate TCP dump file')
  })
  it('shows error when request throws error', async () => {
    vi.spyOn(axios, 'bulkGet').mockRejectedValue({ response: { data: { success: false } } })
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.getStatus()
    expect(spy).toHaveBeenCalled()
  })
  it("doesn't show error when request doesn't throw error for getStatus", async () => {
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] }
    ])
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.getStatus()
    expect(spy).not.toHaveBeenCalled()
  })
  it('shows errors when bulk requests are unsuccessful', async () => {
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      { success: false, data: { errors: [{ message: 'Error 1' }] } },
      { success: false, data: { errors: [{ message: 'Error 2' }] } },
      { success: false, data: { errors: [{ message: 'Error 3' }] } },
      { success: false, data: { errors: [{ message: 'Error 4' }] } }
    ])
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.getStatus()
    expect(spy).toHaveBeenCalledTimes(4)
  })
  it("loads data when request doesn't throw error tested on one request", async () => {
    const data = [
      {
        rx_bytes: 18093702,
        ifname: 'wlan1',
        tx_bytes: 7684471
      }
    ]
    vi.spyOn(axios, 'bulkGet').mockResolvedValue([
      { success: true, data },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] }
    ])
    await wrapper.vm.getStatus()
    expect(wrapper.vm.interfaces).toEqual(data)
  })
  it('returns mount options', () => {
    wrapper.vm.mounts = [
      {
        blocks: '',
        mountpoint: '/mnt/sda1',
        fs: '/dev/sda1',
        used: '64.9M',
        in_use: '-',
        percent: '0%',
        available: '14.3G'
      }
    ]
    const expectedResult = [
      ['/tmp', 'RAM memory'],
      ['/mnt/sda1', '/mnt/sda1']
    ]
    const result = wrapper.vm.mountOptions
    expect(result).toEqual(expectedResult)
  })
  it('returns any interface', () => {
    wrapper.vm.interfaces = [
      {
        device: 'eth1',
        interface: 'wan',
        name: 'wan',
        subdevices: []
      },
      {
        interface: 'wan6',
        name: 'wan6',
        device: 'eth1',
        subdevices: []
      }
    ]
    const interfaceOptions = wrapper.vm.interfaceOptions
    expect(interfaceOptions).toEqual([
      ['any', 'All'],
      ['eth1', 'eth1 (wan, wan6)']
    ])
  })
})
