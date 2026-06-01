import createWrapper from '@tests/unit/mockFactory'
import Storage from '../../src/views/services/Storage.vue'

const simStatus = [
  { modem_id: '3-1', used: '123', total: '321', sim_inserted: '1', storage_id: 1, modem_type: 'Internal' },
  { modem_id: '3-2', used: '10', total: '20', sim_inserted: '1', storage_id: 2, modem_type: 'Internal' },
  { modem_id: '1-1.2', used: 'N/A', total: 'N/A', sim_inserted: '0', storage_id: 1, modem_type: 'Internal' }
]

const simConfig = [
  { modem_id: '3-1', free: '20', msg_storage: 'sm', storage_id: 1 },
  { modem_id: '3-2', free: '20', msg_storage: 'me', storage_id: 2 },
  { modem_id: '1-1.2', free: '10', msg_storage: '20' }
]

describe('Storage.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('returns sim storage string with data', () => {
    const wrapper = createWrapper(Storage)
    wrapper.vm.formData.sms_storage = simConfig
    wrapper.vm.smsStorageStatus = simStatus
    const simStorage = wrapper.vm.loadSimStorage(
      {},
      {
        uciSection: {
          modem_id: '3-1',
          msg_storage: 'sm'
        }
      }
    )
    expect(simStorage).toEqual('Used: 123 Available: 321')
  })
  it('returns sim storage string with incorrect total', () => {
    const wrapper = createWrapper(Storage)
    wrapper.vm.formData.sms_storage = simConfig
    wrapper.vm.smsStorageStatus = simStatus
    const simStorage = wrapper.vm.loadSimStorage(
      {},
      {
        uciSection: {
          modem_id: '1-1.2'
        }
      }
    )
    expect(simStorage).toEqual('N/A')
  })
  it('shows side message on create', async () => {
    const wrapper = createWrapper(Storage, { global: { mocks: { $notification: { info: vi.fn() } } } })
    expect(wrapper.vm.$notification.info).toHaveBeenCalled()
  })
  describe('loadSmsStorageStatus()', () => {
    it('invokes error message when refresh request fails', async () => {
      const wrapper = createWrapper(Storage)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.loadSmsStorageStatus()
      expect(spy).toHaveBeenCalled()
    })
    it('load data', async () => {
      const wrapper = createWrapper(Storage)
      wrapper.vm.$axios.get = vi.fn()
      wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: simConfig })
      await wrapper.vm.loadSmsStorageStatus()
      expect(wrapper.vm.smsStorageStatus).toEqual(simConfig)
    })
    it("doesn't load data", async () => {
      const wrapper = createWrapper(Storage)
      wrapper.vm.isStatusLoading = true
      await wrapper.vm.loadSmsStorageStatus()
      expect(wrapper.vm.smsStorageStatus).toEqual([])
    })
  })
  describe('returns data from other structure', () => {
    const altStatus = [
      {
        modem_id: '3-1',
        alt_used: '123',
        alt_total: '321',
        alt_storage_id: 1,
        sim_inserted: '1',
        modem_type: 'Primary'
      }
    ]
    it.each`
      status       | modem                                     | result
      ${simStatus} | ${{ modem_id: '3-2', msg_storage: 'me' }} | ${{ used: '10', total: '20', sim_inserted: '1', modem_type: 'Internal' }}
      ${simStatus} | ${{ modem_id: '15-5555' }}                | ${{ used: 'N/A', total: 'N/A', sim_inserted: '', modem_type: 'Unknown' }}
      ${altStatus} | ${{ modem_id: '3-1', msg_storage: 'sm' }} | ${{ used: '123', total: '321', sim_inserted: '1', modem_type: 'Primary' }}
    `('returns sms storage status', async ({ status, modem, result }) => {
      const wrapper = createWrapper(Storage)
      wrapper.vm.smsStorageStatus = status
      const res = wrapper.vm.getSmsStorageStatus(modem)
      expect(res).toEqual(result)
    })
  })
  it('gets status once and starts timer', async () => {
    const wrapper = createWrapper(Storage)
    const spyTimer = vi.spyOn(wrapper.vm.$timer, 'start')
    const spyStatus = vi.spyOn(wrapper.vm, 'loadSmsStorageStatus')
    await wrapper.vm.afterLoad()
    expect(spyTimer).toHaveBeenCalled()
    expect(spyStatus).toHaveBeenCalled()
  })
  it.each`
    modem                                         | name
    ${{ modem_type: 'Secondary' }}                | ${'Secondary modem'}
    ${{ modem_type: 'External', modem_index: 1 }} | ${'External modem 1'}
  `('returns modem name: "$name"', ({ modem, name }) => {
    const wrapper = createWrapper(Storage)
    wrapper.vm.getSmsStorageStatus = vi.fn().mockReturnValue(modem)
    const res = wrapper.vm.getModemName()
    expect(res).toBe(name)
  })
  it('returns modem title', () => {
    const wrapper = createWrapper(Storage)
    wrapper.vm.getModemName = vi.fn().mockReturnValueOnce('Primary modem')
    const res = wrapper.vm.getTitle()
    expect(res).toBe('Primary modem SIM configuration')
  })
  it('shows error message when sim disconnected', () => {
    const wrapper = createWrapper(Storage)
    wrapper.vm.getModemName = vi.fn().mockReturnValueOnce('Primary modem')
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.invokeSimWarningMessage({}, false)
    expect(spy).toBeCalledWith('Lost connection to Primary modem SIM card')
  })
  it('shows success message when sim connected', () => {
    const wrapper = createWrapper(Storage)
    wrapper.vm.getModemName = vi.fn().mockReturnValueOnce('Primary modem')
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.invokeSimWarningMessage({}, true)
    expect(spy).toBeCalledWith('Primary modem SIM card detected')
  })
  it('shows warning message when sim connected', () => {
    const wrapper = createWrapper(Storage)
    wrapper.vm.getModemName = vi.fn().mockReturnValueOnce('Primary modem')
    const spy = vi.spyOn(wrapper.vm.$message, 'info')
    wrapper.vm.invokeLostModemMessage()
    expect(spy).toBeCalledWith('Lost connection to Primary modem')
  })
  it('returns section all instances after save', () => {
    const wrapper = createWrapper(Storage)
    const res = wrapper.vm.onAfterSave(null, [{}], [{}])
    expect(res).toEqual([{}])
  })
  it('returns section all instances after save', () => {
    const wrapper = createWrapper(Storage)
    const res = wrapper.vm.onAfterSave(null, [{}], [{}])
    expect(res).toEqual([{}])
  })
  it('returns section filtered instances after save', () => {
    const wrapper = createWrapper(Storage)
    const responseData = [
      {
        messages: [
          { source: 'yes', code: 1 },
          { source: 'no', code: 1 }
        ]
      }
    ]
    const allInstances = [{ id: 'yes' }, { id: 'yes1' }, { id: 'no' }]
    wrapper.vm.formData.sms_storage = allInstances
    wrapper.vm.getErrorMessage = vi.fn().mockReturnValue('test')
    const spy = vi.spyOn(wrapper.vm.$message, 'info')
    const res = wrapper.vm.onAfterSave(null, responseData, allInstances)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(res).toEqual([{ id: 'yes1' }])
    expect(wrapper.vm.formData.sms_storage).toEqual([{ id: 'yes1' }])
  })
  it.each`
    newValue | oldValue | toBeCalled | statusType
    ${'0'}   | ${'0'}   | ${false}   | ${undefined}
    ${'1'}   | ${'1'}   | ${false}   | ${undefined}
    ${'1'}   | ${''}    | ${false}   | ${undefined}
    ${'0'}   | ${''}    | ${false}   | ${undefined}
    ${'0'}   | ${'1'}   | ${true}    | ${false}
    ${'1'}   | ${'0'}   | ${true}    | ${true}
  `('Calls: $toBeCalled getSmsStorageStatus when newValue: $newValue, oldValue: $oldValue', ({ newValue, oldValue, toBeCalled, statusType }) => {
    const wrapper = createWrapper(Storage)
    wrapper.vm.formData.sms_storage = [{}]
    const spy = vi.spyOn(wrapper.vm, 'invokeSimWarningMessage')
    vi.spyOn(wrapper.vm, 'getSmsStorageStatus').mockReturnValueOnce({ sim_inserted: newValue }).mockReturnValueOnce({ sim_inserted: oldValue })
    wrapper.vm.ivokeSmsStorageStatus()
    if (toBeCalled) expect(spy).toBeCalledWith(expect.any(Object), statusType)
    else expect(spy).not.toBeCalled()
  })
  it('validates select', () => {
    const wrapper = createWrapper(Storage)
    const self = {
      vuciSection: {
        validate: vi.fn()
      }
    }
    wrapper.vm.validate(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })
})
