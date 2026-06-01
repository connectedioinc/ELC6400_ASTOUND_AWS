import MobileProfiles from '../../src/views/network/MobileProfiles.vue'
import MobileProfilesEdit from '../../src/views/network/MobileProfilesEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('MobileProfiles.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileProfiles, {
      global: {
        stubs: {
          'tlt-table': { template: '<div />' },
          'vuci-form-edit-delete': { template: '<div />' },
          'vuci-form-item-input': { template: '<div />' }
        }
      },
      computed: { ...MobileProfiles.computed, sectionModem: () => '1-1' }
    })
  })
  it('returns sectionModem with correct data', () => {
    wrapper.vm.$route.path = '/network/mobile/esim_profiles/1-1'
    expect(wrapper.vm.sectionModem).toEqual('1-1')
  })
  it('returns current eSIM status', () => {
    wrapper.vm.statuses = [{ id: '1-1', eid: 'N/A' }]
    expect(wrapper.vm.currentStatus).toEqual({ id: '1-1', eid: 'N/A' })
  })
  it.each([
    [[{ id: '1-1', eid: 'N/A' }], true],
    [[{ id: '1-1.2', eid: '123456789' }], true],
    [[{ id: '1-1', eid: '123456789' }], false]
  ])('returns eSIM status #%#', (statuses, res) => {
    wrapper.vm.statuses = statuses
    expect(wrapper.vm.eSimNotFound).toBe(res)
  })
  it.each([
    [false, 'eSIM is not selected as the active SIM'],
    [true, 'Profile download is in progress']
  ])('returns message for disabled fields #%#', (disabled, res) => {
    wrapper.vm.disableDownload = disabled
    expect(wrapper.vm.disableFieldsMsg).toBe(res)
  })
  it('returns parseCard data', () => {
    wrapper.vm.initialForm = { profile: [{ id: '123456789', profile_set: '1' }] }
    const data = { id: '123456789', provider: 'Bite', profile_set: '1' }
    expect(wrapper.vm.parseCard(data, 2)).toEqual({
      item: data,
      columns: [
        [
          { label: 'State', value: 'Active', class: 'success' },
          { label: 'ID', value: 'eSIM2' }
        ],
        [
          { label: 'Provider', value: 'Bite' },
          { label: 'ICCID', value: '123456789' }
        ]
      ]
    })
  })
  it('returns parseNotifications', () => {
    wrapper.vm.statuses = [{ id: '1-1', eid: '123456789', pending_notifications: [{ sequence_number: '72', iccid: '8988308650100308005F', event: '1', address: 'sm-v4-080-b-gtm.pr.go-esim.com' }] }]
    const response = [{ event: 'Enable profile', address: 'sm-v4-080-b-gtm.pr.go-esim.com', iccid: '8988308650100308005F' }]
    expect(wrapper.vm.parseNotifications).toEqual(response)
  })
  it('check if updateConfig return error when endpoint unsuccessful', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.updateConfig()
    expect(spy).toHaveBeenCalledWith('Failed to update data')
  })
  it('check if updateStatus return error when endpoint unsuccessful', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.updateStatus()
    expect(spy).toHaveBeenCalledWith('Failed to load eSIM profiles statuses')
  })
  it('check if updateStatus returns data and show info message', async () => {
    const data = [{ id: '1-1', eid: '123456789', pending_notifications: [{ sequence_number: '72', iccid: '8988308650100308005F', event: '1', address: 'sm-v4-080-b-gtm.pr.go-esim.com' }] }]
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ data })
    const spy = vi.spyOn(wrapper.vm.$message, 'info')
    await wrapper.vm.updateStatus()
    expect(spy).toHaveBeenCalledWith('There are pending notifications available')
    expect(wrapper.vm.statuses).toEqual(data)
  })
  it('check if updateStatus disables download button and show info message when pending_jobs includes DOWNLAOD', async () => {
    const data = [
      {
        id: '1-1',
        eid: '123456789',
        pending_jobs: ['DOWNLOAD'],
        pending_notifications: []
      }
    ]
    wrapper.vm.disableDownload = false
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ data })
    const spy = vi.spyOn(wrapper.vm.$message, 'info')
    await wrapper.vm.updateStatus()
    expect(spy).toHaveBeenCalledWith('eSIM profile download in progress')
    expect(wrapper.vm.disableDownload).toEqual(true)
  })
  it('check if updateConfig returns data', async () => {
    const data = [{ id: '1', name: 'test' }]
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ data })
    await wrapper.vm.updateConfig()
    expect(wrapper.vm.formData).toEqual(data)
  })
  it.each([
    [{}, 'Device has no pending notifications'],
    [{ response: { data: { errors: [{ code: 1 }] } } }, 'Failed to process notifications'],
    [{ response: { data: { errors: [{ code: 11 }] } } }, 'Failed to process notifications, no connection to the server']
  ])('check if processNotify return error #%#', async (error, res) => {
    wrapper.vm.$axios.post = vi.fn().mockRejectedValue(error)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.processNotify()
    expect(spy).toHaveBeenCalledWith(res)
  })
  it('check if processNotify returns success message', async () => {
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.processNotify()
    expect(spy).toHaveBeenCalledWith('Notifications processed')
  })
  it('check if prompt is shown', async () => {
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    wrapper.vm.processNotify = vi.fn()
    await wrapper.vm.showPrompt()
    expect(spy).toHaveBeenCalled()
  })
  it.each([
    [1, 'Failed to download profile, fatal error'],
    [15, 'Failed to download profile, SIM card error'],
    [16, 'Failed to download profile']
  ])('checks if error message is shown when received event_id is 6 and status is %s', (status, res) => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.disableDownload = true
    wrapper.vm.$mobile.getFailedEsimMessage = vi.fn().mockReturnValue(res)
    wrapper.vm.profileEvent({ modem_id: '1-1', event_id: 6, status })
    expect(spy).toHaveBeenCalledWith(res)
    expect(wrapper.vm.disableDownload).toEqual(false)
  })
  it('checks if success message is shown when received event_id is 6 and status is 0', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.disableDownload = true
    wrapper.vm.profileEvent({ modem_id: '1-1', event_id: 6, status: 0 })
    expect(spy).toHaveBeenCalledWith('eSIM profile added')
    expect(wrapper.vm.disableDownload).toEqual(false)
  })
  it.each([
    ['updateConfig', { modem_id: '1-1', event_id: 8 }],
    ['updateStatus', { modem_id: '1-1', event_id: 9 }]
  ])('checks if %s method is called when event data is %s', (method, data) => {
    const spy = vi.spyOn(wrapper.vm, method)
    wrapper.vm.profileEvent(data)
    expect(spy).toHaveBeenCalledOnce()
  })
  it('check if deleteProfile return error message when request is unsuccessful', async () => {
    wrapper.vm.$axios.delete = vi.fn().mockRejectedValue({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.deleteProfile()
    expect(spy).toHaveBeenCalledWith('Failed to delete eSIM profile')
  })
  it('check if deleteProfile return success message when request is successful', async () => {
    wrapper.vm.$axios.delete = vi.fn().mockResolvedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.deleteProfile()
    expect(spy).toHaveBeenCalledWith('eSIM profile has been deleted')
  })

  it('check if enableProfile return error message when request is unsuccessful', async () => {
    wrapper.vm.$axios.put = vi.fn().mockRejectedValue({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.enableProfile()
    expect(spy).toHaveBeenCalledWith('Failed to enable eSIM profile')
  })
  it('check if enableProfile return success message when request is successful', async () => {
    wrapper.vm.$axios.put = vi.fn().mockResolvedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.enableProfile()
    expect(spy).toHaveBeenCalledWith('eSIM profile has been enabled')
  })
  it.each([
    [
      'bootstrap profile used',
      true,
      false,
      [
        {
          info: 'This eSIM profile is specifically designated to enable initial connectivity. Due to its critical function, it cannot be manually removed. Please note, once a new eSIM profile is successfully downloaded and activated, this bootstrap profile will be automatically removed.'
        }
      ]
    ],
    [
      'profile is downloading',
      false,
      true,
      [
        {
          info: 'Profile download is in progress'
        }
      ]
    ],
    [
      'esim is not active',
      false,
      false,
      [
        {
          info: 'eSIM is not selected as the active SIM'
        }
      ]
    ]
  ])('checks if getHintMsg returns correct message when %s', (name, bootstrap, disable, res) => {
    wrapper.vm.bootstrapProfile = vi.fn().mockReturnValue(bootstrap)
    wrapper.vm.disableFields = vi.fn().mockReturnValue(disable)
    wrapper.vm.disableDownload = disable
    expect(wrapper.vm.getHintMsg({}, bootstrap)).toEqual(res)
  })
})

describe('MobileProfilesEdit.vue', () => {
  const uciData = {
    profile: [
      { id: '1', name: 'test', modem: '1-1', enabled: '1' },
      { id: '2', name: 'test2', modem: '3-1', enabled: '1' }
    ]
  }
  it.each([
    ['same name already exists', 'test', { isValid: false, message: "Profile with name 'test' already exists" }],
    ['same name already exists but different modem', 'test2', { isValid: true }],
    ['name is unique', 'test123', { isValid: true }]
  ])('validates profile name when %s', (text, val, res) => {
    const wrapper = createWrapper(MobileProfilesEdit, {
      global: {
        stubs: {
          'vuci-form-item-input': { template: '<div />' }
        }
      },
      propsData: {
        section: {
          id: '3',
          modem: '1-1',
          enabled: '1'
        }
      }
    })
    wrapper.vm.formData = uciData
    expect(wrapper.vm.validateName(val)).toEqual(res)
  })
})
