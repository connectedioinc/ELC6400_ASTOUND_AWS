import Samba from '../../src/views/services/Samba.vue'
import createWrapper from '@tests/unit/mockFactory'

const successfullBulk = [
  { success: true, data: [] },
  { success: true, data: [] },
  { success: true, data: { active_sessions: [], config_file: [] } },
  { success: true, data: [] }
]

const unsuccessfullBulk = Array.from({ length: 12 }, () => ({ success: false }))

const unformatedAreaValue = [
  '[global]',
  '\tnetbios name = Router_share ',
  '\tdisplay charset = UTF-8',
  '\tinterfaces = lo br-lan ',
  '\tserver string = Router share',
  '\tunix charset = UTF-8',
  '\tworkgroup = WORKGROUP',
  '\tbind interfaces only = yes',
  '\tdeadtime = 30',
  '\tenable core files = no',
  '\tinvalid users = root',
  '\tlocal master = no',
  '\tmap to guest = Bad User',
  '\tmax protocol = SMB2',
  '\tmin receivefile size = 16384',
  '\tnull passwords = yes',
  '\tpassdb backend = smbpasswd',
  '\tsecurity = user',
  '\tsmb passwd file = /etc/samba/smbpasswd',
  '\tuse sendfile = yes',
  '\tforce user = root',
  '\ttest = 200'
]

const formatedAreaValue = unformatedAreaValue.toString().replace(/,/g, '\n')

describe('Samba.vue', () => {
  it.each([
    [true, successfullBulk, 0],
    [false, unsuccessfullBulk, 5]
  ])('invokes load data error messages when %s', async (status, data, response) => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(data)
    const spy2 = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy2).toHaveBeenCalledTimes(response)
  })
  it('invokes error message when bulkGet fails', async () => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Unexpected error')
  })
  it('maps user usernames', () => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.users = [{ username: 'test1' }, { username: 'test2' }]
    const val = wrapper.vm.usernames
    expect(val).toEqual(['test1', 'test2'])
  })
  it('returns true when users exist', () => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.users = [{ username: 'test1' }, { username: 'test2' }]
    const val = wrapper.vm.userExist
    expect(val).toEqual(true)
  })
  it('returns mapped mountpoints', () => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.devices = [{ mountpoint: '/test/test' }, { mountpoint: '/test2/test2' }]
    const val = wrapper.vm.mountpoints
    expect(val).toEqual(['/test/test', '/test2/test2'])
  })
  it('returns formated config', () => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.areaValue = unformatedAreaValue
    const val = wrapper.vm.formatedConfig
    expect(val).toEqual(formatedAreaValue)
  })
  it('returns hints for sessions status', () => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.activeSessions = ['lan', 'lan1']
    const val = wrapper.vm.getStatusHints(wrapper.vm.activeSessions)
    expect(val).toEqual([{ info: 'lan' }, { info: 'lan1' }])
  })
  it('loads data and starts timer to upload status', async () => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: [] })
    const spyTimer = vi.spyOn(wrapper.vm.$timer, 'start')
    await wrapper.vm.loadData()
    expect(spyTimer).toHaveBeenCalledWith(wrapper.vm.updateStatus)
  })
  it('invokes error message when validation fails', async () => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.formData = {
      shares: [
        { name: 'test', id: 'test4' },
        { name: 'test', id: 'test3' }
      ]
    }
    await expect(wrapper.vm.onBeforeSave()).rejects.toEqual('Instance with the same name already exists')
  })
  it('executes put request when validation passes', async () => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.formData = {
      shares: [
        { name: 'test2', id: 'test4' },
        { name: 'test', id: 'test3' }
      ]
    }
    wrapper.vm.$axios.put = vi.fn()
    wrapper.vm.$axios.put.mockResolvedValueOnce()
    wrapper.vm.areaValue = []
    await expect(wrapper.vm.onBeforeSave()).resolves.toEqual()
  })
  it.each([
    ['passes', 'test = 1', { isValid: true }],
    ['passes', 'ab cd = 1', { isValid: true }],
    ['fails', 'test', { isValid: false, message: 'Following format is accepted: [a-Z0-9] = [all characters are allowed except ?]' }],
    ['fails', ' netbios    name  = 1', { isValid: false, message: "Custom value 'netbios name' is not allowed" }],
    ['fails', 'display charset = 1', { isValid: false, message: "Custom value 'display charset' is not allowed" }],
    ['fails', 'interfaces = 1', { isValid: false, message: "Custom value 'interfaces' is not allowed" }],
    ['fails', 'server string = 1', { isValid: false, message: "Custom value 'server string' is not allowed" }],
    ['fails', 'unix charset = 1', { isValid: false, message: "Custom value 'unix charset' is not allowed" }],
    ['fails', 'workgroup = 1', { isValid: false, message: "Custom value 'workgroup' is not allowed" }]
  ])('validateCustom %s', async (text, val, resolve) => {
    const wrapper = createWrapper(Samba)
    wrapper.vm.formData = { samba: [{ custom: val }] }
    const value = wrapper.vm.formData.samba[0].custom
    await expect(wrapper.vm.validateCustom(value)).toEqual(resolve)
  })
  it('openConfig starts setInterval', () => {
    const wrapper = createWrapper(Samba)
    const spyInterval = vi.spyOn(global, 'setInterval')
    wrapper.vm.openConfig()
    expect(spyInterval).toHaveBeenCalledTimes(1)
  })
  it.each([
    ['1', { payload: [{ errors: [{ code: 1 }] }] }, 'Selected USB drive path is not a directory'],
    ['2', { payload: [{ errors: [{ code: 2 }] }] }, 'Selected USB drive path does not exist'],
    ['none', { payload: [{ errors: [{ code: 5 }] }] }, 'Unexpected error']
  ])('returns error message when error code is %s', (status, data, response) => {
    const wrapper = createWrapper(Samba)
    const val = wrapper.vm.returnErrorMessage(data)
    expect(val).toEqual(response)
  })
})
