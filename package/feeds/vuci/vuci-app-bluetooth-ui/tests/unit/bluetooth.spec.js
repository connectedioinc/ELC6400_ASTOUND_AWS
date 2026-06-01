import Bluetooth from '../../src/views/services/Bluetooth.vue'
import createWrapper from '@tests/unit/mockFactory'

const deviceData = {
  success: true,
  data: {
    devices: [
      {
        name: 'test',
        paired: '0'
      },
      {
        name: 'test2',
        paired: '0'
      },
      {
        paired: '0'
      }
    ]
  }
}

const avaiDevices = [
  {
    address: 'N/A',
    checked: false,
    idx: 0,
    name: 'test',
    paired: '0',
    rssi: 'N/A'
  },
  {
    address: 'N/A',
    checked: false,
    idx: 1,
    name: 'test2',
    paired: '0',
    rssi: 'N/A'
  },
  {
    address: 'N/A',
    checked: false,
    idx: 2,
    name: 'NAMELESS DEVICE',
    paired: '0',
    rssi: 'N/A'
  }
]

describe('Bluetooth.vue', () => {
  describe('Scanning tests', () => {
    it('Checks if scanning status check was stopped after it stopped scanning', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: { scanning: '0' } })
      wrapper.vm.loadAvailableDevices = vi.fn().mockResolvedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$timer, 'stop')
      await wrapper.vm.checkIfScanning()
      expect(spy).toHaveBeenCalledWith(wrapper.vm.checkIfScanning)
    })
    it('Checks if scanning status check is running', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: { scanning: '1' } })
      const spy = vi.spyOn(wrapper.vm.$timer, 'stop')
      await wrapper.vm.checkIfScanning()
      expect(spy).toHaveBeenCalledTimes(0)
    })
    it('Checks if scanning status check is running', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockRejectedValue()
      wrapper.vm.failedScanningIterations = 1
      await wrapper.vm.checkIfScanning()
      expect(wrapper.vm.failedScanningIterations).toEqual(2)
    })
    it('Checks if scanning status check is running', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockRejectedValue()
      wrapper.vm.failedScanningIterations = 6
      await wrapper.vm.checkIfScanning()
      expect(wrapper.vm.failedScanningIterations).toEqual(0)
    })
    it('Checks if it is scanning', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true, data: ['test'] })
      const spy = vi.spyOn(wrapper.vm.$timer, 'start')
      await wrapper.vm.startScan()
      expect(spy).toHaveBeenCalledWith(wrapper.vm.checkIfScanning)
    })
    it('Checks if scanning is stopped', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ success: false, data: ['test'] })
      const spy = vi.spyOn(wrapper.vm.$timer, 'stop')
      await wrapper.vm.startScan()
      expect(spy).toHaveBeenCalledWith(wrapper.vm.startScan)
    })
    it('Checks if scan starts', async () => {
      const wrapper = createWrapper(Bluetooth)
      const spy = vi.spyOn(wrapper.vm.$timer, 'start')
      await wrapper.vm.onScanClick()
      expect(spy).toHaveBeenCalledWith(wrapper.vm.startScan)
    })
    it('Checks if timer stops if response is error status 422', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce({ response: { data: { errors: [{ code: '2' }] } } })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.startScan()
      expect(spy).toHaveBeenCalledWith('Bluetooth service is offline, turn on bluetooth and try again.')
    })
  })
  describe('Unpairing tests', () => {
    it('Checks if section was deleted', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.loadPairedDevices = vi.fn()
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true, data: ['test'] })
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: [{ enabled: '1' }] })
      wrapper.vm.loadAvailableDevices = vi.fn().mockResolvedValueOnce()
      wrapper.vm.loadPairedDevices = vi.fn().mockResolvedValueOnce()
      const spy = vi.spyOn(wrapper.vm, 'loadAvailableDevices')
      await wrapper.vm.unpairDevices(['test'])
      expect(spy).toHaveBeenCalledTimes(1)
    })
    it('Checks if it doesnt run scan if section failed to delete', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.loadPairedDevices = vi.fn()
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: [{ enabled: '1' }] })
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce({ response: { errors: [] } })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.unpairDevices()
      expect(spy).toHaveBeenCalledWith('Failed to unpair devices')
    })
    it('Checks if it doesnt try to unpair when bluetooth is offline', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.loadPairedDevices = vi.fn()
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: [{ enabled: '0' }] })
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce({ response: { errors: [] } })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.unpairDevices()
      expect(spy).toHaveBeenCalledWith('Bluetooth service is offline. Turn on bluetooth to unpair a device.')
    })
    it('Checks if single unpair is working when there are elements to unpair', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.formData = { paired_devices: [{ checked: true, id: 'test' }] }
      wrapper.vm.unpairDevices = vi.fn()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.unpairCheckedDevices()
      expect(spy).toHaveBeenCalledTimes(0)
    })
    it('Checks if there are any paired devices', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.formData = { paired_devices: [{}] }
      wrapper.vm.unpairDevices = vi.fn()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.unpairAllDevices()
      expect(spy).toHaveBeenCalledTimes(0)
    })
    it('No selected elements to unpair test', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.formData = { paired_devices: [{ checked: false, id: 'test' }] }
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.unpairCheckedDevices()
      expect(spy).toHaveBeenCalledWith('Please select a device to unpair')
    })
    it('Unpair all test', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.formData = { paired_devices: [] }
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.unpairAllDevices()
      expect(spy).toHaveBeenCalledWith('There are no devices to unpair')
    })
  })
  describe('Device loading tests', () => {
    it('Checks if available devices are loaded', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.availableDevices = ['test']
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce(deviceData)
      await wrapper.vm.loadAvailableDevices()
      expect(wrapper.vm.availableDevices).toEqual(avaiDevices)
    })
    it('checks if error message is displayed when promise is rejected', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockRejectedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.loadAvailableDevices({ bluetooth: [{ enabled: '1' }] })
      expect(spy).toHaveBeenCalledWith('Failed to load available devices')
    })
    it('checks if scan is not executed when service is offline on first load', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockRejectedValueOnce({})
      await expect(wrapper.vm.loadAvailableDevices({ bluetooth: [{ enabled: '0' }] })).resolves.toEqual()
    })
    it('Checks if paired device request passes', async () => {
      const wrapper = createWrapper(Bluetooth)
      const val = { data: { enabled: 0 } }
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce(val)
      await wrapper.vm.loadPairedDevices()
      expect(wrapper.vm.formData.paired_devices).toEqual({ enabled: 0 })
    })
    it('Checks if data is cleaned', async () => {
      const wrapper = createWrapper(Bluetooth)
      const val = {
        data: [{ enabled: '0' }]
      }
      wrapper.vm.availableDevices = [{ test: 'test' }]
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce(val)
      await wrapper.vm.clearAvailableDevices()
      expect(wrapper.vm.availableDevices).toEqual([])
    })
    it('Checks if data isnt cleaned', async () => {
      const wrapper = createWrapper(Bluetooth)
      const val = {
        data: [{ enabled: '1' }]
      }
      wrapper.vm.availableDevices = [{ test: 'test' }]
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce(val)
      await wrapper.vm.clearAvailableDevices()
      expect(wrapper.vm.availableDevices).toEqual([{ test: 'test' }])
    })
    it('checks if device info is added to modal', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: { data: { test: 'test' } } })
      await wrapper.vm.getDeviceInfo({ '.name': 'test' })
      expect(wrapper.vm.showModal).toEqual(true)
    })
    it('checks if modal opens when data is string', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: { data: 'test' } })
      await wrapper.vm.getDeviceInfo({ '.name': 'test' })
      expect(wrapper.vm.showModal).toEqual(true)
    })
    it('checks if error message is correctly displayed', async () => {
      const wrapper = createWrapper(Bluetooth)
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockRejectedValueOnce({})
      await wrapper.vm.getDeviceInfo({ '.name': 'test' })
      expect(spy).toHaveBeenCalledWith('Failed to load device data')
    })
  })
  describe('Other tests', () => {
    it('Checks if modal close works', async () => {
      const wrapper = createWrapper(Bluetooth)
      await wrapper.vm.closeModal()
      expect(wrapper.vm.showModal).toEqual(false)
    })
  })
  describe('Device pairing tests', () => {
    it('No selected elements to pair test', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.selected = []
      const spyError = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.pairDevices()
      spyError.mockClear()
    })
    it('Checks if device paired successfuly message is called', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.availableDevices = [{ checked: true, address: 'test' }]
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.loadPairedDevices = vi.fn()
      wrapper.vm.loadAvailableDevices = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true, data: ['test'] })
      const spySuccess = vi.spyOn(wrapper.vm.$message, 'success')
      await wrapper.vm.pairDevices()
      expect(spySuccess).toHaveBeenCalledWith('Devices successfully paired')
    })
    it('Checks if error message is shown when device pairing fails', async () => {
      const wrapper = createWrapper(Bluetooth)
      wrapper.vm.availableDevices = [{ checked: true, address: 'test' }]
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.loadPairedDevices = vi.fn()
      wrapper.vm.loadAvailableDevices = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.pairDevices()
      expect(spy).toHaveBeenCalledWith('Wrong device address')
    })
  })
})
