import RMS from '@/components/services/RMS.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('RMS.vue', () => {
  let mockedRmsData
  beforeEach(() => {
    mockedRmsData = {
      lan_mac: '00:1E:42:4A:C5:40',
      error_code: '0',
      next_try: '0',
      error_text: '',
      status: '1',
      connection_state: '0',
      error: '0',
      serial_nbr: '1119102319'
    }
  })
  describe('getStatus()', () => {
    it('shows error on load when api call throws error', async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.getStatus()
      expect(spy).toHaveBeenCalled()
    })
    it("doesn't show error on load when api call doesn't throw error", async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({
        success: true,
        data: mockedRmsData
      })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.getStatus()
      expect(spy).not.toHaveBeenCalled()
    })
    it('loads data on successful requests', async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({
        success: true,
        data: mockedRmsData
      })
      await wrapper.vm.getStatus()
      expect(wrapper.vm.rmsData).toEqual(mockedRmsData)
    })
  })
  it.each`
    option        | res
    ${'Enabled'}  | ${[{ name: 'Enabled', value: '1' }, { name: 'Standby', value: '2' }, { name: 'Disabled', value: '0' }]}
    ${'Standby'}  | ${[{ name: 'Enabled', value: '1' }, { name: 'Standby', value: '2' }, { name: 'Disabled', value: '0' }]}
    ${'Disabled'} | ${[{ name: 'Enabled', value: '1' }, { name: 'Standby', value: '2' }, { name: 'Disabled', value: '0' }]}
  `('updates marked radio button when selected filter is $option', ({ option, res }) => {
    const wrapper = createWrapper(RMS, {
      props: { saveButtonText: 'test' }
    })
    wrapper.vm.updateRadio(option)
    expect(wrapper.vm.selectedType).toEqual(res)
  })
  describe('forceRefresh()', () => {
    it("shows success message on load when api call doesn't throws error", async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      wrapper.vm.rmsData = {
        status: '1'
      }
      wrapper.vm.$axios.put = vi.fn()
      wrapper.vm.$axios.put.mockResolvedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.$message, 'success')
      await wrapper.vm.forceRefresh()
      expect(spy).toHaveBeenCalled()
    })
    it('when attempting to connect, it shows an error on load when the API call throws an error.', async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' },
        data() {
          return {
            rmsData: {
              status: '1',
              error: '1'
            }
          }
        }
      })
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.forceRefresh()
      expect(spy).toHaveBeenCalledWith('Attempt to initiate new connection failed')
    })
    it('when attempting to reconnect, it shows an error on load when the API call throws an error.', async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' },
        computed: { isConnected: () => true }
      })
      wrapper.vm.rmsData = {
        status: '1'
      }
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.forceRefresh()
      expect(spy).toHaveBeenCalledWith('Reconnection attempt failed')
    })
    it('makes request when rms is enabled', async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      wrapper.setData({
        formData: {
          rms_mqtt: [{ enable: '1' }]
        }
      })
      const spy = vi.spyOn(wrapper.vm.$axios, 'post').mockResolvedValueOnce({
        success: true,
        data: mockedRmsData
      })
      await wrapper.vm.forceRefresh()
      expect(spy).toHaveBeenCalled()
    })
    it("doesn't make request when RMS is not enabled", async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      wrapper.vm.rmsData = {
        status: '0'
      }
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.forceRefresh()
      expect(spy).toHaveBeenCalledWith('Can not connect while RMS is disabled. Enable RMS and save changes.')
    })
  })
  describe('disconnect()', () => {
    it('displays prompt', async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
      await wrapper.vm.disconnect()
      expect(spy).toHaveBeenCalledTimes(1)
    })
    it("shows success message on load when api call doesn't throws error", async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockResolvedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.$message, 'success')
      await wrapper.vm.onOk()
      expect(spy).toHaveBeenCalled()
    })
    it('shows error on load when api call throws error', async () => {
      const wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      wrapper.vm.$axios.post = vi.fn()
      wrapper.vm.$axios.post.mockRejectedValueOnce({})
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.onOk()
      expect(spy).toHaveBeenCalled()
    })
  })
  const allColumns = [
    { title: 'Management status', value: '-', hint: 'Displays whether connection to RMS is enabled or disabled.' },
    { title: 'Connection state', value: { connectionState: { text: '-', color: '' }, fullError: null }, hint: 'The current state of the connection.', slotName: 'connection_state' },
    { title: 'Serial number', value: undefined, hint: 'A unique 10-digit device identifier. It is required that you submit this when adding the device to RMS.', slotName: 'serial_number' },
    { title: 'LAN MAC', value: undefined, hint: "Device's LAN MAC address. It is required that you submit this when adding the device to RMS.", slotName: 'mac' },
    { title: 'Next connection after', value: '00:00:00', hint: 'How much time is left before the device initiates the next connection attempt.' }
  ]
  const trb1or5Columns = [
    { title: 'Management status', value: '-', hint: 'Displays whether connection to RMS is enabled or disabled.' },
    { title: 'Connection state', value: { connectionState: { text: '-', color: '' }, fullError: null }, hint: 'The current state of the connection.', slotName: 'connection_state' },
    { title: 'Serial number', value: undefined, hint: 'A unique 10-digit device identifier. It is required that you submit this when adding the device to RMS.', slotName: 'serial_number' },
    { title: 'IMEI', value: undefined, hint: "Device's IMEI. It is required that you submit this when adding the device to RMS.", slotName: 'mac' },
    { title: 'Next connection after', value: '00:00:00', hint: 'How much time is left before the device initiates the next connection attempt.' }
  ]
  const trb2Columns = [
    { title: 'Management status', value: '-', hint: 'Displays whether connection to RMS is enabled or disabled.' },
    { title: 'Connection state', value: { connectionState: { text: '-', color: '' }, fullError: null }, hint: 'The current state of the connection.', slotName: 'connection_state' },
    { title: 'Serial number', value: undefined, hint: 'A unique 10-digit device identifier. It is required that you submit this when adding the device to RMS.', slotName: 'serial_number' },
    { title: 'IMEI', value: undefined, hint: "Device's IMEI. It is required that you submit this when adding the device to RMS.", slotName: 'mac' },
    { title: 'Next connection after', value: '00:00:00', hint: 'How much time is left before the device initiates the next connection attempt.' }
  ]
  const weirdMixCols = [
    { title: 'Management status', value: '-', hint: 'Displays whether connection to RMS is enabled or disabled.' },
    { title: 'Connection state', value: { connectionState: { text: '-', color: '' }, fullError: null }, hint: 'The current state of the connection.', slotName: 'connection_state' },
    { title: 'Serial number', value: undefined, hint: 'A unique 10-digit device identifier. It is required that you submit this when adding the device to RMS.', slotName: 'serial_number' },
    { title: 'IMEI', value: undefined, hint: "Device's IMEI. It is required that you submit this when adding the device to RMS.", slotName: 'mac' },
    { title: 'Next connection after', value: '00:00:00', hint: 'How much time is left before the device initiates the next connection attempt.' }
  ]
  it.each`
    columns    | res               | isTRB1or5 | isTRB2
    ${'all'}   | ${allColumns}     | ${false}  | ${false}
    ${'TRB1'}  | ${trb1or5Columns} | ${true}   | ${false}
    ${'TRB2'}  | ${trb2Columns}    | ${false}  | ${true}
    ${'weird'} | ${weirdMixCols}   | ${true}   | ${true}
  `('return $columns status data', ({ res, isTRB1or5, isTRB2 }) => {
    const wrapper = createWrapper(RMS, {
      props: { saveButtonText: 'test' },
      computed: { ...RMS.computed, isTRB1or5: () => isTRB1or5, isTRB2: () => isTRB2 }
    })
    expect(wrapper.vm.statusData).toEqual(res)
  })
  it.each`
    isTRB1or5 | title        | hint
    ${true}   | ${'IMEI'}    | ${"Device's IMEI. It is required that you submit this when adding the device to RMS."}
    ${false}  | ${'LAN MAC'} | ${"Device's LAN MAC address. It is required that you submit this when adding the device to RMS."}
  `('returns status name "$statusName" when is TRB: $isTRB1or5', async ({ isTRB1or5, title, hint }) => {
    const wrapper = createWrapper(RMS, {
      props: { saveButtonText: 'test' },
      computed: { ...RMS.computed, isTRB1or5: () => isTRB1or5 }
    })
    const result = wrapper.vm.networkData
    expect(result).toEqual({ title, hint })
  })
  it.each`
    deviceName  | isTRB1or5 | isTRB2
    ${'TRB142'} | ${true}   | ${false}
    ${'RUTX11'} | ${false}  | ${false}
    ${'TRB245'} | ${false}  | ${true}
  `('returns $isTRB1or5 when it\'s trb, device name: "$deviceName"', async ({ deviceName, isTRB1or5, isTRB2 }) => {
    const wrapper = createWrapper(RMS, {
      props: { saveButtonText: 'test' },
      global: {
        mocks: {
          $store: {
            device: deviceName
          }
        }
      }
    })
    const result = wrapper.vm.isTRB1or5
    expect(result).toBe(isTRB1or5)
    const result2 = wrapper.vm.isTRB2
    expect(result2).toBe(isTRB2)
  })
  it('returns non empty array', async () => {
    // computed property that need $store is beeing activated by this test
    const wrapper = createWrapper(RMS, {
      props: { saveButtonText: 'test' }
    })
    const result = wrapper.vm.statusData
    expect(result).not.toHaveLength(0)
  })

  it.each`
    seconds      | time
    ${'1'}       | ${'00:00:01'}
    ${'0'}       | ${'00:00:00'}
    ${'60'}      | ${'00:01:00'}
    ${'86399'}   | ${'23:59:59'}
    ${undefined} | ${'00:00:00'}
  `('returns time: "$time" when timestamp: $timeStamp', async ({ seconds, time }) => {
    const wrapper = createWrapper(RMS, {
      props: { saveButtonText: 'test' }
    })
    wrapper.vm.rmsData = {
      next_try: seconds
    }
    const result = wrapper.vm.parseTimeLeft
    expect(result).toBe(time)
  })

  describe('handleRmsStatusData', () => {
    let wrapper
    let statusData

    beforeEach(() => {
      wrapper = createWrapper(RMS, {
        props: { saveButtonText: 'test' }
      })
      statusData = {
        connection_state: '0',
        error: '0',
        error_code: '0',
        error_text: '',
        status: '1'
      }
      wrapper.setData({
        proceedingInfo: {
          connect: { state: '0', fakeState: 2, retryCount: 2 },
          disconnect: { state: '1', fakeState: 3, retryCount: 1 }
        },
        rmsErrorCodes: ['99', '100']
      })
    })

    it('sets rmsData directly when no proceedingAction', () => {
      wrapper.setData({ proceedingAction: '' })
      wrapper.vm.handleRmsStatusData(statusData)
      expect(wrapper.vm.rmsData).toEqual(statusData)
    })

    it('resets proceedingAction if proceedingActionCount exceeds retryCount', () => {
      wrapper.setData({ proceedingAction: 'connect', proceedingActionCount: 3 })
      const spy = vi.spyOn(wrapper.vm, 'setProceedingAction')
      wrapper.vm.handleRmsStatusData(statusData)
      expect(spy).toHaveBeenCalledWith('')
    })

    it('resets proceedingAction if error_code is in rmsErrorCodes', () => {
      wrapper.setData({ proceedingAction: 'connect', proceedingActionCount: 0 })
      const spy = vi.spyOn(wrapper.vm, 'setProceedingAction')
      const errorStatusData = { ...statusData, error_code: '99' }
      wrapper.vm.handleRmsStatusData(errorStatusData)
      expect(spy).toHaveBeenCalledWith('')
    })

    it('simulates connection state and resets errors when proceedingAction is set and not exceeded', () => {
      wrapper.setData({ proceedingAction: 'connect', proceedingActionCount: 0 })
      wrapper.vm.handleRmsStatusData(statusData)
      expect(wrapper.vm.rmsData.connection_state).toBe(2)
      expect(wrapper.vm.rmsData.error).toBe(0)
      expect(wrapper.vm.rmsData.error_code).toBe(0)
      expect(wrapper.vm.rmsData.error_text).toBe('')
    })

    it('increments proceedingActionCount when connection_state matches proceedingData.state', () => {
      wrapper.setData({ proceedingAction: 'connect', proceedingActionCount: 0 })
      wrapper.vm.handleRmsStatusData(statusData)
      expect(wrapper.vm.proceedingActionCount).toBe(1)
    })

    it('does not increment proceedingActionCount when connection_state does not match proceedingData.state', () => {
      wrapper.setData({ proceedingAction: 'connect', proceedingActionCount: 0 })
      const differentStateData = { ...statusData, connection_state: '1' }
      wrapper.vm.handleRmsStatusData(differentStateData)
      expect(wrapper.vm.proceedingActionCount).toBe(0)
    })
  })
})
