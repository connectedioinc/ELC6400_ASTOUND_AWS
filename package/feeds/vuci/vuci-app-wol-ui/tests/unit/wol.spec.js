import Wol from '../../src/views/services/Wol.vue'
import createWrapper from '@tests/unit/mockFactory'
const wolData = [
  {
    id: 'test1',
    name: 'example',
    mac: '11:22:33:44:55:66',
    password: '',
    wakeonboot: 0
  },
  {
    id: 'test2',
    name: 'device',
    mac: 'AA:BB:CC:DD:EE:FF'
  },
  {
    id: 'test3'
  }
]
const putRes = {
  success: true,
  data: wolData[0]
}
describe('Wol.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = wrapper = createWrapper(Wol)
  })
  it('invokes error message if name or mac not provided', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.wakeSingleDevice({ name: 'device' })
    expect(spy).toHaveBeenCalledWith('No target or MAC address specified')
  })
  it('invokes success message after all devices wake succeed', async () => {
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.wakeAllDevices()
    expect(spy).toHaveBeenCalledWith('Wol packet sent')
  })
  it('invokes error message after all devices wake fails', async () => {
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.wakeAllDevices()
    expect(spy).toHaveBeenCalledWith('Wol packet sending failed')
  })
  it('invokes success message after single device wake succeed', async () => {
    wrapper.vm.$axios.put = vi.fn()
    wrapper.vm.$axios.put.mockResolvedValueOnce(putRes)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.wakeSingleDevice(wolData[0])
    expect(spy).toHaveBeenCalledWith('Wol packet sent')
  })
  it('invokes error message after single Wol device update fails', async () => {
    wrapper.vm.$axios.put = vi.fn()
    wrapper.vm.$axios.put.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.wakeSingleDevice(wolData[0])
    expect(spy).toHaveBeenCalledWith('Failed to update Wol device configuration')
  })
  it('invokes error message after single Wol device wake fails', async () => {
    wrapper.vm.$axios.put = vi.fn()
    wrapper.vm.$axios.put.mockResolvedValueOnce(putRes)
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.wakeSingleDevice(wolData[0])
    expect(spy).toHaveBeenCalledWith('Wol packet sending failed')
  })
  it.each`
    currentInterval                 | otherInterval                   | expected
    ${{ mac: '11:22:33:44:55:66' }} | ${{ mac: '11:22:33:44:55:67' }} | ${false}
    ${{ mac: '11:22:33:44:55:66' }} | ${{ mac: '11:22:33:44:55:66' }} | ${true}
  `('returns $expected when one interval: $currentInterval, other interval: $otherInterval"', ({ currentInterval, otherInterval, expected }) => {
    const result = wrapper.vm.fieldsOverlap(currentInterval, otherInterval)
    expect(result).toBe(expected)
  })
  it.each`
    rowCount | failOnRows               | expectValid | expectMessage
    ${0}     | ${[{}]}                  | ${true}     | ${''}
    ${3}     | ${[{}]}                  | ${true}     | ${''}
    ${3}     | ${['11:22:33:44:55:60']} | ${false}    | ${'Configuration with MAC 11:22:33:44:55:60 already exists'}
  `('returns {isValid: $expectValid, message: "$expectMessage"} when fails on rows: $failOnRows', ({ rowCount, failOnRows, expectValid, expectMessage }) => {
    const rows = Array.from(Array(rowCount), (_, i) => ({ mac: `11:22:33:44:55:6${i}` }))
    wrapper.vm.fieldsOverlap = vi.fn((_, otherIntervalText) => {
      return failOnRows.includes(otherIntervalText.mac)
    })
    wrapper.vm.findOtherRows = vi.fn()
    wrapper.vm.findOtherRows.mockReturnValue(rows)
    const currentRow = { mac: '11:22:33:44:55:60' }
    const result = wrapper.vm.noDublicateValidate(undefined, { uciSection: currentRow, vuciForm: { uciData: { target: rows } } })
    expect(result.isValid).toBe(expectValid)
    expect(result.message).toEqual(expectMessage)
  })
  it('checks if uniqueName validates duplicate section name', async () => {
    const nameCheck = wrapper.vm.uniqueName(undefined, {
      model: 'test',
      vuciForm: {
        uciData: {
          target: [
            { id: '1', name: 'test' },
            { id: '2', name: 'something' }
          ]
        }
      }
    })
    expect(nameCheck.isValid).toEqual(false)
    expect(nameCheck.message).toEqual('Configuration with name "test" already exists')
  })
  it('checks if uniqueName passes validation with unique name', async () => {
    const nameCheck = wrapper.vm.uniqueName(undefined, {
      model: 'new',
      vuciForm: {
        uciData: {
          target: [
            { id: '1', name: 'test' },
            { id: '2', name: 'something' }
          ]
        }
      }
    })
    expect(nameCheck.isValid).toEqual(true)
    expect(nameCheck.message).toEqual('')
  })
  it('check if validate method call form validate', async () => {
    const self = { vuciForm: { validate: () => {} } }
    const spy = vi.spyOn(self.vuciForm, 'validate')
    await wrapper.vm.validate(self)
    await wrapper.vm.$nextTick()
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('loads loadInterfaces', async () => {
    const data = { interfaces: [{ id: 'lan' }] }
    wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ data })
    await wrapper.vm.loadInterfaces()
    expect(wrapper.vm.interfaces).toEqual(data.interfaces)
  })
  it('fails loadInterfaces', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadInterfaces()
    expect(spy).toBeCalled()
    expect(spy).toBeCalledWith('Failed to load interfaces data')
  })
})
